/* Enforces FileMaker-owned Event fields in Admin v2. Residents are intentionally untouched. */
(function(){
  if(window.__adminEventImageOnlyUiLoaded){window.applyEventImageOnlyUi?.();return}
  window.__adminEventImageOnlyUiLoaded=true;
  const NOTICE='Veranstaltungsdaten werden über FileMaker gepflegt. In der Admin-Seite kann aktuell nur das Veranstaltungsbild geändert werden.';
  const ARTIST_NOTICE='Artist- und Lineup-Daten werden über FileMaker gepflegt und sind hier nur lesbar.';

  function byId(id){return document.getElementById(id)}
  function disable(id,title=NOTICE){const el=byId(id);if(!el)return;el.disabled=true;el.setAttribute('aria-disabled','true');el.title=title}
  function readOnly(id,title=NOTICE){const el=byId(id);if(!el)return;el.readOnly=true;el.setAttribute('aria-readonly','true');el.title=title}
  function addNotice(scope,id,text){
    if(byId(id))return;
    const parent=document.querySelector(scope);
    if(!parent)return;
    const notice=document.createElement('div');
    notice.id=id;
    notice.className='notice warn';
    notice.style.marginBottom='16px';
    notice.textContent=text;
    parent.prepend(notice);
  }
  function protectDynamicLineup(){
    document.querySelectorAll('[data-section-label],[data-section-genre],[data-artist-name],[data-artist-info],[data-artist-link]').forEach(el=>{
      el.readOnly=true;el.setAttribute('aria-readonly','true');el.title=NOTICE;
    });
    document.querySelectorAll('[data-add-artist],[data-remove-artist],[data-move-artist],[data-remove-section],[data-move-section]').forEach(el=>{
      el.disabled=true;el.setAttribute('aria-disabled','true');el.title=NOTICE;
    });
  }
  function applyTopSave(){
    const button=byId('topSaveBtn');
    if(!button||typeof state==='undefined')return;
    const residentView=state.view==='residents'||state.view==='releases';
    const eventView=state.view==='events';
    button.disabled=!residentView&&!eventView;
    button.setAttribute('aria-disabled',String(button.disabled));
    button.textContent=eventView?'Eventbild speichern':residentView?'Speichern':'Speichern nicht verfügbar';
    button.title=state.view==='artists'?ARTIST_NOTICE:'';
  }
  function apply(){
    addNotice('#view-events .editor-body','eventImageOnlyNotice',NOTICE);
    addNotice('#view-artists .editor-body','artistReadOnlyNotice',ARTIST_NOTICE);
    ['evDate','evTitle','evMoreUrl','evDescription','metaMonthLabel','metaCalendarYear','metaCalendarMonth','metaHighlightTitle','metaHighlightLinks'].forEach(readOnly);
    disable('evColor');
    ['newEventBtn','duplicateEventBtn','deleteEventBtn','addSectionBtn','saveDraftBtn'].forEach(id=>disable(id));
    ['artistName','artistInfo','artistLink'].forEach(id=>readOnly(id,ARTIST_NOTICE));
    ['newArtistBtn','collectArtistsBtn','deleteArtistBtn','saveArtistBtn','saveArtistsGitBtn'].forEach(id=>disable(id,ARTIST_NOTICE));
    disable('saveEventsGitBtn','Event-Save ist hier deaktiviert. Bitte im Event unter „Bild“ speichern.');
    const settingsSave=byId('saveEventsGitBtn');if(settingsSave)settingsSave.textContent='Event-Save nur im Bild-Tab';
    const image=byId('evImageUrl');if(image){image.disabled=false;image.readOnly=false;image.removeAttribute('aria-disabled');image.removeAttribute('aria-readonly');image.title=''}
    disable('evImageFile','Der alte Data-URL-Upload ist deaktiviert. Bitte den GitHub-Bildupload verwenden.');
    const eventSave=byId('eventSaveBtn');if(eventSave){eventSave.disabled=false;eventSave.textContent='Eventbild speichern';eventSave.title='Speichert ausschließlich das Bild auf Basis des frischen GitHub-Stands.'}
    protectDynamicLineup();
    applyTopSave();
  }
  function wrap(name){
    if(window['__eventImageOnlyWrapped_'+name]||typeof window[name]!=='function')return;
    window['__eventImageOnlyWrapped_'+name]=true;
    const original=window[name];
    window[name]=function(){const result=original.apply(this,arguments);apply();return result};
  }
  window.applyEventImageOnlyUi=apply;
  wrap('renderAll');
  wrap('renderEventForm');
  wrap('renderArtists');
  wrap('setView');
  document.addEventListener('admin-github-media-ready',apply);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
})();
