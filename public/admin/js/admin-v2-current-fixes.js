/* Admin v2 marker and read-only diagnostics. */
(function(){
  const TEXT='admin-v2-structure-24 geladen';
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
    if(window.__adminV2Structure24BadgeWrapped)return;
    if(typeof window.renderAll!=='function')return;
    window.__adminV2Structure24BadgeWrapped=true;
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
    script.async=false;
    document.body.appendChild(script);
  }
  function loadEventAssets(){loadScriptOnce('./js/event-assets.js?v=event-assets-admin-paths-1')}
  function loadSmokeTest(){loadScriptOnce('./js/admin-smoke-test.js?v=admin-smoke-test-load-aware-1')}
  function loadWalkthroughTest(){loadScriptOnce('./js/admin-walkthrough-test.js?v=admin-walkthrough-test-1')}
  function loadWriteReadiness(){loadScriptOnce('./js/admin-write-readiness.js?v=admin-write-readiness-quiet-1')}
  function loadSnapshotReport(){loadScriptOnce('./js/admin-snapshot-report.js?v=admin-snapshot-report-1')}
  function loadWriteBaseline(){loadScriptOnce('./js/admin-write-baseline.js?v=admin-write-baseline-dirty-guard-1')}
  function loadSavePreflight(){loadScriptOnce('./js/admin-save-preflight.js?v=admin-save-preflight-target-1')}
  function loadPostReloadCheck(){loadScriptOnce('./js/admin-post-reload-check.js?v=admin-post-reload-check-1')}
  function loadMediaPathCheck(){loadScriptOnce('./js/admin-media-path-check.js?v=admin-media-path-check-1')}
  function loadDraftGuard(){loadScriptOnce('./js/admin-draft-guard.js?v=admin-draft-guard-1')}
  function runHealthCheck(){
    const scripts=Array.from(document.querySelectorAll('script[src]'));
    const styles=Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    const scriptDuplicates=duplicates(countBy(scripts,s=>canonical(s.getAttribute('src'))));
    const styleDuplicates=duplicates(countBy(styles,s=>canonical(s.getAttribute('href'))));
    const smoke=window.AdminV2SmokeTest&&typeof window.AdminV2SmokeTest.run==='function'?window.AdminV2SmokeTest.run({allowLoading:true}):null;
    const walkthrough=window.AdminV2WalkthroughTest&&typeof window.AdminV2WalkthroughTest.run==='function'?window.AdminV2WalkthroughTest.run():null;
    const writeReadiness=window.AdminV2WriteReadiness&&typeof window.AdminV2WriteReadiness.run==='function'?window.AdminV2WriteReadiness.run({quiet:true}):null;
    const snapshot=window.AdminV2SnapshotReport&&typeof window.AdminV2SnapshotReport.run==='function'?window.AdminV2SnapshotReport.run():null;
    const baselineStatus=window.AdminV2WriteBaseline&&typeof window.AdminV2WriteBaseline.status==='function'?window.AdminV2WriteBaseline.status():null;
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
      smokeDataReady:smoke?!!smoke.dataReady:null,
      smokeDataDeferred:smoke?!!smoke.dataDeferred:null,
      smokeFailedNames:smoke?smoke.failedNames:[],
      walkthroughTestLoaded:!!window.__adminWalkthroughTestLoaded,
      walkthroughOk:walkthrough?!!walkthrough.ok:null,
      walkthroughFailedNames:walkthrough?walkthrough.failedNames:[],
      writeReadinessLoaded:!!window.__adminWriteReadinessLoaded,
      writeReady:writeReadiness?!!writeReadiness.ok:null,
      writeFailedNames:writeReadiness?writeReadiness.failedNames:[],
      snapshotReportLoaded:!!window.__adminSnapshotReportLoaded,
      snapshotReady:!!snapshot?.readyForWriteReport,
      snapshotCounts:snapshot?{events:snapshot.eventsCount,residents:snapshot.residentsCount,artists:snapshot.artistsCount}:null,
      writeBaselineLoaded:!!window.__adminWriteBaselineLoaded,
      writeBaselinePersisted:baselineStatus?!!baselineStatus.persisted:null,
      savePreflightLoaded:!!window.__adminSavePreflightLoaded,
      postReloadCheckLoaded:!!window.__adminPostReloadCheckLoaded,
      mediaPathCheckLoaded:!!window.__adminMediaPathCheckLoaded,
      draftGuardLoaded:!!window.__adminDraftGuardLoaded,
      residentsNewsLoaded:!!window.__adminResidentsNewsModuleLoaded,
      residentsMediaLoaded:!!window.__adminResidentsMediaModuleLoaded,
      residentsOrderLoaded:!!window.__adminResidentsOrderModuleLoaded,
      releasesCoreLoaded:!!window.__adminReleasesCoreLoaded,
      releasesWorkflowLoaded:!!window.__adminReleasesWorkflowLoaded,
      textareasLoaded:!!window.__adminTextareasModuleLoaded,
      saveStatusUxLoaded:!!window.__adminSaveStatusUxLoaded
    };
    checks.ok=scriptDuplicates.length===0&&styleDuplicates.length===0&&checks.eventsVisible&&checks.residentsVisible&&checks.releasesVisible&&(smoke?!!smoke.ok:true)&&(walkthrough?!!walkthrough.ok:true);
    console.info('[AdminHealthCheck]',checks);
    return checks;
  }
  function install(){
    setBadge();
    installBadgeWrapper();
    loadEventAssets();
    loadSmokeTest();
    loadWalkthroughTest();
    loadWriteReadiness();
    loadSnapshotReport();
    loadWriteBaseline();
    loadSavePreflight();
    loadPostReloadCheck();
    loadMediaPathCheck();
    loadDraftGuard();
    setTimeout(runHealthCheck,600);
  }
  window.AdminBuildMarker={text:TEXT,set:setBadge};
  window.AdminV2HealthCheck={run:runHealthCheck};
  window.loadAdminEventAssets=loadEventAssets;
  window.loadAdminSmokeTest=loadSmokeTest;
  window.loadAdminWalkthroughTest=loadWalkthroughTest;
  window.loadAdminWriteReadiness=loadWriteReadiness;
  window.loadAdminSnapshotReport=loadSnapshotReport;
  window.loadAdminWriteBaseline=loadWriteBaseline;
  window.loadAdminSavePreflight=loadSavePreflight;
  window.loadAdminPostReloadCheck=loadPostReloadCheck;
  window.loadAdminMediaPathCheck=loadMediaPathCheck;
  window.loadAdminDraftGuard=loadDraftGuard;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);
  else install();
})();
