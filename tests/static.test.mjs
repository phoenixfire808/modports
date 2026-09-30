import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { publicFiles } from '../scripts/build.mjs';
const root=new URL('../',import.meta.url);
test('deployment includes only the public allowlist, never API or credentials',async()=>{
 assert.deepEqual((await readdir(new URL('dist/',root))).sort(),[...publicFiles].sort());
 assert.ok(!publicFiles.some(name=>/api|\.env|wrangler|package|README/i.test(name)));
});
test('HTML links resolve to public pages and comply with strict script/style policy',async()=>{
 for(const file of publicFiles.filter(n=>n.endsWith('.html'))){
  const html=await readFile(new URL(file,root),'utf8');
  assert.doesNotMatch(html,/<style\b|\sstyle=|\son\w+=|<script(?![^>]*\bsrc=)/i,file);
  for(const [,url]of html.matchAll(/(?:href|src)="([^"]+)"/g)){
   if(/^(?:https?:|mailto:|#)/.test(url))continue;
   const target=url==='/'?'index.html':url.replace(/^\//,'').split('#')[0];
   assert.ok(publicFiles.includes(target),`${file} links to missing ${target}`);
  }
 }
 const css=await readFile(new URL('styles.css',root),'utf8');assert.doesNotMatch(css,/@import/);
});
test('security headers restrict framing, script origins, and network destinations',async()=>{
 const headers=await readFile(new URL('_headers',root),'utf8');
 for(const rule of ["script-src 'self'","frame-ancestors 'none'","connect-src https://api.rustports.com","X-Content-Type-Options: nosniff"])assert.ok(headers.includes(rule));
 const html=await readFile(new URL('index.html',root),'utf8');assert.ok(html.includes('id="catalog-retry"'));
});
