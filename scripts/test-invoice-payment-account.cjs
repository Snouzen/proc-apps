const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const ts = require('typescript'), { jsPDF } = require('jspdf'), { autoTable } = require('jspdf-autotable');
const root = path.resolve(__dirname, '..');
const logo = 'data:image/png;base64,' + fs.readFileSync(path.join(root, 'public/logo-bulog.png')).toString('base64');
let captured;
function InvoiceDoc(options) {
  const doc = new jsPDF(options), text = doc.text.bind(doc), output = doc.output.bind(doc), image = doc.addImage.bind(doc);
  const records = [], lines = [], line = doc.line.bind(doc);
  captured = { doc, records, lines, bytes: null, mode: null };
  const result = captured;
  doc.text = (value, x, y, ...args) => { records.push({ value, x, y, page: doc.getNumberOfPages(), fontSize: doc.getFontSize() }); return text(value, x, y, ...args); };
  doc.line = (x1, y1, x2, y2, ...args) => { lines.push({ x1, y1, x2, y2, page: doc.getNumberOfPages() }); return line(x1, y1, x2, y2, ...args); };
  // Tests use the local logo only: never request production Storage.
  doc.addImage = (source, ...args) => image(typeof source === 'string' && source.startsWith('https:') ? logo : source, ...args);
  doc.output = type => {
    if (type === 'bloburl') { result.bytes = Buffer.from(output('arraybuffer')); result.mode = 'preview'; return 'blob:test-invoice'; }
    return output(type);
  };
  doc.save = () => { result.bytes = Buffer.from(output('arraybuffer')); result.mode = 'download'; return doc; };
  return doc;
}
const loaded = { exports: {} };
const source = fs.readFileSync(path.join(root, 'src/lib/generateInvoice.ts'), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
new Function('require', 'module', 'exports', code)(name => {
  if (name === 'jspdf') return { __esModule: true, default: InvoiceDoc };
  if (name === 'jspdf-autotable') return { __esModule: true, default: autoTable };
  throw Error('Unexpected dependency ' + name);
}, loaded, loaded.exports);
function fixture(company = 'O! SAVE GROUP', size = 2) {
  return {
    noPo: 'CONTOH-OSAVE-001', noFaktur: 'CONTOH/11/2026/27100', createdAt: '2020-01-01',
    RitelModern: { namaPt: company, inisial: 'INISIAL-RAHASIA-TIDAK-DICETAK' }, tujuanDetail: 'DC CONTOH',
    UnitProduksi: { namaRegional: 'REGIONAL 1 BANDUNG', siteArea: 'SPP SUBANG', managerOperasional: 'Nama Manager Contoh' },
    Items: Array.from({ length: size }, (_, i) => ({ namaProduk: `PRODUK CONTOH ${i + 1}`, pcs: 100, pcsKirim: 50, hargaPcs: 74000, discount: 100000, Product: { satuanKg: 5 } })),
  };
}
function generate(data, action = 'preview') { loaded.exports.generateInvoicePdf(data, action); return captured; }
function content(result) { return result.records.map(r => Array.isArray(r.value) ? r.value.join('\n') : r.value).join('\n'); }
let checks = 0;
function check(name, run) { run(); checks++; console.log('PASS ' + name); }
check('Company exact match includes all aliases, roles, units and old/new POs', () => {
  for (const role of ['pusat', 'rm', 'sitearea']) for (const alias of ['ALIAS A', 'ALIAS B', null]) {
    const data = fixture(); data.role = role; data.RitelModern.inisial = alias;
    const result = generate(data), value = content(result);
    assert(value.includes('180501000026304')); assert(value.includes('MANAJEMEN UB INDUSTRI PERUM BULOG'));
    assert(!value.includes('ALIAS A')); assert(!value.includes('ALIAS B'));
    data.createdAt = '2026-11-09'; data.UnitProduksi.siteArea = 'SPB MAKASSAR'; assert(content(generate(data)).includes('180501000026304'));
  }
});
check('Whitespace/case normalized but partial/other company names never receive account', () => {
  assert(content(generate(fixture('  o!   save group  '))).includes('180501000026304'));
  for (const name of ['O! SAVE GROUP CABANG', 'PT O! SAVE GROUP', 'SAVE GROUP', 'ANEKA JAYA', '', null]) assert(!content(generate(fixture(name))).includes('180501000026304'));
});
check('Preview and download preserve matching document content and totals', () => {
  const preview = generate(fixture()), download = generate(fixture(), 'download');
  assert.equal(preview.mode, 'preview'); assert.equal(download.mode, 'download');
  assert.deepEqual(preview.records, download.records);
  assert(content(preview).includes('Rp 7.400.000')); assert(content(preview).includes('Rp 7.300.000'));
  assert(!content(preview).includes('INISIAL-RAHASIA'));
});
check('Payment block stays below recipient, left of signature, above footer on one page', () => {
  const result = generate(fixture()), bank = result.records.find(r => Array.isArray(r.value) && r.value.includes('Bank BRI'));
  const receiver = result.records.find(r => String(r.value).startsWith('Diterima oleh'));
  const footer = result.records.find(r => String(r.value).startsWith('Dicetak oleh'));
  assert(bank.y > receiver.y); assert.equal(bank.page, footer.page);
  assert(bank.y + 3 * 8 * 1.35 * 25.4 / 72 < footer.y - 5);
  assert(Math.max(...bank.value.map(t => result.doc.getTextWidth(t))) < 125);
});
check('Many products keep payment, summary, signature and footer within A4 bounds', () => {
  for (const size of [7, 10, 15, 20, 35]) {
    const result = generate(fixture('O! SAVE GROUP', size));
    const bank = result.records.find(r => Array.isArray(r.value) && r.value.includes('Bank BRI'));
    const total = result.records.find(r => r.value === 'Total'), manager = result.records.find(r => r.value === 'Nama Manager Contoh');
    const footer = result.records.find(r => String(r.value).startsWith('Pada waktu'));
    assert.equal(bank.page, total.page); assert.equal(bank.page, manager.page); assert.equal(bank.page, footer.page);
    assert(footer.y <= result.doc.internal.pageSize.getHeight() - 12);
  }
});
check('Other companies retain existing recipient/footer layout', () => {
  const result = generate(fixture('ANEKA JAYA'));
  const receiver = result.records.find(r => String(r.value).startsWith('Diterima oleh'));
  const footer = result.records.find(r => String(r.value).startsWith('Dicetak oleh'));
  assert.equal(footer.y - receiver.y, 27); assert(!content(result).includes('Pembayaran melalui:'));
});
if (process.argv.includes('--samples')) {
  const out = path.join(root, 'output/pdf'); fs.mkdirSync(out, { recursive: true });
  for (const [name, company, count] of [['contoh-faktur-osave', 'O! SAVE GROUP', 2], ['contoh-faktur-osave-multiproduk', 'O! SAVE GROUP', 15], ['contoh-faktur-company-lain', 'ANEKA JAYA', 2]]) {
    const result = generate(fixture(company, count)); fs.writeFileSync(path.join(out, name + '.pdf'), result.bytes);
  }
  console.log('Sample PDFs generated using synthetic data and local logo, no network or database access.');
}
console.log(`${checks}/${checks} scenario groups passed (real jsPDF + autoTable).`);
