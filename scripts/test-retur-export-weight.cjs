const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
const ExcelJS = require('exceljs');
const root = path.resolve(__dirname, '..');
function load(file, mocks = {}) {
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  new Function('require', 'module', 'exports', code)(id => {
    if (!(id in mocks)) throw Error('Unexpected dependency: ' + id);
    return mocks[id];
  }, mod, mod.exports);
  return mod.exports;
}
const helper = load('src/lib/returExportWeight.ts');
const cases = [
  ['10 KG from product name', { produk: 'PUNOKAWAN 10 KG', qtyReturn: 5 }, 50],
  ['5 KG from product name', { produk: 'PUNOKAWAN 5 KG', qtyReturn: 5 }, 25],
  ['valid master weight takes priority', { produk: 'PUNOKAWAN 10 KG', qtyReturn: 5, Product: { satuanKg: 5 } }, 25],
  ['one-KG master remains valid', { produk: 'PRODUK', qtyReturn: 5, Product: { satuanKg: 1 } }, 5],
  ['invalid master falls back to name', { produk: 'PUNOKAWAN 10 KG', qtyReturn: 5, Product: { satuanKg: 0 } }, 50],
  ['decimal comma and case', { produk: 'Beras 2,5 kg', qtyReturn: 4 }, 10],
  ['decimal point without space', { produk: 'Beras 0.5KG', qtyReturn: 4 }, 2],
  ['zero quantity', { produk: 'Beras 10 KG', qtyReturn: 0 }, 0],
  ['missing weight', { produk: 'Beras premium', qtyReturn: 5 }, null],
  ['multiple weights', { produk: 'Beras 5 KG / 10 KG', qtyReturn: 5 }, null],
  ['multiple weights without spaces', { produk: 'Beras 5KG+10KG', qtyReturn: 5 }, null],
  ['multipack', { produk: 'Beras 2 x 5 KG', qtyReturn: 5 }, null],
  ['negative weight', { produk: 'Beras -5 KG', qtyReturn: 5 }, null],
  ['negative quantity', { produk: 'Beras 5 KG', qtyReturn: -1 }, null],
  ['non-finite weight', { produk: 'Beras', qtyReturn: 1, Product: { satuanKg: Infinity } }, null],
];
(async () => {
  for (const [name, input, expected] of cases) {
    assert.equal(helper.getReturExportKg(input), expected, name);
    console.log('PASS ' + name);
  }
  const input = [
    { produk: 'PUNOKAWAN 10 KG', qtyReturn: 5, nominal: 737500, rpKg: 147500 },
    { produk: 'PUNOKAWAN 5 KG', qtyReturn: 2, nominal: 147000, rpKg: 73500 },
    { produk: 'Tidak diketahui', qtyReturn: 1, nominal: 100, rpKg: 100 },
  ];
  const before = JSON.stringify(input);
  const route = load('src/app/api/retur/export/route.ts', {
    'next/server': { NextResponse: Response },
    '@/lib/prisma': { __esModule: true, default: { dataRetur: { findMany: async () => input } } },
    '@/lib/auth': { getSession: async () => ({ role: 'pusat' }) },
    '@/lib/returExportWeight': helper,
    exceljs: ExcelJS,
  });
  const response = await route.GET(new Request('http://localhost/api/retur/export'));
  assert.equal(response.status, 200);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(await response.arrayBuffer()));
  const sheet = workbook.worksheets[0], headers = sheet.getRow(1).values;
  const col = name => headers.indexOf(name);
  assert.equal(sheet.getRow(2).getCell(col('KG')).value, 50);
  assert.equal(sheet.getRow(3).getCell(col('KG')).value, 10);
  assert.equal(sheet.getRow(4).getCell(col('KG')).value, 'Berat belum tersedia');
  assert.equal(sheet.getRow(2).getCell(col('QTY RETUR')).value, 5);
  assert.equal(sheet.getRow(2).getCell(col('NOMINAL')).value, 737500);
  assert.equal(sheet.getRow(2).getCell(col('RP/KG')).value, 147500);
  assert.equal(JSON.stringify(input), before);
  console.log('PASS Actual export endpoint produces numeric KG and missing-weight marker; quantity/amount/RP-KG unchanged');
  console.log(`${cases.length + 1}/${cases.length + 1} passed; workbook in memory, mocked DB/auth, no database writes`);
})().catch(error => { console.error(error); process.exitCode = 1; });
