const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), ts = require('typescript');
const root = path.resolve(__dirname, '..');
function loader(mocks = {}) {
  const cache = new Map();
  return function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const mod = { exports: {} }; cache.set(file, mod);
    const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    new Function('require', 'module', 'exports', code)(id => id in mocks ? mocks[id] : id.startsWith('@/') ? load('src/' + id.slice(2) + '.ts') : require(id), mod, mod.exports);
    return mod.exports;
  };
}
const tests = [], test = (name, run) => tests.push([name, run]);
const apply = loader()('src/lib/roleAccessPolicy.ts').applyCreditLimitAccessRules;
test('Old sitearea snapshots receive only PO view floor; non-Pusat loses all Realisasi grants', () => {
  const entry = { enabledMenus: ['report_realisasi'], enabledActions: ['real_view', 'real_input', 'real_export_pdf', 'rep_view'] };
  const original = Object.fromEntries(['pusat', 'rm', 'sitearea', 'magang'].map(role => [role, structuredClone(entry)]));
  const result = apply(original);
  assert(result.sitearea.enabledMenus.includes('po')); assert(result.sitearea.enabledActions.includes('po_view'));
  assert(!result.sitearea.enabledActions.includes('po_edit')); assert(!result.sitearea.enabledActions.includes('po_create'));
  for (const role of ['rm', 'sitearea', 'magang']) {
    assert(!result[role].enabledMenus.includes('report_realisasi'));
    assert(!result[role].enabledActions.some(action => action.startsWith('real_')));
    assert(result[role].enabledActions.includes('rep_view'));
  }
  assert(result.pusat.enabledMenus.includes('report_realisasi')); assert(result.pusat.enabledActions.includes('real_export_pdf'));
  assert.deepEqual(original.sitearea, entry); assert.deepEqual(apply(result), result);
});
function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) return node.map(child => find(child, predicate)).find(Boolean);
  return predicate(node) ? node : find(node.props?.children, predicate);
}
test('Sidebar shows PO for SPP Karawang; Realisasi link only renders for Pusat', () => {
  for (const role of ['sitearea', 'rm', 'pusat', 'magang']) {
    const Sidebar = loader({ react: { useState: initial => [initial === false ? true : initial, () => {}], useRef: initial => ({ current: initial }), useEffect: () => {} },
      'next/navigation': { usePathname: () => '/' }, 'next/link': { __esModule: true, default: 'a' }, 'next/image': { __esModule: true, default: 'img' },
      'lucide-react': new Proxy({}, { get: () => () => null }), '@/lib/me': {}, '@/lib/permissions': { usePermissions: () => ({ isMenuAllowed: () => true }) }
    })('src/components/sidebar.tsx').default;
    const tree = Sidebar({ isOpen: true, setIsOpen() {}, initialRole: role, initialRegional: 'REGIONAL 1 BANDUNG', initialSiteArea: 'SPP KARAWANG' });
    assert(find(tree, node => node.props?.item?.path === '/purchase-order'));
    assert.equal(!!find(tree, node => node.props?.href === '/report/realisasi' || node.props?.item?.path === '/report/realisasi'), role === 'pusat');
  }
});
test('Sitearea filter initializes scope, blocks changes, resolves master labels and allows retailer filters', async () => {
  let index = 0, states = [], effects = [];
  const originalFetch = global.fetch;
  global.fetch = async url => Response.json(url.includes('unit-produksi') ? [{ idRegional: 'U-KARAWANG', namaRegional: 'REGIONAL 1 BANDUNG', siteArea: 'SPP KARAWANG' }] : []);
  try {
    const hook = loader({ react: { useState(initial) { const i = index++; if (!(i in states)) states[i] = initial; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; }, useEffect(fn) { effects.push(fn); }, useMemo: fn => fn() } })('src/hooks/useRetailerFilters.ts').useRetailerFilters;
    const render = () => { index = 0; effects = []; return hook({ role: 'sitearea', regional: 'Regional I', siteArea: 'U-KARAWANG' }); };
    render(); effects.forEach(fn => fn()); for (let i = 0; i < 12; i++) await Promise.resolve();
    let value = render(); assert(value.regionalLocked && value.siteAreaLocked);
    assert.equal(value.selectedRegionalLabel, 'REGIONAL 1 BANDUNG'); assert.equal(value.selectedSiteAreaLabel, 'SPP KARAWANG');
    value.handleSelectRegional('Regional 2'); value.handleSelectSiteArea('SPP OTHER'); value.handleSelectNamaPt('RITEL A'); value = render();
    assert.equal(value.selectedRegional, 'Regional I'); assert.equal(value.selectedSiteArea, 'U-KARAWANG'); assert.equal(value.selectedNamaPt, 'RITEL A');
  } finally { global.fetch = originalFetch; }
});
for (const role of ['rm', 'sitearea', 'magang']) test('Realisasi PDF rejects ' + role + ' even with legacy export permission', async () => {
  let launched = false;
  const POST = loader({ '@/lib/auth': { getSessionWithRole: async () => ({ role }) }, '@/lib/accessControl': { hasPermission: async () => true }, puppeteer: { __esModule: true, default: { launch: () => { launched = true; throw Error('Unexpected PDF launch'); } } } })('src/app/api/realisasi/export-pdf/route.ts').POST;
  assert.equal((await POST(new Request('https://test/api/realisasi/export-pdf', { method: 'POST' }))).status, 403); assert.equal(launched, false);
});
test('Proxy redirects non-Pusat Realisasi URLs while Pusat and scoped PO remain accessible', async () => {
  const originalInterval = global.setInterval;
  global.setInterval = (...args) => { const timer = originalInterval(...args); timer.unref(); return timer; };
  try {
    for (const role of ['pusat', 'rm', 'sitearea', 'magang']) {
      const proxy = loader({ '@/lib/auth-edge': { verifySessionEdge: async () => ({ role }) } })('src/proxy.ts').proxy;
      const { NextRequest } = require('next/server');
      for (const route of ['/report/realisasi', '/report/realisasi/detail']) {
        const response = await proxy(new NextRequest('https://test' + route));
        assert.equal(response.status, role === 'pusat' ? 200 : 307);
      }
      assert.equal((await proxy(new NextRequest('https://test/purchase-order'))).status, 200);
    }
  } finally { global.setInterval = originalInterval; }
});
(async () => { let passed = 0; for (const [name, run] of tests) { try { await run(); passed++; console.log('PASS ' + name); } catch (error) { process.exitCode = 1; console.error('FAIL ' + name, error); } } console.log(`${passed}/${tests.length} passed; actual UI/hooks/policy/proxy/export with mocked sessions/network, no DB writes`); })();
