/* Shows Events/Artists save feedback directly in the visible Artists footer.
   Artists are stored in events.json, but feedback must appear in #artistStatus. */
(function(){
  if(window.__adminSaveStatusUxLoaded){
    if(typeof window.bindAdminSaveStatusUx==='function')window.bindAdminSaveStatusUx();
    return;
  }
  window.__adminSaveStatusUxLoaded=true;
  const DBG='[AdminSaveDebug]';
  function onReady(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn()}
  function tokenPresent(){return !!document.getElementById('ghToken')?.value?.trim()}
  function visibleArtistTab(){
    try{return typeof state!=='undefined' && state.view==='artists'}catch(e){return false}
  }
  function currentView(){
    try{return typeof state!=='undefined'?state.view:undefined}catch(e){return undefined}
  }
  function toArtistText(text){
    return String(text||'')
      .replace(/Events \/ Artists/g,'Artists')
      .replace(/Events:/g,'Artists:')
      .replace(/Events /g,'Artists ');
  }
  function copyEventStatusToArtist(){
    if(!visibleArtistTab()) return;
    const ev=document.getElementById('eventEditStatus');
    const txt=ev?.textContent||'';
    if(!txt) return;
    const type=ev.classList.contains('err')?'err':ev.classList.contains('warn')?'warn':'ok';
    setStatus('artistStatus',toArtistText(txt),type);
    console.log(DBG,'artistStatus:copiedFromEventStatus',{text:txt,type,view:currentView()});
  }
  async function artistSaveClick(){
    setStatus('artistStatus','Artist-Daten werden über FileMaker gepflegt.','warn');
  }
  function installSetStatusMirror(){
    if(window.__artistStatusMirrorInstalled) return;
    if(typeof window.setStatus!=='function') return;
    window.__artistStatusMirrorInstalled=true;
    const originalSetStatus=window.setStatus;
    window.setStatus=function(id,text,type='ok'){
      originalSetStatus(id,text,type);
      if(id==='eventEditStatus'&&visibleArtistTab()) originalSetStatus('artistStatus',toArtistText(text),type);
    };
    console.log(DBG,'artistStatusMirror:installed');
  }
  function bindArtistButtons(){
    installSetStatusMirror();
    const artistSave=document.getElementById('saveArtistsGitBtn');
    if(artistSave&&artistSave.dataset.artistStatusFeedbackBound!=='1'){
      artistSave.onclick=artistSaveClick;
      artistSave.disabled=true;
      artistSave.dataset.artistStatusFeedbackBound='1';
    }
    const topSave=document.getElementById('topSaveBtn');
    if(topSave&&topSave.dataset.adminSaveStatusUxBound!=='1'){
      topSave.onclick=()=>visibleArtistTab()?artistSaveClick():(currentView()==='residents'||currentView()==='releases'?window.saveResidentsToGithub?.():currentView()==='events'?window.saveEventsToGithub?.():undefined);
      topSave.dataset.adminSaveStatusUxBound='1';
    }
    console.log(DBG,'artistStatusFeedback:bound',{artistSave:!!artistSave,topSave:!!topSave,view:currentView(),visibleArtistTab:visibleArtistTab()});
    window.applyEventImageOnlyUi?.();
  }
  window.bindAdminSaveStatusUx=bindArtistButtons;
  onReady(()=>{
    bindArtistButtons();
    if(!window.__adminSaveStatusUxRenderAllWrapped&&typeof window.renderAll==='function'){
      window.__adminSaveStatusUxRenderAllWrapped=true;
      const originalRenderAll=window.renderAll;
      window.renderAll=function(){const out=originalRenderAll.apply(this,arguments);bindArtistButtons();return out;};
    }
    if(!window.__adminSaveStatusUxSetViewWrapped&&typeof window.setView==='function'){
      window.__adminSaveStatusUxSetViewWrapped=true;
      const originalSetView=window.setView;
      window.setView=function(v){const out=originalSetView.apply(this,arguments);bindArtistButtons();return out;};
    }
  });
})();
