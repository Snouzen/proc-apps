const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
const XLSX = require('xlsx');
const root = path.resolve(__dirname, '..');

function fixture(total = 2) {
  const states = [], effects = [], books = [], links = [], errors = [], requests = [];
  let cursor = 0;
  const items = [
    { pcs: 100, pcsKirim: 40, Product: { name: 'Produk 5 KG', satuanKg: 5 } },
    { pcs: 20, pcsKirim: 0, Product: { name: 'Produk 10 KG', satuanKg: 10 } },
  ];
  const mocks = {
    react: {
      useState(initial) { const i = cursor++; if (!(i in states)) states[i] = initial; return [states[i], v => { states[i] = typeof v === 'function' ? v(states[i]) : v; }]; },
      useRef: value => ({ current: value }), useMemo: fn => fn(), useCallback: fn => fn,
      useEffect(fn, deps) { if (deps?.length === 1 && Array.isArray(deps[0]) && deps[0][0]?.defaultVisible !== undefined) effects.push(fn); },
    },
    '@/lib/text': { upperClean: value => String(value).trim().toUpperCase() },
    '@/lib/me': { getMe: async () => ({ authenticated: true, role: 'pusat' }) },
    xlsx: { ...XLSX, writeFile: book => books.push(book) },
  };
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(root, 'src/app/report/hooks/useReport.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const fetch = async url => { requests.push(url); return Response.json({ total, data: [{ id: 'PO-TEST', noPo: 'PO-TEST', Items: items }] }); };
  const document = {
    createElement: () => { const link = { setAttribute() {}, click() { links.push(this.href); }, parentNode: { removeChild() {} } }; return link; },
    body: { appendChild() {} },
  };
  new Function('require', 'module', 'exports', 'fetch', 'document', 'alert', 'requestAnimationFrame', code)(
    id => { if (!(id in mocks)) throw Error('Unexpected import: ' + id); return mocks[id]; },
    mod, mod.exports, fetch, document, message => errors.push(message), fn => fn(),
  );
  const render = () => { cursor = 0; return mod.exports.useReport(); };
  render(); effects.splice(0).forEach(fn => fn());
  return { render, books, links, errors, requests };
}

(async () => {
  const small = fixture();
  await small.render().exportExcel();
  assert.deepEqual(small.errors, []);
  const sheet = small.books[0].Sheets.Report;
  const rows = XLSX.utils.sheet_to_json(sheet);
  assert.equal(rows[0]['Berat Satuan (Kg)'], 5);
  assert.equal(rows[0]['Total Kg'], 500);
  assert.equal(rows[0]['KG Kirim'], 200);
  assert.equal(rows[1]['Total Kg'], 200);
  assert.equal(rows[1]['KG Kirim'], 0);
  console.log('PASS Default Excel contains Total Kg and KG Kirim, including partial and zero shipment');

  const hidden = fixture();
  hidden.render().toggleCol('kgKirim');
  await hidden.render().exportExcel();
  const hiddenRows = XLSX.utils.sheet_to_json(hidden.books[0].Sheets.Report);
  assert.equal(Object.hasOwn(hiddenRows[0], 'KG Kirim'), false);
  assert.equal(hiddenRows[0]['Total Kg'], 500);
  console.log('PASS Explicitly hidden KG Kirim follows existing selected-column export behavior');

  const large = fixture(5001);
  await large.render().fetchData();
  await large.render().exportExcel();
  assert.deepEqual(large.errors, []);
  const url = new URL(large.links[0], 'http://localhost');
  assert.equal(url.pathname, '/api/po/export');
  const columns = JSON.parse(url.searchParams.get('cols'));
  assert(columns.some(c => c.id === 'kg' && c.label === 'Total Kg'));
  assert(columns.some(c => c.id === 'kgKirim' && c.label === 'KG Kirim'));
  console.log('PASS Export above 5000 PO sends both KG columns to the server export endpoint');
  console.log('3/3 passed; actual Report hook and XLSX workbook in memory, mocked API, no DB/file export writes');
})().catch(error => { console.error(error); process.exitCode = 1; });
