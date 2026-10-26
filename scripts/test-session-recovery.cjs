const fs = require('fs'), path = require('path'), assert = require('node:assert/strict');
const repo = 'D:/Projects/proc-apps';
const root = process.argv[2] || (fs.existsSync(path.join(__dirname, 'src')) ? __dirname : path.resolve(__dirname, '..'));
const ts = require(path.join(repo, 'node_modules/typescript'));
function load(file, mocks = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  new Function('require','module','exports', code)(id => {
    if (id in mocks) return mocks[id];
    if (id.startsWith('@/')) return load('src/'+id.slice(2)+'.ts',mocks);
    return require(id);
  },module,module.exports);
  return module.exports;
}
const policy = load('src/lib/session-policy.ts');
const { SessionRecovery } = policy;
const base = { authenticated:true,userId:'U1',email:'pusat@example.test',role:'pusat',regional:null,siteArea:null,expiresAt:Date.now()+14400000,sessionRevision:'A',permissionsHash:'P' };
const tests=[];const test=(name,fn)=>tests.push([name,fn]);
test('Four hours shared policy',()=>{assert.equal(policy.SESSION_TTL_SECONDS,14400);assert.equal(policy.SESSION_TTL_MS,14400000);});
test('Same user new session resumes after expiry',()=>{const c=new SessionRecovery(base);c.lock('expired');assert(c.observe({...base,sessionRevision:'B'}));assert.equal(c.reason,'active');});
test('Signal alone cannot unlock',()=>{const c=new SessionRecovery(base);c.lock('checking');assert.equal(c.reason,'checking');});
test('Idle cannot unlock using the old valid session',()=>{const c=new SessionRecovery(base);c.lock('idle');assert(!c.observe(base));assert(c.observe({...base,sessionRevision:'B'}));});
test('Logout requires a newly issued session',()=>{const c=new SessionRecovery(base);c.lock('logout');assert(!c.observe(base));assert(c.observe({...base,sessionRevision:'B'}));});
for(const change of [{userId:'U2'},{email:'other@example.test'},{role:'rm'},{regional:'Regional 2'},{siteArea:'SPB DKI'},{permissionsHash:'OTHER'}]){
 test('Changed identity/access remains locked '+JSON.stringify(change),()=>{const c=new SessionRecovery(base);c.lock('checking');assert(!c.observe({...base,...change,sessionRevision:'B'}));assert.equal(c.reason,'changed');});
}
test('Old unauthenticated snapshot does not erase form owner',()=>{const c=new SessionRecovery(base);assert(!c.observe({authenticated:false}));assert.equal(c.baseline.userId,'U1');assert(c.observe({...base,sessionRevision:'B'}));});
test('Missing verification metadata cannot unlock',()=>{const c=new SessionRecovery(base);assert(!c.observe({...base,permissionsHash:undefined}));assert.equal(c.reason,'unavailable');});
test('New revision invalidates requests captured under old epoch',()=>{const c=new SessionRecovery(base);const old=c.epoch;c.observe({...base,sessionRevision:'B'});assert.notEqual(c.epoch,old);});

