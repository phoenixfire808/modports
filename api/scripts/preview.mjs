// Local-only browser fixture. Never included in the public build or Worker entrypoint.
import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
const root=new URL('../../',import.meta.url);
const publicFiles=['index.html','app.js','styles.css','terms.html','privacy.html','contact.html','hosting.html','404.html'];
const mf=new Miniflare(convertV4MiniflareOptions({host:'127.0.0.1',port:8788,modules:true,scriptPath:fileURLToPath(new URL('../worker.js',import.meta.url)),compatibilityDate:'2026-08-18',d1Databases:['DB'],bindings:{SITE_ORIGIN:'http://127.0.0.1:8787',MODERATOR_GITHUB_IDS:'2'},outboundService:async request=>{
 if(request.url==='https://api.github.com/repos/maker/game')return Response.json({private:false,name:'game',owner:{id:1,login:'maker',type:'User'}});
 throw new Error('Unexpected external request in local fixture');
}}));
const db=await mf.getD1Database('DB');
for(const name of (await readdir(new URL('../migrations/',import.meta.url))).sort()){
 for(const statement of (await readFile(new URL(`../migrations/${name}`,import.meta.url),'utf8')).split(';').map(s=>s.trim()).filter(Boolean))await db.prepare(statement).run();
}
const hash=async text=>Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))).toString('hex');
const now=new Date().toISOString();
for(const [id,login]of [[1,'maker'],[2,'moderator']]){
 await db.prepare('INSERT INTO users VALUES (?1,?2,?3,?3)').bind(id,login,now).run();
 await db.prepare('INSERT INTO sessions VALUES (?1,?2,?3,?4,?5)').bind(await hash(String(id).repeat(64)),await hash('c'.repeat(64)),id,now,new Date(Date.now()+3600000).toISOString()).run();
}
const server=createServer(async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1:8787');
 if(req.method!=='GET'){res.writeHead(405).end();return;}
 if(url.pathname==='/__test/login'){
  const user=url.searchParams.get('user')==='2'?'2':'1';
  res.writeHead(302,{'Location':'/','Set-Cookie':[`rp_session=${user.repeat(64)}; Path=/; HttpOnly; SameSite=Lax`,`rp_csrf=${'c'.repeat(64)}; Path=/; SameSite=Lax`]}).end();return;
 }
 const requested=url.pathname==='/'?'index.html':url.pathname.slice(1);
 const name=publicFiles.includes(requested)?requested:'404.html';
 try{const data=await readFile(new URL(`dist/${name}`,root));res.writeHead(name===requested?200:404,{'Content-Type':name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/html','Cache-Control':'no-store'}).end(data);}catch{res.writeHead(500).end('Build the static site first.');}
});
server.listen(8787,'127.0.0.1',()=>console.log('Local fixture ready: http://127.0.0.1:8787/__test/login?user=1 (creator), user=2 (moderator). Synthetic accounts, isolated D1, no production changes.'));
process.on('SIGINT',async()=>{server.close();await mf.dispose();process.exit();});
