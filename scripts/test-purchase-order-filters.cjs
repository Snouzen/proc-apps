const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const repo = path.resolve(__dirname, '..');
const ts = require(path.join(repo, 'node_modules/typescript'));

function loader(mocks = {}) {
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const actual = path.join(repo, file);
    const loadedModule = { exports: {} };
    const code = ts.transpileModule(fs.readFileSync(actual, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    new Function('require', 'module', 'exports', code)(id => {
      if (id in mocks) return mocks[id];
      if (id === '@/lib/ttl-cache') return { cacheGet: () => undefined };
      if (id.startsWith('@/')) return load('src/' + id.slice(2) + '.ts');
      if (id.startsWith('.')) return load(path.relative(repo, path.resolve(path.dirname(actual), id + '.ts')));
      return require(id);
    }, loadedModule, loadedModule.exports);
    cache.set(file, loadedModule.exports);
    return loadedModule.exports;
  }
  return load;
}

// Evaluate the actual Prisma-shaped predicates against representative master labels.
function matches(row, where) {
  return Object.entries(where).every(([field, rule]) => {
    if (field === 'AND') return (Array.isArray(rule) ? rule : [rule]).every(part => matches(row, part));
    if (field === 'OR') return rule.some(part => matches(row, part));
    if (field === 'NOT') return !(Array.isArray(rule) ? rule : [rule]).some(part => matches(row, part));
    const actual = row?.[field];
    if (rule === null || typeof rule !== 'object') return actual === rule;
    if ('is' in rule) return actual != null && matches(actual, rule.is);
    if ('OR' in rule || 'AND' in rule) return actual != null && matches(actual, rule);
    if (!Object.keys(rule).some(key => ['equals', 'in', 'not', 'contains'].includes(key))) return actual != null && matches(actual, rule);
    return Object.entries(rule).every(([op, value]) => {
      const normalize = val => rule.mode === 'insensitive' && typeof val === 'string' ? val.toLowerCase() : val;
      if (op === 'mode') return true;
      if (op === 'equals') return normalize(actual) === normalize(value);
      if (op === 'in') return value.some(val => normalize(val) === normalize(actual));
      if (op === 'not') return actual !== value;
      if (op === 'contains') return typeof actual === 'string' && normalize(actual).includes(normalize(value));
      throw Error('Unhandled predicate ' + op);
    });
  });
}

const load = loader();
const { buildPOQueryParams } = load('src/app/api/po/services/poQueryBuilder.ts');
const { poScopeFromUnits } = load('src/lib/utils/poScope.ts');
const units = [
  { idRegional: 'BDG', namaRegional: 'REGIONAL 1 BANDUNG', siteArea: 'SPB BANDUNG' },
  { idRegional: 'SKH', namaRegional: 'REGIONAL 2 SURABAYA', siteArea: 'SPB SUKOHARJO' },
  { idRegional: 'KDL', namaRegional: 'REGIONAL 2 SURABAYA', siteArea: 'SPP KENDAL' },
  { idRegional: 'MKS', namaRegional: 'REGIONAL 3 MAKASSAR', siteArea: 'SPB MAKASSAR' },
  { idRegional: 'REG20', namaRegional: 'REGIONAL 20', siteArea: 'SPB SUKOHARJO TIMUR' },
];
const rows = units.map((unit, index) => ({
  id: String(index), noPo: 'PO-' + index, regional: unit.namaRegional,
  unitProduksiId: unit.idRegional, UnitProduksi: unit,
  RitelModern: { namaPt: index % 2 ? 'COMPANY B' : 'COMPANY A', inisial: 'ALIAS-' + index },
}));
function query(params, auth = { role: 'pusat', session: {}, resolvedPoScope: {} }) {
  return buildPOQueryParams(new URLSearchParams({ summary: 'true', limit: '10', ...params }), auth);
}
function ids(result) { return rows.filter(row => matches(row, result.where)).map(row => row.unitProduksiId); }

const tests = [];
const test = (name, run) => tests.push([name, run]);
for (const unit of units.slice(0, 4)) {
  test('Pusat regional only: ' + unit.namaRegional + ' / ' + unit.siteArea, () => {
    const result = query({ regional: unit.namaRegional });
    assert(ids(result).includes(unit.idRegional));
    assert(!result.where.RitelModern);
    assert(result.where.OR.some(clause => clause.regional?.equals === unit.namaRegional));
  });
  test('Pusat sitearea only, without Company/Inisial/Tujuan: ' + unit.siteArea, () => {
    const result = query({ siteArea: unit.siteArea });
    assert.deepEqual(ids(result), [unit.idRegional]);
    assert.equal(result.where.OR, undefined);
    assert.equal(result.where.RitelModern, undefined);
    assert.equal(result.where.tujuanDetail, undefined);
  });
  test('Pusat combined regional + sitearea: ' + unit.siteArea, () => {
    assert.deepEqual(ids(query({ regional: unit.namaRegional, siteArea: unit.siteArea })), [unit.idRegional]);
  });
}
test('Trimmed case-insensitive regional/sitearea match full labels', () => {
  assert.deepEqual(ids(query({ regional: '  regional 2 surabaya  ', siteArea: '  spb sukoharjo  ' })), ['SKH']);
});
test('Regional filter includes all matching units across different companies', () => {
  assert.deepEqual(ids(query({ regional: 'REGIONAL 2 SURABAYA' })), ['SKH', 'KDL']);
});
test('Sitearea exact matching never includes suffix names', () => {
  assert.deepEqual(ids(query({ siteArea: 'SPB SUKOHARJO' })), ['SKH']);
});
test('Legacy unit ID sitearea parameter still works', () => {
  assert.deepEqual(ids(query({ siteArea: 'SKH' })), ['SKH']);
});
test('Conflicting regional + sitearea yields empty result, not a wider scope', () => {
  assert.deepEqual(ids(query({ regional: 'REGIONAL 1 BANDUNG', siteArea: 'SPB SUKOHARJO' })), []);
});
test('Optional company combines with regional instead of becoming mandatory', () => {
  assert.deepEqual(ids(query({ regional: 'REGIONAL 2 SURABAYA', company: 'COMPANY A' })), ['KDL']);
});

test('Company and inisial intersect without including other aliases of the same company', () => {
  assert.deepEqual(ids(query({ company: 'COMPANY A', inisial: 'alias-2' })), ['KDL']);
});

test('Inisial remains effective without a company filter', () => {
  assert.deepEqual(ids(query({ inisial: 'ALIAS-2' })), ['KDL']);
});

test('Inisial belonging to another company yields no results', () => {
  assert.deepEqual(ids(query({ company: 'COMPANY A', inisial: 'ALIAS-1' })), []);
});

test('Search and column filters cannot broaden the chosen company/inisial', () => {
  assert.deepEqual(ids(query({ company: 'COMPANY A', inisial: 'ALIAS-2', q: 'PO-0' })), []);
  assert.deepEqual(ids(query({ company: 'COMPANY A', inisial: 'ALIAS-2', colFilters: JSON.stringify({ inisial: 'ALIAS-0' }) })), []);
});
test('Legacy regional aliases remain accepted without broad substring matching', () => {
  const oldRow = { ...rows[1], regional: 'reg ii', UnitProduksi: null };
  assert(matches(oldRow, query({ regional: 'REGIONAL 2 SURABAYA' }).where));
  assert(!matches(rows[4], query({ regional: 'REGIONAL 2 SURABAYA' }).where));
});
test('Unassigned PO still matches its full regional label', () => {
  assert(matches({ regional: 'REGIONAL 2 SURABAYA', UnitProduksi: null, unitProduksiId: 'UNKNOWN' }, query({ regional: 'REGIONAL 2 SURABAYA' }).where));
});
for (const role of ['rm', 'sitearea']) {
  const auth = { role, session: {}, dbUser: { regional: 'REGIONAL 2 SURABAYA', siteArea: 'SPB SUKOHARJO' } };
  auth.resolvedPoScope = poScopeFromUnits(role, auth.dbUser.regional, auth.dbUser.siteArea, units);
  test(role + ' retains own scope with empty Company/Inisial/Tujuan', () => {
    assert.deepEqual(ids(query({}, auth)), role === 'rm' ? ['SKH', 'KDL'] : ['SKH']);
  });
  test(role + ' cannot override role boundary using foreign URL filters', () => {
    assert.deepEqual(ids(query({ regional: 'REGIONAL 1 BANDUNG', siteArea: 'SPB BANDUNG' }, auth)), []);
  });
}

// Exercise the actual page hook through its effect/timer boundary, without a browser or database.
async function requestFromHook(regional, siteArea) {
  let states = [], stateIndex = 0, refIndex = 0, refs = [], effectIndex = 0, effects = [], pendingEffects = [], timers = new Map(), timerId = 0, captured;
  const originals = { fetch: global.fetch, setTimeout: global.setTimeout, clearTimeout: global.clearTimeout };
  const react = {
    useState(initial) { const i = stateIndex++; if (!(i in states)) states[i] = initial; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
    useRef(initial) { const i = refIndex++; return refs[i] || (refs[i] = { current: initial }); },
    useCallback: fn => fn,
    useMemo: fn => fn(),
    useEffect(fn, deps) { const i = effectIndex++; if (!effects[i] || deps.some((value, j) => value !== effects[i].deps[j])) { pendingEffects.push(() => { effects[i]?.cleanup?.(); effects[i] = { deps, cleanup: fn() }; }); } },
  };
  const { usePurchaseOrderTable } = loader({ react })('src/hooks/usePurchaseOrderTable.ts');
  function render() { stateIndex = 0; refIndex = 0; effectIndex = 0; const hook = usePurchaseOrderTable([]); const queue = pendingEffects; pendingEffects = []; queue.forEach(fn => fn()); return hook; }
  global.setTimeout = fn => { timers.set(++timerId, fn); return timerId; };
  global.clearTimeout = id => timers.delete(id);
  global.fetch = async url => { captured = new URL(url, 'http://local'); return Response.json({ data: [], total: 0 }); };
  try {
    const first = render();
    await first.handleFetchData('', '', '', regional, siteArea);
    render();
    for (const fn of timers.values()) await fn();
    assert(captured, 'The actual hook must issue a request even without Company');
    assert.equal(captured.searchParams.get('regional') || '', regional);
    assert.equal(captured.searchParams.get('siteArea') || '', siteArea);
    for (const field of ['company', 'inisial', 'tujuan']) assert.equal(captured.searchParams.has(field), false);
    return captured.searchParams;
  } finally {
    effects.forEach(effect => effect?.cleanup?.());
    Object.assign(global, originals);
  }
}
for (const [name, regional, siteArea, expected] of [
  ['regional only', 'REGIONAL 2 SURABAYA', '', ['SKH', 'KDL']],
  ['sitearea only', '', 'SPB SUKOHARJO', ['SKH']],
  ['regional + sitearea', 'REGIONAL 2 SURABAYA', 'SPB SUKOHARJO', ['SKH']],
]) test('Purchase Order hook → real query builder: ' + name + ', other filters empty', async () => {
  const params = await requestFromHook(regional, siteArea);
  assert.deepEqual(ids(buildPOQueryParams(params, { role: 'pusat', session: {}, resolvedPoScope: {} })), expected);
});

(async () => {
  let passed = 0;
  for (const [name, run] of tests) {
    try { await run(); passed++; console.log('PASS ' + name); }
    catch (error) { process.exitCode = 1; console.error('FAIL ' + name, error); }
  }
  console.log(passed + '/' + tests.length + ' passed; actual hook/query/scope code with mocked network and records, no DB writes');
})();
