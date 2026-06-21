/* Mirrors Events/Artists save status into the currently visible Artists footer.
   The Artists editor stores into events.json, but users need feedback in the Artists tab. */
(function(){
  function onReady(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn()}
  function shouldMirror(id,text){
    if(id!=='eventEditStatus') return false;
    if(!window.state || state.view!=='artists') return false;
    return /Speicher|speicher|Token|GitHub|Events \/ Artists|fehlgeschlagen|Konflikt/i.test(String(text||''));
  }
  function toArtistText(text){
    return String(text||'')
      .replace(/Events \/ Artists/g,'Artists')
      .replace(/Events:/g,'Artists:')
      .replace(/Events /g,'Artists ');
  }
  function install(){
    if(window.__artistStatusMirrorInstalled) return;
    if(typeof window.setStatus!=='function') return;
    window.__artistStatusMirrorInstalled=true;
    const originalSetStatus=window.setStatus;
    window.setStatus=function(id,text,type='ok'){
      originalSetStatus(id,text,type);
      if(shouldMirror(id,text)) originalSetStatus('artistStatus',toArtistText(text),type);
    };
    console.log('[AdminSaveDebug] artistStatusMirror:installed');
  }
  onReady(()=>{
    install();
    setTimeout(install,500);
    setTimeout(install,1500);
  });
})();
