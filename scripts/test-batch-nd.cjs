const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), ts = require('typescript');
const root = path.resolve(__dirname, '..');
function fixture({ role = 'pusat', permission = true, auditFailure = false, updateConflict = false, size = 4 } = {}) {
  let rows = Array.from({ length: size }, (_, i) => ({ id: 'P' + i, creditLimitBatchId: 'B1', noNd: [null, '   ', 'SPECIAL', 'FINAL'][i % 4],
    linkNd: 'KEEP-LINK-' + i, isNotaDinas: i % 4 >= 2, statusCreditLimit: i % 4 === 3 ? 'APPROVED_DIREKSI' : 'APPROVED', updatedAt: '2026-11-20T00:00:00Z' }));
  let logs = [], transactions = 0;
  const locks = [];
  const db = {
    $executeRaw: async () => { locks.push('allocation'); }, $queryRaw: async () => { locks.push('rows'); },
    creditLimitBatch: { findUnique: async q => q.where.id === 'B1' ? { id: 'B1', batchCode: 'CL-001' } : null },
    purchaseOrder: {
      findMany: async q => structuredClone(rows.filter(po => po.creditLimitBatchId === q.where.creditLimitBatchId).sort((a,b) => a.id.localeCompare(b.id)).slice(0,q.take)),
      updateMany: async q => {
        let count = 0;
        rows = rows.map(po => {
          if (q.where.id.in.includes(po.id) && po.creditLimitBatchId === q.where.creditLimitBatchId && po.statusCreditLimit !== 'APPROVED_DIREKSI') { count++; return { ...po, ...q.data }; }
          return po;
        });
        return { count: updateConflict ? count - 1 : count };
      },
    },
    auditLog: { createMany: async q => { if (auditFailure) throw Error('Audit unavailable'); logs.push(...q.data); } },
  };
  db.$transaction = async (fn, options) => {
    transactions++; assert.equal(options.timeout,15000);
    const before = structuredClone(rows), oldLogs = structuredClone(logs);
    try { return await fn(db); } catch(error) { rows = before; logs = oldLogs; throw error; }
  };
  const mocks = { '@/lib/prisma': { __esModule: true, default: db }, '../../../../../server/generated/prisma': { Prisma: { sql: (strings,...values) => ({ strings,values }) } },
    '@/lib/auth': { getSessionWithRole: async () => role ? { role, dbUser: { id: 'U1' }, session: {} } : null, getProfileName: () => 'TEST' },
    '@/lib/accessControl': { hasPermission: async () => permission } };
  const loaded = new Map();
  function load(file) {
    if (loaded.has(file)) return loaded.get(file);
    const mod = { exports: {} };
    new Function('require','module','exports',ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText)(id => {
      if (id in mocks) return mocks[id];
      if (id.startsWith('@/')) return load('src/' + id.slice(2) + '.ts');
      return require(id);
    },mod,mod.exports);
    loaded.set(file,mod.exports);return mod.exports;
  }
  const service = load('src/app/api/po/services/creditBatchNdService.ts'), route = load('src/app/api/po/credit-limit/nd/route.ts');
  return { run: input => service.updateBatchNd(input,{id:'U1',name:'TEST',role:'pusat'}),
    post: body => route.POST(new Request('http://local/api/po/credit-limit/nd',{method:'POST',body:JSON.stringify(body)})),
    rows: () => rows, logs: () => logs, change: fn => fn(rows), locks, transactions: () => transactions };
}
const base = {batchId:'B1',noNd:'ND-123',policy:'empty'}, tests = [], test = (n,f) => tests.push([n,f]);
async function save(f, input=base) { const checked=await f.run({...input,mode:'check'}); return f.run({...input,mode:'save',expectedSnapshot:checked.snapshot}); }
test('Default fills null/whitespace only; different ND, completed PO, links and statuses preserved',async()=>{
 const f=fixture(),checked=await f.run({...base,mode:'check'});assert.equal(checked.count,2);assert.equal(f.logs().length,0);
 const result=await f.run({...base,mode:'save',expectedSnapshot:checked.snapshot});
 assert.deepEqual(f.rows().map(p=>p.noNd),['ND-123','ND-123','SPECIAL','FINAL']);
 assert.deepEqual(f.rows().map(p=>p.linkNd),[0,1,2,3].map(i=>'KEEP-LINK-'+i));
 assert(f.rows().slice(0,3).every(p=>p.statusCreditLimit==='APPROVED'&&p.isNotaDinas));
 assert.equal(result.data.length,4);assert.equal(f.logs().length,2);assert.deepEqual(f.locks,['allocation','rows']);
});
for(const mode of ['check','save'])test('Replace rejected by route and service before transaction: '+mode,async()=>{
 const f=fixture(),before=structuredClone(f.rows()),input={...base,policy:'replace',mode,expectedSnapshot:'a'.repeat(64)};
 await assert.rejects(f.run(input),e=>e.status===400&&e.code==='ND_BATCH_INVALID_INPUT');
 assert.equal((await f.post(input)).status,400);
 assert.equal(f.transactions(),0);assert.equal(f.logs().length,0);assert.deepEqual(f.rows(),before);
});

