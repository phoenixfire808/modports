import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.js';
import { TERMS_VERSION } from '../terms-version.js';

const siteOrigin = 'https://rustports.com';
const sessionToken = 'a'.repeat(64);
const csrfToken = 'b'.repeat(64);
const sha256 = async text => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))), byte => byte.toString(16).padStart(2,'0')).join('');
const session = { terms_current: 1, github_id: 123456, github_login: 'maker', csrf_hash: await sha256(csrfToken), expires_at: new Date(Date.now()+60_000).toISOString() };
const queries = [];
const db = {
  prepare(sql) {
    queries.push(sql);
    let params=[];
    return {
      bind(...values){params=values;return this;},
      async first(){
        if(sql.includes('FROM sessions'))return session;
        if(sql.includes('COUNT(*) AS count FROM projects'))return {count:0};
        if(sql.includes('SELECT id, status, updated_at FROM projects'))return {id:'11111111-1111-4111-8111-111111111111',status:'under_review',updated_at:'2026-09-30T00:00:00.000Z'};
        return null;
      },
      async all(){
        if(sql.includes("WHERE p.status='published'"))return {results:[{id:'public-1',name:'Listed',summary:'Reviewed',picks:2}]};
        return {results:[]};
      },
      async run(){return {success:true,meta:{changes:1}};},
    };
  },
  async batch(){return [];},
};
const env = { SITE_ORIGIN: siteOrigin, MODERATOR_GITHUB_IDS: '', DB: db };
function authenticatedHeaders(contentType='application/json'){
 return {Origin:siteOrigin,Cookie:`rp_session=${sessionToken}; rp_csrf=${csrfToken}`,'X-CSRF-Token':csrfToken,'Content-Type':contentType};
}
async function call(path, options={}){
 const request=new Request(`https://api.rustports.com${path}`,options);
 return worker.fetch(request,env);
}

test('multipart file submissions are rejected before being parsed or stored',async()=>{
 const form=new FormData();form.set('name','No file');form.set('game','not really a game file');
 const headers=authenticatedHeaders();delete headers['Content-Type'];
 const request=new Request('https://api.rustports.com/api/projects',{method:'POST',headers,body:form});
 const response=await worker.fetch(request,env);
 assert.equal(response.status,400);
 assert.match((await response.json()).error,/JSON text only|File uploads are not accepted/i);
 assert.equal(queries.some(sql=>sql.startsWith('INSERT INTO projects')),false);
});

test('JSON project submissions reject any unapproved file/asset field',async()=>{
 const response=await call('/api/projects',{method:'POST',headers:authenticatedHeaders(),body:JSON.stringify({name:'Test',summary:'No assets',category:'survival',developmentStage:'prototype',repositoryUrl:'https://github.com/maker/game',noAssetsAttested:true,imageData:'data:image/png;base64,AA=='})});
 assert.equal(response.status,400);
 assert.match((await response.json()).error,/Only project metadata|Files and assets/i);
});

test('project submissions require a separate no-assets attestation',async()=>{
 const response=await call('/api/projects',{method:'POST',headers:authenticatedHeaders(),body:JSON.stringify({name:'Test',summary:'No assets',category:'survival',developmentStage:'prototype',repositoryUrl:'https://github.com/maker/game'})});
 assert.equal(response.status,400);
 assert.match((await response.json()).error,/submitting no files or assets/i);
});

test('repository links are restricted to public github.com owner/repository URLs',async()=>{
 const response=await call('/api/projects',{method:'POST',headers:authenticatedHeaders(),body:JSON.stringify({name:'Test',summary:'No assets',category:'survival',developmentStage:'prototype',repositoryUrl:'https://example.com/redirect?to=github.com',noAssetsAttested:true,selfHostedAttested:true})});
 assert.equal(response.status,400);
 assert.match((await response.json()).error,/Link one public GitHub repository/i);
 assert.equal(queries.some(sql=>sql.startsWith('INSERT INTO projects')),false);
});

test('direct server address is inert metadata and requires a creator-hosting attestation',async()=>{
 const missing=await call('/api/projects',{method:'POST',headers:authenticatedHeaders(),body:JSON.stringify({name:'Test',summary:'No assets',category:'survival',developmentStage:'prototype',repositoryUrl:'https://github.com/maker/game',connectionAddress:'play.example.net:27015',noAssetsAttested:true})});
 assert.equal(missing.status,400);
 assert.match((await missing.json()).error,/operated by you.*connects directly/i);
 const invalid=await call('/api/projects',{method:'POST',headers:authenticatedHeaders(),body:JSON.stringify({name:'Test',summary:'No assets',category:'survival',developmentStage:'prototype',repositoryUrl:'https://github.com/maker/game',connectionAddress:'https://example.com/file.zip',noAssetsAttested:true,selfHostedAttested:true})});
 assert.equal(invalid.status,400);
 assert.match((await invalid.json()).error,/hostname:port/i);
 assert.equal(queries.some(sql=>sql.startsWith('INSERT INTO projects')),false);
});

