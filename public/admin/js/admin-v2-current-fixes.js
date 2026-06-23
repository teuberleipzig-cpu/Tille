/* Current Admin v2 fixes: stable previews, hidden meta tab, event list refresh after save, resident news stability, event list stability. */
(function(){
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
  function adminAssetUrl(value){
    const raw=String(value||'').trim();
    const preview=previewFor(raw);
    if(preview)return preview;
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
  function dateKey(event){
    const s=String(event?.date||'').trim();
    let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if(m)return m[1]+'-'+String(m[2]).padStart(2,'0')+'-'+String(m[3]).padStart(2,'0');
    m=s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if(m)return m[3]+'-'+String(m[2]).padStart(2,'0')+'-'+String(m[1]).padStart(2,'0');
    m=s.match(/^(\d{4})[/.](\d{1,2})[/.](\d{1,2})$/);
    if(m)return m[1]+'-'+String(m[2]).padStart(2,'0')+'-'+String(m[3]).padStart(2,'0');
    return s||'0000-00-00';
  }
  function clearEventFilters(opts={}){
    if($('globalSearch'))$('globalSearch').value='';
    if($('eventFrom'))$('eventFrom').value='';
    if($('eventTo'))$('eventTo').value='';
    if($('eventSort')&&!opts.keepSort)$('eventSort').value='desc';
  }
  function clearEventFiltersForNewSelection(){clearEventFilters({keepSort:true});state.eventListExpanded=false;}
  function installEventFilterReset(){
    const grid=document.querySelector('#view-events .filter-grid');
    if(!grid||$('resetEventFiltersBtn'))return;
    const wrap=document.createElement('div');
    wrap.className='field full';
    wrap.innerHTML='<button class="tool" id="resetEventFiltersBtn" type="button">Filter zurücksetzen / alle Events zeigen</button>';
    grid.appendChild(wrap);
    $('resetEventFiltersBtn').onclick=()=>{
      clearEventFilters();
      state.eventListExpanded=false;
      renderEventList();
      setStatus('eventEditStatus','Filter zurückgesetzt. Alle Events sind wieder in der Liste.','ok');
    };
  }
  function installEventListOverride(){
    if(window.__adminV2EventListOverrideInstalled)return;
    window.__adminV2EventListOverrideInstalled=true;
    window.renderEventList=renderEventList=function(){
      installEventFilterReset();
      const d=events();
      const q=norm($('globalSearch')?.value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      const from=$('eventFrom')?.value||'',to=$('eventTo')?.value||'',sort=$('eventSort')?.value||'desc';
      let visible=d.events.map((event,index)=>({event,index})).filter(({event})=>{
        const dk=dateKey(event);
        return !(from&&(!dk||dk<from))&&!(to&&(!dk||dk>to))&&(!q||eventText(event).includes(q));
      }).sort((a,b)=>{
        const r=dateKey(a.event).localeCompare(dateKey(b.event))||String(a.event.title||'').localeCompare(String(b.event.title||''),'de')||a.index-b.index;
        return sort==='asc'?r:-r;
      });
      const pinned=Number(state.pinnedDraftEventIndex);
      if(state.dirty&&Number.isInteger(pinned)&&pinned>=0&&!q&&!from&&!to){
        const hit=visible.findIndex(x=>x.index===pinned);
        if(hit>0){const [item]=visible.splice(hit,1);visible.unshift(item);}
      }
      const shown=state.eventListExpanded?visible:visible.slice(0,10);
      $('eventListStatus').textContent=`${shown.length} von ${visible.length} sichtbaren Events · insgesamt ${d.events.length}`;
      let html=shown.map(({event,index})=>`<button class="item event-item ${index===state.selectedEvent?'active':''}" data-event-index="${index}"><strong>${esc(event.date||'ohne Datum')} – ${esc(event.title||'Ohne Titel')}</strong><span>${index===pinned&&state.dirty?'Neu im Entwurf · ':''}${(event.sections||[]).length} Abschnitte · ${esc(event.color||'')}</span></button>`).join('');
      if(visible.length>10)html+=`<button class="list-toggle" id="eventListToggle">${state.eventListExpanded?'Weniger anzeigen':'Mehr anzeigen ('+(visible.length-10)+')'}</button>`;
      $('eventList').innerHTML=html||'<p class="muted">Keine Events gefunden.</p>';
      document.querySelectorAll('[data-event-index]').forEach(b=>b.onclick=()=>{readEventForm();state.selectedEvent=Number(b.datasetEventIndex||b.dataset.eventIndex);renderAll()});
      const t=$('eventListToggle');
      if(t)t.onclick=()=>{state.eventListExpanded=!state.eventListExpanded;renderEventList()};
    };
  }
  function fixAllAdminImages(){
    document.querySelectorAll('img').forEach(img=>{
      const src=img.getAttribute('src')||'';
      const fixed=adminAssetUrl(src);
      if(src&&fixed&&src!==fixed)img.src=fixed;
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
    installEventListOverride();
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
    window.renderAll=renderAll=function(){origRenderAll();hideMetaTab();installEventFilterReset();installResidentNewsFixes();fixEventPreviewImages();fixResidentPreviewImages();showBadge();};
    const origNewEvent=newEvent;
    window.newEvent=newEvent=function(){clearEventFiltersForNewSelection();origNewEvent();state.pinnedDraftEventIndex=state.selectedEvent;renderEventList();setStatus('eventEditStatus','Neues Event oben angepinnt. Nach Speichern/Reload greift wieder Datumssortierung.','ok');};
    if($('newEventBtn'))$('newEventBtn').onclick=newEvent;
    const origLoadPublicData=loadPublicData;
    window.loadPublicData=loadPublicData=async function(){
      await origLoadPublicData();
      clearEventFilters();
      state.eventListExpanded=false;
      renderEventList();
      showBadge();
    };
    const origLoadEvents=loadEventsFromGithub;
    window.loadEventsFromGithub=loadEventsFromGithub=async function(){
      await origLoadEvents();
      clearEventFilters();
      state.eventListExpanded=false;
      setView('events');
      renderEventList();
      setStatus('eventEditStatus','Events aus GitHub geladen. Filter zurückgesetzt.','ok');
    };
    const origSaveEvents=saveEventsToGithub;
    window.saveEventsToGithub=saveEventsToGithub=async function(){
      await origSaveEvents();
      if(state.syncState==='loaded'){
        state.pinnedDraftEventIndex=-1;
        clearEventFilters();
        state.eventListExpanded=false;
        setView('events');
        renderEventList();
        renderEventForm();
        setStatus('eventEditStatus','Events gespeichert. Datumssortierung ist wieder aktiv.','ok');
      }
    };
    if($('eventSaveBtn'))$('eventSaveBtn').onclick=saveEventsToGithub;
    if($('saveEventsGitBtn'))$('saveEventsGitBtn').onclick=saveEventsToGithub;
    if($('loadEventsGitBtn'))$('loadEventsGitBtn').onclick=loadEventsFromGithub;
    if($('topLoadBtn'))$('topLoadBtn').onclick=()=>state.view==='residents'?loadResidentsFromGithub():loadEventsFromGithub();
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
    b.textContent='admin-v2-fixes-4 geladen';
  }
  onReady(()=>{installWrappers();hideMetaTab();installEventFilterReset();installResidentNewsFixes();fixEventPreviewImages();fixResidentPreviewImages();showBadge();clearEventFilters();state.eventListExpanded=false;renderEventList();});
})();
