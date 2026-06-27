/* Admin v2 post-reload check.
   Scope: convenience wrapper for persisted baseline verification. No save calls and no GitHub writes. */
(function(){
  if(window.__adminPostReloadCheckLoaded){
    if(window.AdminV2PostReloadCheck&&typeof window.AdminV2PostReloadCheck.run==='function')window.AdminV2PostReloadCheck.run({});
    return;
  }
  window.__adminPostReloadCheckLoaded=true;
  function run(expect){
    if(!window.AdminV2WriteBaseline||typeof window.AdminV2WriteBaseline.verifyAfterReload!=='function'){
      const result={ok:false,failures:['Write baseline helper missing']};
      console.warn('[AdminPostReloadCheck]',result);
      return result;
    }
    const result=window.AdminV2WriteBaseline.verifyAfterReload(expect||{});
    console.info('[AdminPostReloadCheck]',result);
    return result;
  }
  window.AdminV2PostReloadCheck={run};
})();