// Run the actual detector's lifecycle against browser doubles. No auth/database writes.
class Events { constructor(){this.listeners=new Map();} addEventListener(k,f){if(!this.listeners.has(k))this.listeners.set(k,new Set());this.listeners.get(k).add(f);} removeEventListener(k,f){this.listeners.get(k)?.delete(f);} dispatchEvent(e){this.listeners.get(e.type)?.forEach(f=>f(e));return true;} }
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
async function mountDetector(initial=base){
 const win=new Events(),doc=new Events(),storage=new Map(),state=[],effects=[],refs=[];
 let response={...initial},mutationCount=0,pending401;
 const app={inert:false},form={value:'Unsaved work',updatedAt:'original-version'},timers=[];
 win.location={origin:'http://localhost',reload(){throw Error('Unexpected reload');}};
 win.setTimeout=()=>1;win.clearTimeout=()=>{};win.setInterval=fn=>{timers.push(fn);return 1;};win.clearInterval=()=>{};
 win.fetch=async(input,init)=>{
  const url=String(input);
  if(url==='/api/auth/me') { if(response instanceof Error) throw response; return Response.json(response); }
  if(url==='/api/delayed') return new Promise(resolve=>{pending401=resolve;});
  if((init?.method||'GET')==='POST')mutationCount++;
  return Response.json({ok:true});
 };
 doc.hidden=false;doc.getElementById=()=>app;
 global.window=win;global.document=doc;
 global.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
 global.CustomEvent=class {constructor(type,init){this.type=type;this.detail=init.detail;}};
 let cache={...initial};
 const React={useState:v=>{const i=state.length;state.push(v);return[v,n=>{state[i]=n;}];},useRef:v=>{const r={current:v};refs.push(r);return r;},useEffect:f=>effects.push(f)};
 const Detector=load('src/components/IdleTimeoutDetector.tsx',{'react':React,'react/jsx-runtime':{jsx:()=>null,jsxs:()=>null},'next/navigation':{usePathname:()=>'/po'},'@/lib/session-policy':policy,'@/lib/me':{getMeSync:()=>cache,setMeCache:v=>{cache=v;},clearMeCache:()=>{cache=null;}}}).default;
 Detector();const cleanup=effects[0]();await flush();
 return {win,app,form,state,timers,storage,cleanup,setSession:v=>{response=v;},getMutationCount:()=>mutationCount,resolve401:()=>pending401(Response.json({error:'Unauthorized'},{status:401})),signal:kind=>win.dispatchEvent(new CustomEvent(policy.SESSION_CHANGE_EVENT,{detail:{kind}}))};
}
test('Detector preserves mounted form across expiry and login in another tab',async()=>{
 const t=await mountDetector();assert.equal(t.state[0],'active');
 t.setSession({authenticated:false});t.signal('changed');await flush();assert(t.app.inert);
 t.setSession({...base,sessionRevision:'B'});t.signal('login');await flush();
 assert.equal(t.state[0],'active');assert(!t.app.inert);assert.equal(t.form.value,'Unsaved work');assert.equal(t.form.updatedAt,'original-version');t.cleanup();
});
test('Detector blocks Save while locked without submitting or replaying mutation',async()=>{
 const t=await mountDetector();t.setSession({authenticated:false});t.signal('changed');await flush();
 assert.equal((await t.win.fetch('/api/po',{method:'POST'})).status,401);assert.equal(t.getMutationCount(),0);
 t.setSession({...base,sessionRevision:'B'});t.signal('login');await flush();assert.equal(t.getMutationCount(),0);
 await t.win.fetch('/api/po',{method:'POST'});assert.equal(t.getMutationCount(),1);t.cleanup();
});
test('Late 401 from old session cannot close a recovered form',async()=>{
 const t=await mountDetector();const old=t.win.fetch('/api/delayed');
 t.setSession({...base,sessionRevision:'B'});t.signal('login');await flush();t.resolve401();await old;await flush();assert.equal(t.state[0],'active');t.cleanup();
});
test('Different account keeps form locked and unsent',async()=>{const t=await mountDetector();t.setSession({...base,email:'other@example.test',userId:'U2',sessionRevision:'B'});t.signal('login');await flush();assert.equal(t.state[0],'changed');assert(t.app.inert);assert.equal(t.form.value,'Unsaved work');t.cleanup();});
test('Server/network failure is distinct from expired session and recovers',async()=>{const t=await mountDetector();t.setSession(new Error('offline'));t.signal('changed');await flush();assert.equal(t.state[0],'unavailable');t.setSession(base);t.signal('changed');await flush();assert.equal(t.state[0],'active');t.cleanup();});
test('Metadata and token never travel in cross-tab payload',()=>{const source=fs.readFileSync(path.join(root,'src/lib/me.ts'),'utf8');assert(source.includes('const message = { kind, nonce: crypto.randomUUID() }'));assert(!source.includes('window.location.reload'));});
test('Login, profile cookie and token use shared lifetime',()=>{const auth=fs.readFileSync(path.join(root,'src/lib/auth.ts'),'utf8');assert(auth.includes('exp: Date.now() + SESSION_TTL_MS'));assert(!auth.includes('Number(process.env.SESSION_TTL_MS)'));for(const f of ['login','profile'])assert(fs.readFileSync(path.join(root,'src/app/api/auth/'+f+'/route.ts'),'utf8').includes('maxAge: SESSION_TTL_SECONDS'));});

