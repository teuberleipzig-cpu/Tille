/* Admin v2 draft storage guard.
   Scope: prevents local draft quota crashes. No GitHub save/load calls and no data JSON writes. */
(function(){
  if(window.__adminDraftGuardLoaded)return;
  window.__adminDraftGuardLoaded=true;

  function safeSetDraft(key,value){
    try{
      localStorage.setItem(key,value);
      return{ok:true,bytes:String(value||'').length};
    }catch(error){
      if(error&&error.name==='QuotaExceededError'){
        try{localStorage.removeItem(key)}catch(e){}
        return{ok:false,quota:true,bytes:String(value||'').length,message:error.message};
      }
      return{ok:false,quota:false,bytes:String(value||'').length,message:error?.message||String(error)};
    }
  }
  function guardedSaveDraft(){
    try{if(typeof readEventForm==='function')readEventForm()}catch(e){}
    try{if(typeof readArtistForm==='function')readArtistForm()}catch(e){}
    try{if(typeof readResidentForm==='function')readResidentForm()}catch(e){}
    const eventsText=typeof eventsJson==='function'?eventsJson():'';
    const residentsText=typeof residentsJson==='function'?residentsJson():'';
    const ev=safeSetDraft('distillery-admin-v2-events-draft',eventsText);
    const res=safeSetDraft('distillery-admin-v2-residents-draft',residentsText);
    const result={events:ev,residents:res};
    console.info('[AdminDraftGuard]',result);
    if(ev.ok&&res.ok){
      if(typeof setStatus==='function')setStatus('eventEditStatus','Entwurf lokal gespeichert. Noch nicht veröffentlicht.','ok');
      return result;
    }
    if(typeof setStatus==='function')setStatus('eventEditStatus','GitHub-Speichern ist möglich. Lokaler Browser-Entwurf ist für Residents zu groß und wurde nicht gespeichert.','warn');
    return result;
  }
  if(typeof window.saveDraft==='function'){
    window.__adminOriginalSaveDraft=window.saveDraft;
    window.saveDraft=guardedSaveDraft;
    try{saveDraft=guardedSaveDraft}catch(e){}
  }
  window.AdminV2DraftGuard={saveDraft:guardedSaveDraft,safeSetDraft};
})();
