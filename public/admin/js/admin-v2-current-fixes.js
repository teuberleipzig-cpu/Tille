/* Current Admin v2 fixes: stable previews, hidden meta tab, event list refresh after save, resident news stability. */
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
  function normalizeNews(r){
    if(!r)return[];
    if(!Array.isArray(r.newsItems)){
      if(Array.isArray(r.news))r.newsItems=r.news;
      else r.newsItems=[];
    }
    r.newsItems=r.newsItems.map(n=>typeof n==='string'?{date:'',text:n}:{date:n.date||'',text:n.text||''});
    return r.newsItems;
  }
  function sortResidentNews(r){
    return normalizeNews(r).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||String(a.text||'').localeCompare(String(b.text||''),'de'));
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
      rel.published=rel.published!==false;
      rel.autoNews=rel.autoNews!==false;
      const cover=mainpagePath(rel.coverUrl||rel.coverImage||rel.cover||rel.imageUrl||'');
      if(cover){rel.coverUrl=cover;rel.coverImage=cover;}
    });
    sortResidentNews(r);
  }
  function normalizeEvent(e){if(e&&e.imageUrl)e.imageUrl=mainpagePath(e.imageUrl)}
  function fixAllAdminImages(){
    document.querySelectorAll('img').forEach(img=>{
      const src=img.getAttribute('src')||'';
      if(src&&!/^(https?:|data:|blob:)/.test(src))img.src=adminAssetUrl(src);
    });
  }
  function fixEventPreviewImages(){
    const e=currentEvent&&currentEvent();
    if(e&&$('eventImagePreview'))$('eventImagePreview').src=adminAssetUrl(e.imageUrl||'');
    const img=$('eventPreview')?.querySelector('img');
    if(img&&e?.imageUrl)img.src=adminAssetUrl(e.imageUrl);
    fixAllAdminImages();
  }
  function fixResidentPreviewImages(){
    document.querySelectorAll('#residentPhotosList img,.resident-photo-card img').forEach(img=>{
      const attr=img.getAttribute('src')||'';
      img.src=adminAssetUrl(attr);
    });
    fixAllAdminImages();
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
  function installResidentNewsFixes(){
    const add=$('addResidentNewsBtn');
    if(add&&add.dataset.adminV2CurrentFixNews!=='1'){
      add.dataset.adminV2CurrentFixNews='1';
      add.onclick=()=>{
        readResidentForm();
        const r=currentResident();
        if(!r)return;
        normalizeNews(r).unshift({date:new Date().toISOString().slice(0,10),text:''});
        markDirty();
        renderResidentForm();
        setResidentTab('news');
        setStatus('residentStatus','Neue News oben eingefügt. Noch nicht veröffentlicht.','ok');
      };
    }
    const sort=$('sortResidentNewsBtn');
    if(sort&&sort.dataset.adminV2CurrentFixNews!=='1'){
      sort.dataset.adminV2CurrentFixNews='1';
      sort.onclick=()=>{
        const r=currentResident();
        if(!r)return;
        sortResidentNews(r);
        markDirty();
        if(window.renderResidentNews)renderResidentNews();
        setResidentTab('news');
        setStatus('residentStatus','News nach Datum sortiert. Noch nicht veröffentlicht.','ok');
      };
    }
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
    window.readResidentForm=readResidentForm=function(){origReadResident();normalizePhotos(currentResident());sortResidentNews(currentResident());};
    const origRenderResident=renderResidentForm;
    window.renderResidentForm=renderResidentForm=function(){origRenderResident();installResidentNewsFixes();fixResidentPreviewImages();};
    const origRenderAll=renderAll;
    window.renderAll=renderAll=function(){origRenderAll();hideMetaTab();installResidentNewsFixes();fixEventPreviewImages();fixResidentPreviewImages();showBadge();};
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
    const mo=new MutationObserver(()=>installResidentNewsFixes());
    mo.observe(document.body,{childList:true,subtree:true});
  }
  function showBadge(){
    let b=$('adminBuildBadge');
    if(!b){
      b=document.createElement('div');b.id='adminBuildBadge';
      b.style.position='fixed';b.style.left='8px';b.style.bottom='26px';b.style.zIndex='99999';b.style.padding='4px 6px';b.style.border='1px solid #111';b.style.background='#fff';b.style.color='#111';b.style.font='11px/1.2 monospace';b.style.pointerEvents='none';
      document.body.appendChild(b);
    }
    b.textContent='admin-v2-fixes-2 geladen';
  }
  onReady(()=>{installWrappers();hideMetaTab();installResidentNewsFixes();fixEventPreviewImages();fixResidentPreviewImages();showBadge();});
})();
