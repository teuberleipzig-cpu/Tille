/* Current Admin v2 fixes: stable previews, hidden meta tab, event list refresh after save. */
(function(){
  function onReady(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn()}
  function adminAssetUrl(value){
    const raw=String(value||'').trim();
    if(!raw||/^(https?:|data:|blob:)/.test(raw))return raw;
    if(raw.startsWith('/Tille/public/'))return raw;
    if(raw.startsWith('/events/')||raw.startsWith('/residents/'))return '..'+raw;
    if(raw.startsWith('events/')||raw.startsWith('residents/'))return '../'+raw;
    if(raw.startsWith('public/'))return '../'+raw.replace(/^public\//,'');
    return raw;
  }
  function mainpagePath(value){
    const raw=String(value||'').trim();
    if(!raw||/^(https?:|data:|blob:)/.test(raw))return raw;
    if(raw.startsWith('/Tille/public/'))return 'public/'+raw.split('/Tille/public/')[1];
    if(raw.startsWith('/events/')||raw.startsWith('/residents/'))return 'public'+raw;
    if(raw.startsWith('events/')||raw.startsWith('residents/'))return 'public/'+raw;
    if(raw.startsWith('../events/')||raw.startsWith('../residents/'))return 'public/'+raw.replace(/^\.\.\//,'');
    return raw;
  }
  function normalizePhotos(r){
    if(!r)return;
    const source=Array.isArray(r.photoList)&&r.photoList.length?r.photoList:(Array.isArray(r.photos)?r.photos:[]);
    const normalized=source.map(p=>({url:mainpagePath(typeof p==='string'?p:(p?.url||p?.src||''))})).filter(p=>p.url);
    if(normalized.length){r.photoList=normalized;r.photos=normalized;}
    if(r.presskit)r.presskit=mainpagePath(r.presskit);
    if(r.presskitUrl)r.presskitUrl=mainpagePath(r.presskitUrl);
    if(r.pressKitUrl)r.pressKitUrl=mainpagePath(r.pressKitUrl);
    if(Array.isArray(r.releases))r.releases.forEach(rel=>{
      const cover=mainpagePath(rel.coverUrl||rel.coverImage||rel.cover||rel.imageUrl||'');
      if(cover){rel.coverUrl=cover;rel.coverImage=cover;}
    });
  }
  function normalizeEvent(e){if(e&&e.imageUrl)e.imageUrl=mainpagePath(e.imageUrl)}
  function fixEventPreviewImages(){
    const e=currentEvent&&currentEvent();
    if(e&&$('eventImagePreview'))$('eventImagePreview').src=adminAssetUrl(e.imageUrl||'');
    const img=$('eventPreview')?.querySelector('img');
    if(img&&e?.imageUrl)img.src=adminAssetUrl(e.imageUrl);
  }
  function fixResidentPreviewImages(){
    document.querySelectorAll('#residentPhotosList img,.resident-photo-card img').forEach(img=>{
      const attr=img.getAttribute('src')||'';
      img.src=adminAssetUrl(attr);
    });
  }
  function hideMetaTab(){
    const metaBtn=document.querySelector('[data-event-tab="meta"]');
    const metaPanel=$('event-tab-meta');
    if(metaBtn)metaBtn.style.display='none';
    if(metaPanel)metaPanel.classList.add('hidden');
    if(state.eventTab==='meta'&&window.setEventTab)setEventTab('basis');
  }
  function clearEventFiltersForNewSelection(){
    if($('globalSearch'))$('globalSearch').value='';
    if($('eventFrom'))$('eventFrom').value='';
    if($('eventTo'))$('eventTo').value='';
    state.eventListExpanded=true;
  }
  function installWrappers(){
    if(window.__adminV2CurrentFixesInstalled)return;
    window.__adminV2CurrentFixesInstalled=true;
    const origReadEvent=readEventForm;
    window.readEventForm=readEventForm=function(){origReadEvent();normalizeEvent(currentEvent());};
    const origRenderEvent=renderEventForm;
    window.renderEventForm=renderEventForm=function(){origRenderEvent();hideMetaTab();fixEventPreviewImages();};
    const origRenderPreview=renderPreview;
    window.renderPreview=renderPreview=function(){origRenderPreview();fixEventPreviewImages();};
    const origReadResident=readResidentForm;
    window.readResidentForm=readResidentForm=function(){origReadResident();normalizePhotos(currentResident());};
    const origRenderResident=renderResidentForm;
    window.renderResidentForm=renderResidentForm=function(){origRenderResident();fixResidentPreviewImages();};
    const origRenderAll=renderAll;
    window.renderAll=renderAll=function(){origRenderAll();hideMetaTab();fixEventPreviewImages();fixResidentPreviewImages();showBadge();};
    const origNewEvent=newEvent;
    window.newEvent=newEvent=function(){clearEventFiltersForNewSelection();origNewEvent();renderEventList();setStatus('eventEditStatus','Neues Event oben/links sichtbar. Noch nicht veröffentlicht.','ok');};
    if($('newEventBtn'))$('newEventBtn').onclick=newEvent;
    const origSaveEvents=saveEventsToGithub;
    window.saveEventsToGithub=saveEventsToGithub=async function(){
      await origSaveEvents();
      if(state.syncState==='loaded'){
        clearEventFiltersForNewSelection();
        setView('events');
        renderEventList();
        renderEventForm();
        setStatus('eventEditStatus','Events gespeichert und Eventliste aktualisiert.','ok');
      }
    };
    if($('eventSaveBtn'))$('eventSaveBtn').onclick=saveEventsToGithub;
    if($('saveEventsGitBtn'))$('saveEventsGitBtn').onclick=saveEventsToGithub;
  }
  function showBadge(){
    let b=$('adminBuildBadge');
    if(!b){
      b=document.createElement('div');b.id='adminBuildBadge';
      b.style.position='fixed';b.style.left='8px';b.style.bottom='26px';b.style.zIndex='99999';b.style.padding='4px 6px';b.style.border='1px solid #111';b.style.background='#fff';b.style.color='#111';b.style.font='11px/1.2 monospace';b.style.pointerEvents='none';
      document.body.appendChild(b);
    }
    b.textContent='admin-v2-fixes-1 geladen';
  }
  onReady(()=>{installWrappers();hideMetaTab();fixEventPreviewImages();fixResidentPreviewImages();showBadge();});
})();
