/* Retired Admin v2 current-fixes compatibility shim.
   Scope: visible build marker only. No wrappers, no observers, no save/load patches. */
(function(){
  const TEXT='admin-v2-structure-4 geladen';
  function setBadge(){
    let b=document.getElementById('adminBuildBadge');
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
    b.textContent=TEXT;
  }
  function installBadgeWrapper(){
    if(window.__adminV2Structure4BadgeWrapped)return;
    if(typeof window.renderAll!=='function')return;
    window.__adminV2Structure4BadgeWrapped=true;
    const originalRenderAll=window.renderAll;
    window.renderAll=function(){
      const result=originalRenderAll.apply(this,arguments);
      setTimeout(setBadge,0);
      return result;
    };
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>{setBadge();installBadgeWrapper();});
  }else{
    setBadge();
    installBadgeWrapper();
  }
})();
