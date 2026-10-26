const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const repo='D:/Projects/proc-apps';
const root=process.argv[2]||(fs.existsSync(path.join(__dirname,'src'))?__dirname:path.resolve(__dirname,'..'));
const ts=require(path.join(repo,'node_modules/typescript'));
const tests=[];function test(n,f){tests.push([n,f]);}
function loader(mocks){const cache=new Map();return function load(file){
 const staged=path.join(root,file),actual=fs.existsSync(staged)?staged:path.join(repo,file);
 if(cache.has(actual))return cache.get(actual).exports;
 const m={exports:{}};cache.set(actual,m);
 const code=ts.transpileModule(fs.readFileSync(actual,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 new Function('require','module','exports',code)(id=>id in mocks?mocks[id]:id.startsWith('@/')?load('src/'+id.slice(2)+'.ts'):id.startsWith('.')?load(path.relative(path.dirname(actual).startsWith(root)?root:repo,path.resolve(path.dirname(actual),id+'.ts'))):require(require.resolve(id,{paths:[repo]})),m,m.exports);return m.exports;
};}
const unit={idRegional:'U1',namaRegional:'Regional 1',siteArea:'SITE A'};
const ritels=[{id:'A1',namaPt:'MATAHARI',inisial:'MATA TIMUR'},{id:'A2',namaPt:'MATAHARI',inisial:'MATA BARAT'},{id:'B1',namaPt:'OTHER COMPANY',inisial:'MATA TIMUR'}];
const pos=[['I1','A1',100],['I2','A2',200],['OTHER','B1',999]].map(([noInvoice,ritelId,value])=>({id:'PO'+noInvoice,noPo:'PO'+noInvoice,noInvoice,ritelId,UnitProduksi:unit,Items:[{rpTagih:value,Product:{name:'Rice'}}],statusBayar:false}));
const returs=[['R1','A1',10],['R2','A2',20],['R3','B1',999]].map(([id,ritelId,value])=>({id,ritelId,rtvCn:'CN-SAME',nominal:value,qtyReturn:1,LokasiBarang:unit,PembebananReturn:unit,Product:{name:'Rice'},lokasiBarangId:'U1',referensiPembayaran:null}));
function match(row,where={}){return Object.entries(where).every(([k,v])=>{
 if(v===undefined)return true;if(k==='AND')return (Array.isArray(v)?v:[v]).every(w=>match(row,w));if(k==='OR')return v.some(w=>match(row,w));
 const x=row[k];if(v===null||typeof v!=='object')return x===v;
 if('in'in v&&!v.in.includes(x))return false;if('not'in v&&x===v.not)return false;
 if('equals'in v&&(v.mode==='insensitive'?String(x).toLowerCase()!==String(v.equals).toLowerCase():x!==v.equals))return false;
 if('hasSome'in v&&!v.hasSome.some(a=>(x||[]).includes(a)))return false;
 if('endsWith'in v&&!String(x||'').endsWith(v.endsWith))return false;
 if('contains'in v&&!String(x||'').includes(v.contains))return false;
 return true;
 });}
function fixture({ realFiles = false } = {}){
 let saved=null;const records=[],proofCalls=[],moves=[];
 const table=rows=>({findMany:async({where}={})=>rows.filter(r=>match(r,where)),findUnique:async({where})=>rows.find(r=>match(r,where))||null,findFirst:async({where}={})=>rows.find(r=>match(r,where))||null,updateMany:async()=>({count:1}),count:async()=>records.length,aggregate:async()=>({_sum:{bankStatement:0}})});
 const db={ritelModern:table(ritels),purchaseOrder:table(pos),dataRetur:table(returs),promo:table([]),auditLog:table([]),reconcile:table(records),$executeRaw:async()=>0,$queryRaw:async()=>[]};
 db.reconcile.upsert=async({create,update,where})=>{const old=records.find(r=>r.id===where.id);saved=old?{...old,...update}:{...create};if(!old)records.push(saved);else Object.assign(old,saved);return saved;};
 db.$transaction=async fn=>fn(db);
 const mocks={
  '@/lib/prisma':{__esModule:true,default:db},
  'next/server':{NextResponse:{json:(data,init)=>Response.json(data,init)}},
  '@/lib/auth':{getSessionWithRole:async()=>({role:'pusat',session:{email:'test@example.test'},dbUser:{id:'ADMIN'}}),getProfileName:()=> 'Admin'},
  '@/lib/accessControl':{hasPermission:async()=>true},
  '@prisma/client':{Prisma:{sql:(s,...v)=>({s,v}),join:v=>v}},
  '@/lib/audit':{auditActivity:async()=>{}},
  '@/lib/generatePoInvoiceNumber':{withTransactionRetry:async fn=>fn()},
  '@/lib/supabase':{supabaseAdmin:{}},
  '@/app/api/rekon/services/rekonFileUtils':{},
 };
 const files={extractStoragePathFromUrl:()=>null,validateProofFile:async url=>{proofCalls.push(url);return null;},safelyFinalizeProofFile:async(...args)=>{moves.push(args);return null;},rollbackFinalizedFiles:async()=>({success:true,failed:[]})};
 if (!realFiles) mocks['./rekonFileUtils']=files;
 const load=loader(mocks);
 return {db,records,load,proofCalls,moves,getSaved:()=>saved};
}
const body={ritelId:'A1',companyName:'MATAHARI',invoices:['I1','I2'],rtvs:[{id:'R1',noRtv:'CN-SAME'},{id:'R2',noRtv:'CN-SAME'}],status:'draft'};
const auth={role:'pusat',safeRole:'pusat',session:{email:'test@example.test'},dbUser:{id:'ADMIN'}};
test('Company resolution includes both initials but no foreign company',async()=>{const f=fixture(),g=await f.load('src/app/api/rekon/services/rekonAccessHelper.ts').resolveRitelGroup(f.db,'A1','MATAHARI','MATA TIMUR');assert.deepEqual(g.companyRitelIds,['A1','A2']);assert.deepEqual(g.siblingRitelIds,['A1','A2']);});
test('Forged companyName/id combination rejected',async()=>{const f=fixture();await assert.rejects(()=>f.load('src/app/api/rekon/services/rekonAccessHelper.ts').resolveRitelGroup(f.db,'B1','MATAHARI'));});
test('Unknown ID does not fall back to a supplied company name',async()=>{const f=fixture();await assert.rejects(()=>f.load('src/app/api/rekon/services/rekonAccessHelper.ts').resolveRitelGroup(f.db,'MISSING','MATAHARI'));});
test('Lookup suggests all initials and only the selected company',async()=>{const f=fixture(),GET=f.load('src/app/api/rekon/lookup/route.ts').GET;const r=await GET(new Request('http://localhost/api/rekon/lookup?ritelId=A1&companyName=MATAHARI&inisial=MATA%20TIMUR'));assert.equal(r.status,200);const d=await r.json();assert.deepEqual(d.invoices.map(i=>i.noInvoice),['I1','I2']);assert.deepEqual(d.rtvs.map(i=>i.id),['R1','R2']);});
test('Invoice lookup accepts another initial of selected company',async()=>{const f=fixture(),GET=f.load('src/app/api/rekon/lookup/route.ts').GET;const d=await(await GET(new Request('http://localhost/api/rekon/lookup?ritelId=A1&invoiceNo=I2'))).json();assert.equal(d.data[0].ritelId,'A2');});
test('Direct foreign invoice lookup is empty',async()=>{const f=fixture(),GET=f.load('src/app/api/rekon/lookup/route.ts').GET;const d=await(await GET(new Request('http://localhost/api/rekon/lookup?ritelId=A1&invoiceNo=OTHER'))).json();assert.deepEqual(d.data,[]);});
test('Direct RTV ID lookup works without CN and stays company-scoped',async()=>{const f=fixture(),GET=f.load('src/app/api/rekon/lookup/route.ts').GET;const a=await(await GET(new Request('http://localhost/api/rekon/lookup?ritelId=A1&rtvId=R2'))).json();assert.equal(a.data[0].id,'R2');const b=await(await GET(new Request('http://localhost/api/rekon/lookup?ritelId=A1&rtvId=R3'))).json();assert.deepEqual(b.data,[]);});
test('Lookup without selected company returns 400',async()=>{const f=fixture(),GET=f.load('src/app/api/rekon/lookup/route.ts').GET;assert.equal((await GET(new Request('http://localhost/api/rekon/lookup?invoiceNo=I1'))).status,400);});
test('Save recalculates mixed initials within one company and persists exact RTV IDs',async()=>{const f=fixture();const saved=await f.load('src/app/api/rekon/services/rekonSaveService.ts').saveRekon(body,auth);assert.equal(saved.totalInvoices,300);assert.equal(saved.totalRtvs,30);assert.deepEqual(saved.rtvDetails.map(r=>r.id),['R1','R2']);assert.equal(saved.ritelId,'A1');});
test('Save rejects foreign invoice even when payload forges totals',async()=>{const f=fixture();await assert.rejects(()=>f.load('src/app/api/rekon/services/rekonSaveService.ts').saveRekon({...body,invoices:['OTHER'],totalInvoices:999},auth));assert.equal(f.getSaved(),null);});
test('Save rejects explicit foreign RTV ID, never replaces it with same CN',async()=>{const f=fixture();await assert.rejects(()=>f.load('src/app/api/rekon/services/rekonSaveService.ts').saveRekon({...body,rtvs:[{id:'R3',noRtv:'CN-SAME'}]},auth));assert.equal(f.getSaved(),null);});
test('Ambiguous CN-only mutation requires explicit ID',async()=>{const f=fixture();await assert.rejects(()=>f.load('src/app/api/rekon/services/rekonSaveService.ts').saveRekon({...body,rtvs:['CN-SAME']},auth),/beberapa record/);});
test('Existing company permits changing representative initial on edit',async()=>{const f=fixture(),save=f.load('src/app/api/rekon/services/rekonSaveService.ts').saveRekon;const first=await save(body,auth);const next=await save({...body,id:first.id,ritelId:'A2'},auth);assert.equal(next.totalInvoices,300);assert.equal(next.ritelId,'A1');});
test('Edit cannot switch to a different company',async()=>{const f=fixture(),save=f.load('src/app/api/rekon/services/rekonSaveService.ts').saveRekon;const first=await save(body,auth);await assert.rejects(()=>save({...body,id:first.id,ritelId:'B1',companyName:'OTHER COMPANY'},auth),/Company tidak dapat diubah/);});
test('Detail and list resolve mixed initials consistently and export accepts them',async()=>{
 const f=fixture(),save=f.load('src/app/api/rekon/services/rekonSaveService.ts').saveRekon;const saved=await save(body,auth);saved.RitelModern=ritels[0];
 const detail=await f.load('src/app/api/rekon/services/rekonSingleService.ts').fetchSingleRekon(saved.id,auth);
 assert.deepEqual(detail.detailedInvoices.map(i=>i.nominal),[100,200]);assert.deepEqual(detail.detailedRtvs.map(i=>i.id),['R1','R2']);
 const list=await f.load('src/app/api/rekon/services/rekonListService.ts').fetchRekonList(new URLSearchParams(),auth);
 assert.deepEqual(list.data[0].invoices.map(i=>i.nominal),[100,200]);assert.deepEqual(list.data[0].rtvs.map(i=>i.id),['R1','R2']);
 const prepare=f.load('src/lib/rekonExportData.ts').prepareRekonExport;assert.equal(prepare([detail])[0].rtvs.length,2);assert.equal(prepare(list.data)[0].rtvs.length,2);
});
test('Regional access remains checked for every selected record',async()=>{const f=fixture(),check=f.load('src/app/api/rekon/services/rekonAccessHelper.ts').checkReconcileAccess;const a=await check({ritelId:'A1',invoices:['I1','I2'],rtvDetails:[],preloadedPos:pos}, {role:'rm',dbUser:{regional:'REGIONAL 2'}});assert(!a.allowed);});
test('A payment reference does not authorize records of another company',async()=>{const f=fixture(),check=f.load('src/app/api/rekon/services/rekonAccessHelper.ts').checkReconcileAccess;const foreign={...pos[2],buktiBayar:'REC'};const a=await check({ritelId:'A1',noRekonsiliasi:'REC',invoices:['OTHER'],preloadedPos:[foreign]}, {role:'rm',dbUser:{regional:'REGIONAL 1'}});assert(!a.allowed);});
test('Final save accepts mixed initials of the same company',async()=>{const f=fixture();const saved=await f.load('src/app/api/rekon/services/rekonSaveService.ts').saveRekon({...body,status:'final'},auth);assert.equal(saved.status,'final');assert.equal(saved.totalInvoices,300);assert.equal(saved.totalRtvs,30);});
test('RTV already finalized under another initial cannot be bound again',async()=>{const f=fixture();f.records.push({id:'OLD',ritelId:'A2',status:'final',noRekonsiliasi:'OLD',invoices:[],rtvs:['CN-SAME'],rtvDetails:[{id:'R2',noRtv:'CN-SAME'}]});await assert.rejects(()=>f.load('src/app/api/rekon/services/rekonSaveService.ts').saveRekon(body,auth),/rekonsiliasi|terikat/);});
test('Foreign reference invoice cannot determine return allocation',async()=>{const f=fixture();await assert.rejects(()=>f.load('src/app/api/rekon/services/rekonSaveService.ts').saveRekon({...body,status:'final',rtvs:[{id:'R1',noRtv:'CN-SAME',refInvoice:'OTHER'}]},auth),/Referensi invoice RTV/);});
test('Drive rincian link saves without entering Storage validation or move',async()=>{const f=fixture();const link='https://drive.google.com/file/d/EXAMPLE/view?usp=sharing';const result=await f.load('src/app/api/rekon/services/rekonSaveService.ts').saveRekon({...body,rincianBayarUrl:link},auth);assert.equal(result.rincianBayarUrl,link);assert(!f.proofCalls.includes(link));assert.equal(f.moves.length,0);});
test('Sheets link accepted and malformed link rejected before any save',async()=>{const f=fixture(),save=f.load('src/app/api/rekon/services/rekonSaveService.ts').saveRekon;const link='https://docs.google.com/spreadsheets/d/EXAMPLE/edit#gid=0';const result=await save({...body,rincianBayarUrl:link},auth);assert.equal(result.rincianBayarUrl,link);await assert.rejects(()=>save({...body,rincianBayarUrl:'javascript:alert(1)'},auth),/Link rincian bayar tidak valid/);});
test('Editing and clearing rincian link persists null',async()=>{const f=fixture(),save=f.load('src/app/api/rekon/services/rekonSaveService.ts').saveRekon;const a=await save({...body,rincianBayarUrl:'https://drive.google.com/file/d/EXAMPLE/view'},auth);const b=await save({...body,id:a.id,rincianBayarUrl:''},auth);assert.equal(b.rincianBayarUrl,null);});
test('Legacy draft proof survives edit plus Sheets link and final submit without Storage writes',async()=>{
  const original=process.env.SUPABASE_URL;process.env.SUPABASE_URL='https://legacy-test.supabase.co';
  try{const f=fixture({realFiles:true}),save=f.load('src/app/api/rekon/services/rekonSaveService.ts').saveRekon;
    const draft=await save(body,auth);const url='https://legacy-test.supabase.co/storage/v1/object/public/bukti_bayar_rekon/bukti-bayar/new_1792571224973.jpeg';
    f.records[0].buktiBayarUrl=url;
    for(const status of ['draft','final']){const result=await save({...body,id:draft.id,status,buktiBayarUrl:url,rincianBayarUrl:'https://docs.google.com/spreadsheets/d/EXAMPLE/edit'},auth);assert.equal(result.buktiBayarUrl,url);assert.equal(result.status,status);}
  }finally{if(original===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=original;}
});
test('A new record cannot claim a legacy proof by forging request metadata',async()=>{
 const original=process.env.SUPABASE_URL;process.env.SUPABASE_URL='https://legacy-test.supabase.co';
 try{const f=fixture({realFiles:true});await assert.rejects(()=>f.load('src/app/api/rekon/services/rekonSaveService.ts').saveRekon({...body,buktiBayarUrl:'https://legacy-test.supabase.co/storage/v1/object/public/bukti_bayar_rekon/bukti-bayar/new_1792571224973.jpeg',previousUrl:'forged',retained:{previousUrl:'forged'}},auth),/penyimpanan resmi/);assert.equal(f.getSaved(),null);}
 finally{if(original===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=original;}
});
test('Initial selector and mandatory initial guard removed from form',()=>{for(const f of ['src/app/rekon/calc/components/RekonForm.tsx','src/app/rekon/calc/hooks/useRekonCalc.ts']){const s=fs.readFileSync(fs.existsSync(path.join(root,f))?path.join(root,f):path.join(repo,f),'utf8');assert(!s.includes('selectedInisial'));assert(!s.includes('PILIH INISIAL'));}});
(async()=>{let pass=0;for(const[n,f]of tests){try{await f();pass++;console.log('PASS',n);}catch(e){console.error('FAIL',n,e.stack);process.exitCode=1;}}console.log(pass+'/'+tests.length+' passed; in-memory DB only');})();
