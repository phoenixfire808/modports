const starterProjects = [
  {id:'01',name:'Long Winter',creator:'Northbound Studio',status:'playable',description:'A quiet survival story where the cold is only half the battle.',genre:'SURVIVAL · NARRATIVE',region:'CANADA',picks:42,theme:'theme-ice',art:'WHITEOUT / 01',url:''},
  {id:'02',name:'Dustline',creator:'Morrow Works',status:'playable',description:'Make a home in a sun-blasted world that never stands still.',genre:'OPEN WORLD · CRAFTING',region:'AUSTRALIA',picks:31,theme:'theme-dust',art:'DRY SEASON / 02',url:''},
  {id:'03',name:'No Signal',creator:'Studio Faraway',status:'in-development',description:'A strange transmission. A very empty island. Your call.',genre:'MYSTERY · CO-OP',region:'JAPAN',picks:24,theme:'theme-night',art:'FREQUENCY / 03',url:''},
  {id:'04',name:'Rook & Ruin',creator:'Kindling Collective',status:'playable',description:'Build a little, lose a lot, make a story worth telling.',genre:'SANDBOX · SOCIAL',region:'UNITED KINGDOM',picks:18,theme:'theme-copper',art:'OLD COUNTRY / 04',url:''},
  {id:'05',name:'Greenwater',creator:'Lowtide Interactive',status:'in-development',description:'The tide is rising. So is your neighbor’s suspicious new wall.',genre:'SURVIVAL · COMEDY',region:'BRAZIL',picks:9,theme:'theme-pine',art:'HIGH TIDE / 05',url:''},
  {id:'06',name:'Last Light',creator:'Mira & Friends',status:'playable',description:'A tiny, handmade frontier about the people you meet there.',genre:'ADVENTURE · SOLO',region:'POLAND',picks:4,theme:'theme-dust',art:'AFTERGLOW / 06',url:''}
];
const starterActivity = [
  {name:'Community pick',project:'Long Winter',region:'Canada',time:'JUST NOW'},
  {name:'Community pick',project:'No Signal',region:'Japan',time:'8 MIN AGO'},
  {name:'Community pick',project:'Dustline',region:'Australia',time:'23 MIN AGO'},
  {name:'Community pick',project:'Rook & Ruin',region:'United Kingdom',time:'1 HR AGO'}
];
const read = (key, fallback) => { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; } catch { return fallback; } };
let projects = read('rustports-projects-v1', starterProjects);
let selections = read('rustports-selections-v1', []);
let activity = read('rustports-activity-v1', starterActivity);
let activeFilter = 'all';
let sortByPicks = true;
const grid = document.getElementById('project-grid');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function persist(){localStorage.setItem('rustports-projects-v1',JSON.stringify(projects));localStorage.setItem('rustports-selections-v1',JSON.stringify(selections));localStorage.setItem('rustports-activity-v1',JSON.stringify(activity));}
function render(){
 const query=document.getElementById('search').value.trim().toLowerCase();
 let visible=projects.filter(p=>(activeFilter==='all'||p.status===activeFilter)&&(!query||`${p.name} ${p.creator} ${p.description} ${p.genre} ${p.region}`.toLowerCase().includes(query)));
 visible=visible.sort((a,b)=>sortByPicks?b.picks-a.picks:a.name.localeCompare(b.name));
 grid.innerHTML=visible.length?visible.map(p=>`<article class="project-card"><div class="card-art ${esc(p.theme||'theme-pine')}" ${p.image?`style="background-image:linear-gradient(0deg,#11170ed1,transparent 68%),url('${p.image}')"`:''}><span class="card-sun"></span><span class="mountain"></span><span class="mountain two"></span><div class="card-tags"><span class="tag ${p.status==='playable'?'tag-status':'tag-dev'}">${p.status==='playable'?'PLAYABLE':'IN DEVELOPMENT'}</span></div><span class="art-number">FIELD ${esc(p.id)}</span><span class="art-label">${esc(p.art||'COMMUNITY PROJECT')}</span></div><div class="card-body"><div class="card-titleline"><div><h3 class="card-title">${esc(p.name)}</h3><div class="card-creator">by ${esc(p.creator)}</div></div>${p.url?`<a class="card-link" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer" aria-label="Open ${esc(p.name)} project page">↗</a>`:''}</div><p class="card-desc">${esc(p.description)}</p><div class="card-foot"><span class="card-picks"><b>${p.picks}</b> community picks</span><button class="pick-button ${selections.includes(p.id)?'selected':''}" data-pick="${esc(p.id)}">${selections.includes(p.id)?'✓ Picked':'Pick this'}</button></div></div></article>`).join(''):'<div class="empty-state">NO PROJECTS MATCH THAT SEARCH. TRY ANOTHER TERM.</div>';
 document.getElementById('showing-count').textContent=visible.length.toString().padStart(2,'0');
 document.getElementById('project-count').textContent=projects.length.toString().padStart(2,'0');
 document.getElementById('selection-count').textContent=(128+selections.length).toString();
 document.getElementById('log-count').textContent=selections.length;
 document.querySelector('[data-filter="all"] span').textContent=projects.length.toString().padStart(2,'0');
 renderActivity();
}
function renderActivity(){
 const list=document.getElementById('activity-list');
 const own=activity.slice(0,8);
 list.innerHTML=own.length?own.map(a=>`<div class="activity-row"><span class="activity-icon">↗</span><div><div class="activity-name">${esc(a.name)} picked <strong>${esc(a.project)}</strong></div><div class="activity-meta">${esc(a.region)} · COMMUNITY SELECTION</div></div><span class="activity-time">${esc(a.time)}</span></div>`).join(''):'<div class="board-empty">No selections yet. Be the first to pick a project.</div>';
}
grid.addEventListener('click',e=>{const button=e.target.closest('[data-pick]');if(!button)return;const id=button.dataset.pick;const project=projects.find(p=>p.id===id);if(!project)return;if(selections.includes(id)){selections=selections.filter(item=>item!==id);project.picks=Math.max(0,project.picks-1);activity=activity.filter(a=>a.id!==id);}else{selections.push(id);project.picks++;activity.unshift({id,name:'You',project:project.name,region:'THIS DEVICE',time:'JUST NOW'});}persist();render();});
document.getElementById('search').addEventListener('input',render);
document.getElementById('filters').addEventListener('click',e=>{const button=e.target.closest('[data-filter]');if(!button)return;activeFilter=button.dataset.filter;document.querySelectorAll('.filter').forEach(item=>item.classList.toggle('active',item===button));render();});
document.getElementById('sort').addEventListener('click',()=>{sortByPicks=!sortByPicks;document.getElementById('sort').innerHTML=sortByPicks?'MOST PICKED <span>⌄</span>':'A TO Z <span>⌃</span>';render();});
const dialog=document.getElementById('submit-dialog');
['submit-open','hero-submit','bottom-submit','closing-submit','rules-submit'].forEach(id=>document.getElementById(id).addEventListener('click',()=>dialog.showModal()));
document.querySelector('.modal-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
document.getElementById('submission-form').addEventListener('submit',async e=>{
 e.preventDefault();const form=e.currentTarget;if(!form.reportValidity())return;
 const data=new FormData(form);const name=data.get('name').trim();
 if(projects.some(p=>p.name.toLowerCase()===name.toLowerCase())){document.getElementById('form-message').textContent='A project with that name is already in the preview catalog.';return;}
 const image=data.get('image');let imageData='';
 if(image?.size){if(!image.type.startsWith('image/')){document.getElementById('form-message').textContent='Please choose an image file.';return;}if(image.size>2*1024*1024){document.getElementById('form-message').textContent='Image must be 2 MB or smaller.';return;}imageData=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(image);}).catch(()=>null);if(!imageData){document.getElementById('form-message').textContent='Could not read that image. Please try another file.';return;}}
 projects.push({id:`P${Date.now().toString().slice(-5)}`,name,creator:data.get('creator').trim(),status:data.get('status'),description:data.get('description').trim(),genre:'COMMUNITY SUBMISSION',region:'COMMUNITY',picks:0,theme:['theme-ice','theme-dust','theme-night','theme-copper','theme-pine'][projects.length%5],art:'NEW ARRIVAL',url:data.get('url').trim(),image:imageData});
 persist();render();form.reset();document.getElementById('form-message').textContent='Saved in this browser preview. It is not submitted to a live server.';setTimeout(()=>{dialog.close();document.getElementById('form-message').textContent='';},2200);
});
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();document.getElementById('search').focus();}});
render();
