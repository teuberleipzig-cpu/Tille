/* Admin v2 media layout + local preview repair.
   Keeps upload dropzones inside their sections and keeps blob previews after reorder. */
(function(){
  function $(id){return document.getElementById(id)}
  function onReady(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn()}
  function previewFor(value){
    const raw=String(value||'').trim();
    const map=window.__adminLocalMediaPreviews;
    if(!raw||!map)return'';
    const keys=[raw];
    if(raw.startsWith('/Tille/public/'))keys.push('public/'+raw.split('/Tille/public/')[1]);
    if(raw.startsWith('../events/')||raw.startsWith('../residents/'))keys.push('public/'+raw.replace(/^\.\.\//,''));
    if(raw.startsWith('/events/')||raw.startsWith('/residents/'))keys.push('public'+raw);
    if(raw.startsWith('events/')||raw.startsWith('residents/'))keys.push('public/'+raw);
    if(raw.startsWith('public/')){
      keys.push('../'+raw.replace(/^public\//,''));
      if(raw.startsWith('public/events/'))keys.push('/events/'+raw.split('public/events/')[1]);
      if(raw.startsWith('public/residents/'))keys.push('/residents/'+raw.split('public/residents/')[1]);
      if(location.pathname.includes('/public/'))keys.push(location.pathname.slice(0,location.pathname.indexOf('/public/'))+'/public/'+raw.replace(/^public\//,''));
    }
    for(const key of keys){if(map.has(key))return map.get(key)}
    return'';
  }
  function assetFor(value){
    const raw=String(value||'').trim();
    const local=previewFor(raw);
    if(local)return local;
    if(!raw||/^(https?:|data:|blob:)/.test(raw))return raw;
    if(raw.startsWith('/Tille/public/'))return raw;
    if(raw.startsWith('/events/')||raw.startsWith('/residents/'))return '..'+raw;
    if(raw.startsWith('events/')||raw.startsWith('residents/'))return '../'+raw;
    if(raw.startsWith('public/'))return '../'+raw.replace(/^public\//,'');
    return raw;
  }
  function moveDropzone(id,slotId){
    const zone=$(id),slot=$(slotId);
    if(zone&&slot&&zone.parentElement!==slot){slot.appendChild(zone)}
  }
  function hideLegacyNotice(){
    const panel=$('resident-tab-media');
    if(!panel)return;
    [...panel.querySelectorAll('.notice')].forEach(n=>{
      const txt=n.textContent||'';
      if(txt.includes('News, Fotos, Embeds und Releases bleiben erhalten'))n.style.display='none';
    });
  }
  function repairLayout(){
    moveDropzone('residentPresskitGithubDrop','residentPresskitSlot');
    moveDropzone('residentPhotosGithubDrop','residentPhotosDropSlot');
    hideLegacyNotice();
  }
  function repairImages(){
    document.querySelectorAll('#eventImagePreview,#eventPreview img,#residentPhotosList img,.resident-photo-card img').forEach(img=>{
      const src=img.getAttribute('src')||'';
      const fixed=assetFor(src);
      if(fixed&&fixed!==src)img.src=fixed;
    });
    const current=window.currentEvent&&currentEvent();
    if(current&&current.imageUrl){
      const fixed=assetFor(current.imageUrl);
      if($('eventImagePreview')&&fixed)$('eventImagePreview').src=fixed;
      const p=$('eventPreview')?.querySelector('img');
      if(p&&fixed)p.src=fixed;
    }
  }
  function showBadge(){
    let b=$('adminBuildBadge');
    if(!b){
      b=document.createElement('div');
      b.id='adminBuildBadge';
      b.style.position='fixed';b.style.left='8px';b.style.bottom='26px';b.style.zIndex='99999';
      b.style.padding='4px 6px';b.style.border='1px solid #111';b.style.background='#fff';b.style.color='#111';
      b.style.font='11px/1.2 monospace';b.style.pointerEvents='none';
      document.body.appendChild(b);
    }
    b.textContent='admin-v2-fixes-5 geladen';
  }
  function run(){repairLayout();repairImages();showBadge()}
  onReady(()=>{
    run();
    setInterval(run,700);
    new MutationObserver(run).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
  });
})();
