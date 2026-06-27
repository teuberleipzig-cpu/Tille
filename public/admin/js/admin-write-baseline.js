/* Admin v2 write baseline.
   Scope: persisted hash/count baseline for browser write tests. No save calls and no GitHub writes. */
(function(){
  if(window.__adminWriteBaselineLoaded){
    if(window.AdminV2WriteBaseline&&typeof window.AdminV2WriteBaseline.status==='function')window.AdminV2WriteBaseline.status();
    return;
  }
  window.__adminWriteBaselineLoaded=true;
  const STORAGE_KEY='adminV2WriteBaseline';
  let baseline=readStoredBaseline();

  function appState(){try{return typeof state!=='undefined'?state:null}catch(e){return null}}
  function smallHash(text){
    const s=String(text||'');let h=2166136261;
    for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}
    return (h>>>0).toString(16).padStart(8,'0');
  }
  function jsonText(fn){return typeof fn==='function'?fn():''}
  function safeParse(text){try{return JSON.parse(text)}catch(e){return null}}
  function readStoredBaseline(){
    try{return safeParse(sessionStorage.getItem(STORAGE_KEY)||'')}
    catch(e){return null}
  }
  function writeStoredBaseline(value){
    baseline=value;
    if(value)sessionStorage.setItem(STORAGE_KEY,JSON.stringify(value));
    else sessionStorage.removeItem(STORAGE_KEY);
  }
  function capture(label){
    const s=appState();
    const eventsText=jsonText(typeof eventsJson==='function'?eventsJson:null);
    const residentsText=jsonText(typeof residentsJson==='function'?residentsJson:null);
    return{
      label:label||'baseline',
      capturedAt:new Date().toISOString(),
      badgeText:document.getElementById('adminBuildBadge')?.textContent||'',
      view:s?.view||'',
      dirty:!!s?.dirty,
      syncState:s?.syncState||'',
      eventsSha:s?.eventsSha||'',
      residentsSha:s?.residentsSha||'',
      eventsCount:s?.eventsData?.events?.length||0,
      residentsCount:s?.residentsData?.residents?.length||0,
      artistsCount:s?.eventsData?.meta?.artists?.length||0,
      eventsBytes:eventsText.length,
      residentsBytes:residentsText.length,
      eventsHash:smallHash(eventsText),
      residentsHash:smallHash(residentsText)
    };
  }
  function begin(label){
    const next=capture(label||'before-write-test');
    writeStoredBaseline(next);
    console.info('[AdminWriteBaseline] begin',next);
    return next;
  }
  function status(){
    baseline=baseline||readStoredBaseline();
    const current=capture('current');
    const result={hasBaseline:!!baseline,baseline,current,diff:baseline?diff(current,baseline):null,persisted:!!readStoredBaseline()};
    console.info('[AdminWriteBaseline] status',result);
    return result;
  }
  function diff(current,base){
    return{
      dirtyChanged:current.dirty!==base.dirty,
      syncStateChanged:current.syncState!==base.syncState,
      eventsShaChanged:current.eventsSha!==base.eventsSha,
      residentsShaChanged:current.residentsSha!==base.residentsSha,
      eventsCountChanged:current.eventsCount!==base.eventsCount,
      residentsCountChanged:current.residentsCount!==base.residentsCount,
      artistsCountChanged:current.artistsCount!==base.artistsCount,
      eventsHashChanged:current.eventsHash!==base.eventsHash,
      residentsHashChanged:current.residentsHash!==base.residentsHash,
      eventsBytesDelta:current.eventsBytes-base.eventsBytes,
      residentsBytesDelta:current.residentsBytes-base.residentsBytes
    };
  }
  function verifyAfterReload(expect){
    baseline=baseline||readStoredBaseline();
    const current=capture('after-reload');
    const d=baseline?diff(current,baseline):null;
    const expected=expect||{};
    const failures=[];
    if(!baseline)failures.push('No baseline captured');
    if(current.dirty)failures.push('Dirty flag is true');
    if(current.syncState!=='loaded')failures.push('Sync state is '+current.syncState);
    if(d&&d.eventsCountChanged)failures.push('Events count changed');
    if(d&&d.residentsCountChanged)failures.push('Residents count changed');
    if(d&&expected.eventsChanged===false&&d.eventsHashChanged)failures.push('Events hash changed unexpectedly');
    if(d&&expected.residentsChanged===false&&d.residentsHashChanged)failures.push('Residents hash changed unexpectedly');
    if(d&&expected.eventsChanged===true&&!d.eventsHashChanged)failures.push('Events hash did not change');
    if(d&&expected.residentsChanged===true&&!d.residentsHashChanged)failures.push('Residents hash did not change');
    const result={ok:failures.length===0,failures,baseline,current,diff:d,expect:expected,persisted:!!readStoredBaseline()};
    console.info('[AdminWriteBaseline] verifyAfterReload',result);
    if(failures.length)console.table(failures.map(name=>({name})));
    return result;
  }
  function reset(){writeStoredBaseline(null);console.info('[AdminWriteBaseline] reset');return{ok:true,persisted:false}}
  window.AdminV2WriteBaseline={begin,status,verifyAfterReload,reset};
})();
