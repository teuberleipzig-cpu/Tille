/* Admin v2 read-only smoke test runner.
   Scope: DOM/module presence checks only. No data writes and no GitHub save/load calls. */
(function(){
  if(window.__adminSmokeTestLoaded){
    if(window.AdminV2SmokeTest&&typeof window.AdminV2SmokeTest.run==='function')window.AdminV2SmokeTest.run();
    return;
  }
  window.__adminSmokeTestLoaded=true;

  function exists(selector){return !!document.querySelector(selector)}
  function count(selector){return document.querySelectorAll(selector).length}
  function visible(id){
    const el=document.getElementById(id);
    return !!el && !el.classList.contains('hidden');
  }
  function check(name,pass,detail){return{name,pass:!!pass,detail:detail||''}}
  function scriptDuplicates(){
    const seen=new Map();
    document.querySelectorAll('script[src]').forEach(script=>{
      const key=String(script.getAttribute('src')||'').split('?')[0];
      seen.set(key,(seen.get(key)||0)+1);
    });
    return Array.from(seen.entries()).filter(([,n])=>n>1).map(([key,count])=>({key,count}));
  }
  function styleDuplicates(){
    const seen=new Map();
    document.querySelectorAll('link[rel="stylesheet"]').forEach(link=>{
      const key=String(link.getAttribute('href')||'').split('?')[0];
      seen.set(key,(seen.get(key)||0)+1);
    });
    return Array.from(seen.entries()).filter(([,n])=>n>1).map(([key,count])=>({key,count}));
  }
  function moduleChecks(){
    return [
      check('AdminGithubMedia loaded',!!window.AdminGithubMedia),
      check('events-meta loaded',!!window.__adminEventsMetaModuleLoaded),
      check('event-assets loaded',!!window.__adminEventAssetsLoaded),
      check('residents-news loaded',!!window.__adminResidentsNewsModuleLoaded),
      check('residents-media loaded',!!window.__adminResidentsMediaModuleLoaded),
      check('residents-order loaded',!!window.__adminResidentsOrderModuleLoaded),
      check('releases-core loaded',!!window.__adminReleasesCoreLoaded),
      check('releases-workflow loaded',!!window.__adminReleasesWorkflowLoaded),
      check('textareas loaded',!!window.__adminTextareasModuleLoaded),
      check('save-status-ux loaded',!!window.__adminSaveStatusUxLoaded)
    ];
  }
  function domChecks(){
    return [
      check('Events view exists',exists('#view-events')),
      check('Artists view exists',exists('#view-artists')),
      check('Residents view exists',exists('#view-residents')),
      check('Releases view exists',exists('#view-releases')),
      check('Status view exists',exists('#view-status')),
      check('Settings view exists',exists('#view-settings')),
      check('Event tabs exist',count('[data-event-tab]')>=5,'count='+count('[data-event-tab]')),
      check('Event Meta tab exists',exists('[data-event-tab="meta"]')),
      check('Resident News tab exists',exists('[data-resident-tab="news"]')),
      check('Resident Media tab exists',exists('[data-resident-tab="media"]')),
      check('Resident media editor exists',exists('#residentMediaEditor')),
      check('Resident presskit section exists',exists('#residentPresskitBlock')),
      check('Resident photos section exists',exists('#residentPhotosBlock')),
      check('Resident embeds section exists',exists('#residentEmbedsBlock')),
      check('Releases workflow exists',exists('.releases-workflow')||exists('#wfDetail')),
      check('No duplicate scripts',scriptDuplicates().length===0,JSON.stringify(scriptDuplicates())),
      check('No duplicate styles',styleDuplicates().length===0,JSON.stringify(styleDuplicates()))
    ];
  }
  function dataChecks(){
    const eventCount=window.state?.eventsData?.events?.length||0;
    const residentCount=window.state?.residentsData?.residents?.length||0;
    return [
      check('Events data shape present',!!window.state?.eventsData),
      check('Residents data shape present',!!window.state?.residentsData),
      check('Events count available',eventCount>0,'events='+eventCount),
      check('Residents count available',residentCount>0,'residents='+residentCount)
    ];
  }
  function mediaChecks(){
    const wrongEventImages=Array.from(document.querySelectorAll('img')).filter(img=>String(img.src||'').includes('/public/admin/public/events/'));
    return [
      check('No wrong admin event image paths',wrongEventImages.length===0,'count='+wrongEventImages.length),
      check('Event asset resolver available',typeof window.eventAdminAssetUrl==='function'),
      check('Event image path fixer available',typeof window.fixAdminEventImagePaths==='function')
    ];
  }
  function run(){
    if(window.fixAdminEventImagePaths)window.fixAdminEventImagePaths();
    const checks=[...moduleChecks(),...domChecks(),...dataChecks(),...mediaChecks()];
    const failed=checks.filter(item=>!item.pass);
    const result={
      ok:failed.length===0,
      total:checks.length,
      passed:checks.length-failed.length,
      failed:failed.length,
      failedChecks:failed,
      checks
    };
    console.info('[AdminSmokeTest]',result);
    return result;
  }
  window.AdminV2SmokeTest={run};
})();
