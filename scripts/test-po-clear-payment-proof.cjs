const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const mod = { exports: {} };
const code = ts.transpileModule(fs.readFileSync(path.join(root, 'src/lib/schemas/po.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
new Function('require', 'module', 'exports', code)(require, mod, mod.exports);
const { POBodySchema } = mod.exports;
const base = {
  company: 'TEST', tujuan: 'DC TEST', noPo: 'TEST-PO',
  tglPo: '2026-11-16', expiredTgl: '2026-11-20',
  items: [{ namaProduk: 'PRODUK TEST', pcs: 5, pcsKirim: 0, hargaPcs: 100 }],
  status: { bayar: false, po: true },
};
const tests = [], test = (name, run) => tests.push([name, run]);
for (const value of [null, '', '   ']) {
  test(`Explicit empty ${JSON.stringify(value)} remains null through validation`, () => {
    const parsed = POBodySchema.parse({ ...base, buktiBayar: value });
    assert.equal(parsed.buktiBayar, null);
    assert.equal(parsed.status.bayar, false);
    assert.equal(parsed.status.po, true);
  });
}
test('Omitted field remains undefined so existing value can be preserved', () => {
  assert.equal(POBodySchema.parse(base).buktiBayar, undefined);
});
test('Explicit undefined retains omission semantics', () => {
  assert.equal(POBodySchema.parse({ ...base, buktiBayar: undefined }).buktiBayar, undefined);
});
test('Existing nonempty reconciliation reference is preserved and trimmed', () => {
  const parsed = POBodySchema.parse({ ...base, buktiBayar: ' R-407/10/2026 ', status: { bayar: true } });
  assert.equal(parsed.buktiBayar, 'R-407/10/2026');
  assert.equal(parsed.status.bayar, true);
});
test('Other document fields retain their existing empty-value behavior', () => {
  const parsed = POBodySchema.parse({ ...base, buktiBayar: null, buktiTagih: null, buktiKirim: '', buktiFp: null });
  assert.equal(parsed.buktiBayar, null);
  for (const field of ['buktiTagih', 'buktiKirim', 'buktiFp']) assert.equal(parsed[field], undefined);
});
let passed = 0;
for (const [name, run] of tests) {
  try { run(); passed++; console.log('PASS ' + name); }
  catch (error) { process.exitCode = 1; console.error('FAIL ' + name, error); }
}
console.log(`${passed}/${tests.length} passed; real PO schema, no database/network calls`);