test('Existing matching ND preserves its checkbox and creates no audit entry',async()=>{
 const f=fixture();f.change(rows=>{rows[2].noNd=base.noNd;rows[2].isNotaDinas=false;});
 const before=structuredClone(f.rows()[2]);await save(f);
 assert.deepEqual(f.rows()[2],before);assert.equal(f.logs().length,2);
});
test('Full 50-PO batch resolved on server; no browser-provided PO list required',async()=>{const f=fixture({size:50}),r=await save(f);assert.equal(r.total,50);assert.equal(r.data.length,50);assert.equal(r.count,26);});
for(const [name,change] of [ ['ND',rows=>rows[0].noNd='OTHER'], ['status',rows=>rows[0].statusCreditLimit='APPROVED_DIREKSI'], ['membership',rows=>rows[0].creditLimitBatchId='B2'] ]) test('Concurrent '+name+' change aborts without partial updates',async()=>{
 const f=fixture(),checked=await f.run({...base,mode:'check'});f.change(change);const before=structuredClone(f.rows());
 await assert.rejects(f.run({...base,mode:'save',expectedSnapshot:checked.snapshot}),e=>e.code==='ND_BATCH_CHANGED');assert.deepEqual(f.rows(),before);assert.equal(f.logs().length,0);
});
for(const option of ['auditFailure','updateConflict'])test(option+' rolls back all ND writes',async()=>{const f=fixture({[option]:true}),before=structuredClone(f.rows());await assert.rejects(save(f));assert.deepEqual(f.rows(),before);assert.equal(f.logs().length,0);});
for(const size of [0,51])test('Invalid batch size '+size+' rejected',async()=>{const f=fixture({size});await assert.rejects(f.run({...base,mode:'check'}),e=>e.code==='ND_BATCH_INVALID');});
test('Unknown batch rejected',async()=>{const f=fixture();await assert.rejects(f.run({...base,batchId:'UNKNOWN',mode:'check'}),e=>e.status===404);});
test('Repeat fill-empty is a safe no-op after success',async()=>{const f=fixture();await save(f);const r=await save(f);assert.equal(r.count,0);assert.equal(f.logs().length,2);});
for(const options of [{role:null},{role:'rm'},{role:'sitearea'},{permission:false}])test('Authorization rejects '+JSON.stringify(options)+' before transaction',async()=>{const f=fixture(options),r=await f.post({...base,mode:'check'});assert.equal(r.status,options.role===null?401:403);assert.equal(f.transactions(),0);});
for(const body of [{...base,noNd:'   ',mode:'check'},{...base,noNd:'X'.repeat(256),mode:'check'},{...base,policy:'bad',mode:'check'},{...base,mode:'save'}])test('Invalid ND payload rejected before transaction '+JSON.stringify(body).slice(0,90),async()=>{const f=fixture(),r=await f.post(body);assert.equal(r.status,400);assert.equal(f.transactions(),0);});
test('HTTP check/save trims ND and returns complete ND patches with private no-store',async()=>{const f=fixture(),check=await f.post({...base,noNd:' ND-123 ',mode:'check'}),snapshot=(await check.json()).snapshot;const r=await f.post({...base,noNd:' ND-123 ',mode:'save',expectedSnapshot:snapshot});assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'private, no-store');assert.equal((await r.json()).data[0].noNd,'ND-123');});
(async()=>{let passed=0;for(const[n,fn]of tests){try{await fn();passed++;console.log('PASS '+n);}catch(e){process.exitCode=1;console.error('FAIL '+n,e);}}console.log(`${passed}/${tests.length} passed; actual ND service/route with mock transactions and rollback, no real database access`);})();
