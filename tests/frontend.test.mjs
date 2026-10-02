import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const source=await readFile(new URL('../app.js',import.meta.url),'utf8');
// Small DOM boundary stub. Actual browser/Worker acceptance is recorded separately.
function app(url='https://rustports.com/') {
 const elements=new Map();
 const element=selector=>{
  if(!elements.has(selector))elements.set(selector,{value:'',textContent:'',innerHTML:'',dataset:{},attributes:{},listeners:{},classList:{toggle(){}},setAttribute(key,value){this.attributes[key]=value;},addEventListener(name,handler){this.listeners[name]=handler;},focus(){this.focused=true;}});
  return elements.get(selector);
 };
 const filters=['all','prototype','playable','released'].map(filter=>{const item=element(filter);item.dataset.filter=filter;return item;});
 const location=new URL(url);
 const document={cookie:'',listeners:{},querySelector(selector){return selector==='dialog[open]'?this.dialog:element(selector);},querySelectorAll(selector){return selector==='.filter'?filters:[];},addEventListener(name,handler){this.listeners[name]=handler;}};
 const context=vm.createContext({document,location,URL,URLSearchParams,Headers,AbortSignal,console,fetch:()=>new Promise(()=>{}),window:{addEventListener(){}},history:{replaceState(_state,_title,url){location.href=String(new URL(url,location));}}});
 vm.runInContext(source,context);
 return {element,document,location,run:code=>vm.runInContext(code,context)};
}
test('catalogue deep links restore validated filters, query and sort',()=>{
 const page=app('https://rustports.com/?q=original&stage=playable&sort=picks#discover');
 assert.equal(page.element('#search').value,'original');
 assert.equal(page.element('playable').attributes['aria-pressed'],'true');
 assert.equal(page.element('#sort').textContent,'Most picked ↓');
 const invalid=app('https://rustports.com/?stage=invalid&sort=invalid');
 assert.equal(invalid.element('all').attributes['aria-pressed'],'true');
 assert.equal(invalid.element('#sort').textContent,'Newest ↓');
});
test('catalogue state is bounded, URL encoded and preserves unrelated parameters',()=>{
 const page=app('https://rustports.com/?other=keep#discover');
 page.element('#search').value='<test> & '+ 'x'.repeat(300);
 page.run("activeFilter='released';sortByNewest=false;saveCatalogState()");
 assert.equal(page.location.searchParams.get('q').length,200);
 assert.equal(page.location.searchParams.get('stage'),'released');
 assert.equal(page.location.searchParams.get('other'),'keep');
 assert.equal(page.location.hash,'#discover');
 page.element('#search').value='';
 page.run("activeFilter='all';sortByNewest=true;saveCatalogState()");
 assert.equal(page.location.search,'?other=keep');
});
test('catalogue renders escaped metadata, pressed picks and useful real empty state',()=>{
 const page=app();
 page.run(`catalogLoaded=true;renderCatalog()`);
 assert.match(page.element('#project-grid').innerHTML,/Try the starter/);
 page.run(`projects=[{id:'safe',name:'<img src=x>',creator:'maker',summary:'Original & synthetic',category:'other',repo_url:'https://github.com/maker/game',development_stage:'prototype',picks:1}];picks.add('safe');renderCatalog()`);
 const html=page.element('#project-grid').innerHTML;
 assert.match(html,/&lt;img src=x&gt;/);
 assert.doesNotMatch(html,/<img/);
 assert.match(html,/aria-pressed="true"/);
 page.element('#search').value='no match';page.run('renderCatalog()');
 assert.match(page.element('#project-grid').innerHTML,/Clear filters/);
 assert.equal(page.element('#showing-count').textContent,'00');
});
test('outdated consent displays reacceptance notice and an optional sign-out control',async()=>{
 const page=app();
 page.run(`fetch=async url=>({ok:true,json:async()=>url.endsWith('/api/me')?{user:null,termsRequired:true}:{projects:[],activity:[]}})`);
 await page.run('refresh()');
 assert.equal(page.element('#terms-signout').hidden,false);
 assert.match(page.element('#catalog-message').textContent,/Terms of Service have changed/);
 page.run(`fetch=async()=>({ok:true,json:async()=>({user:null,projects:[],activity:[]})})`);
 await page.run('refresh()');
 assert.equal(page.element('#terms-signout').hidden,true);
});
test('search shortcut never moves focus behind an open dialog',()=>{
 const page=app();let prevented=false;
 const event={ctrlKey:true,key:'k',preventDefault(){prevented=true;}};
 page.document.dialog={open:true};page.document.listeners.keydown(event);
 assert.equal(prevented,false);assert.notEqual(page.element('#search').focused,true);
 page.document.dialog=null;page.document.listeners.keydown(event);
 assert.equal(prevented,true);assert.equal(page.element('#search').focused,true);
});