test('Frequent activity still updates cross-tab storage at least every ten seconds',async()=>{
 const originalNow=Date.now;let now=originalNow();Date.now=()=>now;
 try {const t=await mountDetector();for(let i=0;i<15;i++){now+=1000;t.win.dispatchEvent({type:'keydown'});}assert(now-Number(t.storage.get(policy.ACTIVITY_KEY))<10000);t.cleanup();} finally {Date.now=originalNow;}
});
test('Old /me response cannot overwrite freshly verified login cache',async()=>{
 const oldFetch=global.fetch;let resolve;
 global.window=new Events();global.sessionStorage={setItem(){},removeItem(){},getItem(){return null;}};
 global.fetch=()=>new Promise(r=>{resolve=r;});
 try {const me=load('src/lib/me.ts',{'@/lib/session-policy':policy});const old=me.getMe();me.setMeCache({...base,sessionRevision:'B'});resolve(Response.json({authenticated:false}));const result=await old;assert.equal(result.sessionRevision,'B');assert.equal(me.getMeSync().sessionRevision,'B');}finally{global.fetch=oldFetch;}
});
test('/me exposes safe metadata and hashes only effective role permissions',async()=>{
 let config={pusat:{enabledMenus:['B','A'],enabledActions:['write','read']}};
 const endpoint=load('src/app/api/auth/me/route.ts',{
  'next/server':{NextResponse:{json:(data,init)=>Response.json(data,init)}},
  '@/lib/auth':{getSessionWithRole:async()=>({session:{...base,userId:'U1',jti:'secret-jti',exp:base.expiresAt},role:'pusat',dbUser:null})},
  '@/lib/accessControl':{readPermissionsConfigWithVersion:async()=>({config,version:1})}
 }).GET;
 const req=new Request('http://localhost/api/auth/me');const response=await endpoint(req);assert.equal(response.headers.get('cache-control'),'private, no-store');const a=await response.json();assert.equal(a.expiresAt,base.expiresAt);assert(!JSON.stringify(a).includes('secret-jti'));assert(!('jti' in a));config.pusat.enabledMenus.reverse();const b=await(await endpoint(req)).json();assert.equal(a.permissionsHash,b.permissionsHash);config.pusat.enabledActions.push('delete');const c=await(await endpoint(req)).json();assert.notEqual(a.permissionsHash,c.permissionsHash);
});
test('/me outage returns 503 rather than masquerading as logout',async()=>{
 const endpoint=load('src/app/api/auth/me/route.ts',{'next/server':{NextResponse:{json:(data,init)=>Response.json(data,init)}},'@/lib/auth':{getSessionWithRole:async()=>{throw Error('DB unavailable');}},'@/lib/accessControl':{}}).GET;
 assert.equal((await endpoint(new Request('http://localhost/api/auth/me'))).status,503);
});
(async()=>{let passed=0;for(const[name,fn]of tests){try{await fn();passed++;console.log('PASS',name);}catch(e){console.error('FAIL',name,e);process.exitCode=1;}}console.log(passed+'/'+tests.length+' passed; simulated browser, no DB writes');})();
