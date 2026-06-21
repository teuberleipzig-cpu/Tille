/* Resident ordering controls for Admin v2.
   Shows residents in JSON order and lets editors move them up/down. */
(function(){
  function onReady(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn()}
  function moveResident(from,to){
    const list=residents().residents||[];
    if(from<0||from>=list.length||to<0||to>=list.length)return;
    readResidentForm();
    const current=currentResident();
    const [item]=list.splice(from,1);
    list.splice(to,0,item);
    state.selectedResident=list.indexOf(current);
    if(state.selectedResident<0)state.selectedResident=to;
    markDirty();
    renderResidentList();
    renderResidentForm();
    renderStats();
  }
  function residentMatches(r,q){
    if(!q)return true;
    return norm([r.name,r.city,r.genre,arr(r.labels),arr(r.relatedProjects)].join(' ')).includes(q);
  }
  function renderOrderedResidentList(){
    const q=norm($('residentSearch')?.value||'');
    const all=residents().residents||[];
    const visible=all.map((r,i)=>({r,i})).filter(({r})=>residentMatches(r,q));
    $('residentListStatus').textContent=visible.length+' von '+all.length+' Residents · Reihenfolge = Website-Reihenfolge';
    $('residentList').innerHTML=visible.map(({r,i})=>'<div class="item resident-order-item '+(i===state.selectedResident?'active':'')+'"><button class="resident-order-main" data-resident-index="'+i+'"><strong>'+esc(r.name||'Ohne Name')+'</strong><span>'+esc(r.city||'')+(r.genre?' · '+esc(r.genre):'')+'</span></button><div class="resident-order-actions"><button class="tool" data-resident-move="'+i+':-1" title="Nach oben">↑</button><button class="tool" data-resident-move="'+i+':1" title="Nach unten">↓</button></div></div>').join('')||'<p class="muted">Keine Residents.</p>';
    document.querySelectorAll('[data-resident-index]').forEach(b=>b.onclick=()=>{readResidentForm();state.selectedResident=Number(b.dataset.residentIndex);renderAll()});
    document.querySelectorAll('[data-resident-move]').forEach(b=>b.onclick=e=>{e.stopPropagation();const parts=b.dataset.residentMove.split(':').map(Number);moveResident(parts[0],parts[0]+parts[1])});
  }
  onReady(()=>{
    window.renderResidentList=renderResidentList=renderOrderedResidentList;
    if($('residentList'))renderResidentList();
  });
})();