test('valid direct server address is stored as text and RustPorts never connects to it',async()=>{
 const originalFetch=globalThis.fetch;
 let fetchUrl='';
 globalThis.fetch=async input=>{
  fetchUrl=String(input);
  return new Response(JSON.stringify({private:false,disabled:false,name:'game',owner:{login:'maker',id:123456,type:'User'}}),{status:200,headers:{'Content-Type':'application/json'}});
 };
 try{
  const response=await call('/api/projects',{method:'POST',headers:authenticatedHeaders(),body:JSON.stringify({name:'Test',summary:'No assets',category:'survival',developmentStage:'playable',repositoryUrl:'https://github.com/maker/game',connectionAddress:'play.example.net:27015',noAssetsAttested:true,selfHostedAttested:true})});
  assert.equal(response.status,201);
  assert.equal((await response.json()).project.connectionAddress,'play.example.net:27015');
  assert.match(fetchUrl,/api\.github\.com\/repos\/maker\/game$/);
  assert.ok(queries.some(sql=>sql.includes('connection_address')));
  assert.equal(fetchUrl.includes('play.example.net'),false);
 }finally{globalThis.fetch=originalFetch;}
});

test('public catalog query only returns moderator-published rows',async()=>{
 const response=await call('/api/catalog',{method:'GET'});
 assert.equal(response.status,200);
 const result=await response.json();
 assert.equal(result.projects.length,1);
 assert.equal(result.projects[0].id,'public-1');
 assert.ok(queries.some(sql=>sql.includes("WHERE p.status='published'")));
});

test('moderator queue is denied unless the GitHub numeric ID is allowlisted',async()=>{
 const response=await call('/api/mod/queue',{method:'GET',headers:{Origin:siteOrigin,Cookie:`rp_session=${sessionToken}`}});
 assert.equal(response.status,403);
 assert.match((await response.json()).error,/Moderator access/);
});

test('approval requires a human asset-review attestation and records the audit column',async()=>{
 env.MODERATOR_GITHUB_IDS='123456';
 const payload={status:'approved',reason:'Reviewed linked public repository.',expectedUpdatedAt:'2026-09-30T00:00:00.000Z'};
 const missing=await call('/api/mod/projects/11111111-1111-4111-8111-111111111111/status',{method:'POST',headers:authenticatedHeaders(),body:JSON.stringify(payload)});
 assert.equal(missing.status,400);
 assert.match((await missing.json()).error,/manually reviewed/i);
 const accepted=await call('/api/mod/projects/11111111-1111-4111-8111-111111111111/status',{method:'POST',headers:authenticatedHeaders(),body:JSON.stringify({...payload,assetsReviewed:true})});
 assert.equal(accepted.status,200);
 assert.ok(queries.some(sql=>sql.includes('assets_reviewed')));
 env.MODERATOR_GITHUB_IDS='';
});

test('unimplemented upload routes return 404 and do not store a body',async()=>{
 const response=await call('/uploads/game.zip',{method:'POST',body:'not a file endpoint'});
 assert.equal(response.status,404);
 assert.equal(await response.text(),'Not found');
});

test('account OAuth remains unavailable until owner secrets are configured',async()=>{
 const form=new URLSearchParams({termsAccepted:'yes',termsVersion:TERMS_VERSION});
 const response=await call('/auth/github/start',{method:'POST',headers:{Origin:siteOrigin,'Content-Type':'application/x-www-form-urlencoded'},body:form});
 assert.equal(response.status,503);
 assert.match((await response.json()).error,/not configured/i);
});

test('OAuth accepts the existing RustGitHub secret binding alias',async()=>{
 const previous={id:env.GITHUB_CLIENT_ID,secret:env.RustGitHub};
 env.GITHUB_CLIENT_ID='public-client-id';env.RustGitHub='not-read-or-logged';
 const form=new URLSearchParams({termsAccepted:'yes',termsVersion:TERMS_VERSION});
 const response=await call('/auth/github/start',{method:'POST',headers:{Origin:siteOrigin,'Content-Type':'application/x-www-form-urlencoded'},body:form});
 assert.equal(response.status,302);
 assert.match(response.headers.get('Location'),/^https:\/\/github\.com\/login\/oauth\/authorize\?/);
 delete env.GITHUB_CLIENT_ID;delete env.RustGitHub;
 if(previous.id!==undefined)env.GITHUB_CLIENT_ID=previous.id;
 if(previous.secret!==undefined)env.RustGitHub=previous.secret;
});
