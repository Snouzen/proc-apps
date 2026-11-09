const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), ts = require(path.join(root, 'node_modules/typescript')), XLSX = require('xlsx');
function loader(mocks) {
  const cache = new Map();
  return function load(file) {
    if (cache.has(file)) return cache.get(file);
    const actual = path.join(root, file), loadedModule = { exports: {} };
    const code = ts.transpileModule(fs.readFileSync(actual, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    new Function('require', 'module', 'exports', code)(id => id in mocks ? mocks[id] : id.startsWith('@/') ? load('src/' + id.slice(2) + '.ts') : id.startsWith('.') ? load(path.relative(root, path.resolve(path.dirname(actual), id + '.ts'))) : require(require.resolve(id, { paths: [root] })), loadedModule, loadedModule.exports);
    cache.set(file, loadedModule.exports); return loadedModule.exports;
  };
}
function matches(row, where) {
  return Object.entries(where).every(([key, rule]) => {
    if (key === 'AND') return (Array.isArray(rule) ? rule : [rule]).every(r => matches(row, r));
    if (key === 'OR') return rule.some(r => matches(row, r));
    if (key === 'NOT') return !(Array.isArray(rule) ? rule : [rule]).some(r => matches(row, r));
    const value = row[key];
    if (rule === null || typeof rule !== 'object') return value === rule;
    if ('some' in rule) return value.some(r => matches(r, rule.some));
    if ('is' in rule) return value && matches(value, rule.is);
    const norm = v => rule.mode === 'insensitive' && typeof v === 'string' ? v.toLowerCase() : v;
    if ('contains' in rule) return typeof value === 'string' && norm(value).includes(norm(rule.contains));
    if ('equals' in rule) return norm(value) === norm(rule.equals);
    if ('in' in rule) return rule.in.includes(value);
    if ('not' in rule) return value !== rule.not;
    if ('gte' in rule || 'lt' in rule) return (!rule.gte || new Date(value) >= rule.gte) && (!rule.lt || new Date(value) < rule.lt);
    if (value && typeof value === 'object') return matches(value, rule);
    return false;
  });
}
const actor = { id: 'ADMIN', name: 'Admin', role: 'pusat' };
function fixture({ status = 'APPROVED', size = 50, nd = 'ND-1', role = 'pusat', permission = true, authenticated = true, auditFailure = false, conflict = false } = {}) {
  let rows = Array.from({ length: size }, (_, i) => ({ id: 'P' + String(i).padStart(3, '0'), noPo: 'PO-' + i, noNd: nd, linkNd: null, isNotaDinas: false, updatedAt: new Date('2026-11-01'), statusCreditLimit: status, creditLimitBatchId: 'B1' }));
  let batch = { id: 'B1', batchCode: 'CL-001/11/2026', status: 'OPEN' }, audits = [], tail = Promise.resolve();
  const calls = { locks: [], options: [], reads: 0 };
  const db = {
    $executeRaw: async (strings) => calls.locks.push(strings.join('')),
    $queryRaw: async sql => { calls.locks.push(sql.strings.join('')); return []; },
    creditLimitBatch: { findUnique: async ({ where }) => batch.id === where.id ? structuredClone(batch) : null, update: async ({ data }) => Object.assign(batch, data) },
    purchaseOrder: { findMany: async ({ where, take }) => { calls.reads++; return structuredClone(rows.filter(row => matches(row, where)).slice(0, take)); },
      updateMany: async ({ where, data }) => { if (conflict) return { count: 0 }; const target = rows.filter(row => matches(row, where)); target.forEach(row => Object.assign(row, data)); return { count: target.length }; },
      count: async ({ where }) => rows.filter(row => matches(row, where)).length },
    auditLog: { createMany: async ({ data }) => { if (auditFailure) throw Error('audit unavailable'); audits.push(...data); return { count: data.length }; } },
  };
  db.$transaction = (fn, options) => {
    const run = tail.then(async () => { calls.options.push(options); const before = structuredClone({ rows, batch, audits }); try { return await fn(db); } catch (error) { rows = before.rows; batch = before.batch; audits = before.audits; throw error; } });
    tail = run.catch(() => {}); return run;
  };
  const load = loader({ '@/lib/prisma': { __esModule: true, default: db }, '../../../../../server/generated/prisma': { Prisma: { sql: (strings, ...values) => ({ strings, values }) } },
    '@/lib/audit': { sanitizeAuditData: value => value }, '@/lib/auth': { getSessionWithRole: async () => authenticated ? { role, dbUser: { id: 'ADMIN' }, session: {} } : null, getProfileName: () => 'Admin' },
    '@/lib/accessControl': { hasPermission: async () => permission }, '@/app/api/po/services/creditApprovalListService': {} });
  return { service: load('src/app/api/po/services/creditApprovalActionService.ts'), route: load('src/app/api/po/credit-limit/approval/route.ts'), calls, get rows() { return rows; }, get audits() { return audits; }, get batch() { return batch; } };
}
const check = (f, stage = 'direksi', extra = {}) => f.service.processApprovalBatch({ batchId: 'B1', mode: 'check', stage, ...extra }, actor);
const approve = (f, snapshot, stage = 'direksi', extra = {}) => f.service.processApprovalBatch({ batchId: 'B1', mode: 'approve', stage, expectedSnapshot: snapshot, ...extra }, actor);
const tests = [], test = (name, fn) => tests.push([name, fn]);
test('Read-only Direksi check covers all 50 PO without loading detail; no checkbox/link requirement', async () => { const f = fixture(), r = await check(f); assert.equal(r.total, 50); assert.equal(r.targetCount, 50); assert(r.ready); assert.equal(f.audits.length, 0); assert.equal(f.calls.locks.length, 0); assert.equal(f.calls.options[0].isolationLevel, 'RepeatableRead'); });
for (const nd of [null, '', '   ']) test('Missing No ND ' + JSON.stringify(nd) + ' blocks Direksi commit', async () => { const f = fixture({ nd }), r = await check(f); assert(!r.ready); assert.equal(r.missingNdCount, 50); await assert.rejects(approve(f, r.snapshot), e => e.status === 400 && e.code === 'APPROVAL_ND_REQUIRED'); assert(f.rows.every(row => row.statusCreditLimit === 'APPROVED')); assert.equal(f.audits.length, 0); });
for (const [stage, status, next] of [['pusat', 'REQUESTED', 'APPROVED'], ['direksi', 'APPROVED', 'APPROVED_DIREKSI']]) test(stage + ' commits full batch atomically with 50 audit rows and shared allocation/ordered row locks', async () => { const f = fixture({ status, nd: stage === 'pusat' ? null : 'ND-1' }), r = await check(f, stage), done = await approve(f, r.snapshot, stage); assert.equal(done.count, 50); assert(f.rows.every(row => row.statusCreditLimit === next)); assert.equal(f.audits.length, 50); assert.equal(new Set(f.audits.map(a => a.entityId)).size, 50); assert(f.calls.locks[0].includes('718293')); assert(f.calls.locks[1].includes('ORDER BY id ASC FOR UPDATE')); assert.equal(f.batch.status, stage === 'pusat' ? 'OPEN' : 'CLOSED'); assert.equal(f.calls.options.at(-1).timeout, 15000); });
for (const field of ['noNd', 'statusCreditLimit', 'membership', 'updatedAt']) test('Change ' + field + ' after preflight rejected as 409 with zero mutations', async () => { const f = fixture(), r = await check(f); if (field === 'membership') f.rows[0].creditLimitBatchId = 'B2'; else f.rows[0][field] = field === 'updatedAt' ? new Date('2026-11-02') : field === 'noNd' ? 'ND-NEW' : 'APPROVED_DIREKSI'; await assert.rejects(approve(f, r.snapshot), e => e.status === 409); assert.equal(f.audits.length, 0); });
test('Single Direksi validates selected PO; missing ND in another PO does not change existing single rule', async () => { const f = fixture(); f.rows[1].noNd = null; const r = await check(f, 'direksi', { poId: 'P000' }); assert(r.ready); const done = await approve(f, r.snapshot, 'direksi', { poId: 'P000' }); assert.equal(done.count, 1); assert.equal(f.rows[0].statusCreditLimit, 'APPROVED_DIREKSI'); assert.equal(f.rows[1].statusCreditLimit, 'APPROVED'); assert.equal(f.batch.status, 'OPEN'); });
for (const size of [0, 51]) test('Empty/oversized batch ' + size + ' blocked', async () => { const f = fixture({ size }); await assert.rejects(check(f), e => e.code === 'APPROVAL_BATCH_INVALID'); assert.equal(f.audits.length, 0); });
for (const status of ['REQUESTED', 'APPROVED_DIREKSI', null]) test('Direksi invalid source ' + status + ' never mutated', async () => { const f = fixture({ status }); await assert.rejects(check(f), e => e.status === 409); assert.equal(f.audits.length, 0); });
test('Mixed batch status keeps existing all-source validation', async () => { const f = fixture({ status: 'REQUESTED' }); f.rows[0].statusCreditLimit = 'APPROVED'; await assert.rejects(check(f, 'pusat'), e => e.status === 409); assert.equal(f.audits.length, 0); });
for (const options of [{ auditFailure: true }, { conflict: true }]) test('Failure ' + JSON.stringify(options) + ' rolls back status and audit', async () => { const f = fixture(options), r = await check(f); await assert.rejects(approve(f, r.snapshot)); assert(f.rows.every(row => row.statusCreditLimit === 'APPROVED')); assert.equal(f.audits.length, 0); assert.equal(f.batch.status, 'OPEN'); });
test('Parallel duplicate commits with same snapshot mutate once under simulated transaction serialization', async () => { const f = fixture(), r = await check(f), outcomes = await Promise.allSettled([approve(f, r.snapshot), approve(f, r.snapshot)]); assert.equal(outcomes.filter(o => o.status === 'fulfilled').length, 1); assert.equal(outcomes.find(o => o.status === 'rejected').reason.status, 409); assert.equal(f.audits.length, 50); });
const request = body => new Request('http://local/api/po/credit-limit/approval', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
for (const options of [{ authenticated: false }, { role: 'rm' }, { role: 'sitearea' }, { permission: false }]) test('POST denies ' + JSON.stringify(options) + ' before DB reads', async () => { const f = fixture(options), r = await f.route.POST(request({ batchId: 'B1', mode: 'check', stage: 'direksi' })); assert.equal(r.status, options.authenticated === false ? 401 : 403); assert.equal(f.calls.reads, 0); });
for (const body of [{}, { batchId: 'B1', mode: 'approve', stage: 'direksi' }, { batchId: 'B1', mode: 'check', stage: 'invalid' }]) test('Malformed action rejected ' + JSON.stringify(body), async () => { const f = fixture(), r = await f.route.POST(request(body)); assert.equal(r.status, 400); assert.equal(f.calls.reads, 0); });
test('HTTP flow check/commit returns no-store and stale retry returns 409', async () => { const f = fixture(); const checked = await f.route.POST(request({ batchId: 'B1', mode: 'check', stage: 'direksi' })); const snapshot = (await checked.json()).snapshot; const body = { batchId: 'B1', mode: 'approve', stage: 'direksi', expectedSnapshot: snapshot }; const r = await f.route.POST(request(body)); assert.equal(r.status, 200); assert.equal(r.headers.get('cache-control'), 'private, no-store'); assert.equal((await r.json()).count, 50); assert.equal((await f.route.POST(request(body))).status, 409); });
function exportFixture({ role = 'pusat', authenticated = true, extra = 0, failure = false } = {}) {
  const batches = Array.from({ length: 120 }, (_, i) => ({ id: 'B' + i, batchCode: 'CL-' + String(i).padStart(3, '0'), _count: { PurchaseOrders: 50 + (i === 0 ? extra : 0) } }));
  const orders = batches.flatMap((b, index) => Array.from({ length: b._count.PurchaseOrders }, (_, i) => ({ id: b.id + 'P' + i, creditLimitBatchId: b.id, noPo: b.id + 'PO' + i, noNd: 'ND', tujuanDetail: 'DC A', unitProduksiId: 'UNIT-A', tglPo: '2026-11-01', statusCreditLimit: 'APPROVED', RitelModern: { namaPt: index === 119 && i === 0 ? 'NEEDLE' : 'COMPANY A', inisial: 'A' }, UnitProduksi: { siteArea: 'SPB DKI' }, CreditLimitBatch: { batchCode: b.batchCode }, Items: [{ pcs: 10, pcsKirim: 3, nominal: 100 }, { pcs: 20, pcsKirim: 7, nominal: 200 }] })));
  batches.forEach(b => b.PurchaseOrders = orders.filter(p => p.creditLimitBatchId === b.id));
  const calls = { batches: [], orders: [], options: null };
  const db = { creditLimitBatch: { findMany: async q => { calls.batches.push(q); const filtered = batches.filter(b => matches(b, q.where)).sort((a,b) => b.batchCode.localeCompare(a.batchCode)); const start = q.cursor ? filtered.findIndex(b => b.id === q.cursor.id) + 1 : 0; return filtered.slice(start, start + q.take); } }, purchaseOrder: { findMany: async q => { calls.orders.push(q); return orders.filter(p => matches(p, q.where)).slice(0, q.take); } } };
  db.$transaction = async (fn, options) => { calls.options = options; if (failure) throw Error('DB unavailable'); return fn(db); };
  const load = loader({ '@/lib/prisma': { __esModule: true, default: db }, '../../../../../server/generated/prisma': {}, '@/app/api/po/services/poQueryBuilder': { buildPOQueryParams: params => ({ where: params.get('q') ? { RitelModern: { is: { namaPt: params.get('q') } } } : {} }) }, '@/lib/auth': { getSessionWithRole: async () => authenticated ? { role } : null } });
  return { calls, service: load('src/app/api/po/services/creditApprovalExportService.ts'), route: load('src/app/api/po/credit-limit/approval/export/route.ts') };
}
function readRows(file) { const workbook = XLSX.read(file, { type: 'array' }); return XLSX.utils.sheet_to_json(workbook.Sheets['Approval PO']); }
test('Server export formats dates in WIB including UTC evening boundary', () => { const helpers=loader({})('src/lib/creditApprovalExport.ts');const row=helpers.approvalExportRow({tglPo:'2026-10-31T18:00:00Z',tglkirim:'2026-11-01T17:00:00Z'},0);assert.equal(row['Tgl PO'],'01/11/2026');assert.equal(row['Tgl Kirim'],'02/11/2026'); });
test('Full export contains all 6000 POs from 120 unopened batches with numeric totals; bounded queries and consistent snapshot', async () => { const f = exportFixture(), result = await f.service.exportApprovalBatches(new URLSearchParams({ page: '1', limit: '10' })), rows = readRows(result.file); assert.equal(rows.length, 6001); assert.equal(new Set(rows.slice(0,-1).map(r => r['No PO'])).size, 6000); assert.equal(rows.at(-1)['Pcs Total'], 180000); assert.equal(rows.at(-1)['Pcs Kirim'], 60000); assert.equal(rows.at(-1).Nominal, 1800000); assert(f.calls.batches.every(q => q.take === 20)); assert(f.calls.orders.every(q => q.take === 1001 && q.where.creditLimitBatchId.in.length <= 20)); assert.equal(f.calls.options.isolationLevel, 'RepeatableRead'); });
test('Single-batch export includes exactly 50 PO plus subtotal even if not opened', async () => { const f = exportFixture(), result = await f.service.exportApprovalBatches(new URLSearchParams({ batchId: 'B1' })); assert.equal(readRows(result.file).length, 51); assert(result.filename.includes('CL-001')); });
test('Filter finds batch outside first page and exports all 50 batch PO, not just the one matching PO', async () => { const f = exportFixture(), result = await f.service.exportApprovalBatches(new URLSearchParams({ q: 'NEEDLE' })), rows = readRows(result.file); assert.equal(rows.length, 51); assert(rows.slice(0,-1).every(r => r.Batch === 'CL-119')); });
test('Unknown batch and zero matches return no empty workbook', async () => { const f = exportFixture(); await assert.rejects(f.service.exportApprovalBatches(new URLSearchParams({ batchId: 'missing' })), /APPROVAL_BATCH_NOT_FOUND/); await assert.rejects(f.service.exportApprovalBatches(new URLSearchParams({ q: 'NO-MATCH' })), /APPROVAL_EXPORT_EMPTY/); });
test('Over-cap batch aborts export instead of truncating', async () => { const f = exportFixture({ extra: 1 }); await assert.rejects(f.service.exportApprovalBatches(new URLSearchParams()), /APPROVAL_BATCH_INCOMPLETE/); });
for (const options of [{ authenticated: false }, { role: 'rm' }, { role: 'sitearea' }]) test('Export denies ' + JSON.stringify(options) + ' before DB reads', async () => { const f = exportFixture(options), r = await f.route.GET(new Request('http://local/api/po/credit-limit/approval/export')); assert.equal(r.status, options.authenticated === false ? 401 : 403); assert.equal(f.calls.batches.length, 0); });
test('Download HTTP response is a valid XLSX attachment with no-store', async () => { const f = exportFixture(), r = await f.route.GET(new Request('http://local/api/po/credit-limit/approval/export?batchId=B1')); assert.equal(r.status, 200); assert(r.headers.get('content-type').includes('spreadsheetml')); assert(r.headers.get('content-disposition').includes('.xlsx')); assert.equal(r.headers.get('cache-control'), 'private, no-store'); assert.equal(readRows(new Uint8Array(await r.arrayBuffer())).length, 51); });
test('Database failure returns JSON 503 rather than a partial Excel file', async () => { const f = exportFixture({ failure: true }), r = await f.route.GET(new Request('http://local/api/po/credit-limit/approval/export')); assert.equal(r.status, 503); assert.equal((await r.json()).code, 'APPROVAL_EXPORT_FAILED'); });
(async () => { let pass = 0; for (const [name, run] of tests) { try { await run(); pass++; console.log('PASS ' + name); } catch (error) { process.exitCode = 1; console.error('FAIL ' + name, error); } } console.log(pass + '/' + tests.length + ' passed; actual services/routes and in-memory XLSX roundtrip, mocked DB transactions, no production writes'); })();
