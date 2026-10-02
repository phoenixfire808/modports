import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { publicFiles } from '../scripts/build.mjs';
const root=new URL('../',import.meta.url);
test('deployment includes only the public allowlist, never API or credentials',async()=>{
 assert.deepEqual((await readdir(new URL('dist/',root))).sort(),[...publicFiles].sort());
 assert.ok(!publicFiles.some(name=>/api|\.env|wrangler|package|README/i.test(name)));
});

test('local page anchors and label targets resolve, without duplicate IDs',async()=>{
 const pages=new Map();
 for(const name of publicFiles.filter(n=>n.endsWith('.html'))){
  const html=await readFile(new URL(name,root),'utf8');
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length,new Set(ids).size,`Duplicate ID: ${name}`);
  pages.set(name,{html,ids:new Set(ids)});
 }
 for(const [name,{html,ids}]of pages){
  for(const [,target]of html.matchAll(/\baria-labelledby="([^"]+)"/g))for(const id of target.split(' '))assert.ok(ids.has(id),`${name}: ${id}`);
  for(const [,href]of html.matchAll(/\bhref="([^"]*#[^"]+)"/g)){
   if(href.startsWith('https:'))continue;
   const [path,id]=href.split('#');
   const target=path?path.replace(/^\//,'')||'index.html':name;
   assert.ok(pages.get(target)?.ids.has(id),`${name} broken anchor ${href}`);
  }
 }
});

test('primary text tokens meet AA normal-text contrast on all main surfaces',async()=>{
 const css=await readFile(new URL('styles.css',root),'utf8');
 const tokens=Object.fromEntries([...css.matchAll(/--([a-z]+):\s*(#[0-9a-f]{6});/g)].map(m=>[m[1],m[2]]));
 const luminance=hex=>hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
 const contrast=(a,b)=>{const values=[luminance(a),luminance(b)].sort((x,y)=>y-x);return(values[0]+.05)/(values[1]+.05);};
 for(const ink of ['ink','muted','accent','cool','error'])for(const surface of ['bg','surface','raised'])assert.ok(contrast(tokens[ink],tokens[surface])>=4.5,`${ink} on ${surface}`);
 assert.ok(contrast('#151116',tokens.accent)>=4.5);
 assert.match(css,/prefers-reduced-motion: reduce/);
});

test('resource commands are available without JS and copy controls target visible code',async()=>{
 const html=await readFile(new URL('resources.html',root),'utf8');
 for(const [,id]of html.matchAll(/data-copy-code="([^"]+)"/g))assert.ok(html.includes(`<code id="${id}">`));
 assert.match(html,/py -3 -m venv \.venv/);
 assert.match(html,/python3 -m venv \.venv/);
 assert.match(html,/build_matrix\.py --check/);
 assert.match(html,/No tested binary or stable native release/);
 assert.match(html,/src="resources\.js\?v=legal-20261002"/);
});

test('page payloads stay small and asset release queries remain consistent',async()=>{
 let total=0;
 for(const name of ['index.html','styles.css','app.js','resources.html','resources.js']){
  const data=await readFile(new URL(name,root));total+=gzipSync(data).length;
 }
 assert.ok(total<35000,`Combined gzipped public page payload ${total} exceeds 35KB budget`);
 for(const name of publicFiles.filter(n=>n.endsWith('.html'))){
  const html=await readFile(new URL(name,root),'utf8');
  for(const [,url]of html.matchAll(/(?:src|href)="([^"?]+\.(?:js|css)[^"]*)"/g))assert.ok(url.endsWith('?v=legal-20261002'),`${name}: ${url}`);
 }
});
test('HTML links resolve to public pages and comply with strict script/style policy',async()=>{
 for(const file of publicFiles.filter(n=>n.endsWith('.html'))){
  const html=await readFile(new URL(file,root),'utf8');
  assert.doesNotMatch(html,/<style\b|\sstyle=|\son\w+=|<script(?![^>]*\bsrc=)/i,file);
  for(const [,url]of html.matchAll(/(?:href|src)="([^"]+)"/g)){
   if(/^(?:https?:|mailto:|#)/.test(url))continue;
   const target=url.replace(/^\//,'').split(/[?#]/)[0] || 'index.html';
   assert.ok(publicFiles.includes(target),`${file} links to missing ${target}`);
  }
 }
 const css=await readFile(new URL('styles.css',root),'utf8');assert.doesNotMatch(css,/@import/);
});
test('legal policies and account consent match the current Worker version',async()=>{
 const { TERMS_VERSION }=await import('../api/terms-version.js');
 const terms=await readFile(new URL('terms.html',root),'utf8');
 const index=await readFile(new URL('index.html',root),'utf8');
 const worker=await readFile(new URL('api/worker.js',root),'utf8');
 assert.ok(worker.includes(`const TERMS_VERSION = '${TERMS_VERSION}';`));
 assert.ok(terms.includes(TERMS_VERSION));
 assert.ok(index.includes(`name="termsVersion" value="${TERMS_VERSION}"`));
 for(const id of ['rights','assets','conduct','moderation','reports','permission','liability','disputes','review'])assert.ok(terms.includes(`id="${id}"`));
 assert.match(terms,/Nothing in these terms excludes or limits liability or remedies that cannot lawfully be excluded/);
 assert.match(terms,/not an ownership transfer, an irrevocable advertising license/);
 for(const name of ['terms.html','privacy.html','contact.html']){
  const html=await readFile(new URL(name,root),'utf8');
  assert.match(html,/<!--email_off-->[\s\S]*mailto:rights@rustports\.com[\s\S]*<!--\/email_off-->/);
 }
 const contact=await readFile(new URL('contact.html',root),'utf8');
 for(const id of ['rights-reports','appeals','security'])assert.ok(contact.includes(`id="${id}"`));
 const app=await readFile(new URL('app.js',root),'utf8');
 assert.match(app,/if\(me\.value\.termsRequired\)/);
});
test('security headers restrict framing, script origins, and network destinations',async()=>{
 const headers=await readFile(new URL('_headers',root),'utf8');
 for(const rule of ["script-src 'self'","frame-ancestors 'none'","connect-src https://api.rustports.com","X-Content-Type-Options: nosniff"])assert.ok(headers.includes(rule));
 const html=await readFile(new URL('index.html',root),'utf8');assert.ok(html.includes('id="catalog-retry"'));
 assert.ok(html.includes('src="app.js?v=legal-20261002"'));
 assert.ok(html.includes('href="styles.css?v=legal-20261002"'));
 for(const name of ['contact.html','privacy.html']){
  const page=await readFile(new URL(name,root),'utf8');
  assert.match(page,/<!--email_off-->[\s\S]*mailto:rights@rustports\.com[\s\S]*<!--\/email_off-->/);
 }
});
