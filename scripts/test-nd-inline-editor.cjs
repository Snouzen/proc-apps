const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), ts = require('typescript');
const root = path.resolve(__dirname, '..');
function fixture(overrides = {}) {
  let index = 0, refIndex = 0, resolveSave;
  const states = [], refs = [], calls = [], Table = () => null;
  const react = {
    useState(initial) { const i = index++; if (!(i in states)) states[i] = initial; return [states[i], v => { states[i] = typeof v === 'function' ? v(states[i]) : v; }]; },
    useRef(initial) { const i = refIndex++; return refs[i] || (refs[i] = { current: initial }); },
    useMemo: fn => fn(),
  };
  const mocks = { react, '@/components/data-table/DataTableV2': { DataTableV2: Table },
    '@tanstack/react-table': { createColumnHelper: () => ({ display: v => v, accessor: (key, v) => ({ ...v, accessorKey: key }) }) },
    'lucide-react': new Proxy({}, { get: () => () => null }), 'date-fns': { format: () => '' },
    '@/lib/credit-limit': {}, './StandardTooltip': {}, './ActionButton': {}, './StatusBadge': {}, './InlineVendorInput': {} };
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(root, 'src/components/credit-limit/BatchAccordion.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  new Function('require', 'module', 'exports', code)(id => id in mocks ? mocks[id] : require(id), mod, mod.exports);
  const props = { batchCode: 'B1', pos: [{ id: 'P1', statusCreditLimit: 'APPROVED' }], isExpanded: true, isArchived: false,
    onBatchND: (...args) => { calls.push(args); return new Promise(resolve => { resolveSave = resolve; }); },
    onUpdateNDDetails: (...args) => { calls.push(args); return new Promise(resolve => { resolveSave = resolve; }); }, ...overrides };
  function findTable(node) {
    if (!node || typeof node !== 'object') return null;
    if (Array.isArray(node)) return node.map(findTable).find(Boolean);
    return node.type === Table ? node : findTable(node.props?.children);
  }
  const tree = () => { index = refIndex = 0; return mod.exports.BatchAccordion(props); };
  const render = () => findTable(tree()).props;
  return { render, tree, calls, props, resolve: success => resolveSave(success) };
}
function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) return node.map(child => find(child,predicate)).find(Boolean) || null;
  return predicate(node) ? node : find(node.props?.children,predicate);
}
(async () => {
  const f = fixture();
  f.render().meta.setEditNdId('P1'); f.render().meta.setTempNoNd('ND-123'); f.render().meta.setTempLinkNd('link');
  const pending = f.render().meta.saveNd('P1');
  assert.equal(f.render().meta.savingNd, true);
  assert.equal(f.render().meta.editNdId, 'P1');
  assert.equal(f.render().meta.tempNoNd, 'ND-123');
  await f.render().meta.saveNd('P1'); assert.equal(f.calls.length, 1);
  f.resolve(false); await pending;
  assert.equal(f.render().meta.savingNd, false);
  assert.equal(f.render().meta.editNdId, 'P1');
  assert.equal(f.render().meta.tempNoNd, 'ND-123');
  console.log('PASS Pending save keeps inline draft, blocks double clicks and retains editor on failure');
  const retry = f.render().meta.saveNd('P1'); f.resolve(true); await retry;
  assert.equal(f.render().meta.editNdId, null);
  assert.equal(f.render().meta.savingNd, false);
  assert.deepEqual(f.calls, [['P1', 'ND-123', 'link'], ['P1', 'ND-123', 'link']]);
  console.log('PASS Successful retry closes editor only after persistence confirms success');
  const bulk=fixture();
  find(bulk.tree(),node=>node.type==='button'&&node.props.children?.includes?.(' Isi ND per Batch'))?.props.onClick({stopPropagation(){}});
  // JSX text may omit the leading whitespace.
  if(!find(bulk.tree(),node=>node.type==='form'))find(bulk.tree(),node=>node.type==='button'&&node.props.children?.includes?.('Isi ND per Batch')).props.onClick({stopPropagation(){}});
  find(bulk.tree(),node=>node.type==='input'&&node.props.placeholder==='Masukkan No. ND').props.onChange({target:{value:'ND-MASSAL'}});
  assert.equal(find(bulk.tree(),node=>node.type==='select'),null);
  assert(!JSON.stringify(bulk.tree()).includes('Ganti seluruh'));
  find(bulk.tree(),node=>node.type==='form').props.onSubmit({preventDefault(){}});
  assert.deepEqual(bulk.calls,[['B1','ND-MASSAL']]);
  bulk.resolve(false);for(let i=0;i<5;i++)await Promise.resolve();
  assert.equal(find(bulk.tree(),node=>node.type==='input'&&node.props.placeholder==='Masukkan No. ND').props.value,'ND-MASSAL');
  find(bulk.tree(),node=>node.type==='form').props.onSubmit({preventDefault(){}});bulk.resolve(true);for(let i=0;i<5;i++)await Promise.resolve();
  assert.equal(find(bulk.tree(),node=>node.type==='form'),null);
  assert.deepEqual(bulk.calls,[['B1','ND-MASSAL'],['B1','ND-MASSAL']]);
  console.log('PASS Bulk form has no overwrite option, retains draft on failure and closes after success');
  const hasButton=f=>!!find(f.tree(),node=>node.type==='button'&&[node.props.children].flat().some(child=>typeof child==='string'&&child.includes('Isi ND per Batch')));
  const filled=fixture({pos:[{id:'P1',statusCreditLimit:'APPROVED',noNd:'ND-1',isNotaDinas:false}]});
  assert.equal(hasButton(filled),false);
  filled.props.pos[0].noNd='   ';assert.equal(hasButton(filled),true);
  filled.props.pos[0].noNd='ND-2';assert.equal(hasButton(filled),false);
  for(const missingNdCount of [0,1,50]){
    const closed=fixture({pos:[],summary:{poCount:50,approvedCount:50,requestedCount:0,ndCount:50,missingNdCount}});
    assert.equal(hasButton(closed),missingNdCount>0);
  }
  console.log('PASS Button follows blank ND, not checklist; works for closed batch with only one blank and reacts to edits');
  console.log('4/4 passed; actual accordion with mocked React/save, no database writes');
})().catch(error => { console.error(error); process.exitCode = 1; });
