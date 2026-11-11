const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), ts = require('typescript');
const root = path.resolve(__dirname, '..');
function load(file, mocks) {
  const loaded = { exports: {} }, code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  new Function('require', 'module', 'exports', code)(name => {
    if (name in mocks) return mocks[name];
    if (name === '@/lib/utils/regional') return load('src/lib/utils/regional.ts', {});
    throw Error('Unexpected import ' + name);
  }, loaded, loaded.exports); return loaded.exports;
}
const unit = (site = 'SPB DKI', reg = 'REGIONAL 1 BANDUNG') => ({ idRegional: site, siteArea: site, namaRegional: reg });
const po = (id, site = 'SPB DKI') => ({ id, noPo: 'PO-' + id, unitProduksiId: site, UnitProduksi: unit(site), regional: 'REGIONAL 1 BANDUNG', createdAt: '2026-01-01T00:00:00Z', RitelModern: { namaPt: 'RITEL' }, Items: [] });
function fixture(entity, entityId = 'REC', patch = {}) {
  const log = { id: 'A1', entity, entityId, action: 'CREATE', userRole: 'LATEST-ACTOR', createdAt: '2026-11-01T01:00:00Z', newData: null, ...patch };
  let permitted = true, fail = false;
  const rows = { PurchaseOrder: [po('REC')], DataRetur: [{ id: 'REC', rtvCn: 'RTV-1', createdAt: '2026-10-01T00:00:00Z', qtyReturn: 4, produk: 'PRODUK', statusBarang: null, LokasiBarang: unit(), lokasiBarangId: 'SPB DKI' }], Reconcile: [{ id: 'REC', noRekonsiliasi: 'R-001/10/2026', createdAt: '2026-10-01T00:00:00Z', bankStatement: 1000, nominal: -123.45, totalInvoices: 90000, RitelModern: { namaPt: 'RITEL' }, invoices: ['I-1'], rtvs: [] }], CreditLimitBatch: [{ id: 'REC', batchCode: 'CL-1/10/2026', createdAt: '2026-10-01T00:00:00Z', PurchaseOrders: [po('P1'), po('P2')] }] };
  const calls = [];
  const db = { auditLog: {
    findUnique: async () => { if (fail) throw Error('INTERNAL SQL SECRET'); return log; },
    findFirst: async () => ({ userRole: 'ORIGINAL', createdAt: '2026-09-30T00:00:00Z' }),
    findMany: async args => { calls.push(args); return (args.where.entityId?.in || []).map(id => ({ entityId: id, userRole: 'FIRST-REQUESTER', createdAt: '2026-10-01T01:00:00Z' })); },
  } };
  for (const [key, model] of [['PurchaseOrder', 'purchaseOrder'], ['DataRetur', 'dataRetur'], ['Reconcile', 'reconcile'], ['CreditLimitBatch', 'creditLimitBatch']]) db[model] = { findUnique: async args => rows[key].find(r => r.id === args.where.id) || null, findMany: async args => rows[key].filter(r => args.where.id.in.includes(r.id)) };
  const service = load('src/app/api/activities/activityDetailService.ts', { '@/lib/prisma': { __esModule: true, default: db }, '@/lib/accessControl': { hasPermission: async () => permitted }, '@/app/api/rekon/services/rekonAccessHelper': { checkReconcileAccess: async r => ({ allowed: r.allowed !== false }) } });
  const auth = { role: 'sitearea', safeRole: 'sitearea', dbUser: { id: 'U1', regional: 'REGIONAL 1 BANDUNG', siteArea: 'SPB DKI' }, session: {} };
  return { rows, log, db, service, auth, calls, denyPermission: () => { permitted = false; }, fail: () => { fail = true; }, run: recordId => service.fetchActivityDetail('A1', recordId || null, auth, db) };
}
const tests = [], test = (name, run) => tests.push([name, run]);
test('Retur uses original creator, actual timestamp/qty/location; empty fields stay missing', async () => {
  const f = fixture('DataRetur'), r = await f.run();
  assert.equal(r.fields.find(x => x.label === 'Role pembuat').value, 'ORIGINAL'); assert.equal(r.fields.find(x => x.label === 'Qty retur').value, '4'); assert.equal(r.fields.find(x => x.label === 'Status barang').value, '—'); assert.equal(r.fields.find(x => x.label === 'Lokasi barang').value, 'SPB DKI'); assert.match(r.fields.find(x => x.label === 'Tanggal input').value, /WIB/); assert.match(r.detailHref, /^\/activities\/A1$/);
});
test('Retur/PO deny foreign scope and unrelated record ID even when URL is entered directly', async () => {
  const f = fixture('DataRetur'); f.rows.DataRetur[0].LokasiBarang = unit('SPB SUKOHARJO'); f.rows.DataRetur[0].lokasiBarangId = 'SPB SUKOHARJO'; await assert.rejects(f.run(), e => e.status === 403);
  const p = fixture('PurchaseOrder'); p.rows.PurchaseOrder[0] = po('REC', 'SPB SUKOHARJO'); await assert.rejects(p.run(), e => e.status === 403);
  await assert.rejects(f.run('OTHER'), e => e.status === 404);
});
test('Permission denial/deleted record never returns summary or detail link', async () => {
  const f = fixture('DataRetur'); f.denyPermission(); await assert.rejects(f.run(), e => e.code === 'ACTIVITY_PERMISSION_DENIED');
  const deleted = fixture('DataRetur'); deleted.rows.DataRetur = []; await assert.rejects(deleted.run(), e => e.status === 404);
});
test('Rekon returns persisted Net Due verbatim, not a new calculation from totals', async () => {
  const f = fixture('Reconcile'), r = await f.run(); assert.match(r.fields.find(x => x.label === 'Net due').value, /-.*123/); assert.equal(r.fields.find(x => x.label === 'Nama ritel').value, 'RITEL'); f.rows.Reconcile[0].allowed = false; await assert.rejects(f.run(), e => e.status === 403);
});
test('Credit batch original request roles/dates are loaded independently of latest batch actor', async () => {
  const f = fixture('CreditLimitBatch'), r = await f.run(); assert.equal(r.records.length, 2); assert(r.records.every(x => x.role === 'FIRST-REQUESTER')); assert.equal(r.fields[0].value, 'CL-1/10/2026');
  const single = await f.run('P2'); assert.equal(single.records.length, 1); assert(single.details.some(x => x.value === 'PO-P2')); await assert.rejects(f.run('UNRELATED'), e => e.status === 404);
  f.rows.CreditLimitBatch[0].PurchaseOrders.push(po('FOREIGN', 'SPB SUKOHARJO')); await assert.rejects(f.run('P1'), e => e.status === 403);
});
test('Legacy bulk does not invent record identities or links; scoped users cannot read global count', async () => {
  const f = fixture('DataRetur', 'batch-1', { newData: { isBatch: true, count: 75, ritelIds: ['R1'] } }); await assert.rejects(f.run(), e => e.status === 403); f.auth.role = f.auth.safeRole = 'pusat';
  const r = await f.run(); assert.equal(r.records.length, 0); assert.equal(r.detailHref, null); assert.equal(r.noticeCode, 'ACTIVITY_BULK_REFERENCES_UNAVAILABLE');
});
test('Bulk with explicit identities shows compact exact records; missing/foreign member rejects whole payload', async () => {
  const f = fixture('DataRetur', 'batch-1', { newData: { isBatch: true, recordIds: ['REC'] } }); const r = await f.run(); assert.equal(r.records.length, 1); assert.equal(r.records[0].number, 'RTV-1'); assert.match(r.records[0].detailHref, /recordId=REC/);
  f.log.newData.count = 10; await assert.rejects(f.run(), e => e.code === 'ACTIVITY_BULK_REFERENCES_INCOMPLETE'); delete f.log.newData.count;
  f.log.newData.recordIds.push('MISSING'); await assert.rejects(f.run(), e => e.status === 404);
});
test('API error Reference is structured and contains no raw SQL/internal message', async () => {
  const f = fixture('DataRetur'); let session = f.auth;
  const route = load('src/app/api/activities/detail/route.ts', { '@/lib/auth': { getSessionWithRole: async () => session }, '../activityDetailService': { ...f.service, fetchActivityDetail: () => f.run() } });
  f.fail(); const response = await route.GET(new Request('http://local/api/activities/detail?activityId=A1')); const json = await response.json(); assert.equal(response.status, 503); assert(json.reference.requestId); assert.equal(json.reference.code, 'ACTIVITY_DETAIL_UNAVAILABLE'); assert(!JSON.stringify(json).includes('INTERNAL SQL')); session = null; assert.equal((await route.GET(new Request('http://local/api/activities/detail?activityId=A1'))).status, 401);
});
test('Widget uses buttons for activity popups and has no stale /dashboard links', () => {
  const code = fs.readFileSync(path.join(root, 'src/components/dashboard-widgets.tsx'), 'utf8'); assert(!code.includes('`/dashboard/')); assert(code.includes('setSelectedActivity(act.id)')); assert(code.includes('ActivitySummaryDialog'));
});
function clientFixture() {
  const states = [], effects = []; let cursor = 0, props = { activityId: 'A', onClose: () => {} };
  const react = {
    useState(initial) { const i = cursor++; if (!(i in states)) states[i] = initial; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
    useEffect(fn, deps) { const i = cursor++; if (!effects[i] || !deps.every((v, n) => Object.is(v, effects[i].deps[n]))) { effects[i]?.cleanup?.(); effects[i] = { deps, fn, dirty: true }; } },
  };
  const jsx = (type, props) => typeof type === 'function' ? type(props) : ({ type, props });
  const component = load('src/components/ActivitySummary.tsx', {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx }, 'next/link': { __esModule: true, default: 'a' },
    '@/components/ui/dialog': { Dialog: 'dialog', DialogContent: 'content', DialogDescription: 'description', DialogHeader: 'header', DialogTitle: 'title' },
    '@/lib/readDeadline': load('src/lib/readDeadline.ts', {}),
  });
  return {
    render(patch = {}) { props = { ...props, ...patch }; cursor = 0; return component.ActivitySummaryDialog(props); },
    mount() { for (const e of effects) if (e?.dirty) { e.dirty = false; e.cleanup = e.fn(); } },
    close() { for (const e of effects) e?.cleanup?.(); },
  };
}
const flush = async () => { for (let i = 0; i < 25; i++) await Promise.resolve(); };
test('Client aborts old selection; ignored late response never replaces new popup', async () => {
  const original = global.fetch; const pending = [];
  global.fetch = (url, options) => new Promise(resolve => pending.push({ url, options, resolve }));
  const f = clientFixture();
  try {
    assert(JSON.stringify(f.render()).includes('Memuat informasi')); f.mount();
    f.render({ activityId: 'B' }); f.mount(); assert(pending[0].options.signal.aborted);
    pending[1].resolve(Response.json({ data: { title: 'NEW-B', fields: [] } })); await flush();
    pending[0].resolve(Response.json({ data: { title: 'OLD-A', fields: [] } })); await flush();
    const tree = JSON.stringify(f.render()); assert(tree.includes('NEW-B')); assert(!tree.includes('OLD-A'));
  } finally { f.close(); global.fetch = original; }
});
test('Client renders error Reference and explicit retry reloads without page refresh', async () => {
  const original = global.fetch; let calls = 0;
  global.fetch = async () => { calls++; return calls === 1 ? Response.json({ error: 'Denied', reference: { code: 'ACTIVITY_SCOPE_DENIED', requestId: 'REF1', status: 403 } }, { status: 403 }) : Response.json({ data: { title: 'RECOVERED', fields: [] } }); };
  const f = clientFixture();
  const findRetry = node => {
    if (!node || typeof node !== 'object') return null;
    if (node.type === 'button' && node.props.children === 'Coba Lagi') return node;
    return (Array.isArray(node) ? node : Object.values(node)).map(findRetry).find(Boolean);
  };
  try {
    f.render(); f.mount(); await flush(); const tree = f.render(); assert(JSON.stringify(tree).includes('ACTIVITY_SCOPE_DENIED'));
    findRetry(tree).props.onClick(); f.render(); f.mount(); await flush(); assert(JSON.stringify(f.render()).includes('RECOVERED')); assert.equal(calls, 2);
  } finally { f.close(); global.fetch = original; }
});
(async () => { let passed = 0; for (const [name, run] of tests) { try { await run(); passed++; console.log('PASS ' + name); } catch (e) { process.exitCode = 1; console.error('FAIL ' + name, e); } } console.log(`${passed}/${tests.length} passed; actual detail service/route, mocked DB, no database access`); })();
