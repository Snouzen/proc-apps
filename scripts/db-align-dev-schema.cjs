// Additive development-only DDL. Never creates a production connection.
const { Client } = require('pg');
const fs = require('node:fs/promises');
const path = require('node:path');
const { verifiedConnection } = require('./db-clone-preflight.cjs');

const TARGET_REF = 'mytkqzkpywdrpnrgafss';
const SOURCE_REF = 'rzjlkpumrsjpafduhlgt';
const TABLE = 'realisasi_pemenuhan';
const COLUMNS = [
  { name: 'daftarRegional', udt: 'text', sql: 'text', defaultValue: null },
  { name: 'daftarTanggal', udt: '_text', sql: 'text[] DEFAULT ARRAY[]::text[]', defaultValue: 'ARRAY[]::text[]' },
  { name: 'tanggalAkhir', udt: 'timestamp', sql: 'timestamp(3) without time zone', defaultValue: null },
];
const inspectColumns = `SELECT column_name, udt_name, is_nullable, column_default FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'realisasi_pemenuhan' ORDER BY ordinal_position`;
// Hash original row values without printing/returning any business data.
const inspectRows = `SELECT count(*)::text AS count, md5(COALESCE(jsonb_agg(
  to_jsonb(t) - 'daftarRegional' - 'daftarTanggal' - 'tanggalAkhir' ORDER BY t.id)::text, '[]')) AS checksum
  FROM public.realisasi_pemenuhan t`;

function planChanges(report, existing) {
  if (report.source?.projectRef !== SOURCE_REF || report.target?.projectRef !== TARGET_REF || !existing.length) throw new Error('SCHEMA_REFERENCE_INVALID');
  return COLUMNS.filter(column => {
    const source = report.source.columns.find(item => item.table_name === TABLE && item.column_name === column.name);
    if (!source || source.udt_name !== column.udt || source.is_nullable !== 'YES' || source.column_default !== column.defaultValue) throw new Error('SOURCE_COLUMN_REFERENCE_MISMATCH');
    const current = existing.find(item => item.column_name === column.name);
    if (current && (current.udt_name !== column.udt || current.is_nullable !== 'YES' || current.column_default !== column.defaultValue)) throw new Error('DEV_COLUMN_INCOMPATIBLE');
    return !current;
  });
}

async function align(client, report, apply) {
  let inTransaction = false;
  try {
    await client.query(apply ? 'BEGIN' : 'BEGIN READ ONLY'); inTransaction = true;
    await client.query("SET LOCAL statement_timeout = '15000ms'");
    await client.query("SET LOCAL lock_timeout = '2000ms'");
    await client.query("SET LOCAL idle_in_transaction_session_timeout = '30000ms'");
    const identity = (await client.query("SELECT current_database() AS database, current_user AS username, current_setting('transaction_read_only') AS read_only")).rows[0];
    if (identity.database !== 'postgres' || !['postgres', `postgres.${TARGET_REF}`].includes(identity.username)) throw new Error('DEV_SESSION_IDENTITY_INVALID');
    if (apply && identity.read_only !== 'off') throw new Error('DEV_SESSION_NOT_WRITABLE');
    // Short dev-table lock keeps before/after row verification consistent. No prod lock exists.
    if (apply) await client.query('LOCK TABLE public.realisasi_pemenuhan IN ACCESS EXCLUSIVE MODE');
    const beforeColumns = (await client.query(inspectColumns)).rows;
    const missing = planChanges(report, beforeColumns);
    const beforeRows = (await client.query(inspectRows)).rows[0];
    if (apply) {
      for (const column of missing) await client.query(`ALTER TABLE public.realisasi_pemenuhan ADD COLUMN "${column.name}" ${column.sql}`);
      const afterColumns = (await client.query(inspectColumns)).rows;
      if (planChanges(report, afterColumns).length) throw new Error('DEV_SCHEMA_VERIFICATION_FAILED');
      const afterRows = (await client.query(inspectRows)).rows[0];
      if (beforeRows.count !== afterRows.count || beforeRows.checksum !== afterRows.checksum) throw new Error('DEV_ROWS_CHANGED_UNEXPECTEDLY');
      await client.query('COMMIT'); inTransaction = false;
    } else { await client.query('ROLLBACK'); inTransaction = false; }
    return { projectRef: TARGET_REF, mode: apply ? 'applied' : 'read-only-plan', table: TABLE, addedColumns: apply ? missing.map(item => item.name) : [], plannedColumns: missing.map(item => item.name), existingRowsPreserved: beforeRows.count, productionConnections: 0 };
  } finally { if (inTransaction) await client.query('ROLLBACK').catch(() => {}); }
}

async function main() {
  const config = verifiedConnection('target');
  if (config.ref !== TARGET_REF || !config.caFile) throw new Error('DEV_CONNECTION_OR_CA_INVALID');
  const report = JSON.parse(await fs.readFile(path.join(__dirname, '..', 'scratch', 'db-clone-preflight.json'), 'utf8'));
  const ca = await fs.readFile(config.caFile, 'utf8');
  const client = new Client({ connectionString: config.connectionString, ssl: { rejectUnauthorized: true, ca }, connectionTimeoutMillis: 15000, query_timeout: 20000, application_name: 'proc-apps-dev-only-schema-alignment' });
  try {
    await client.connect();
    const result = await align(client, report, process.argv.includes('--apply'));
    if (result.mode === 'applied') await fs.writeFile(path.join(__dirname, '..', 'scratch', 'db-dev-schema-alignment.json'), JSON.stringify({ ...result, completedAt: new Date().toISOString() }, null, 2));
    console.log(JSON.stringify(result, null, 2));
  } finally { await client.end().catch(() => {}); }
}

if (require.main === module) main().catch(error => {
  // Do not emit connection strings, passwords, SQL detail, or row data.
  const code = error.code || error.message;
  console.error(JSON.stringify({ error: 'Penyesuaian dev belum selesai; periksa status sebelum mengulang.', environment: 'development-only', code: /^[A-Z0-9_]+$/.test(code || '') ? code : 'DEV_SCHEMA_ALIGNMENT_FAILED', productionConnections: 0 }));
  process.exitCode = 1;
});
module.exports = { planChanges, align };
