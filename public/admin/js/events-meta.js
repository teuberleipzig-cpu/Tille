/* Event meta/calendar, JSON tools and controlled Admin v2 module loading.
   Loaded after admin-app.js. */
(function(){
  const ADMIN_BUILD_TEXT='admin-v2-structure-1 geladen';
  function onReady(fn){
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn);
    else fn();
  }
  function setAdminBuildBadge(){
    let b=$('adminBuildBadge');
    if(!b){
      b=document.createElement('div');
      b.id='adminBuildBadge';
      b.style.position='fixed';
      b.style.left='8px';
      b.style.bottom='26px';
      b.style.zIndex='99999';
      b.style.padding='4px 6px';
      b.style.border='1px solid #111';
      b.style.background='#fff';
      b.style.color='#111';
      b.style.font='11px/1.2 monospace';
      b.style.pointerEvents='none';
      document.body.appendChild(b);
    }
    b.textContent=ADMIN_BUILD_TEXT;
  }
  function installAdminBuildBadge(){
    setAdminBuildBadge();
    setTimeout(setAdminBuildBadge,0);
    if(window.__adminV2StructureBadgeWrapped)return;
    if(typeof window.renderAll!=='function')return;
    window.__adminV2StructureBadgeWrapped=true;
    const originalRenderAll=window.renderAll;
    window.renderAll=function(){
      const result=originalRenderAll.apply(this,arguments);
      setTimeout(setAdminBuildBadge,0);
      return result;
    };
  }

  function installEventSortDefault(){
    const sort=$('eventSort');
    if(!sort) return;
    if(sort.dataset.eventSortDefaultBound!=='1'){
      sort.dataset.eventSortDefaultBound='1';
      sort.addEventListener('change',()=>{sort.dataset.userTouched='1';});
    }
    if(sort.dataset.userTouched!=='1') sort.value='desc';
  }

  function ensureMetaShape(){
    const d=events();
    d.meta ||= {};
    d.meta.highlightLinks ||= [];
    d.meta.monthLabel ??= '';
    d.meta.calendarYear ??= new Date().getFullYear();
    d.meta.calendarMonth ??= new Date().getMonth()+1;
    d.meta.highlightTitle ??= '';
  }

  function toTextarea(id, extraClass){
    const old=$(id);
    if(!old || old.tagName==='TEXTAREA') return;
    const next=document.createElement('textarea');
    next.id=old.id;
    next.className=(old.className||'input')+(extraClass?' '+extraClass:'');
    next.placeholder=old.placeholder||'';
    next.value=old.value||'';
    old.replaceWith(next);
  }

  function addInputListener(id){
    const el=$(id);
    if(!el || el.dataset.metaExtBound==='1') return;
    el.dataset.metaExtBound='1';
    el.addEventListener('input',()=>{
      readEventForm();
      markDirty();
      updateEditorHeader();
      renderEventList();
      renderPreview();
      renderEventsJson();
    });
  }

  function injectMetaUi(){
    const tabs=document.querySelector('#view-events .tabs');
    const basis=$('event-tab-basis');
    if(!tabs || !basis) return;

    if(!document.querySelector('[data-event-tab="meta"]')){
      const btn=document.createElement('button');
      btn.className='tab';
      btn.dataset.eventTab='meta';
      btn.textContent='Meta / Kalender';
      btn.onclick=()=>setEventTab('meta');
      const lineup=document.querySelector('[data-event-tab="lineup"]');
      tabs.insertBefore(btn,lineup||null);
    }

    if(!$('event-tab-meta')){
      const panel=document.createElement('div');
      panel.id='event-tab-meta';
      panel.className='event-tab-panel hidden';
      panel.innerHTML='<div class="form-grid"><div class="field"><label class="label">Monatslabel</label><textarea class="input small-textarea" id="metaMonthLabel" placeholder="JUNE 2026"></textarea></div><div class="field"><label class="label">Highlight-Titel</label><textarea class="input small-textarea" id="metaHighlightTitle" placeholder="optional"></textarea></div><div class="field"><label class="label">Kalender-Jahr</label><input class="input" id="metaCalendarYear" type="number" min="2000" max="2100"></div><div class="field"><label class="label">Kalender-Monat</label><input class="input" id="metaCalendarMonth" type="number" min="1" max="12"></div><div class="field full"><label class="label">Highlight-Links, ein Link pro Zeile</label><textarea class="input meta-textarea" id="metaHighlightLinks" placeholder="https://..."></textarea></div></div><div class="notice" style="margin-top:16px">Diese Angaben landen in <code>events.json → meta</code>. Leere Zeilen in Highlight-Links werden ignoriert.</div>';
      basis.after(panel);
    }

    toTextarea('evTitle','small-textarea');
    toTextarea('evMoreUrl','small-textarea');
    toTextarea('evImageUrl','small-textarea');

    ['evTitle','evMoreUrl','evImageUrl','metaMonthLabel','metaCalendarYear','metaCalendarMonth','metaHighlightTitle','metaHighlightLinks'].forEach(addInputListener);
  }

  function renderEventMeta(){
    ensureMetaShape();
    const meta=events().meta||{};
    if($('metaMonthLabel')) $('metaMonthLabel').value=meta.monthLabel||'';
    if($('metaCalendarYear')) $('metaCalendarYear').value=meta.calendarYear||'';
    if($('metaCalendarMonth')) $('metaCalendarMonth').value=meta.calendarMonth||'';
    if($('metaHighlightTitle')) $('metaHighlightTitle').value=meta.highlightTitle||'';
    if($('metaHighlightLinks')) $('metaHighlightLinks').value=(meta.highlightLinks||[]).join('\n');
  }

  function readEventMeta(){
    ensureMetaShape();
    const meta=events().meta;
    if($('metaMonthLabel')) meta.monthLabel=$('metaMonthLabel').value||'';
    if($('metaCalendarYear')) meta.calendarYear=Number($('metaCalendarYear').value)||new Date().getFullYear();
    if($('metaCalendarMonth')) meta.calendarMonth=Number($('metaCalendarMonth').value)||new Date().getMonth()+1;
    if($('metaHighlightTitle')) meta.highlightTitle=$('metaHighlightTitle').value||'';
    if($('metaHighlightLinks')) meta.highlightLinks=String($('metaHighlightLinks').value||'').split(/\n/).map(x=>x.trim()).filter(Boolean);
  }

  function convertGeneratedInputs(html){
    const convert=(source,attr)=>source.replace(new RegExp('<input class="input" ('+attr+'="[^"]+") value="([^"]*)" placeholder="([^"]*)">','g'),'<textarea class="input small-textarea" $1 placeholder="$3">$2</textarea>');
    let out=html;
    ['data-section-label','data-section-genre','data-artist-name','data-artist-info','data-artist-link'].forEach(attr=>{out=convert(out,attr);});
    return out;
  }

  function installJsonTools(){
    const download=$('downloadEventsJsonBtn');
    if(!download || $('copyEventsJsonBtn')) return;
    download.textContent='JSON herunterladen';

    const refresh=document.createElement('button');
    refresh.className='btn';
    refresh.id='refreshEventsJsonBtn';
    refresh.textContent='JSON aktualisieren';
    refresh.onclick=()=>{
      readEventForm();
      readArtistForm();
      renderEventsJson();
      setStatus('eventEditStatus','Events JSON aktualisiert.','ok');
    };

    const copy=document.createElement('button');
    copy.className='btn';
    copy.id='copyEventsJsonBtn';
    copy.textContent='JSON kopieren';
    copy.onclick=async()=>{
      readEventForm();
      readArtistForm();
      const text=eventsJson();
      try{
        await navigator.clipboard.writeText(text);
        setStatus('eventEditStatus','Events JSON in die Zwischenablage kopiert.','ok');
      }catch(e){
        $('eventsJsonOutput').focus();
        $('eventsJsonOutput').select();
        setStatus('eventEditStatus','JSON ist markiert. Bitte manuell kopieren.','warn');
      }
    };

    download.before(refresh,copy);
  }

  function loadExtraExtension(cssPath,jsPath){
    if(cssPath && !document.querySelector('link[href="'+cssPath+'"]')){
      const link=document.createElement('link');
      link.rel='stylesheet';
      link.href=cssPath;
      document.head.appendChild(link);
    }
    if(jsPath && !document.querySelector('script[src="'+jsPath+'"]')){
      const script=document.createElement('script');
      script.src=jsPath;
      script.defer=true;
      document.body.appendChild(script);
    }
  }

  function loadControlledAdminModules(){
    loadExtraExtension(null,'./js/save-status-ux.js?v=status-ux-1');
    loadExtraExtension('./css/residents-news.css','./js/residents-news.js?v=residents-news-only-news-1');
    loadExtraExtension('./css/residents-media.css','./js/residents-media.js?v=resident-media-structure-restore-2');
    loadExtraExtension('./css/textareas.css','./js/textareas.js');
    loadExtraExtension('./css/releases-admin.css','./js/releases-core.js');
    loadExtraExtension(null,'./js/releases-extra.js');
    loadExtraExtension(null,'./js/auto-github-load.js?v=debug-save-safe-restore-1');
    loadExtraExtension('./css/residents-order.css','./js/residents-order.js');
    loadExtraExtension('./css/releases-workflow.css','./js/releases-workflow.js');
    loadExtraExtension('./css/resident-access.css','./extensions/resident-access.js?v=resident-access-2');
  }

  function installStrictArtistOffer(){
    window.offerArtistSave=offerArtistSave=function(input){
      readEventForm();
      const key=input?.dataset?.artistName||input?.dataset?.artistInfo||input?.dataset?.artistLink;
      if(!key||!currentEvent()) return;
      const parts=key.split(':').map(Number);
      const item=currentEvent().sections?.[parts[0]]?.items?.[parts[1]];
      if(!item) return;
      const name=String(item.name||'').trim();
      const info=String(item.info||'').trim();
      const link=String(item.link||'').trim();
      if(!name||!info||!link) return;

      const existing=artists().find(a=>norm(a.name)===norm(name));
      if(existing && String(existing.info||'').trim()===info && String(existing.link||'').trim()===link) return;

      if(existing){
        if(!confirm('Artist "'+name+'" existiert schon, aber Info/Link unterscheiden sich. Artistliste aktualisieren?')) return;
        existing.info=info;
        existing.link=link;
        setStatus('eventEditStatus','Artistliste für '+name+' aktualisiert.','ok');
      }else{
        if(!confirm('Artist "'+name+'" mit Info und Link in die Artistliste aufnehmen?')) return;
        artists().push({name,info,link});
        state.selectedArtist=artists().length-1;
        setStatus('eventEditStatus','Artist '+name+' in die Artistliste aufgenommen.','ok');
      }
      markDirty();
      renderArtists();
      renderEventsJson();
    };
  }

  onReady(()=>{
    installEventSortDefault();
    injectMetaUi();
    installJsonTools();
    installStrictArtistOffer();
    loadControlledAdminModules();
    installAdminBuildBadge();

    const originalEnsureEvents=ensureEvents;
    window.ensureEvents=ensureEvents=function(){
      originalEnsureEvents();
      ensureMetaShape();
    };

    const originalRenderEventForm=renderEventForm;
    window.renderEventForm=renderEventForm=function(){
      injectMetaUi();
      originalRenderEventForm();
      renderEventMeta();
      installStrictArtistOffer();
    };

    const originalReadEventForm=readEventForm;
    window.readEventForm=readEventForm=function(){
      readEventMeta();
      originalReadEventForm();
    };

    const originalSectionHtml=sectionHtml;
    window.sectionHtml=sectionHtml=function(s,si){
      return convertGeneratedInputs(originalSectionHtml(s,si));
    };

    ensureMetaShape();
    renderAll();
    installAdminBuildBadge();
  });
})();