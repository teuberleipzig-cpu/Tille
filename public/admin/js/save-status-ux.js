/* Shows Events/Artists save feedback directly in the visible Artists footer.
   Artists are stored in events.json, but feedback must appear in #artistStatus. */
(function(){
  const DBG='[AdminSaveDebug]';
  function onReady(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn()}
  function tokenPresent(){return !!document.getElementById('ghToken')?.value?.trim()}
  function visibleArtistTab(){return window.state && state.view==='artists'}
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
    console.log(DBG,'artistStatus:copiedFromEventStatus',{text:txt,type});
  }
  async function artistSaveClick(){
    console.log(DBG,'artistSaveFeedback:click',{view:window.state?.view,tokenPresent:tokenPresent()});
    if(!tokenPresent()){
      setStatus('artistStatus','Speichern braucht einen GitHub Token. Laden/Bearbeiten geht ohne Token.','err');
      return;
    }
    setStatus('artistStatus','Speichere Artists in GitHub...','warn');
    try{
      const result=window.saveEventsToGithub?.();
      await Promise.resolve(result);
      setTimeout(copyEventStatusToArtist,0);
      setTimeout(copyEventStatusToArtist,150);
      setTimeout(copyEventStatusToArtist,700);
    }catch(e){
      setStatus('artistStatus',e?.message||'Artists speichern fehlgeschlagen.','err');
    }
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
    if(artistSave){
      artistSave.onclick=artistSaveClick;
      artistSave.dataset.artistStatusFeedbackBound='1';
    }
    const topSave=document.getElementById('topSaveBtn');
    if(topSave){
      topSave.onclick=()=>visibleArtistTab()?artistSaveClick():(state.view==='residents'||state.view==='releases'?window.saveResidentsToGithub?.():window.saveEventsToGithub?.());
    }
    console.log(DBG,'artistStatusFeedback:bound',{artistSave:!!artistSave,topSave:!!topSave});
  }
  onReady(()=>{
    bindArtistButtons();
    setTimeout(bindArtistButtons,500);
    setTimeout(bindArtistButtons,1500);
    setTimeout(bindArtistButtons,3000);
    setTimeout(bindArtistButtons,6000);
  });
})();
