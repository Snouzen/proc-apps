// Production is READ ONLY. Restore can only connect to the pinned development project.
const { Client } = require('pg');
const fs = require('node:fs/promises');
const nativeFs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { StringDecoder } = require('node:string_decoder');
const { execFileSync } = require('node:child_process');
const { verifiedConnection } = require('./db-clone-preflight.cjs');

const ROOT = path.join(__dirname, '..', 'database-backups.local');
const REFS = { source: 'rzjlkpumrsjpafduhlgt', target: 'mytkqzkpywdrpnrgafss' };
const BUSINESS = ['Product', 'UnitProduksi', 'ritel_modern', 'credit_limit_batches', 'PurchaseOrder', 'PurchaseOrderItem', 'data_retur', 'promos', 'reconciliations', 'realisasi_pemenuhan', 'realisasi_pemenuhan_items'];
const TABLES = [...BUSINESS, 'User', 'AuditLog'];
const SECURITY = ['AccessControl', 'RevokedSession', 'RateLimit', 'RateLimitAccount'];
const QUOTED_SECURITY = SECURITY.map(value => `'${value}'`).join(',');
const AUDIT_BUSINESS = `entity NOT IN (${QUOTED_SECURITY})`;
const AUDIT_SECURITY = `entity IN (${QUOTED_SECURITY})`;
const quote = value => '"' + value.replace(/"/g, '""') + '"';
const fail = code => { throw Object.assign(new Error(code), { safeCode: code }); };
const log = value => console.log(JSON.stringify(value));
let phase = 'initializing', committed = false, commitAttempted = false;

function dpapi(value, decrypt = false) {
  const command = decrypt
    ? '$null=[Reflection.Assembly]::LoadWithPartialName("System.Security"); $bytes=[Convert]::FromBase64String([Console]::In.ReadToEnd().Trim()); [Console]::Write([Text.Encoding]::UTF8.GetString([Security.Cryptography.ProtectedData]::Unprotect($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)))'
    : '$null=[Reflection.Assembly]::LoadWithPartialName("System.Security"); $bytes=[Text.Encoding]::UTF8.GetBytes([Console]::In.ReadToEnd().Trim()); [Console]::Write([Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Protect($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)))';
  try { return execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { input: value, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim(); }
  catch { return fail('BACKUP_KEY_PROTECTION_FAILED'); }
}

async function protectedDirectory() {
  await fs.mkdir(ROOT, { recursive: true });
  try {
    const sid = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', '[System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    if (!/^S-1-\d+(?:-\d+)+$/.test(sid)) fail('BACKUP_ACL_IDENTITY_INVALID');
    execFileSync('icacls.exe', [ROOT, '/inheritance:r', '/grant:r', `*${sid}:(OI)(CI)F`, '*S-1-5-18:(OI)(CI)F'], { stdio: ['ignore', 'pipe', 'pipe'] });
  } catch { fail('BACKUP_ACL_FAILED'); }
}

async function connect(role, readOnly = true) {
  if (!readOnly && role !== 'target') fail('PRODUCTION_WRITE_CONNECTION_FORBIDDEN');
  const config = verifiedConnection(role);
  if (config.ref !== REFS[role] || !config.caFile) fail('DATABASE_IDENTITY_OR_CA_INVALID');
  const ca = await fs.readFile(config.caFile, 'utf8');
  const client = new Client({ connectionString: config.connectionString, ssl: { rejectUnauthorized: true, ca },
    options: readOnly ? '-c default_transaction_read_only=on' : undefined, connectionTimeoutMillis: 15000, query_timeout: 35000,
    application_name: role === 'source' ? 'proc-apps-source-readonly-backup' : 'proc-apps-development-clone' });
  await client.connect();
  try {
    await client.query(readOnly ? 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY' : 'BEGIN');
    await client.query(role === 'source' ? "SET LOCAL statement_timeout = '15000ms'" : "SET LOCAL statement_timeout = '30000ms'");
    await client.query("SET LOCAL lock_timeout = '2000ms'");
    await client.query("SET LOCAL idle_in_transaction_session_timeout = '60000ms'");
    await client.query("SET LOCAL timezone = 'UTC'");
    await client.query("SET LOCAL datestyle = 'ISO, YMD'");
    await client.query("SET LOCAL extra_float_digits = 3");
    const current = (await client.query("SELECT current_database() AS database, current_user AS username, current_setting('transaction_read_only') AS read_only")).rows[0];
    if (current.database !== 'postgres' || !['postgres', `postgres.${REFS[role]}`].includes(current.username) || (readOnly && current.read_only !== 'on')) fail('DATABASE_SESSION_IDENTITY_INVALID');
    client.cloneRole = role; client.cloneReadOnly = readOnly;
    return client;
  } catch (error) { await client.end().catch(() => {}); throw error; }
}

async function schema(client) {
  const columns = (await client.query(`SELECT t.relname AS table_name, a.attname AS name, format_type(a.atttypid, a.atttypmod) AS type,
    a.attnotnull AS not_null, pg_get_expr(d.adbin, d.adrelid) AS default_value, a.attidentity AS identity, a.attgenerated AS generated
    FROM pg_attribute a JOIN pg_class t ON t.oid=a.attrelid JOIN pg_namespace n ON n.oid=t.relnamespace
    LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
    WHERE n.nspname='public' AND t.relname=ANY($1::text[]) AND a.attnum>0 AND NOT a.attisdropped ORDER BY t.relname,a.attname`, [TABLES])).rows;
  const constraints = (await client.query(`SELECT t.relname AS table_name, c.conname AS name, c.contype AS type, pg_get_constraintdef(c.oid) AS definition,
    CASE WHEN c.contype='p' THEN ARRAY(SELECT a.attname::text FROM unnest(c.conkey) WITH ORDINALITY k(attnum,ord)
      JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=k.attnum ORDER BY k.ord) ELSE NULL END AS primary_columns
    FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace
    WHERE n.nspname='public' AND t.relname=ANY($1::text[]) ORDER BY t.relname,c.conname`, [TABLES])).rows;
  const indexes = (await client.query("SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname='public' AND tablename=ANY($1::text[]) ORDER BY tablename,indexname", [TABLES])).rows;
  const triggers = (await client.query(`SELECT t.relname AS table_name, g.tgname AS name FROM pg_trigger g JOIN pg_class t ON t.oid=g.tgrelid
    JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='public' AND t.relname=ANY($1::text[]) AND NOT g.tgisinternal`, [TABLES])).rows;
  for (const table of TABLES) {
    if (!columns.some(c => c.table_name === table) || !constraints.some(c => c.table_name === table && c.type === 'p')) fail('APPLICATION_TABLE_OR_PRIMARY_KEY_MISSING');
  }
  if (columns.some(c => c.identity || c.generated)) fail('GENERATED_COLUMN_REQUIRES_REVIEW');
  return { columns, constraints, indexes, triggers };
}

function assertSchemas(source, target) {
  const normal = value => JSON.stringify({ columns: value.columns, constraints: value.constraints });
  if (normal(source) !== normal(target)) fail('DATABASE_SCHEMAS_DIFFER');
  if (target.triggers.length) fail('DEV_USER_TRIGGERS_REQUIRE_REVIEW');
}

async function* sqlLines(client, metadata, table, where = '') {
  if (!TABLES.includes(table)) fail('TABLE_NOT_ALLOWED');
  const columns = metadata.columns.filter(c => c.table_name === table).map(c => quote(c.name)).join(',');
  const pk = metadata.constraints.find(c => c.table_name === table && c.type === 'p').primary_columns.map(quote).join(',');
  const predicate = where ? ` WHERE ${where}` : '';
  await client.query(`DECLARE clone_rows NO SCROLL CURSOR FOR SELECT row_to_json(t)::text AS line FROM (SELECT ${columns} FROM public.${quote(table)}${predicate} ORDER BY ${pk}) t`);
  try {
    while (true) {
      const batch = (await client.query('FETCH FORWARD 500 FROM clone_rows')).rows;
      if (!batch.length) break;
      for (const row of batch) yield row.line + '\n';
    }
  } finally { await client.query('CLOSE clone_rows').catch(() => {}); }
}

function counters() { return { hash: crypto.createHash('sha256'), count: 0 }; }
function record(stats, line) { stats.hash.update(line); stats.count++; }
function finish(stats) { return { count: stats.count, checksum: stats.hash.digest('hex') }; }
const isBusinessAudit = line => !SECURITY.includes(JSON.parse(line).entity);

async function snapshot(role) {
  phase = `${role}-snapshot-connecting`;
  const client = await connect(role, true);
  const dir = path.join(ROOT, `${role}-${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomBytes(4).toString('hex')}`);
  const key = crypto.randomBytes(32);
  let manifest;
  try {
    await fs.mkdir(dir);
    await fs.writeFile(path.join(dir, 'key.dpapi'), dpapi(key.toString('base64')), { flag: 'wx' });
    phase = `${role}-snapshot-schema`;
    const metadata = await schema(client);
    manifest = { version: 1, role, projectRef: REFS[role], startedAt: new Date().toISOString(), schema: metadata, encryption: 'AES-256-GCM+Windows-DPAPI', tables: [] };
    for (const table of TABLES) {
      phase = `${role}-snapshot-${table}`;
      const expected = Number((await client.query(`SELECT count(*)::text AS count FROM public.${quote(table)}`)).rows[0].count);
      const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      cipher.setAAD(Buffer.from(`${REFS[role]}:${table}`));
      const total = counters(), business = counters(), security = counters();
      async function* rows() {
        for await (const line of sqlLines(client, metadata, table)) {
          record(total, line);
          if (table === 'AuditLog') record(isBusinessAudit(line) ? business : security, line);
          yield line;
        }
      }
      await pipeline(Readable.from(rows()), zlib.createGzip(), cipher, nativeFs.createWriteStream(path.join(dir, `${table}.enc`), { flags: 'wx' }));
      const stats = finish(total);
      if (stats.count !== expected) fail('SNAPSHOT_ROW_COUNT_MISMATCH');
      manifest.tables.push({ table, ...stats, iv: iv.toString('hex'), tag: cipher.getAuthTag().toString('hex'), ...(table === 'AuditLog' ? { business: finish(business), security: finish(security) } : {}) });
      log({ phase: `${role}-snapshot`, table, rows: stats.count, readOnly: true });
    }
    await client.query('ROLLBACK');
    manifest.completedAt = new Date().toISOString();
    await fs.writeFile(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2), { flag: 'wx' });
  } finally { key.fill(0); await client.end().catch(() => {}); }
  await verifySnapshot(dir);
  await fs.writeFile(path.join(ROOT, `latest-${role}.json`), JSON.stringify({ directory: path.basename(dir) }));
  log({ phase: `${role}-snapshot-verified`, directory: dir, tables: manifest.tables.length, totalRows: manifest.tables.reduce((n, t) => n + t.count, 0), sourceConnectionClosed: true });
}

async function openSnapshot(dir, expectedRole) {
  const real = await fs.realpath(dir), root = await fs.realpath(ROOT);
  if (!real.startsWith(root + path.sep)) fail('BACKUP_PATH_OUTSIDE_PROTECTED_DIRECTORY');
  const manifest = JSON.parse(await fs.readFile(path.join(real, 'manifest.json'), 'utf8'));
  if (manifest.version !== 1 || !manifest.completedAt || !REFS[manifest.role] || manifest.projectRef !== REFS[manifest.role] || (expectedRole && manifest.role !== expectedRole)
    || manifest.tables.length !== TABLES.length || TABLES.some(table => manifest.tables.filter(t => t.table === table).length !== 1)) fail('BACKUP_MANIFEST_INVALID');
  const key = Buffer.from(dpapi(await fs.readFile(path.join(real, 'key.dpapi'), 'utf8'), true), 'base64');
  if (key.length !== 32) fail('BACKUP_KEY_INVALID');
  return { directory: real, manifest, key };
}

async function visitFile(backup, table, onLine) {
  const data = backup.manifest.tables.find(t => t.table === table);
  if (!data || !TABLES.includes(table)) fail('BACKUP_TABLE_MISSING');
  const decipher = crypto.createDecipheriv('aes-256-gcm', backup.key, Buffer.from(data.iv, 'hex'));
  decipher.setAAD(Buffer.from(`${backup.manifest.projectRef}:${table}`));
  decipher.setAuthTag(Buffer.from(data.tag, 'hex'));
  await pipeline(nativeFs.createReadStream(path.join(backup.directory, `${table}.enc`)), decipher, zlib.createGunzip(), async stream => {
    const decoder = new StringDecoder('utf8'); let pending = '';
    for await (const chunk of stream) {
      pending += decoder.write(chunk);
      let index;
      while ((index = pending.indexOf('\n')) >= 0) { const line = pending.slice(0, index + 1); pending = pending.slice(index + 1); await onLine(line); }
      if (pending.length > 64 * 1024 * 1024) fail('BACKUP_ROW_TOO_LARGE');
    }
    pending += decoder.end(); if (pending) fail('BACKUP_LINE_INCOMPLETE');
  });
}

async function verifySnapshot(dir) {
  const backup = await openSnapshot(dir);
  try {
    for (const table of backup.manifest.tables) {
      const stats = counters();
      await visitFile(backup, table.table, line => { JSON.parse(line); record(stats, line); });
      const found = finish(stats);
      if (found.count !== table.count || found.checksum !== table.checksum) fail('BACKUP_CHECKSUM_MISMATCH');
    }
  } finally { backup.key.fill(0); }
}

async function latest(role) {
  const pointer = JSON.parse(await fs.readFile(path.join(ROOT, `latest-${role}.json`), 'utf8'));
  if (path.basename(pointer.directory) !== pointer.directory) fail('BACKUP_POINTER_INVALID');
  const dir = path.join(ROOT, pointer.directory);
  await verifySnapshot(dir);
  return openSnapshot(dir, role);
}

async function sqlStats(client, metadata, table, where = '') {
  const stats = counters();
  for await (const line of sqlLines(client, metadata, table, where)) record(stats, line);
  return finish(stats);
}
function sameStats(actual, expected) { if (!expected || actual.count !== expected.count || actual.checksum !== expected.checksum) fail('RESTORE_DATA_VERIFICATION_FAILED'); }

async function importTable(client, backup, table, auditOnly = false) {
  if (client.cloneRole !== 'target' || client.cloneReadOnly) fail('DEV_WRITE_GUARD_FAILED');
  const columns = backup.manifest.schema.columns.filter(c => c.table_name === table).map(c => quote(c.name)).join(',');
  let batch = [], bytes = 0;
  const flush = async () => {
    if (!batch.length) return;
    await client.query(`INSERT INTO public.${quote(table)} (${columns}) SELECT ${columns} FROM json_populate_recordset(NULL::public.${quote(table)}, $1::json)`, ['[' + batch.join(',') + ']']);
    batch = []; bytes = 0;
  };
  await visitFile(backup, table, async line => {
    if (auditOnly && !isBusinessAudit(line)) return;
    batch.push(line.trimEnd()); bytes += Buffer.byteLength(line);
    if (batch.length >= 250 || bytes >= 1024 * 1024) await flush();
  });
  await flush();
}

async function verifyDev(client, metadata, source, previous) {
  const checks = [];
  for (const table of BUSINESS) { const actual = await sqlStats(client, metadata, table); sameStats(actual, source.manifest.tables.find(t => t.table === table)); checks.push({ table, rows: actual.count, checksumMatch: true }); }
  sameStats(await sqlStats(client, metadata, 'AuditLog', AUDIT_BUSINESS), source.manifest.tables.find(t => t.table === 'AuditLog').business);
  sameStats(await sqlStats(client, metadata, 'AuditLog', AUDIT_SECURITY), previous.manifest.tables.find(t => t.table === 'AuditLog').security);
  sameStats(await sqlStats(client, metadata, 'User'), previous.manifest.tables.find(t => t.table === 'User'));
  return checks;
}

async function restoreDev(apply) {
  if (!apply) fail('EXPLICIT_APPLY_REQUIRED');
  const source = await latest('source'), previous = await latest('target');
  let client;
  try {
    assertSchemas(source.manifest.schema, previous.manifest.schema);
    client = await connect('target', false);
    if (client.cloneRole !== 'target' || client.cloneReadOnly) fail('DEV_WRITE_GUARD_FAILED');
    await client.query(`LOCK TABLE ${TABLES.map(t => `public.${quote(t)}`).join(',')} IN ACCESS EXCLUSIVE MODE`);
    const current = await schema(client);
    assertSchemas(source.manifest.schema, current);
    // Abort if dev changed since its verified recovery snapshot.
    for (const table of TABLES) sameStats(await sqlStats(client, current, table), previous.manifest.tables.find(t => t.table === table));
    phase = 'restoring-development-only';
    await client.query(`TRUNCATE TABLE ${BUSINESS.map(t => `public.${quote(t)}`).join(',')}`);
    await client.query(`DELETE FROM public."AuditLog" WHERE ${AUDIT_BUSINESS}`);
    for (const table of BUSINESS) { await importTable(client, source, table); log({ phase, table, rows: source.manifest.tables.find(t => t.table === table).count }); }
    await importTable(client, source, 'AuditLog', true);
    const checks = await verifyDev(client, current, source, previous);
    commitAttempted = true;
    await client.query('COMMIT'); committed = true;
    await client.end(); client = null;
    // Independent connection verifies committed state, without ever reconnecting to production.
    client = await connect('target', true);
    await verifyDev(client, await schema(client), source, previous);
    await client.query('ROLLBACK');
    const receipt = { completedAt: new Date().toISOString(), sourceSnapshot: source.directory, devRecoverySnapshot: previous.directory, sourceRef: REFS.source, targetRef: REFS.target,
      dataChecks: checks, businessAuditRows: source.manifest.tables.find(t => t.table === 'AuditLog').business.count,
      devUsersPreserved: previous.manifest.tables.find(t => t.table === 'User').count, devSecurityAuditRowsPreserved: previous.manifest.tables.find(t => t.table === 'AuditLog').security.count,
      productionConnectionsDuringRestore: 0, storageOperations: 0, verifiedAfterCommit: true };
    await fs.writeFile(path.join(ROOT, 'clone-receipt.json'), JSON.stringify(receipt, null, 2));
    log(receipt);
  } catch (error) {
    if (client && !committed) await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally { source.key.fill(0); previous.key.fill(0); if (client) await client.end().catch(() => {}); }
}

async function main() {
  verifiedConnection('source'); verifiedConnection('target');
  await protectedDirectory();
  const command = process.argv[2];
  phase = command || 'unknown';
  if (command === 'snapshot-source') return snapshot('source');
  if (command === 'backup-dev') return snapshot('target');
  if (command === 'restore-dev') return restoreDev(process.argv.includes('--apply'));
  fail('INVALID_CLONE_COMMAND');
}
if (require.main === module) main().catch(error => {
  const code = error.safeCode || error.code;
  console.error(JSON.stringify({ phase, code: /^[A-Z0-9_]+$/.test(code || '') ? code : 'CLONE_FAILED', developmentCommitConfirmed: committed, developmentCommitAttempted: commitAttempted,
    errorType: error.name, scriptLocations: (error.stack || '').split('\n').slice(1, 4).filter(line => line.includes('db-clone-data.cjs')).map(line => line.trim()),
    message: committed ? 'Dev sudah commit; verifikasi akhir perlu diperiksa sebelum mengulang.' : commitAttempted ? 'Status commit dev belum pasti; jangan ulang restore sebelum memeriksa hasil.' : 'Proses belum selesai. Tidak ada perintah tulis prod. Restore dev yang gagal sebelum commit dibatalkan.' }));
  process.exitCode = 1;
});
module.exports = { assertSchemas, connect, sameStats, isBusinessAudit, importTable, BUSINESS, SECURITY, dpapi };
