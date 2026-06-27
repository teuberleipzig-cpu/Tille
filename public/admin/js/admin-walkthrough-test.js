/* Admin v2 read-only walkthrough test.
   Scope: exercises view/tab navigation only. It restores the previous state and does not save or write data. */
(function(){
  if(window.__adminWalkthroughTestLoaded){
    if(window.AdminV2WalkthroughTest&&typeof window.AdminV2WalkthroughTest.run==='function')window.AdminV2WalkthroughTest.run();
    return;
  }
  window.__adminWalkthroughTestLoaded=true;

  function appState(){try{return typeof state!=='undefined'?state:null}catch(e){return null}}
  function check(name,pass,detail){return{name,pass:!!pass,detail:detail||''}}
  function exists(selector){return !!document.querySelector(selector)}
  function isVisible(id){
    const el=document.getElementById(id);
    return !!el&&!el.classList.contains('hidden');
  }
  function snapshot(){
    const s=appState();
    if(!s)return null;
    return{
      view:s.view,
      eventTab:s.eventTab,
      residentTab:s.residentTab,
      selectedEvent:s.selectedEvent,
      selectedResident:s.selectedResident,
      selectedArtist:s.selectedArtist,
      releaseResidentIndex:s.releaseResidentIndex,
      releaseIndex:s.releaseIndex,
      dirty:s.dirty,
      syncState:s.syncState
    };
  }
  function restore(snap){
    const s=appState();
    if(!s||!snap)return;
    Object.assign(s,snap);
    try{if(typeof renderAll==='function')renderAll()}catch(e){console.warn('[AdminWalkthroughTest] restore render failed',e)}
    s.dirty=snap.dirty;
    s.syncState=snap.syncState;
    try{if(typeof updateSaveStatus==='function')updateSaveStatus()}catch(e){}
  }
  function safeCall(name,arg){
    try{
      if(typeof window[name]==='function'){
        window[name](arg);
        return check(name+'('+arg+') callable',true);
      }
      if(typeof eval(name)==='function'){
        eval(name)(arg);
        return check(name+'('+arg+') callable',true);
      }
      return check(name+'('+arg+') callable',false,'function missing');
    }catch(e){return check(name+'('+arg+') callable',false,e.message)}
  }
  function testViews(){
    const out=[];
    ['events','artists','residents','releases','status','settings'].forEach(view=>{
      out.push(safeCall('setView',view));
      out.push(check('view '+view+' visible',isVisible('view-'+view)));
    });
    return out;
  }
  function testEventTabs(){
    const out=[];
    safeCall('setView','events');
    ['basis','meta','lineup','image','description','preview'].forEach(tab=>{
      out.push(safeCall('setEventTab',tab));
      out.push(check('event tab '+tab+' visible',exists('#event-tab-'+tab)&&!document.getElementById('event-tab-'+tab).classList.contains('hidden')));
    });
    return out;
  }
  function testResidentTabs(){
    const out=[];
    safeCall('setView','residents');
    ['profile','links','news','media'].forEach(tab=>{
      out.push(safeCall('setResidentTab',tab));
      out.push(check('resident tab '+tab+' visible',exists('#resident-tab-'+tab)&&!document.getElementById('resident-tab-'+tab).classList.contains('hidden')));
    });
    return out;
  }
  function testReleaseWorkflow(){
    const out=[];
    safeCall('setView','releases');
    if(typeof window.renderReleasesWorkflow==='function'){
      try{window.renderReleasesWorkflow();out.push(check('renderReleasesWorkflow callable',true))}
      catch(e){out.push(check('renderReleasesWorkflow callable',false,e.message))}
    }else out.push(check('renderReleasesWorkflow callable',false,'function missing'));
    out.push(check('release workflow shell present',exists('.releases-workflow')||exists('#wfDetail')));
    return out;
  }
  function run(){
    const snap=snapshot();
    const checks=[
      check('App state reachable',!!snap),
      ...testViews(),
      ...testEventTabs(),
      ...testResidentTabs(),
      ...testReleaseWorkflow()
    ];
    restore(snap);
    const failed=checks.filter(item=>!item.pass);
    const result={ok:failed.length===0,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedNames:failed.map(item=>item.name),failedChecks:failed,checks};
    console.info('[AdminWalkthroughTest]',result);
    if(failed.length)console.table(failed);
    return result;
  }
  window.AdminV2WalkthroughTest={run};
})();
