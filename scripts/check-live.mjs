import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const site='https://rustports.com';
const api='https://api.rustports.com';
const digest=data=>createHash('sha256').update(data).digest('hex');
for(const file of ['index.html','app.js','resources.js','styles.css','terms.html','privacy.html','contact.html','hosting.html','resources.html']){
 const url=`${site}/${file==='index.html'?'':file}${['app.js','resources.js','styles.css'].includes(file)?'?v=lab-20260930':''}`;
 const response=await fetch(url,{signal:AbortSignal.timeout(20000),headers:{'Cache-Control':'no-cache'}});
 assert.equal(response.status,200,url);
 // Cloudflare consumes email_off directives but must preserve contact links and all other bytes.
 const expected=(await readFile(new URL(`../dist/${file}`,import.meta.url),'utf8')).replaceAll('<!--email_off-->','').replaceAll('<!--/email_off-->','');
 assert.equal(digest(Buffer.from(await response.arrayBuffer())),digest(expected),`${file} differs from reviewed build`);
 assert.ok(response.headers.get('Content-Security-Policy')?.includes("script-src 'self'"),`CSP missing: ${file}`);
 assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');
 console.log(`PASS deployed bytes and security headers: ${file}`);
}
for(const path of ['/api/worker.js','/api/package.json','/.git/config','/__test/login','/nonexistent-launch-check']){
 const response=await fetch(site+path,{signal:AbortSignal.timeout(20000)});
 assert.equal(response.status,404,path);console.log(`PASS private/nonexistent route unavailable: ${path}`);
}
for(const path of ['/api/health','/api/catalog','/api/activity','/api/me']){
 const response=await fetch(api+path,{headers:{Origin:site},signal:AbortSignal.timeout(20000)});
 assert.equal(response.status,200,path);assert.equal(response.headers.get('Access-Control-Allow-Origin'),site);
 const data=await response.json();
 if(path.endsWith('health')){assert.equal(data.version,'launch-2026-09-30');assert.equal(data.authConfigured,true);}
 if(path.endsWith('/me'))assert.equal(data.user,null);
 console.log(`PASS live API: ${path}`);
}
console.log('Production smoke checks passed. Real GitHub consent and inbox delivery remain separate acceptance checks.');
