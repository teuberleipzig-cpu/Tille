/* Resident ordering controls for Admin v2.
   Shows residents in JSON order in the hidden legacy panel, but sidebar subnav is alphabetical. */
(function(){
  if(window.__adminResidentsOrderModuleLoaded){
    if(typeof window.renderResidentsSidebarList==='function')window.renderResidentsSidebarList();
    return;
  }
  window.__adminResidentsOrderModuleLoaded=true;
  function onReady(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn()}
  function allResidents(){return residents().residents||[]}
  function alphaResidents(){return allResidents().map((r,i)=>({r,i})).sort((a,b)=>String(a.r.name||'').localeCompare(String(b.r.name||''),'de',{sensitivity:'base'}))}
  function moveResident(from,to){
    const list=allResidents();
    if(from<0||from>=list.length||to<0||to>=list.length)return;
    readResidentForm();
    const current=currentResident();
    const [item]=list.splice(from,1);
    list.splice(to,0,item);
    state.selectedResident=list.indexOf(current);
    if(state.selectedResident<0)state.selectedResident=to;
    markDirty();
    renderResidentList();
    renderResidentsSidebarList();
    renderResidentForm();
    renderStats();
  }
  function residentMatches(r,q){
    if(!q)return true;
    return norm([r.name,r.city,r.genre,arr(r.labels),arr(r.relatedProjects)].join(' ')).includes(q);
  }
  function renderOrderedResidentList(){
    const q=norm($('residentSearch')?.value||'');
    const all=allResidents();
    const visible=all.map((r,i)=>({r,i})).filter(({r})=>residentMatches(r,q));
    if($('residentListStatus'))$('residentListStatus').textContent=visible.length+' von '+all.length+' Residents · Reihenfolge = Website-Reihenfolge';
    if($('residentList')){
      $('residentList').innerHTML=visible.map(({r,i})=>'<div class="item resident-order-item '+(i===state.selectedResident?'active':'')+'"><button class="resident-order-main" data-resident-index="'+i+'"><strong>'+esc(r.name||'Ohne Name')+'</strong><span>'+esc(r.city||'')+(r.genre?' · '+esc(r.genre):'')+'</span></button><div class="resident-order-actions"><button class="tool" data-resident-move="'+i+':-1" title="Nach oben">↑</button><button class="tool" data-resident-move="'+i+':1" title="Nach unten">↓</button></div></div>').join('')||'<p class="muted">Keine Residents.</p>';
      document.querySelectorAll('#residentList [data-resident-index]').forEach(b=>b.onclick=()=>{readResidentForm();state.selectedResident=Number(b.dataset.residentIndex);renderAll()});
      document.querySelectorAll('#residentList [data-resident-move]').forEach(b=>b.onclick=e=>{e.stopPropagation();const parts=b.dataset.residentMove.split(':').map(Number);moveResident(parts[0],parts[0]+parts[1])});
    }
    renderResidentsSidebarList();
  }
  function ensureSidebarBox(){
    const btn=document.querySelector('.nav-btn[data-view="residents"]');
    if(!btn)return null;
    let box=$('residentsSidebarList');
    if(!box){
      box=document.createElement('div');
      box.id='residentsSidebarList';
      box.className='residents-sidebar-list hidden';
      btn.insertAdjacentElement('afterend',box);
    }
    return box;
  }
  function selectResident(index){
    readResidentForm();
    state.selectedResident=index;
    state.residentTab=state.residentTab||'profile';
    setView('residents');
    renderResidentList();
    renderResidentForm();
    renderStats();
  }
  function renderResidentsSidebarList(){
    const box=ensureSidebarBox();
    const view=$('view-residents');
    if(!box)return;
    const isActive=state.view==='residents';
    box.classList.toggle('hidden',!isActive);
    if(view)view.classList.toggle('residents-sidebar-mode',isActive);
    if(!isActive)return;
    const list=alphaResidents();
    box.innerHTML=list.map(({r,i})=>'<button class="residents-sidebar-main '+(i===state.selectedResident?'active':'')+'" data-sidebar-resident="'+i+'">'+esc(r.name||'Ohne Name')+'</button>').join('')||'<p class="muted">Keine Residents.</p>';
    document.querySelectorAll('[data-sidebar-resident]').forEach(b=>b.onclick=()=>selectResident(Number(b.dataset.sidebarResident)));
  }
  window.renderResidentsSidebarList=renderResidentsSidebarList;
  onReady(()=>{
    if(!window.__adminResidentsOrderListWrapped){
      window.__adminResidentsOrderListWrapped=true;
      window.renderResidentList=renderResidentList=renderOrderedResidentList;
    }
    if(!window.__adminResidentsOrderSetViewWrapped){
      window.__adminResidentsOrderSetViewWrapped=true;
      const oldSetView=setView;
      window.setView=setView=function(v){oldSetView(v);renderResidentsSidebarList()};
    }
    if($('residentList'))renderResidentList();
    renderResidentsSidebarList();
  });
})();