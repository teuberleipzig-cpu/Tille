/* Admin v2 token session helper.
   Scope: optional sessionStorage restore for the GitHub token field. It never logs or stores a token in the repo. */
(function(){
  if(window.__adminTokenSessionLoaded){
    if(window.AdminV2TokenSession&&typeof window.AdminV2TokenSession.status==='function')window.AdminV2TokenSession.status();
    return;
  }
  window.__adminTokenSessionLoaded=true;
  const KEY='adminV2GhTokenSession';
  function field(){return document.getElementById('ghToken')}
  function tokenLength(value){return String(value||'').trim().length}
  function dispatchTokenChange(el){
    try{el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}catch(e){}
  }
  function status(){
    const el=field();
    const stored=sessionStorage.getItem(KEY)||'';
    const result={fieldPresent:!!el,tokenPresent:tokenLength(el?.value)>0,tokenLength:tokenLength(el?.value),sessionStored:tokenLength(stored)>0,sessionLength:tokenLength(stored)};
    console.info('[AdminTokenSession]',result);
    return result;
  }
  function remember(){
    const el=field();
    const token=String(el?.value||'').trim();
    if(!el||!token){const result={ok:false,reason:'token field empty'};console.warn('[AdminTokenSession]',result);return result}
    sessionStorage.setItem(KEY,token);
    const result={ok:true,sessionStored:true,sessionLength:token.length};
    console.info('[AdminTokenSession]',result);
    return result;
  }
  function restore(){
    const el=field();
    const token=sessionStorage.getItem(KEY)||'';
    if(!el||!token){const result={ok:false,reason:!el?'token field missing':'no session token'};console.info('[AdminTokenSession]',result);return result}
    el.value=token;
    dispatchTokenChange(el);
    const result={ok:true,tokenPresent:true,tokenLength:token.length};
    console.info('[AdminTokenSession]',result);
    return result;
  }
  function clear(){
    sessionStorage.removeItem(KEY);
    const result={ok:true,sessionStored:false};
    console.info('[AdminTokenSession]',result);
    return result;
  }
  function autoRestore(){if(sessionStorage.getItem(KEY))restore()}
  window.AdminV2TokenSession={status,remember,restore,clear};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',autoRestore);
  else autoRestore();
})();
