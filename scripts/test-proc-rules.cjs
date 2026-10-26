// Exercises production handlers with an in-memory transaction double; no database/network.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const repo = 'D:/Projects/proc-apps';
let auth, po, writes, events, regionalUnits;
const unit = { idRegional: 'U1', siteArea: 'SITE A', namaRegional: 'Regional 1', kodeRegional: 'REG 1' };
const tx = {
  $executeRaw: async () => { events.push('lock'); },
  purchaseOrder: { findUnique: async () => { events.push('read'); return po; } },
  unitProduksi: { findMany: async () => regionalUnits, findFirst: async ({ where }) => where.siteArea
    ? (where.siteArea.equals === unit.siteArea ? unit : null)
    : (where.namaRegional.in.includes('regional 1') ? unit : null) },
  purchaseOrderItem: { update: async ({ data }) => { writes.push(data); return data; } },
};
const prisma = { ...tx, $transaction: async fn => { events.push('begin'); const result = await fn(tx); events.push('commit'); return result; } };
const mocks = {
  'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
  '@/lib/prisma': { __esModule: true, default: prisma },
  '@/lib/auth': { getSessionWithRole: async () => auth, getProfileName: () => 'Tester', canonicalizeRole: role => ['pusat', 'rm', 'sitearea', 'magang'].includes(role) ? role : null },
  '@/lib/ttl-cache': { invalidatePoCache: () => {}, cacheGet: () => undefined },
  '@/lib/accessControl': { hasPermission: async () => true },
  '@/lib/audit': {
    auditUpdatePO: async (client, where, data) => { assert.equal(client, tx); events.push('write-audit'); writes.push(data); return { ...po, ...data }; },
    auditActivity: async client => { assert.equal(client, tx); events.push('audit'); },
  },
};
const modules = new Map();
function load(file) {
  file = path.resolve(root, file);
  if (!fs.existsSync(file)) file = path.resolve(repo, path.relative(root, file));
  if (modules.has(file)) return modules.get(file).exports;
  const loadedModule = { exports: {} }; modules.set(file, loadedModule);
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  new Function('require', 'module', 'exports', compiled)(id => {
    if (id in mocks) return mocks[id];
    if (id.startsWith('@/')) return load('src/' + id.slice(2) + '.ts');
    if (id.startsWith('.')) return load(path.resolve(path.dirname(file), id + '.ts'));
    return require(id);
  }, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}
function reset(role = 'pusat') {
  auth = { role, session: { userId: 'test' }, dbUser: { id: 'test', regional: 'Regional 1', siteArea: 'U1' } };
  po = { id: 'PO1', noPo: 'PO-1', regional: 'Regional 1', unitProduksiId: 'U1', UnitProduksi: unit, noInvoice: null, statusBayar: false,
    Items: [{ id: 'I1', pcs: 10, pcsKirim: 0, hargaPcs: 100, discount: 0 }] };
  writes = []; events = []; regionalUnits = [unit];
}
const request = body => new Request('http://localhost/api', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
const assign = load('src/app/api/po/assign/route.ts').POST;
const reject = load('src/app/api/po/reject/route.ts').POST;
const pcs = load('src/app/api/po/pcs-kirim/route.ts').PATCH;
const { checkPOOwnership } = load('src/lib/utils/regional.ts');
const { buildPOQueryParams } = load('src/app/api/po/services/poQueryBuilder.ts');
const { prepareRekonExport } = load('src/lib/rekonExportData.ts');
const permissions = load('src/lib/accessControl.ts');
const tests = [];
const test = (name, fn) => tests.push([name, fn]);
test('Pusat delegates regional only; lock precedes validation and audited write', async () => {
  reset(); const res = await assign(request({ noPo: po.noPo, regional: 'Regional 1' }));
  assert.equal(res.status, 200); assert.equal(writes[0].unitProduksiId, 'UNKNOWN'); assert.equal(writes[0].regional, 'Regional 1');
  assert.deepEqual(events, ['begin', 'lock', 'read', 'write-audit', 'commit']);
});
for (const label of ['REGIONAL 1 BANDUNG', 'REGIONAL 2 SURABAYA', 'REGIONAL 3 MAKASSAR', 'KANTOR WILAYAH BULOG']) test('Pusat delegates full master label without sitearea: '+label, async()=>{
  reset(); regionalUnits=[{...unit,namaRegional:label}];
  const res=await assign(request({noPo:po.noPo,regional:label,siteArea:null}));
  assert.equal(res.status,200);assert.equal(writes[0].regional,label);assert.equal(writes[0].unitProduksiId,'UNKNOWN');
});
test('Pusat delegation supports short aliases against long master names',async()=>{
  reset();regionalUnits=[{...unit,namaRegional:'REGIONAL 2 SURABAYA'}];
  assert.equal((await assign(request({noPo:po.noPo,regional:'Regional II'}))).status,200);
  assert.equal(writes[0].regional,'REGIONAL 2 SURABAYA');
});
test('Regional 10 does not accidentally match Regional 1',async()=>{
  reset();regionalUnits=[{...unit,namaRegional:'REGIONAL 10'}];
  assert.equal((await assign(request({noPo:po.noPo,regional:'Regional 1'}))).status,400);assert.equal(writes.length,0);
});
test('Delegation preserves a blank sitearea and RM can complete the next step',async()=>{
  reset();regionalUnits=[{...unit,namaRegional:'REGIONAL 1 BANDUNG'}];
  assert.equal((await assign(request({noPo:po.noPo,regional:'REGIONAL 1 BANDUNG',siteArea:''}))).status,200);
  Object.assign(po,writes[0]);po.UnitProduksi={namaRegional:'UNKNOWN',siteArea:'UNKNOWN',idRegional:'UNKNOWN'};
  auth={role:'rm',session:{userId:'RM1'},dbUser:{id:'RM1',regional:'REGIONAL 1 BANDUNG',siteArea:null}};
  assert.equal(checkPOOwnership(po,'rm',auth.dbUser.regional).allowed,true);
  const {poScopeFromUnits}=load('src/lib/utils/poScope.ts');
  const scope=poScopeFromUnits('rm',auth.dbUser.regional,null,regionalUnits);
  const delegated=scope.OR.find(clause=>clause.unitProduksiId?.in?.includes('UNKNOWN'));
  assert(delegated.OR.some(clause=>clause.regional.equals==='REGIONAL 1 BANDUNG'));
  const res=await assign(request({noPo:po.noPo,regional:'REGIONAL 1 BANDUNG',siteArea:'SITE A'}));
  assert.equal(res.status,200);assert.equal(writes.at(-1).unitProduksiId,'U1');
});
test('Pusat cannot delegate a PO with an active invoice',async()=>{
  reset();po.noInvoice='INV-ACTIVE';assert.equal((await assign(request({noPo:po.noPo,regional:'Regional 1'}))).status,400);assert.equal(writes.length,0);
});
test('RM cannot finish delegation to a foreign regional unit',async()=>{
  reset('rm');auth.dbUser.regional='REGIONAL 2 SURABAYA';po.regional='REGIONAL 2 SURABAYA';po.unitProduksiId='UNKNOWN';po.UnitProduksi=null;
  assert.equal((await assign(request({noPo:po.noPo,siteArea:'SITE A'}))).status,403);assert.equal(writes.length,0);
});
test('Unknown regional rejected without mutation', async () => { reset(); assert.equal((await assign(request({ noPo: po.noPo, regional: 'INVALID' }))).status, 400); assert.equal(writes.length, 0); });
test('RM cannot assign regional without unit', async () => { reset('rm'); assert.equal((await assign(request({ noPo: po.noPo, regional: 'Regional 1' }))).status, 400); });
test('RM completes regional delegation despite UNKNOWN dummy unit', async () => {
  reset('rm'); po.unitProduksiId = 'UNKNOWN'; po.UnitProduksi = { namaRegional: 'UNKNOWN', kodeRegional: 'UNKNOWN' };
  assert.equal((await assign(request({ noPo: po.noPo, regional: 'Regional 1', siteArea: 'SITE A' }))).status, 200);
  assert.equal(writes[0].unitProduksiId, 'U1');
});
test('RM cannot assign another regional PO', async () => {
  reset('rm'); po.unitProduksiId = 'UNKNOWN'; po.UnitProduksi = null; po.regional = 'Regional 2';
  assert.equal((await assign(request({ noPo: po.noPo, siteArea: 'SITE A' }))).status, 403); assert.equal(writes.length, 0);
});
for (const role of ['pusat', 'rm', 'sitearea']) test(`${role} reject returns correct assignment level`, async () => {
  reset(role); assert.equal((await reject(request({ id: po.id }))).status, 200);
  assert.equal(writes[0].regional, role === 'sitearea' ? 'Regional 1' : null); assert.equal(writes[0].unitProduksiId, 'UNKNOWN');
  assert.deepEqual(events, ['begin', 'lock', 'read', 'write-audit', 'commit']);
});
test('Invoice prevents reject', async () => { reset(); po.noInvoice = 'INV1'; assert.equal((await reject(request({ id: po.id }))).status, 409); assert.equal(writes.length, 0); });
test('Unassigned PO regional visible to matching RM ownership checker', () => { assert.equal(checkPOOwnership({ regional: 'Regional 1', unitProduksiId: 'UNKNOWN', UnitProduksi: { namaRegional: 'UNKNOWN' } }, 'rm', 'Bandung').allowed, true); });
test('Unit regional overrides stale PO regional', () => { assert.equal(checkPOOwnership({ regional: 'Regional 1', unitProduksiId: 'U2', UnitProduksi: { namaRegional: 'Regional 2' } }, 'rm', 'Regional 1').allowed, false); });
test('Query keeps role boundary alongside arbitrary user filters', () => {
  reset('rm'); const result = buildPOQueryParams(new URLSearchParams({ company: 'ACME', siteArea: 'FOREIGN', colFilters: JSON.stringify({ noPo: 'ONE' }) }), auth);
  assert.match(JSON.stringify(result.where), /regional 1/); assert.match(JSON.stringify(result.where), /ACME/); assert.match(JSON.stringify(result.where), /FOREIGN/);
  assert.ok(result.where.AND.some(x => x.OR?.some(y => y.unitProduksiId?.in?.includes('UNKNOWN'))));
});
test('Cabang query accepts configured ID, not just display name', () => {
  reset('sitearea'); const result = buildPOQueryParams(new URLSearchParams(), auth);
  const scopes = result.where.AND.filter(x => x.OR?.some(y => y.unitProduksiId?.in?.includes('U1')));
  assert.equal(scopes.length, 1); // No redundant text filter may hide a resolved unit.
});
test('Different cabang accounts never share cache key', () => {
  reset('sitearea'); const a = buildPOQueryParams(new URLSearchParams(), auth); auth.dbUser.siteArea = 'U2';
  const b = buildPOQueryParams(new URLSearchParams(), auth); assert.notEqual(a.cacheKey, b.cacheKey); assert.notEqual(a.totalCacheKey, b.totalCacheKey);
});
test('Server sorting uses requested scalar field and stable tie-breaker', () => { reset(); assert.deepEqual(buildPOQueryParams(new URLSearchParams({ sort: 'noPo_asc' }), auth).orderBy, [{ noPo: 'asc' }, { id: 'asc' }]); });
test('Client cannot inject arbitrary database sort fields', () => { reset(); assert.deepEqual(buildPOQueryParams(new URLSearchParams({ sort: 'password_asc' }), auth).orderBy, [{ createdAt: 'desc' }, { id: 'asc' }]); });
test('Delete remains Pusat-only even if permission configuration grants others delete', async () => {
  permissions.updateMemoryPermissionsCache(Object.fromEntries(['pusat', 'rm', 'sitearea', 'magang'].map(role => [role, { enabledMenus: [], enabledActions: ['po_delete', 'retur_delete', 'm_prod_delete'] }])), 999);
  for (const role of ['rm', 'sitearea', 'magang']) for (const action of ['po_delete', 'retur_delete', 'm_prod_delete']) assert.equal(await permissions.hasPermission(role, action), false);
  assert.equal(await permissions.hasPermission('pusat', 'po_delete'), true);
});
test('Missing regional scope stays fail-closed', () => { reset('rm'); auth.dbUser.regional = null; assert.match(JSON.stringify(buildPOQueryParams(new URLSearchParams(), auth).where), /__NO_CONFIGURED_SCOPE__/); });
test('Partial PCS shipment is saved', async () => { reset(); assert.equal((await pcs(request({ id: po.id, pcsKirim: 4 }))).status, 200); assert.equal(writes[0].pcsKirim, 4); });
for (const value of [11, -1, 1.5, 'abc']) test(`Invalid PCS ${value} rejected`, async () => { reset(); assert.equal((await pcs(request({ id: po.id, pcsKirim: value }))).status, 400); assert.equal(writes.length, 0); });
const exportItem = () => ({ noRekonsiliasi: 'REC1', totalRtvs: 50, detailedRtvs: [{ id: 'R1', noRtv: 'CN1', lokasiBarang: 'SITE A', qty: 0, nominal: 50 }] });
test('Export retains valid zero quantity and location', () => { const out = prepareRekonExport([exportItem()])[0]; assert.equal(out.rtvs[0].qty, 0); assert.equal(out.rtvs[0].lokasiBarang, 'SITE A'); });
test('Export reports RTV ritel mismatch explicitly', () => { const item = exportItem(); item.detailedRtvs[0].sourceRitelMismatch = true; assert.throws(() => prepareRekonExport([item]), /company-nya berbeda/); });
test('Export never substitutes missing invoice with zero', () => { const item = exportItem(); item.detailedInvoices = [{ noInvoice: 'INV-OTHER', sourceRitelMismatch: true, nominal: null }]; assert.throws(() => prepareRekonExport([item]), /invoice INV-OTHER tidak tersedia/); });
test('Export preserves valid invoice zero', () => { const item = exportItem(); item.detailedInvoices = [{ noInvoice: 'INV-ZERO', nominal: 0 }]; assert.equal(prepareRekonExport([item])[0].invoices[0].nominal, 0); });
for (const change of [{ sourceMissing: true }, { lokasiBarang: null }, { qty: null }, { nominal: 60 }]) test(`Export blocks incomplete/mismatched RTV ${JSON.stringify(change)}`, () => { const item = exportItem(); Object.assign(item.detailedRtvs[0], change); assert.throws(() => prepareRekonExport([item])); });
const { poScopeFromUnits } = load('src/lib/utils/poScope.ts');
const { loadRekonExportRows } = load('src/lib/loadRekonExportRows.ts');
test('RM scope resolves legacy regional label using ownership semantics', () => {
  const units = [{ ...unit, namaRegional: ' REGIONAL I - BANDUNG ' }, { ...unit, idRegional: 'U2', namaRegional: 'Regional 2', kodeRegional: 'REG 2' }];
  const scope = poScopeFromUnits('rm', 'Bandung', null, units);
  assert.deepEqual(scope.OR[0].unitProduksiId.in, ['U1']);
});
test('Cabang scope resolves case and whitespace to actual unit ID', () => {
  assert.deepEqual(poScopeFromUnits('sitearea', null, ' u1 ', [unit]), { unitProduksiId: { in: ['U1'] } });
  assert.deepEqual(poScopeFromUnits('sitearea', null, ' site a ', [unit]), { unitProduksiId: { in: ['U1'] } });
  assert.deepEqual(poScopeFromUnits('sitearea', null, 'OTHER', [unit]), { unitProduksiId: { in: [] } });
});
test('Explicit outside sitearea filter cannot replace server unit boundary', () => {
  reset('sitearea'); const where = buildPOQueryParams(new URLSearchParams({ siteArea: 'U2' }), { ...auth, resolvedPoScope: { unitProduksiId: { in: ['U1'] } } }).where;
  assert.ok(where.AND.some(x => x.unitProduksiId?.in?.[0] === 'U1'));
  assert.ok(where.AND.some(x => x.OR?.some(y => y.unitProduksiId?.equals === 'U2')));
});
const filters = { search: 'ACME', startDate: '2026-10-01', endDate: '2026-10-24', status: 'final' };
test('Export retrieves all 123 rows across pages and preserves filters', async () => {
  const seen = [];
  const rows = await loadRekonExportRows(filters, async url => {
    const p = new URL(url, 'http://localhost').searchParams; seen.push(p.get('page'));
    assert.equal(p.get('q'), 'ACME'); assert.equal(p.get('status'), 'final'); assert.equal(p.get('startDate'), filters.startDate); assert.equal(p.get('endDate'), filters.endDate);
    const offset = (Number(p.get('page')) - 1) * 50;
    return Response.json({ total: 123, data: Array.from({ length: Math.min(50, 123 - offset) }, (_, i) => ({ id: String(offset + i) })) });
  });
  assert.equal(rows.length, 123); assert.deepEqual(seen, ['1', '2', '3']);
});
test('Export empty result terminates immediately', async () => { assert.deepEqual(await loadRekonExportRows(filters, async () => Response.json({ total: 0, data: [] })), []); });
for (const failure of ['http', 'duplicate', 'short', 'changed']) test(`Export aborts instead of writing partial file: ${failure}`, async () => {
  let call = 0;
  await assert.rejects(loadRekonExportRows(filters, async () => {
    call++;
    if (call === 1) return Response.json({ total: 51, data: Array.from({ length: 50 }, (_, i) => ({ id: String(i) })) });
    if (failure === 'http') return Response.json({ error: 'Unavailable' }, { status: 503 });
    if (failure === 'duplicate') return Response.json({ total: 51, data: [{ id: '0' }] });
    if (failure === 'short') return Response.json({ total: 51, data: [] });
    return Response.json({ total: 52, data: [{ id: '50' }] });
  }));
});
test('Excel generator includes multiple reconciliations in one workbook', () => {
  const xlsx = require('xlsx'); let captured;
  mocks.xlsx = { ...xlsx, writeFile: workbook => { captured = workbook; } };
  const generate = load('src/lib/generateRekonExcel.ts').generateRekonExcel;
  generate([1, 2, 3].map(n => ({ id: String(n), noRekonsiliasi: `REC-${n}`, totalRtvs: 0, invoices: [], rtvs: [], RitelModern: { namaPt: 'ACME' } })), filters);
  assert.ok(captured);
  const cells = xlsx.utils.sheet_to_json(captured.Sheets[captured.SheetNames[0]], { header: 1 }).flat();
  for (const n of [1, 2, 3]) assert.ok(cells.includes(`REC-${n}`));
  assert.ok(cells.some(v => typeof v === 'string' && v.includes('Status: final')));
});
(async () => {
  const error = console.error, log = console.log; let failed = 0;
  for (const [name, fn] of tests) {
    console.error = () => {}; console.log = () => {};
    try { await fn(); log('PASS', name); } catch (e) { failed++; error('FAIL', name, e); }
    finally { console.error = error; console.log = log; }
  }
  log(`${tests.length - failed}/${tests.length} passed (mocked DB, no external writes)`);
  process.exitCode = failed ? 1 : 0;
})();
