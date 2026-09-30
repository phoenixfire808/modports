const API_BASE = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? `http://127.0.0.1:${Number(location.port || 8787) + 1}` : 'https://api.rustports.com';
const empty = '<div class="empty-state"><span class="eyebrow">THE FIRST CHAPTER IS STILL BEING WRITTEN</span><h3>Your project could start it.</h3><p>No projects have been published yet. While the catalogue grows, run the original workbook example or submit your own Rust project for review.</p><div class="empty-actions"><a class="button button-primary" href="/resources.html#quickstart">Try the starter ↗</a><button class="button button-outline" id="empty-submit">Submit a project ＋</button></div></div>';
let projects = [];
let picks = new Set();
let activeFilter = 'all';
let sortByNewest = true;
let account = null;
let ownerProjects = [];
let editingId = null;
let catalogLoaded = false;
const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const statusLabel = value => ({submitted:'Submitted',under_review:'Under review',changes_requested:'Changes requested',approved:'Approved',published:'Published',rejected:'Rejected',removed:'Removed'}[value] || value);
const stageLabel = value => ({prototype:'Prototype',playable:'Playable',released:'Released'}[value] || 'Project');
const categoryLabel = value => ({survival:'SURVIVAL',parody:'PARODY',sandbox:'SANDBOX',adventure:'ADVENTURE',other:'COMMUNITY'}[value] || 'COMMUNITY');
function csrfToken(){const item=document.cookie.split('; ').find(row=>row.startsWith('rp_csrf='));return item?decodeURIComponent(item.slice('rp_csrf='.length)):'';}
async function api(path, options={}){
 const headers=new Headers(options.headers||{});
 const init={...options,headers,credentials:'include',signal:AbortSignal.timeout(15000)};
 if(options.body!==undefined){headers.set('Content-Type','application/json');init.body=JSON.stringify(options.body);}
 if(options.method&&options.method!=='GET')headers.set('X-CSRF-Token',csrfToken());
 const response=await fetch(`${API_BASE}${path}`,init);
 let data={};try{data=await response.json();}catch{}
 if(!response.ok){const error=new Error(data.error||`Request failed (${response.status}).`);error.status=response.status;throw error;}
 return data;
}
function showMessage(element,message,isError=false){element.textContent=message;element.classList.toggle('error',isError);}
function artTheme(project){const themes=['theme-ice','theme-dust','theme-night','theme-copper','theme-pine'];let number=0;for(const char of String(project.id))number=(number+char.charCodeAt(0))%themes.length;return themes[number];}
function restoreCatalogState(){
 const params=new URLSearchParams(location.search);
 $('#search').value=(params.get('q')||'').slice(0,200);
 activeFilter=['prototype','playable','released'].includes(params.get('stage'))?params.get('stage'):'all';
 sortByNewest=params.get('sort')!=='picks';
 updateCatalogControls();
}
function updateCatalogControls(){
 $$('.filter').forEach(item=>{const active=item.dataset.filter===activeFilter;item.classList.toggle('active',active);item.setAttribute('aria-pressed',String(active));});
 $('#sort').textContent=sortByNewest?'Newest ↓':'Most picked ↓';
 $('#sort').setAttribute('aria-label',sortByNewest?'Sort by community picks':'Sort by newest');
}
function saveCatalogState(){
 const url=new URL(location.href);
 for(const [key,value]of [['q',$('#search').value.trim().slice(0,200)],['stage',activeFilter==='all'?'':activeFilter],['sort',sortByNewest?'':'picks']]){
  if(value)url.searchParams.set(key,value);else url.searchParams.delete(key);
 }
 history.replaceState(null,'',url);
}
function renderCatalog(){
 const query=$('#search').value.trim().toLowerCase();
 const filtered=projects.filter(project=>(activeFilter==='all'||project.development_stage===activeFilter)&&(!query||`${project.name} ${project.creator} ${project.summary} ${project.category} ${project.repo_owner}`.toLowerCase().includes(query)));
 filtered.sort((a,b)=>sortByNewest?String(b.published_at||'').localeCompare(String(a.published_at||'')):Number(b.picks)-Number(a.picks));
 const grid=$('#project-grid');
 grid.innerHTML=filtered.length?filtered.map(project=>{
  const selected=picks.has(project.id);
  return `<article class="project-card"><div class="card-art ${artTheme(project)}"><span class="card-sun"></span><span class="mountain"></span><span class="mountain two"></span><div class="card-tags"><span class="tag tag-status">${escapeHtml(categoryLabel(project.category))}</span></div><span class="art-number">PROJECT ${escapeHtml(String(project.id).slice(0,7))}</span><span class="art-label">${escapeHtml(stageLabel(project.development_stage).toUpperCase())}</span></div><div class="card-body"><div class="card-titleline"><div><h3 class="card-title">${escapeHtml(project.name)}</h3><div class="card-creator">by ${escapeHtml(project.creator)}</div></div><a class="card-link" href="${escapeHtml(project.repo_url)}" target="_blank" rel="noopener noreferrer" aria-label="View ${escapeHtml(project.name)} on GitHub">↗</a></div><p class="card-desc">${escapeHtml(project.summary)}</p><p class="repo-note">${project.repo_owner_verified?'GitHub owner verified':'GitHub link · review checked'} · metadata only</p>${project.connection_address?`<div class="direct-connect"><span>CREATOR-RUN SERVER · DIRECT CONNECTION</span><code>${escapeHtml(project.connection_address)}</code><button type="button" class="button button-outline" data-copy-address="${escapeHtml(project.connection_address)}">Copy address</button><small>Connect using the game’s own client. RustPorts does not relay game traffic.</small></div>`:''}<div class="card-foot"><span class="card-picks"><b>${Number(project.picks)||0}</b> community picks</span><button class="pick-button ${selected?'selected':''}" data-pick="${escapeHtml(project.id)}" aria-pressed="${selected}" aria-label="${selected?'Remove pick for':'Pick'} ${escapeHtml(project.name)}">${selected?'✓ Picked':'Pick this'}</button></div></div></article>`;
 }).join(''):(projects.length?'<div class="empty-state">No projects match your search or filter. <button class="text-link" id="clear-search">Clear filters</button></div>':catalogLoaded?empty:'<div class="empty-state">The catalog is unavailable. Please retry below.</div>');
 $('#showing-count').textContent=filtered.length.toString().padStart(2,'0');
 $('#project-count').textContent=projects.length.toString().padStart(2,'0');
 $('#selection-count').textContent=projects.reduce((count,project)=>count+(Number(project.picks)||0),0).toString().padStart(2,'0');
 $('#log-count').textContent=projects.reduce((count,project)=>count+(Number(project.picks)||0),0).toString();
 $('[data-filter="all"] span').textContent=projects.length.toString().padStart(2,'0');
}
function renderActivity(items=[]){
 const list=$('#activity-list');
 list.innerHTML=items.length?items.map(item=>`<div class="activity-row"><span class="activity-icon">↗</span><div><div class="activity-name">A community member picked <strong>${escapeHtml(item.project)}</strong></div><div class="activity-meta">PUBLISHED PROJECT · NO PERSONAL DETAILS</div></div><span class="activity-time">${escapeHtml(new Date(item.time).toLocaleDateString())}</span></div>`).join(''):'<div class="board-empty">No public picks yet. Sign in and pick a published project to start the log.</div>';
}
function renderAccountNav(user){
 const target=$('#account-nav');
 if(!user){target.innerHTML='<button class="button button-light" id="login-open">Sign in with GitHub <span aria-hidden="true">↗</span></button>';$('#login-open').addEventListener('click',openAuth);return;}
 target.innerHTML=`<div class="account-menu"><span class="account-handle">@${escapeHtml(user.login)}</span><button class="account-button" id="dashboard-open">My dashboard</button></div>`;
 $('#dashboard-open').addEventListener('click',openDashboard);
}
function renderOwnerProjects(items=[]){
 ownerProjects=items;
 const container=$('#my-projects');
  container.innerHTML=items.length?items.map(project=>`<article class="dashboard-project"><div class="dashboard-project-head"><h3>${escapeHtml(project.name)}</h3><span class="status-badge ${escapeHtml(project.status)}">${escapeHtml(statusLabel(project.status))}</span></div><p>${escapeHtml(project.development_stage)} · updated ${escapeHtml(new Date(project.updated_at).toLocaleDateString())}</p><a href="${escapeHtml(project.repo_url)}" target="_blank" rel="noopener noreferrer">Public GitHub repository ↗</a>${project.connection_address?`<p>Creator-run direct server: <code>${escapeHtml(project.connection_address)}</code></p>`:''}${project.status_reason?`<p class="status-reason">${escapeHtml(project.status_reason)}</p>`:''}<div class="dashboard-actions">${!['removed','rejected'].includes(project.status)?`<button class="button button-outline" data-edit="${escapeHtml(project.id)}">Edit and resubmit</button>`:''}${project.status!=='removed'?`<button class="button button-outline" data-withdraw="${escapeHtml(project.id)}">Withdraw listing</button>`:''}</div></article>`).join(''):'<div class="dashboard-empty">You have not submitted a project yet. New listings stay private until moderator approval.</div>';
}
function transitionsFor(status){return ({submitted:[['under_review','Start review'],['changes_requested','Request changes'],['rejected','Reject']],under_review:[['changes_requested','Request changes'],['approved','Approve'],['rejected','Reject']],changes_requested:[['under_review','Resume review'],['rejected','Reject']],approved:[['published','Publish'],['changes_requested','Request changes'],['removed','Remove']],published:[['changes_requested','Request changes'],['removed','Remove']],rejected:[['removed','Remove']],removed:[]}[status]||[]);}
function renderModeratorQueue(items=[]){
 const container=$('#moderation-queue');
  container.innerHTML=items.length?items.map(project=>`<article class="queue-project" data-queue-project="${escapeHtml(project.id)}" data-updated-at="${escapeHtml(project.updated_at)}"><div class="queue-project-head"><div><h3>${escapeHtml(project.name)}</h3><p>by @${escapeHtml(project.creator)} · ${escapeHtml(statusLabel(project.status))}</p></div><span class="status-badge ${escapeHtml(project.status)}">${escapeHtml(statusLabel(project.status))}</span></div><p>${escapeHtml(project.summary)}</p><p>${escapeHtml(categoryLabel(project.category))} · ${escapeHtml(stageLabel(project.development_stage))} · ${project.repo_owner_verified?'Owner matched':'Owner requires human check'}</p><a href="${escapeHtml(project.repo_url)}" target="_blank" rel="noopener noreferrer">Review public GitHub repository ↗</a>${project.connection_address?`<p>Submitted direct server address: <code>${escapeHtml(project.connection_address)}</code></p>`:''}<p class="moderation-note">Manually review the public GitHub page in your browser. RustPorts never downloads or stores repository files and never connects to the submitted game server. If rights, assets, or server ownership are unclear, request changes or reject.</p><label class="check-label"><input class="asset-reviewed" type="checkbox" /><span>I reviewed the public project and rights claim, found no copied source-game or third-party assets, and confirmed the submitter is authorized to publish any direct server address.</span></label><textarea class="queue-reason" maxlength="500" rows="2" placeholder="Required moderator note, visible to the creator"></textarea><div class="queue-actions">${transitionsFor(project.status).map(([status,label])=>`<button class="queue-action" data-status="${status}" data-project="${escapeHtml(project.id)}">${label}</button>`).join('')}</div></article>`).join(''):'<div class="dashboard-empty">The moderation queue is empty.</div>';
}
async function openAuth(){
 $('#auth-form').action=`${API_BASE}/auth/github/start`;
 if(!$('#auth-dialog').open)$('#auth-dialog').showModal();
 const button=$('#auth-form button[type="submit"]');button.disabled=true;
 showMessage($('#auth-message'),'Checking sign-in availability…');
 try { const health=await api('/api/health');button.disabled=!health.authConfigured;showMessage($('#auth-message'),health.authConfigured?'':'GitHub sign-in is temporarily unavailable. Please try again later.',!health.authConfigured); }
 catch { showMessage($('#auth-message'),'Unable to reach sign-in. Close this dialog and retry when your connection is restored.',true); }
}
async function openDashboard(){
 if(!$('#dashboard-dialog').open)$('#dashboard-dialog').showModal();
 try{
  const data=await api('/api/me');
  if(!data.user){$('#dashboard-dialog').close();openAuth();return;}
  account=data.user;
  $('#dashboard-user').textContent=`Signed in as @${account.login}. Your submissions are private until published.`;
  renderOwnerProjects(data.projects||[]);
  const modArea=$('#moderator-area');modArea.hidden=!account.isModerator;
  if(account.isModerator){const queue=await api('/api/mod/queue');renderModeratorQueue(queue.projects||[]);}
 }catch(error){showMessage($('#dashboard-user'),error.message,true);}
}
async function refresh(){
 const message=$('#catalog-message');
 $('#project-grid').setAttribute('aria-busy','true');
 const [catalog,activity,me]=await Promise.allSettled([api('/api/catalog'),api('/api/activity'),api('/api/me')]);
 if(catalog.status==='fulfilled'){
  projects=catalog.value.projects||[];catalogLoaded=true;showMessage(message,projects.length?'Only moderator-published project listings are shown.':'No public projects yet. Be the first to submit an original Rust project for review.');
 }else{showMessage(message,'The catalog could not be refreshed. Check your connection and retry. Previously loaded listings may be out of date.',true);}
 if(activity.status==='fulfilled')renderActivity(activity.value.activity||[]);
 else $('#activity-list').innerHTML='<div class="board-empty">Recent activity is temporarily unavailable.</div>';
 if(me.status==='fulfilled'){account=me.value.user;picks=new Set(account?me.value.picks||[]:[]);}
 else{account=null;picks=new Set();showMessage(message,'Account services could not be reached. Please retry before signing in.',true);}
 renderAccountNav(account);renderCatalog();
 $('#project-grid').setAttribute('aria-busy','false');
  const authState=new URLSearchParams(location.search).get('auth');
  if(authState==='success'&&account){const authUrl=new URL(location.href);authUrl.searchParams.delete('auth');history.replaceState(null,'',authUrl);showMessage(message,'Signed in with GitHub. You can view project status or submit metadata for review.');}
  else if(authState){const authUrl=new URL(location.href);authUrl.searchParams.delete('auth');history.replaceState(null,'',authUrl);showMessage(message,'GitHub sign-in was not completed. Please try again.',true);}
}
function openSubmission(project=null){
 if(!account){openAuth();return;}
 editingId=project?.id||null;
 $('#form-message').textContent='';$('#submission-form').reset();$('#submit-dialog').showModal();
 $('#submission-form h2').textContent=editingId?'Update your project.':'Share your project.';
 if(editingId){const form=$('#submission-form');for(const [field,value] of Object.entries({name:project.name,summary:project.summary,category:project.category,developmentStage:project.development_stage,repositoryUrl:project.repo_url,connectionAddress:project.connection_address||''}))form.elements.namedItem(field).value=value;showMessage($('#form-message'),'Saving changes hides the listing until a moderator reviews it again.');}
}
$('#submission-form').addEventListener('submit',async event=>{
 event.preventDefault();
 const form=event.currentTarget;
 if(!form.reportValidity())return;
 if(!account){$('#submit-dialog').close();openAuth();return;}
 const data=new FormData(form);
 const submit=form.querySelector('button[type="submit"]');submit.disabled=true;
 try{
  const result=await api(editingId?`/api/projects/${encodeURIComponent(editingId)}`:'/api/projects',{method:editingId?'PUT':'POST',body:{name:data.get('name'),summary:data.get('summary'),category:data.get('category'),developmentStage:data.get('developmentStage'),repositoryUrl:data.get('repositoryUrl'),connectionAddress:data.get('connectionAddress'),noAssetsAttested:data.get('noAssetsAttested')==='on',selfHostedAttested:data.get('selfHostedAttested')==='on'}});
  $('#form-message').textContent=`${result.project.name} was sent to moderation. Track its status in your dashboard.`;
  form.reset();$('#submit-dialog').close();await refresh();await openDashboard();
 }catch(error){$('#form-message').textContent=error.message;}
 finally{submit.disabled=false;}
});
$('#project-grid').addEventListener('click',async event=>{
 if(event.target.closest('#empty-submit')){openSubmission();return;}
 if(event.target.closest('#clear-search')){$('#search').value='';activeFilter='all';updateCatalogControls();saveCatalogState();renderCatalog();$('#search').focus();return;}
 const copy=event.target.closest('[data-copy-address]');if(copy){try{await navigator.clipboard.writeText(copy.dataset.copyAddress);copy.textContent='Copied';}catch{const range=document.createRange();range.selectNodeContents(copy.closest('.direct-connect').querySelector('code'));const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);copy.textContent='Address selected: Ctrl/Cmd+C';}return;}
 const button=event.target.closest('[data-pick]');if(!button)return;
 if(!account){openAuth();return;}
 const id=button.dataset.pick;button.disabled=true;
 try{await api(`/api/projects/${encodeURIComponent(id)}/pick`,{method:picks.has(id)?'DELETE':'POST'});await refresh();}
 catch(error){showMessage($('#catalog-message'),error.message,true);}
 finally{button.disabled=false;}
});
$('#filters').addEventListener('click',event=>{const button=event.target.closest('[data-filter]');if(!button)return;activeFilter=button.dataset.filter;updateCatalogControls();saveCatalogState();renderCatalog();});
$('#search').addEventListener('input',()=>{saveCatalogState();renderCatalog();});
$('#sort').addEventListener('click',()=>{sortByNewest=!sortByNewest;updateCatalogControls();saveCatalogState();renderCatalog();});
window.addEventListener('popstate',()=>{restoreCatalogState();renderCatalog();});
['hero-submit','bottom-submit','closing-submit'].forEach(id=>$('#'+id).addEventListener('click',()=>openSubmission()));
$('#login-open').addEventListener('click',openAuth);
$$('.modal-close').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
$$('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();}));
$('#dashboard-new-project').addEventListener('click',()=>{$('#dashboard-dialog').close();openSubmission();});
$('#logout').addEventListener('click',async()=>{try{await api('/api/logout',{method:'POST',body:{}});account=null;$('#dashboard-dialog').close();await refresh();}catch(error){showMessage($('#dashboard-user'),error.message,true);}});
$('#moderation-queue').addEventListener('click',async event=>{
 const button=event.target.closest('[data-status]');if(!button)return;
 const card=button.closest('[data-queue-project]');const reason=card.querySelector('.queue-reason').value.trim();
 if(!reason){card.querySelector('.queue-reason').focus();showMessage($('#dashboard-user'),'Add a moderator note before changing project status.',true);return;}
 button.disabled=true;
 try{await api(`/api/mod/projects/${encodeURIComponent(button.dataset.project)}/status`,{method:'POST',body:{status:button.dataset.status,reason,assetsReviewed:card.querySelector('.asset-reviewed').checked,expectedUpdatedAt:card.dataset.updatedAt}});await openDashboard();await refresh();}
 catch(error){button.disabled=false;showMessage($('#dashboard-user'),error.message,true);}
});
document.addEventListener('keydown',event=>{if(!document.querySelector('dialog[open]')&&(event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();$('#search').focus();}});
$('#catalog-retry').addEventListener('click',async event=>{event.currentTarget.disabled=true;try{await refresh();}finally{$('#catalog-retry').disabled=false;}});
$('#my-projects').addEventListener('click',async event=>{
 const edit=event.target.closest('[data-edit]');if(edit){const project=ownerProjects.find(item=>item.id===edit.dataset.edit);if(project){$('#dashboard-dialog').close();openSubmission(project);}return;}
 const withdraw=event.target.closest('[data-withdraw]');if(!withdraw)return;
 if(!confirm('Withdraw this listing? It will be hidden from the catalog. Contact moderation to restore it.'))return;
 withdraw.disabled=true;
 try{await api(`/api/projects/${encodeURIComponent(withdraw.dataset.withdraw)}`,{method:'DELETE'});await openDashboard();await refresh();}
 catch(error){showMessage($('#dashboard-user'),error.message,true);withdraw.disabled=false;}
});
restoreCatalogState();
refresh();
