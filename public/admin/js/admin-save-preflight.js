/* Admin v2 save preflight.
   Scope: read-only checks directly before a human-triggered save. It never calls save functions. */
(function(){
  if(window.__adminSavePreflightLoaded){
    if(window.AdminV2SavePreflight&&typeof window.AdminV2SavePreflight.run==='function')window.AdminV2SavePreflight.run();
    return;
  }
  window.__adminSavePreflightLoaded=true;

  function appState(){try{return typeof state!=='undefined'?state:null}catch(e){return null}}
  function check(name,pass,detail){return{name,pass:!!pass,detail:detail||''}}
  function tokenPresent(){return !!(document.getElementById('ghToken')?.value||'').trim()}
  function canParse(label,fn){
    try{const text=typeof fn==='function'?fn():'';JSON.parse(text);return check(label+' JSON parseable',true,'bytes='+text.length)}
    catch(e){return check(label+' JSON parseable',false,e.message)}
  }
  function run(target){
    const s=appState();
    const checks=[
      check('Target provided',!!target,'target='+(target||'')),
      check('Target is known',['events','artists','residents','resident-media','releases','release-cover'].includes(target||''),'target='+(target||'')),
      check('Token present',tokenPresent()),
      check('App state reachable',!!s),
      check('Sync state loaded',s?.syncState==='loaded','syncState='+(s?.syncState||'')),
      check('No conflict state',s?.syncState!=='conflict','syncState='+(s?.syncState||'')),
      check('Events SHA present',!!s?.eventsSha,'sha='+(s?.eventsSha||'')),
      check('Residents SHA present',!!s?.residentsSha,'sha='+(s?.residentsSha||'')),
      check('Events count nonzero',(s?.eventsData?.events?.length||0)>0,'events='+(s?.eventsData?.events?.length||0)),
      check('Residents count nonzero',(s?.residentsData?.residents?.length||0)>0,'residents='+(s?.residentsData?.residents?.length||0)),
      canParse('Events',typeof eventsJson==='function'?eventsJson:null),
      canParse('Residents',typeof residentsJson==='function'?residentsJson:null)
    ];
    const failed=checks.filter(item=>!item.pass);
    const result={ok:failed.length===0,target:target||'',failedNames:failed.map(item=>item.name),failedChecks:failed,checks};
    console.info('[AdminSavePreflight]',result);
    if(failed.length)console.table(failed);
    return result;
  }
  window.AdminV2SavePreflight={run};
})();
