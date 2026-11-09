// Read-only inventory. Load credentials through the runtime environment; never log them.
const { Client } = require('pg');
const dns = require('node:dns');
const fs = require('node:fs/promises');
const path = require('node:path');
dns.setDefaultResultOrder('ipv4first');

const ENVIRONMENTS = { source: { variable: 'DATABASE_URL', ref: 'rzjlkpumrsjpafduhlgt' }, target: { variable: 'TARGET_DEV_DATABASE_URL', ref: 'mytkqzkpywdrpnrgafss' } };
const TABLES = ['Product', 'UnitProduksi', 'ritel_modern', 'credit_limit_batches', 'PurchaseOrder', 'PurchaseOrderItem', 'data_retur', 'promos', 'reconciliations', 'realisasi_pemenuhan', 'realisasi_pemenuhan_items', 'User', 'AuditLog'];

function verifiedConnection(role) {
  const expected = ENVIRONMENTS[role], value = process.env[expected.variable];
  if (!value) throw Object.assign(new Error(), { safeCode: `${expected.variable}_MISSING` });
  let url;
  try { url = new URL(value); } catch { throw Object.assign(new Error(), { safeCode: `${role.toUpperCase()}_URL_INVALID` }); }
  const user = decodeURIComponent(url.username);
  const matched = user === `postgres.${expected.ref}` && /^aws-[a-z0-9-]+\.pooler\.supabase\.com$/.test(url.hostname)
    || user === 'postgres' && url.hostname === `db.${expected.ref}.supabase.co`;
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !matched || url.pathname !== '/postgres' || !url.password || (url.port && url.port !== '5432')) {
    throw Object.assign(new Error(), { safeCode: `${role.toUpperCase()}_IDENTITY_MISMATCH` });
  }
  // Enforce certificate verification independently of legacy sslmode=require options.
  for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert', 'uselibpqcompat', 'pgbouncer', 'connection_limit', 'connect_timeout', 'ssl', 'options']) url.searchParams.delete(key);
  return { ref: expected.ref, connectionString: url.toString(), caFile: process.env[role === 'source' ? 'SOURCE_DATABASE_CA_FILE' : 'TARGET_DATABASE_CA_FILE'] };
}

async function inspect(role) {
  const config = verifiedConnection(role);
  const ca = config.caFile ? await fs.readFile(config.caFile, 'utf8') : undefined;
  const client = new Client({ connectionString: config.connectionString, ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) },
    options: '-c default_transaction_read_only=on', connectionTimeoutMillis: 15000, query_timeout: 20000, application_name: 'proc-apps-readonly-clone-preflight' });
  try {
    await client.connect();
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    await client.query("SET LOCAL statement_timeout = '15000ms'");
    await client.query("SET LOCAL lock_timeout = '2000ms'");
    await client.query("SET LOCAL idle_in_transaction_session_timeout = '60000ms'");
    const metadata = (await client.query("SELECT current_database() AS database, current_user AS username, current_setting('transaction_read_only') AS read_only, current_setting('server_version_num') AS version")).rows[0];
    if (metadata.read_only !== 'on') throw Object.assign(new Error(), { safeCode: 'READ_ONLY_NOT_ENFORCED' });
    if (metadata.username !== `postgres.${config.ref}` && metadata.username !== 'postgres') throw Object.assign(new Error(), { safeCode: 'SESSION_USER_MISMATCH' });
    const columns = (await client.query(`SELECT table_name, column_name, ordinal_position, udt_name, is_nullable, column_default, is_identity, is_generated
      FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ANY($1::text[]) ORDER BY table_name, ordinal_position`, [TABLES])).rows;
    const constraints = (await client.query(`SELECT t.relname AS table_name, c.conname AS name, c.contype AS type, pg_get_constraintdef(c.oid) AS definition
      FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public' AND t.relname = ANY($1::text[]) ORDER BY t.relname, c.conname`, [TABLES])).rows;
    const counts = [];
    for (const table of TABLES) {
      if (!columns.some(column => column.table_name === table)) { counts.push({ table, missing: true }); continue; }
      // Identifier comes only from the fixed table allowlist above.
      const count = (await client.query(`SELECT count(*)::text AS count FROM public."${table}"`)).rows[0].count;
      const size = (await client.query('SELECT pg_total_relation_size($1::regclass)::text AS bytes', [`public."${table}"`])).rows[0].bytes;
      counts.push({ table, count, bytes: size });
    }
    await client.query('ROLLBACK');
    console.log(JSON.stringify({ environment: role, projectRef: config.ref, readOnly: true, tablesInspected: counts.length }));
    return { projectRef: config.ref, database: metadata.database, version: metadata.version, readOnly: true, tlsCertificateVerified: true, columns, constraints, tables: counts };
  } catch (error) { error.environment = role; throw error; }
  finally { await client.end().catch(() => {}); }
}

async function main() {
  // Validate both identities before opening even the source connection.
  verifiedConnection('source'); verifiedConnection('target');
  const source = await inspect('source');
  const target = await inspect('target');
  const differences = TABLES.filter(table => {
    const schema = result => JSON.stringify({ columns: result.columns.filter(c => c.table_name === table), constraints: result.constraints.filter(c => c.table_name === table) });
    return schema(source) !== schema(target);
  });
  const report = { checkedAt: new Date().toISOString(), source, target, schemaDifferences: differences };
  await fs.mkdir(path.join(__dirname, '..', 'scratch'), { recursive: true });
  await fs.writeFile(path.join(__dirname, '..', 'scratch', 'db-clone-preflight.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ source: source.projectRef, target: target.projectRef, readOnly: true, tlsCertificateVerified: true, tables: source.tables.map(table => ({ table: table.table, productionRows: table.count || null, developmentRows: target.tables.find(t => t.table === table.table)?.count || null, productionBytes: table.bytes || null })), schemaDifferences: differences }, null, 2));
}

if (require.main === module) main().catch(error => {
  // Error messages can contain connection strings or row values; expose codes only.
  const code = error.safeCode || error.code || 'PREFLIGHT_FAILED';
  console.error(JSON.stringify({ error: 'Pemeriksaan baca saja belum selesai. Tidak ada data yang ditimpa.', environment: error.environment || 'configuration', code: /^[A-Z0-9_]+$/.test(code) ? code : 'PREFLIGHT_FAILED' }));
  process.exitCode = 1;
});

module.exports = { verifiedConnection };
