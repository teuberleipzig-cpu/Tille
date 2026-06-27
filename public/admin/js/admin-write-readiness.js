/* Admin v2 write-readiness check.
   Scope: validates whether controlled write tests can be started. It never calls save functions and never writes data. */
(function(){
  if(window.__adminWriteReadinessLoaded){
    if(window.AdminV2WriteReadiness&&typeof window.AdminV2WriteReadiness.run==='function')window.AdminV2WriteReadiness.run();
    return;
  }
  window.__adminWriteReadinessLoaded=true;

  function appState(){try{return typeof state!=='undefined'?state:null}catch(e){return null}}
  function check(name,pass,detail){return{name,pass:!!pass,detail:detail||''}}
  function safeJson(fn,label){
    try{
      if(typeof fn!=='function')return check(label+' function exists',false,'missing');
      const text=fn();
      JSON.parse(text);
      return check(label+' serializes valid JSON',true,'bytes='+text.length);
    }catch(e){return check(label+' serializes valid JSON',false,e.message)}
  }
  function tokenState(){
    const token=document.getElementById('ghToken')?.value?.trim()||'';
    return{present:!!token,length:token.length};
  }
  function functionChecks(){
    return[
      check('saveEventsToGithub exists',typeof saveEventsToGithub==='function'),
      check('saveResidentsToGithub exists',typeof saveResidentsToGithub==='function'),
      check('loadEventsFromGithub exists',typeof loadEventsFromGithub==='function'),
      check('loadResidentsFromGithub exists',typeof loadResidentsFromGithub==='function'),
      check('eventsJson exists',typeof eventsJson==='function'),
      check('residentsJson exists',typeof residentsJson==='function'),
      check('readEventForm exists',typeof readEventForm==='function'),
      check('readResidentForm exists',typeof readResidentForm==='function'),
      check('renderAll exists',typeof renderAll==='function'),
      check('setStatus exists',typeof setStatus==='function')
    ];
  }
  function dataChecks(){
    const s=appState();
    const eventCount=s?.eventsData?.events?.length||0;
    const residentCount=s?.residentsData?.residents?.length||0;
    return[
      check('App state reachable',!!s),
      check('Events data loaded',!!s?.eventsData),
      check('Residents data loaded',!!s?.residentsData),
      check('Events count nonzero',eventCount>0,'events='+eventCount),
      check('Residents count nonzero',residentCount>0,'residents='+residentCount),
      check('Events SHA present',!!s?.eventsSha,'sha='+(s?.eventsSha||'')),
      check('Residents SHA present',!!s?.residentsSha,'sha='+(s?.residentsSha||'')),
      check('Sync state loaded',s?.syncState==='loaded','syncState='+(s?.syncState||''))
    ];
  }
  function jsonChecks(){return[safeJson(typeof eventsJson==='function'?eventsJson:null,'Events JSON'),safeJson(typeof residentsJson==='function'?residentsJson:null,'Residents JSON')]}
  function uiWriteChecks(){
    const token=tokenState();
    return[
      check('GitHub token present for write phase',token.present,'length='+token.length),
      check('Top save button exists',!!document.getElementById('topSaveBtn')),
      check('Event save button exists',!!document.getElementById('eventSaveBtn')),
      check('Resident save button exists',!!document.getElementById('saveResidentsGitBtn')),
      check('Artist save button exists',!!document.getElementById('saveArtistsGitBtn')),
      check('Save status pill exists',!!document.getElementById('saveStatus')),
      check('Event status exists',!!document.getElementById('eventEditStatus')),
      check('Resident status exists',!!document.getElementById('residentStatus')),
      check('Artist status exists',!!document.getElementById('artistStatus'))
    ];
  }
  function mediaWriteChecks(){
    const helper=window.AdminGithubMedia||{};
    return[
      check('Upload helper uploadImage exists',typeof helper.uploadImage==='function'),
      check('Upload helper uploadRawFile exists',typeof helper.uploadRawFile==='function'),
      check('Upload helper makeDropzone exists',typeof helper.makeDropzone==='function'),
      check('Event image dropzone exists',!!document.getElementById('eventImageGithubDrop')||typeof window.installEventImageUpload==='function'),
      check('Resident media upload refresher exists',typeof window.refreshResidentMediaUploads==='function'),
      check('Release cover installer exists',typeof window.installReleaseCoverUpload==='function'||typeof window.installReleaseWorkflowCoverDrop==='function')
    ];
  }
  function dirtyChecks(){
    const s=appState();
    return[
      check('Dirty flag is false before write test',s?.dirty===false,'dirty='+(s?s.dirty:'missing')),
      check('No conflict state before write test',s?.syncState!=='conflict','syncState='+(s?.syncState||''))
    ];
  }
  function run(){
    const checks=[...functionChecks(),...dataChecks(),...jsonChecks(),...uiWriteChecks(),...mediaWriteChecks(),...dirtyChecks()];
    const failed=checks.filter(item=>!item.pass);
    const result={ok:failed.length===0,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedNames:failed.map(item=>item.name),failedChecks:failed,checks};
    console.info('[AdminWriteReadiness]',result);
    if(failed.length)console.table(failed);
    return result;
  }
  window.AdminV2WriteReadiness={run};
})();
