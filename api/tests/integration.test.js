import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';

const origin = 'https://rustports.com';
const hash = async text => Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))).toString('hex');

test('real Worker and D1: authentication, review, publishing, picks, owner edits and withdrawal', { timeout: 120000 }, async t => {
  const outbound=[];
  const mf=new Miniflare(convertV4MiniflareOptions({ workers:[{ name:'rustports-test', modules:true, scriptPath:new URL('../worker.js',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1'), compatibilityDate:'2026-08-18', d1Databases:['DB'], bindings:{SITE_ORIGIN:origin,MODERATOR_GITHUB_IDS:'2',GITHUB_CLIENT_ID:'test',GITHUB_CLIENT_SECRET:'test-only'}, outboundService:async request=>{
    outbound.push(request.url);
    if(request.url==='https://api.github.com/repos/maker/game')return Response.json({private:false,disabled:false,name:'game',owner:{login:'maker',id:1,type:'User'}});
    if(request.url==='https://github.com/login/oauth/access_token')return Response.json({access_token:'test-token-never-store',scope:'read:user'});
    if(request.url==='https://api.github.com/user')return Response.json({id:4,login:'oauth-maker'});
    throw new Error(`Unexpected outbound request: ${request.url}`);
  }}]}));
  t.after(()=>mf.dispose());
  const db=await mf.getD1Database('DB','rustports-test');
  for(const name of (await readdir(new URL('../migrations/',import.meta.url))).sort()){
    const sql=await readFile(new URL(`../migrations/${name}`,import.meta.url),'utf8');
    for(const statement of sql.split(';').map(s=>s.trim()).filter(Boolean))await db.prepare(statement).run();
  }
  const now=new Date().toISOString(),future=new Date(Date.now()+3600000).toISOString();
  for(const [id,login] of [[1,'maker'],[2,'moderator'],[3,'outsider']]){
    await db.prepare('INSERT INTO users VALUES (?1,?2,?3,?3)').bind(id,login,now).run();
    await db.prepare('INSERT INTO sessions VALUES (?1,?2,?3,?4,?5)').bind(await hash(String(id).repeat(64)),await hash('c'.repeat(64)),id,now,future).run();
  }
  async function call(path,{user,method='GET',body,headers={}}={}){
    const h={Origin:origin,...headers};
    if(user){h.Cookie=`rp_session=${String(user).repeat(64)}; rp_csrf=${'c'.repeat(64)}`;h['X-CSRF-Token']='c'.repeat(64);}
    if(body!==undefined)h['Content-Type']='application/json';
    const response=await mf.dispatchFetch(`https://api.rustports.com${path}`,{method,headers:h,...(body!==undefined?{body:JSON.stringify(body)}:{})});
    const data=await response.json();return {status:response.status,data};
  }
  const payload={name:'Original game',summary:'Original Rust implementation without copied assets',category:'sandbox',developmentStage:'playable',repositoryUrl:'https://github.com/maker/game',connectionAddress:'play.example.net:27015',noAssetsAttested:true,selfHostedAttested:true};
  await t.test('health and identity use real bindings',async()=>{
    assert.equal((await call('/api/health')).data.authConfigured,true);
    assert.equal((await call('/api/me')).data.user,null);
    assert.equal((await call('/api/me',{user:1})).data.user.login,'maker');
    assert.equal((await call('/api/mod/queue',{user:1})).status,403);
  });
  let id;
  await t.test('create is private and server address never fetched',async()=>{
    const created=await call('/api/projects',{user:1,method:'POST',body:payload});
    assert.equal(created.status,201,JSON.stringify(created.data));id=created.data.project.id;
    assert.deepEqual((await call('/api/catalog')).data.projects,[]);
    assert.equal((await call('/api/me',{user:1})).data.projects.length,1);
    assert.deepEqual(outbound,['https://api.github.com/repos/maker/game']);
  });
  const project=()=>db.prepare('SELECT * FROM projects WHERE id=?1').bind(id).first();
  async function moderate(status,overrides={}){return call(`/api/mod/projects/${id}/status`,{user:2,method:'POST',body:{status,reason:'Manually reviewed test metadata',assetsReviewed:true,expectedUpdatedAt:(await project()).updated_at,...overrides}});}
  await t.test('review cannot skip states or publish stale metadata',async()=>{
    assert.equal((await moderate('published')).status,409);
    assert.equal((await moderate('under_review')).status,200);
    assert.equal((await moderate('approved',{assetsReviewed:false})).status,400);
    assert.equal((await moderate('approved',{expectedUpdatedAt:'stale'})).status,409);
    assert.equal((await moderate('approved')).status,200);
    assert.equal((await moderate('published')).status,200);
    assert.equal((await call('/api/catalog')).data.projects.length,1);
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM moderation_events').first()).n,3);
  });
  await t.test('picks are idempotent and removable',async()=>{
    const path=`/api/projects/${id}/pick`;
    { const first=await call(path,{user:3,method:'POST'});assert.equal(first.status,200,JSON.stringify(first.data));assert.equal(first.data.picks,1); }
    { const first=await call(path,{user:3,method:'POST'});assert.equal(first.status,200,JSON.stringify(first.data));assert.equal(first.data.picks,1); }
    assert.equal((await call(path,{user:3,method:'POST',body:{file:'forbidden'}})).status,415);
    assert.equal((await call(path,{user:3,method:'DELETE'})).data.picks,0);
  });
  await t.test('only creator can edit, edits require re-review, withdrawal hides listing',async()=>{
    const path=`/api/projects/${id}`;
    assert.equal((await call(path,{user:3,method:'PUT',body:payload})).status,404);
    assert.equal((await call(path,{user:1,method:'PUT',body:{...payload,name:'Updated original'}})).status,200);
    assert.equal((await project()).status,'submitted');
    assert.equal((await project()).published_at,null);
    assert.deepEqual((await call('/api/catalog')).data.projects,[]);
    assert.equal((await call(path,{user:3,method:'DELETE'})).status,404);
    assert.equal((await call(path,{user:1,method:'DELETE'})).status,200);
    assert.equal((await project()).status,'removed');
    assert.equal((await call(path,{user:1,method:'PUT',body:payload})).status,409);
  });
  await t.test('OAuth state is single-use and creates secure cookies without retaining GitHub tokens',async()=>{
    const response=await mf.dispatchFetch('https://api.rustports.com/auth/github/start',{method:'POST',redirect:'manual',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:'termsAccepted=yes&termsVersion=rustports-2026-09-30-v3'});
    assert.equal(response.status,302);
    const auth=new URL(response.headers.get('Location'));
    assert.equal(auth.searchParams.get('scope'),'read:user');assert.equal(auth.searchParams.get('code_challenge_method'),'S256');
    const state=auth.searchParams.get('state');
    const callback=`https://api.rustports.com/auth/github/callback?state=${state}&code=test-code`;
    const options={redirect:'manual',headers:{Cookie:`rp_oauth_state=${state}`}};
    const completed=await mf.dispatchFetch(callback,options);
    assert.equal(completed.headers.get('Location'),`${origin}/?auth=success`);
    const cookieHeaders=completed.headers.getSetCookie();
    assert.ok(cookieHeaders.some(c=>c.startsWith('rp_session=')&&c.includes('HttpOnly')&&c.includes('Secure')));
    assert.ok(cookieHeaders.some(c=>c.startsWith('rp_csrf=')&&!c.includes('HttpOnly')));
    assert.equal((await mf.dispatchFetch(callback,options)).headers.get('Location'),`${origin}/?auth=expired`);
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM oauth_attempts').first()).n,0);
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM terms_acceptances WHERE github_id=4').first()).n,1);
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE github_id=4').first()).n,1);
  });
  await t.test('cross-origin, unauthenticated, oversized and asset writes fail',async()=>{
    assert.equal((await call('/api/projects',{method:'POST',body:payload})).status,401);
    assert.equal((await call('/api/projects',{user:1,method:'POST',body:payload,headers:{Origin:'https://evil.example'}})).status,403);
    assert.equal((await call('/api/projects',{user:1,method:'POST',body:{...payload,summary:'x'.repeat(9000)}})).status,400);
    assert.equal((await call('/api/projects',{user:1,method:'POST',body:{...payload,file:'assets'}})).status,400);
  });
});
