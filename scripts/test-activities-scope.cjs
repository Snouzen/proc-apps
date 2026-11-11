const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), ts = require('typescript');
const root = path.resolve(__dirname, '..');
function load(file, mocks = {}) {
  const loaded = { exports: {} }, source = fs.readFileSync(path.join(root, file), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  new Function('require', 'module', 'exports', code)(name => {
    if (name in mocks) return mocks[name];
    if (name === '@/lib/utils/regional') return load('src/lib/utils/regional.ts');
    throw Error('Unexpected import ' + name);
  }, loaded, loaded.exports);
  return loaded.exports;
}
const unit = (site, reg) => ({ idRegional: site, siteArea: site, namaRegional: reg });
const po = (id, site = 'SPB DKI', reg = 'REGIONAL 1 BANDUNG') => ({ id, noPo: 'PO-' + id, regional: reg, unitProduksiId: site, UnitProduksi: unit(site, reg) });
const act = (id, entityId, entity = 'PurchaseOrder') => ({ id, entityId, entity, action: 'CREATE', userName: 'Actor', userRole: 'pusat', userId: 'ACTOR', createdAt: new Date(), newData: { noPo: 'STALE-SECRET', count: 999, unrelatedInvoice: 'HIDDEN' }, oldData: { hidden: 'SECRET' } });
const auth = role => ({ role, safeRole: role, dbUser: { id: 'U1', regional: 'REGIONAL 1 BANDUNG', siteArea: 'SPB DKI' }, session: { regional: 'REGIONAL 2 SURABAYA', siteArea: 'SPB SUKOHARJO' } });
function fixture(logs, pos = [], returs = [], rekons = [], batches = [], useActualRekon = false) {
  const calls = [], pick = rows => async args => rows.filter(r => args.where.id.in.includes(r.id));
  const db = {
    auditLog: { findMany: async args => { calls.push(args); const start = args.cursor ? logs.findIndex(a => a.id === args.cursor.id) + 1 : 0; return logs.slice(start, start + args.take); }, findFirst: async args => logs.find(a => a.entityId === args.where.entityId && a.entity === args.where.entity) || null },
    purchaseOrder: { findMany: args => args.where.noInvoice ? Promise.resolve(pos.filter(p => args.where.noInvoice.in.includes(p.noInvoice))) : pick(pos)(args) }, dataRetur: { findMany: pick(returs) }, reconcile: { findMany: pick(rekons) }, creditLimitBatch: { findMany: pick(batches) },
  };
  const checked = [];
  const { fetchScopedActivities } = load('src/app/api/activities/activityService.ts', {
    '@/lib/prisma': { __esModule: true, default: db },
    '@/app/api/rekon/services/rekonAccessHelper': useActualRekon ? load('src/app/api/rekon/services/rekonAccessHelper.ts', { '@/lib/prisma': { __esModule: true, default: db } }) : { checkReconcileAccess: async (rekon, ctx, client) => { assert.equal(client, db); checked.push(rekon.id); return { allowed: rekon.permitted }; } },
  });
  return { run: ctx => fetchScopedActivities(ctx, db), calls, checked };
}
const tests = [], test = (name, run) => tests.push([name, run]);
test('Pusat retains 15 global operational records, including unresolved legacy bulk', async () => {
  const logs = Array.from({ length: 20 }, (_, i) => act('A' + i, 'batch-' + i, 'DataRetur'));
  const f = fixture(logs), result = await f.run(auth('pusat')); assert.equal(result.data.length, 15); assert.equal(f.calls.length, 1); assert.deepEqual(result.data[0].newData, logs[0].newData);
  assert.deepEqual(f.calls[0].where.entity.in, ['PurchaseOrder', 'Reconcile', 'DataRetur', 'CreditLimitBatch']); assert.equal(f.calls[0].where.action, 'CREATE');
});
test('RM uses current unit ownership, accepts regional-only unassigned PO, excludes foreign actor-owned records', async () => {
  const own = po('OWN'), foreign = po('FOREIGN', 'SPB SUKOHARJO', 'REGIONAL 2 SURABAYA'), mismatch = { ...po('MISMATCH'), UnitProduksi: foreign.UnitProduksi };
  const unassigned = { id: 'WAIT', noPo: 'PO-WAIT', regional: 'REGIONAL 1 BANDUNG', unitProduksiId: 'UNKNOWN', UnitProduksi: null };
  const f = fixture([act('A', own.id), act('B', foreign.id), act('C', mismatch.id), act('D', unassigned.id)], [own, foreign, mismatch, unassigned]);
  const result = await f.run(auth('rm')); assert.deepEqual(result.data.map(a => a.entityId), ['OWN', 'WAIT']); assert(result.data.every(a => !a.oldData && !a.userId && a.newData === null)); assert.equal(result.data[0].refNumber, 'PO-OWN'); assert(f.calls[0].select); assert(!f.calls[0].select.newData);
});
test('Sitearea permits exact multi-area/ID matches, not substring or same-regional foreign units', async () => {
  const rows = [po('DKI'), po('SUB', 'SPP SUBANG'), po('PREFIX', 'SPB DKI TIMUR'), po('UNKNOWN', 'UNKNOWN')];
  const f = fixture(rows.map((r, i) => act('A' + i, r.id)), rows), ctx = auth('sitearea'); ctx.dbUser.siteArea = 'SPB DKI, SPP SUBANG';
  assert.deepEqual((await f.run(ctx)).data.map(a => a.entityId), ['DKI', 'SUB']);
});
test('Missing DB scope cannot fall back to stale token, unsupported role returns no data', async () => {
  for (const role of ['rm', 'sitearea', 'unexpected']) {
    const f = fixture([act('A', 'OWN')], [po('OWN')]), ctx = auth(role); ctx.dbUser.regional = null; ctx.dbUser.siteArea = null;
    assert.equal((await f.run(ctx)).data.length, 0); assert.equal(f.calls.length, 0);
  }
});
test('Retur checks both location/charging units; bulk without IDs, missing units and deleted records stay hidden', async () => {
  const own = { id: 'OWN', rtvCn: 'RTV-1', lokasiBarangId: 'SPB DKI', LokasiBarang: unit('SPB DKI', 'REGIONAL 1 BANDUNG') };
  const charged = { id: 'CHARGED', rtvCn: 'RTV-2', pembebananReturnId: 'SPB DKI', PembebananReturn: own.LokasiBarang };
  const f = fixture(['OWN', 'CHARGED', 'EMPTY', 'DELETED', 'batch-1'].map((id, i) => act('A' + i, id, 'DataRetur')), [], [own, charged, { id: 'EMPTY' }]);
  assert.deepEqual((await f.run(auth('sitearea'))).data.map(a => a.entityId), ['OWN', 'CHARGED']);
});
test('Rekon delegates to canonical access helper, not actor role or audit metadata', async () => {
  const f = fixture([act('A', 'YES', 'Reconcile'), act('B', 'NO', 'Reconcile'), act('C', 'MISSING', 'Reconcile')], [], [], [{ id: 'YES', noRekonsiliasi: 'R-1', permitted: true }, { id: 'NO', permitted: false }]);
  const result = await f.run(auth('rm')); assert.deepEqual(f.checked, ['YES', 'NO']); assert.deepEqual(result.data.map(a => a.refNumber), ['R-1']);
});
test('Credit batch requires every current member authorized, nonempty and at most 50', async () => {
  const batches = [{ id: 'OWN', PurchaseOrders: [po('P1')] }, { id: 'MIXED', PurchaseOrders: [po('P1'), po('P2', 'SPB SUKOHARJO')] }, { id: 'EMPTY', PurchaseOrders: [] }, { id: 'OVERSIZE', PurchaseOrders: Array.from({ length: 51 }, (_, i) => po('P' + i)) }];
  const f = fixture(batches.map((b, i) => act('A' + i, b.id, 'CreditLimitBatch')), [], [], [], batches);
  assert.deepEqual((await f.run(auth('sitearea'))).data.map(a => a.entityId), ['OWN']);
});
test('Actual Rekon validator excludes mixed/missing invoices and checks empty draft creator', async () => {
  const own = { ...po('P1'), noInvoice: 'I1' }, foreign = { ...po('P2', 'SPB SUKOHARJO', 'REGIONAL 2 SURABAYA'), noInvoice: 'I2' };
  const logs = ['OWN', 'MIXED', 'MISSING', 'DRAFT', 'OTHER-DRAFT'].map((id, i) => act('A' + i, id, 'Reconcile')); logs[3].userId = 'U1';
  const rekons = [{ id: 'OWN', invoices: ['I1'] }, { id: 'MIXED', invoices: ['I1', 'I2'] }, { id: 'MISSING', invoices: ['NO-SUCH'] }, { id: 'DRAFT', invoices: [] }, { id: 'OTHER-DRAFT', invoices: [] }];
  const f = fixture(logs, [own, foreign], [], rekons, [], true);
  assert.deepEqual((await f.run(auth('sitearea'))).data.map(a => a.entityId), ['OWN', 'DRAFT']);
});
test('Older authorized records can fill feed past first global page; bounded scan is explicit', async () => {
  const logs = Array.from({ length: 160 }, (_, i) => act('A' + i, 'P' + i));
  const rows = Array.from({ length: 15 }, (_, i) => po('P' + (i + 50)));
  const f = fixture(logs, rows); assert.equal((await f.run(auth('rm'))).data.length, 15); assert.equal(f.calls.length, 2); assert.equal(f.calls[1].cursor.id, 'A49');
  const denied = fixture(logs); const result = await denied.run(auth('rm')); assert.equal(result.data.length, 0); assert.equal(result.scopeScanLimited, true); assert.equal(denied.calls.length, 3);
});
test('API denies unauthenticated requests and never exposes raw backend failure', async () => {
  let session = null;
  const route = load('src/app/api/activities/route.ts', { 'next/server': { NextResponse: Response }, '@/lib/auth': { getSessionWithRole: async () => session }, './activityService': { fetchScopedActivities: async () => { throw Error('postgres://SECRET INTERNAL SQL'); } } });
  assert.equal((await route.GET()).status, 401); session = auth('rm'); const response = await route.GET(); assert.equal(response.status, 503); assert.equal(response.headers.get('Cache-Control'), 'private, no-store'); assert(!(await response.text()).includes('SECRET'));
});
(async () => { let passed = 0; for (const [name, run] of tests) { try { await run(); passed++; console.log('PASS ' + name); } catch (error) { console.error('FAIL ' + name, error); process.exitCode = 1; } } console.log(`${passed}/${tests.length} passed; actual ownership helpers + mocked DB, no database connections`); })();
