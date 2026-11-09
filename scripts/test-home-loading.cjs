const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const ts = require('typescript'), root = path.resolve(__dirname, '..');
function load(file, mocks = {}) {
  const loaded = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  new Function('require', 'module', 'exports', code)(id => {
    if (id in mocks) return mocks[id];
    if (id === '@/lib/readDeadline') return load('src/lib/readDeadline.ts');
    throw Error('Unexpected dependency ' + id);
  }, loaded, loaded.exports);
  return loaded.exports;
}
function hooks(file, symbol, mocks = {}) {
  const states = [], refs = [], effects = [], memo = [];
  let cursor = 0;
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    useState(initial) { const i = cursor++; if (!(i in states)) states[i] = initial; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
    useRef(initial) { const i = cursor++; return refs[i] || (refs[i] = { current: initial }); },
    useMemo(fn, deps) { const i = cursor++; if (!same(memo[i]?.deps, deps)) memo[i] = { deps, value: fn() }; return memo[i].value; },
    useCallback(fn, deps) { return react.useMemo(() => fn, deps); },
    useEffect(fn, deps) { const i = cursor++; if (!same(effects[i]?.deps, deps)) { effects[i]?.cleanup?.(); effects[i] = { deps, fn, dirty: true }; } },
  };
  const exported = load(file, { react, ...mocks });
  return {
    render(props) { cursor = 0; return exported[symbol](props); },
    mount() { for (const effect of effects) if (effect?.dirty) { effect.dirty = false; effect.cleanup = effect.fn(); } },
    unmount() { for (const effect of effects) effect?.cleanup?.(); },
  };
}
const flush = async () => { for (let i = 0; i < 25; i++) await Promise.resolve(); };
const tests = [], test = (name, fn) => tests.push([name, fn]);
const base = { roleReady: true, role: 'pusat', regional: null, siteArea: null };
const stats = count => Response.json({ cAll: count, cActive: 2, cAssign: 3 });
test('Stats initial load runs without browser focus, preserving filters for all roles', async () => {
  for (const role of ['pusat', 'rm', 'sitearea']) {
    let url;
    global.fetch = async value => { url = new URL(value, 'http://local'); return stats(12); };
    global.document = { hasFocus: () => false };
    const f = hooks('src/hooks/usePoStats.ts', 'usePoStats');
    const props = { ...base, role, regional: 'REGIONAL 1', siteArea: 'SPB DKI', dateFrom: '2026-11-01' };
    f.render(props); f.mount(); await flush();
    assert.equal(f.render(props).stats.totalCount, 12);
    assert.equal(url.searchParams.get('regional'), role === 'pusat' ? null : 'REGIONAL 1');
    assert.equal(url.searchParams.get('siteArea'), role === 'sitearea' ? 'SPB DKI' : null);
    assert.equal(url.searchParams.get('tglFrom'), '2026-11-01');
    f.unmount();
  }
});
test('Stats do not fetch before role is ready', async () => {
  global.fetch = () => { throw Error('Must not fetch'); };
  const f = hooks('src/hooks/usePoStats.ts', 'usePoStats'); f.render({ ...base, roleReady: false }); f.mount(); await flush(); f.unmount();
});
test('Failed stats leave loading, keep prior data, and explicit retry recovers', async () => {
  const f = hooks('src/hooks/usePoStats.ts', 'usePoStats');
  global.fetch = async () => stats(9); await f.render(base).fetchStats();
  global.fetch = async () => Response.json({}, { status: 503 }); await f.render(base).fetchStats();
  assert.equal(f.render(base).statsLoading, false); assert(f.render(base).statsError); assert.equal(f.render(base).stats.totalCount, 9);
  global.fetch = async () => stats(14); await f.render(base).fetchStats(); assert.equal(f.render(base).statsError, null); assert.equal(f.render(base).stats.totalCount, 14); f.unmount();
});
test('Old filter response cannot overwrite a newer successful request even if abort is ignored', async () => {
  let resolve, oldSignal;
  global.fetch = (_, options) => { oldSignal = options.signal; return new Promise(r => resolve = r); };
  const f = hooks('src/hooks/usePoStats.ts', 'usePoStats'); const old = f.render(base).fetchStats();
  global.fetch = async () => stats(20); await f.render({ ...base, dateFrom: '2026-11-02' }).fetchStats();
  assert.equal(oldSignal.aborted, true); resolve(stats(1)); await old;
  assert.equal(f.render(base).stats.totalCount, 20); f.unmount();
});
test('Unmount aborts stats request and ignores its late result', async () => {
  let resolve, signal;
  global.fetch = (_, options) => { signal = options.signal; return new Promise(r => resolve = r); };
  const f = hooks('src/hooks/usePoStats.ts', 'usePoStats'); f.render(base); f.mount(); f.unmount();
  assert.equal(signal.aborted, true); resolve(stats(50)); await flush(); assert.equal(f.render(base).stats.totalCount, 0);
});
test('Real UI deadline rejects stalled work; stats shows error and permits retry', async () => {
  const { withReadDeadline } = load('src/lib/readDeadline.ts');
  const f = hooks('src/hooks/usePoStats.ts', 'usePoStats', { '@/lib/readDeadline': { withReadDeadline: work => withReadDeadline(work, 5) } });
  global.fetch = () => new Promise(() => {}); await f.render(base).fetchStats();
  assert.equal(f.render(base).statsLoading, false); assert.match(f.render(base).statsError, /batas waktu/);
  global.fetch = async () => stats(7); await f.render(base).fetchStats(); assert.equal(f.render(base).stats.totalCount, 7); f.unmount();
});
test('Auth deadline is opt-in for Home and never changes shared session policy', async () => {
  const { withReadDeadline } = load('src/lib/readDeadline.ts'); let next = new Promise(() => {}), calls = 0;
  const f = hooks('src/hooks/useAuthData.ts', 'useAuthData', {
    '@/lib/me': { getMeSync: () => null, getMe: () => { calls++; return next; } },
    '@/lib/readDeadline': { withReadDeadline: work => withReadDeadline(work, 5) },
  });
  const props = { loadingDeadline: true }; await f.render(props).fetchMe();
  assert.equal(f.render(props).roleReady, false); assert.equal(f.render(props).authLoading, false); assert(f.render(props).authError);
  next = Promise.resolve({ authenticated: true, role: 'rm', regional: 'REGIONAL 1' }); await f.render(props).fetchMe(true);
  assert.equal(f.render(props).role, 'rm'); assert.equal(f.render(props).authError, null); assert.equal(calls, 2);
  f.unmount();
  const legacy = hooks('src/hooks/useAuthData.ts', 'useAuthData', { '@/lib/me': { getMeSync: () => null, getMe: async () => { throw Error('Unavailable'); } } });
  await legacy.render().fetchMe(); assert.equal(legacy.render().roleReady, true); legacy.unmount();
});
test('Master units initial load runs while document lacks focus', async () => {
  const f = hooks('src/hooks/useMasterUnits.ts', 'useMasterUnits', { '@/lib/units': { getUnits: async () => [{ id: 'UNIT' }] } });
  f.render(); f.mount(); await flush(); assert.equal(f.render().unitData[0].id, 'UNIT'); f.unmount();
});
test('ReadTiming measures stages and status but logs no identity or secrets', async () => {
  const previous = process.env.READ_TIMING_ENABLED, info = console.info, output = [];
  process.env.READ_TIMING_ENABLED = '1'; console.info = (...args) => output.push(args);
  try {
    const { createReadTiming } = load('src/lib/readTiming.ts'), timing = createReadTiming('/api/auth/me');
    const value = await timing.measure('auth', async () => ({ secret: 'DO-NOT-LOG' })); assert.equal(value.secret, 'DO-NOT-LOG');
    const response = timing.finish(Response.json({ authenticated: false }, { status: 503 }));
    assert.match(response.headers.get('Server-Timing'), /auth;dur=.*total;dur=/); assert(!JSON.stringify(output).includes('DO-NOT-LOG'));
  } finally { console.info = info; if (previous === undefined) delete process.env.READ_TIMING_ENABLED; else process.env.READ_TIMING_ENABLED = previous; }
});
test('Activity loads initially without focus, pauses hidden polling, resumes once and prevents overlap', async () => {
  const originalInterval = global.setInterval, originalClear = global.clearInterval, originalDocument = global.document;
  let interval, listener, calls = 0, resolve, signal;
  global.document = { hidden: true, addEventListener: (_, fn) => { listener = fn; }, removeEventListener: (_, fn) => { assert.equal(fn, listener); listener = null; } };
  global.setInterval = fn => { interval = fn; return 1; }; global.clearInterval = () => {};
  global.fetch = (_, options) => { calls++; signal = options.signal; return new Promise(r => resolve = r); };
  const empty = {}, mocks = {
    'react/jsx-runtime': { jsx: () => null, jsxs: () => null },
    '@/lib/dashboardDrilldown': empty, recharts: empty, '@/components/ui/card': empty,
    '@/components/PoDateBadge': empty, 'lucide-react': empty, 'next/link': empty, '@/components/DateInputHybrid': empty,
  };
  const f = hooks('src/components/dashboard-widgets.tsx', 'RecentActivityWidget', mocks);
  try {
    f.render(); f.mount(); assert.equal(calls, 1); interval(); assert.equal(calls, 1);
    global.document.hidden = false; listener(); interval(); assert.equal(calls, 1);
    resolve(Response.json([])); await flush(); interval(); assert.equal(calls, 2);
    f.unmount(); assert.equal(signal.aborted, true); assert.equal(listener, null);
    resolve(Response.json([])); await flush();
  } finally { global.setInterval = originalInterval; global.clearInterval = originalClear; global.document = originalDocument; }
});
test('Instrumented GET routes preserve authorization and role scope, including failure status', async () => {
  const timer = { createReadTiming: () => ({ measure: (_, fn) => fn(), finish: response => response }) };
  let auth = null, config = { pusat: { enabledMenus: ['all'], enabledActions: ['all'] }, rm: { enabledMenus: ['po'], enabledActions: ['po_view'] } };
  const mocks = {
    'next/server': { NextResponse: Response }, crypto: require('node:crypto'), '@/lib/readTiming': timer,
    '@/lib/auth': { getSessionWithRole: async () => auth },
    '@/lib/accessControl': { readPermissionsConfigWithVersion: async () => ({ config, version: 7 }) },
    '@/lib/roleAccessPolicy': {}, '@/lib/prisma': {}, '@/lib/audit': {}, '@/app/access-control/constants/accessControlData': {},
  };
  const me = load('src/app/api/auth/me/route.ts', mocks), access = load('src/app/api/access-control/route.ts', mocks);
  assert.equal((await access.GET()).status, 401);
  assert.deepEqual(await (await me.GET()).json(), { authenticated: false });
  auth = { role: 'rm', safeRole: 'rm', session: { jti: 'test', exp: 123 }, dbUser: { id: 'test', regional: 'R1', siteArea: 'S1' } };
  assert.deepEqual((await (await access.GET()).json()).data, { rm: config.rm });
  assert.equal((await (await me.GET()).json()).regional, 'R1');
  auth.role = 'pusat'; auth.safeRole = 'pusat'; assert.deepEqual((await (await access.GET()).json()).data, config);
  config = null; assert.equal((await access.GET()).status, 503); assert.equal((await me.GET()).status, 503);
});
(async () => {
  const previousFetch = global.fetch, previousDocument = global.document;
  let passed = 0;
  try { for (const [name, run] of tests) { try { await run(); passed++; console.log('PASS ' + name); } catch (error) { console.error('FAIL ' + name, error); process.exitCode = 1; } } }
  finally { global.fetch = previousFetch; global.document = previousDocument; }
  console.log(`${passed}/${tests.length} passed; actual hooks/helpers, mocked network, no DB connections`);
})();
