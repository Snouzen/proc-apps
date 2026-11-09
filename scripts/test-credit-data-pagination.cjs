const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const repo = path.resolve(__dirname, '..'), ts = require(path.join(repo, 'node_modules/typescript'));
process.env.TZ = 'Asia/Bangkok';
function loader(mocks = {}) {
  const cache = new Map();
  return function load(file) {
    if (cache.has(file)) return cache.get(file);
    const actual = path.join(repo, file), loadedModule = { exports: {} };
    const code = ts.transpileModule(fs.readFileSync(actual, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    new Function('require', 'module', 'exports', code)(id => id in mocks ? mocks[id] : id.startsWith('@/') ? load('src/' + id.slice(2) + '.ts') : id.startsWith('.') ? load(path.relative(repo, path.resolve(path.dirname(actual), id + '.ts'))) : require(require.resolve(id, { paths: [repo] })), loadedModule, loadedModule.exports);
    cache.set(file, loadedModule.exports); return loadedModule.exports;
  };
}
function matches(row, where) {
  return Object.entries(where).every(([field, rule]) => {
    if (field === 'AND') return (Array.isArray(rule) ? rule : [rule]).every(item => matches(row, item));
    if (field === 'OR') return rule.some(item => matches(row, item));
    if (field === 'NOT') return !(Array.isArray(rule) ? rule : [rule]).some(item => matches(row, item));
    const actual = row?.[field];
    if (rule === null || typeof rule !== 'object' || rule instanceof Date) return actual === rule;
    if ('is' in rule) return actual != null && matches(actual, rule.is);
    if ('isNot' in rule) return actual == null || !matches(actual, rule.isNot);
    if ('some' in rule) return (actual || []).some(item => matches(item, rule.some));
    if (!Object.keys(rule).some(op => ['in', 'notIn', 'not', 'equals', 'contains', 'gte', 'lt', 'lte'].includes(op))) return actual != null && matches(actual, rule);
    const norm = value => rule.mode === 'insensitive' && typeof value === 'string' ? value.toLowerCase() : value;
    return Object.entries(rule).every(([op, value]) => {
      if (op === 'mode') return true;
      if (op === 'equals') return norm(actual) === norm(value);
      if (op === 'not') return actual !== value;
      if (op === 'in') return value.some(v => norm(v) === norm(actual));
      if (op === 'notIn') return !value.some(v => norm(v) === norm(actual));
      if (op === 'contains') return typeof actual === 'string' && norm(actual).includes(norm(value));
      if (op === 'gte') return actual != null && new Date(actual) >= new Date(value);
      if (op === 'lt') return actual != null && new Date(actual) < new Date(value);
      if (op === 'lte') return actual != null && new Date(actual) <= new Date(value);
      throw Error('Unhandled predicate ' + op);
    });
  });
}
const common = loader({ '@/lib/ttl-cache': { cacheGet: () => undefined } });
const { getBusinessStartOfToday } = common('src/lib/utils/dates.ts');
const { getDueDateZone, needsRemarks } = common('src/lib/credit-limit.ts');
const today = getBusinessStartOfToday();
const due = day => day === null ? null : new Date(today.getTime() + day * 86400000 + 12 * 3600000).toISOString();
const offsets = [-31, -15, -14, -8, -7, 0, 7, 8, 30, 31, null];
const statuses = [null, '', 'REJECTED', 'REQUESTED', 'APPROVED', 'APPROVED_DIREKSI'];
const units = [{ idRegional: 'SKH', siteArea: 'SPB SUKOHARJO', namaRegional: 'REGIONAL 2 SURABAYA' }, { idRegional: 'BDG', siteArea: 'SPB BANDUNG', namaRegional: 'REGIONAL 1 BANDUNG' }];
const rows = Array.from({ length: 5037 }, (_, i) => ({ id: String(i).padStart(6, '0'), noPo: 'PO-' + i, tglPo: new Date('2026-10-01T12:00:00Z'), tglkirim: '2026-10-05T12:00:00Z', noInvoice: null, expiredTgl: due(offsets[i % offsets.length]), statusCreditLimit: statuses[i % statuses.length], unitProduksiId: units[i % 2].idRegional, UnitProduksi: units[i % 2], RitelModern: { namaPt: i % 3 ? 'COMPANY A' : 'COMPANY B', inisial: i % 4 ? 'ALIAS A' : 'ALIAS B' }, tujuanDetail: i % 2 ? 'DC BANDUNG' : 'DC SOLO', CreditLimitBatch: { batchCode: 'CL-001' }, kodeVendor: 'VENDOR-1', Items: [] }));
rows.push({ ...rows[0], id: 'INVOICED', noInvoice: 'INV-1' }, { ...rows[0], id: 'UNSCHEDULED', tglkirim: null }, { ...rows[0], id: 'UNKNOWN', unitProduksiId: 'UNKNOWN' });
function fixture(role = 'pusat', customRows = rows) {
  const calls = { pages: [], itemIds: [], mutations: 0 };
  let authorized = true, authenticated = true;
  const db = {
    unitProduksi: { findMany: async () => units },
    purchaseOrder: {
      findMany: async query => { calls.pages.push(query); const filtered = customRows.filter(row => matches(row, query.where)); filtered.sort((a, b) => a.id.localeCompare(b.id)); return filtered.slice(query.skip, query.skip + query.take); },
      count: async ({ where }) => customRows.filter(row => matches(row, where)).length,
    },
    purchaseOrderItem: { findMany: async ({ where }) => { calls.itemIds.push(where.purchaseOrderId.in); return where.purchaseOrderId.in.map(id => ({ id: 'ITEM-' + id, purchaseOrderId: id, pcs: 100, pcsKirim: 0, rpTagih: 0, nominal: 10000, hargaPcs: 100, discount: 0, Product: { name: 'PRODUCT', satuanKg: 5 } })); } },
  };
  const auth = { role, safeRole: role, session: {}, dbUser: { regional: 'REGIONAL 2 SURABAYA', siteArea: 'SPB SUKOHARJO' } };
  const load = loader({ '@/lib/prisma': { __esModule: true, default: db }, '@/lib/ttl-cache': { cacheGet: () => undefined }, '@/lib/auth': { getSessionWithRole: async () => authenticated ? auth : null }, '@/lib/accessControl': { hasPermission: async () => authorized } });
  return { auth, calls, load, service: load('src/app/api/po/services/creditLimitDataListService.ts'), deny: () => { authorized = false; }, logout: () => { authenticated = false; } };
}
const tests = [], test = (name, run) => tests.push([name, run]);
test('Only ten PO and ten item groups fetched; total includes all 5037 eligible records', async () => { const f = fixture(), result = await f.service.getCreditLimitDataPage(new URLSearchParams(), f.auth); assert.equal(result.data.length, 10); assert.equal(result.total, 5037); assert.equal(result.stats.total, 5037); assert.equal(f.calls.pages.length, 1); assert.equal(f.calls.pages[0].take, 10); assert.equal(f.calls.itemIds[0].length, 10); assert(result.data.every(po => po.pcsKirimTotal === 0)); });
test('Next page loads a new ten records; data beyond old 5000 cap remains reachable', async () => { const f = fixture(), first = await f.service.getCreditLimitDataPage(new URLSearchParams(), f.auth), next = await f.service.getCreditLimitDataPage(new URLSearchParams({ page: '2' }), f.auth), beyond = await f.service.getCreditLimitDataPage(new URLSearchParams({ page: '501' }), f.auth); assert.equal(f.calls.pages[1].skip, 10); assert.equal(beyond.data.length, 10); assert(!first.data.some(x => next.data.some(y => x.id === y.id))); });
for (const tab of ['pending', 'outdate']) test('Server ' + tab + ' predicate/count matches former client filtering across all records', async () => { const f = fixture(), expected = rows.slice(0, 5037).filter(po => (!po.statusCreditLimit || po.statusCreditLimit === 'REJECTED') && (tab === 'pending' ? getDueDateZone(po.expiredTgl) === 'normal' : needsRemarks(getDueDateZone(po.expiredTgl)))), result = await f.service.getCreditLimitDataPage(new URLSearchParams({ tab }), f.auth); assert.equal(result.total, expected.length); assert(result.data.every(po => expected.some(x => x.id === po.id))); assert.equal(result.stats.total, 5037); assert.equal(tab === 'pending' ? result.stats.normal : result.stats.remarksNeeded, expected.length); });
test('Due-date boundary predicates match existing helper, including null and all edge days', () => { const f = fixture(), zones = f.service.creditLimitDateFilters(today); for (const offset of offsets) { const row = { expiredTgl: due(offset) }; assert.equal(matches(row, zones.normal), getDueDateZone(row.expiredTgl) === 'normal', String(offset)); assert.equal(matches(row, zones.remarksNeeded), needsRemarks(getDueDateZone(row.expiredTgl)), String(offset)); } });
for (const [status, value] of [['WAITING_PUSAT', 'REQUESTED'], ['WAITING_DIREKSI', 'APPROVED'], ['COMPLETED', 'APPROVED_DIREKSI']]) test('Status ' + status + ' filters all records before take/skip', async () => { const f = fixture(), result = await f.service.getCreditLimitDataPage(new URLSearchParams({ status }), f.auth); assert(result.data.every(row => row.statusCreditLimit === value)); assert.equal(result.total, rows.slice(0, 5037).filter(row => row.statusCreditLimit === value).length); });
test('Company + inisial + tujuan remain independent and conjunctive', async () => { const f = fixture(), result = await f.service.getCreditLimitDataPage(new URLSearchParams({ company: 'COMPANY A', inisial: 'ALIAS B', tujuan: 'DC SOLO' }), f.auth); assert.equal(result.total, rows.slice(0, 5037).filter(po => po.RitelModern.namaPt === 'COMPANY A' && po.RitelModern.inisial === 'ALIAS B' && po.tujuanDetail === 'DC SOLO').length); assert(result.data.every(po => po.RitelModern.inisial === 'ALIAS B')); });
test('Search reaches records beyond first page; other cards retain global scoped totals', async () => { const f = fixture(), result = await f.service.getCreditLimitDataPage(new URLSearchParams({ q: 'PO-5036' }), f.auth); assert.equal(result.total, 1); assert.equal(result.data[0].noPo, 'PO-5036'); assert.equal(result.stats.total, 5037); });
for (const role of ['rm', 'sitearea']) test(role + ' rows, totals and cards retain authenticated unit scope', async () => { const f = fixture(role), result = await f.service.getCreditLimitDataPage(new URLSearchParams({ regional: 'REGIONAL 1 BANDUNG', siteArea: 'SPB BANDUNG' }), f.auth); assert.equal(result.total, 2519); assert.equal(result.stats.total, 2519); assert(result.data.every(po => po.unitProduksiId === 'SKH')); });
for (const args of [{ page: '0' }, { page: '-1' }, { page: '1.5' }, { page: '2147483647', pageSize: '100' }, { pageSize: '101' }, { tab: 'bad' }, { status: 'bad' }, { status: '__proto__' }, { colFilters: '{bad' }]) test('Invalid paging/filter parameters rejected: ' + JSON.stringify(args), async () => { const f = fixture(); await assert.rejects(f.service.getCreditLimitDataPage(new URLSearchParams(args), f.auth), /INVALID_CREDIT_DATA_QUERY/); assert.equal(f.calls.pages.length, 0); });
test('PO date and header vendor filter operate before paging while cards remain global', async () => { const f = fixture(), result = await f.service.getCreditLimitDataPage(new URLSearchParams({ tglFrom: '2026-10-02', tglTo: '2026-10-31', colFilters: JSON.stringify({ kodeVendor: 'VENDOR-1' }), sort: 'expiredTgl_asc' }), f.auth); assert.equal(result.total, 0); assert.equal(result.stats.total, 5037); assert.deepEqual(f.calls.pages[0].orderBy, [{ expiredTgl: 'asc' }, { id: 'asc' }]); });
test('GET endpoint enforces auth/permission and no-store without touching submission/approval', async () => { const f = fixture(), route = f.load('src/app/api/po/credit-limit/data/route.ts'), ok = await route.GET(new Request('http://local/api/po/credit-limit/data')); assert.equal(ok.status, 200); assert.equal(ok.headers.get('cache-control'), 'private, no-store'); f.deny(); assert.equal((await route.GET(new Request('http://local/api/po/credit-limit/data'))).status, 403); f.logout(); assert.equal((await route.GET(new Request('http://local/api/po/credit-limit/data'))).status, 401); assert.equal(f.calls.pages.length, 1); });
(async () => { let passed = 0; for (const [name, run] of tests) { try { await run(); passed++; console.log('PASS ' + name); } catch (error) { process.exitCode = 1; console.error('FAIL ' + name, error); } } console.log(passed + '/' + tests.length + ' passed; real list service/query/summary/scope with mocked database, no production writes'); })();
