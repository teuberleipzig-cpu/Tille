/* Retired Admin v2 current-fixes compatibility shim.
   Scope: visible build marker, read-only health/smoke checks, and safe display-only asset loading. No observers, no save/load patches. */
(function(){
  const TEXT='admin-v2-structure-13 geladen';
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
    if(window.__adminV2Structure13BadgeWrapped)return;
    if(typeof window.renderAll!=='function')return;
    window.__adminV2Structure13BadgeWrapped=true;
    const originalRenderAll=window.renderAll;
    window.renderAll=function(){
      const result=originalRenderAll.apply(this,arguments);
      setBadge();
      if(window.fixAdminEventImagePaths)window.fixAdminEventImagePaths();
      return result;
    };
  }
  function canonical(src){return String(src||'').split('?')[0]}
  function countBy(items,keyFn){return items.reduce((acc,item)=>{const key=keyFn(item);acc[key]=(acc[key]||0)+1;return acc;},{});}
  function duplicates(map){return Object.entries(map).filter(([,count])=>count>1).map(([key,count])=>({key,count}));}
  function loadScriptOnce(src){
    const wanted=canonical(src);
    if(Array.from(document.querySelectorAll('script[src]')).some(script=>canonical(script.getAttribute('src'))===wanted))return;
    const script=document.createElement('script');
    script.src=src;
    script.defer=true;
    document.body.appendChild(script);
  }
  function loadEventAssets(){loadScriptOnce('./js/event-assets.js?v=event-assets-admin-paths-1')}
  function loadSmokeTest(){loadScriptOnce('./js/admin-smoke-test.js?v=admin-smoke-test-1')}
  function runHealthCheck(){
    const scripts=Array.from(document.querySelectorAll('script[src]'));
    const styles=Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    const scriptDuplicates=duplicates(countBy(scripts,s=>canonical(s.getAttribute('src'))));
    const styleDuplicates=duplicates(countBy(styles,s=>canonical(s.getAttribute('href'))));
    const smoke=window.AdminV2SmokeTest&&typeof window.AdminV2SmokeTest.run==='function'?window.AdminV2SmokeTest.run():null;
    const checks={
      badgeText:document.getElementById('adminBuildBadge')?.textContent||'',
      duplicateScripts:scriptDuplicates,
      duplicateStyles:styleDuplicates,
      eventsVisible:!!document.getElementById('view-events'),
      residentsVisible:!!document.getElementById('view-residents'),
      releasesVisible:!!document.getElementById('view-releases'),
      githubMediaLoaded:!!window.AdminGithubMedia,
      eventsMetaLoaded:!!window.__adminEventsMetaModuleLoaded,
      eventAssetsLoaded:!!window.__adminEventAssetsLoaded,
      smokeTestLoaded:!!window.__adminSmokeTestLoaded,
      smokeOk:smoke?!!smoke.ok:null,
      residentsNewsLoaded:!!window.__adminResidentsNewsModuleLoaded,
      residentsMediaLoaded:!!window.__adminResidentsMediaModuleLoaded,
      residentsOrderLoaded:!!window.__adminResidentsOrderModuleLoaded,
      releasesCoreLoaded:!!window.__adminReleasesCoreLoaded,
      releasesWorkflowLoaded:!!window.__adminReleasesWorkflowLoaded,
      textareasLoaded:!!window.__adminTextareasModuleLoaded,
      saveStatusUxLoaded:!!window.__adminSaveStatusUxLoaded
    };
    checks.ok=scriptDuplicates.length===0&&styleDuplicates.length===0&&checks.eventsVisible&&checks.residentsVisible&&checks.releasesVisible&&(smoke?!!smoke.ok:true);
    console.info('[AdminHealthCheck]',checks);
    return checks;
  }
  function install(){
    setBadge();
    installBadgeWrapper();
    loadEventAssets();
    loadSmokeTest();
    setTimeout(runHealthCheck,0);
  }
  window.AdminBuildMarker={text:TEXT,set:setBadge};
  window.AdminV2HealthCheck={run:runHealthCheck};
  window.loadAdminEventAssets=loadEventAssets;
  window.loadAdminSmokeTest=loadSmokeTest;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);
  else install();
})();
