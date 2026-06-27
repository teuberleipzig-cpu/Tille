/* Admin v2 snapshot report.
   Scope: read-only pre-write diagnostics. It never calls save functions and never writes data. */
(function(){
  if(window.__adminSnapshotReportLoaded){
    if(window.AdminV2SnapshotReport&&typeof window.AdminV2SnapshotReport.run==='function')window.AdminV2SnapshotReport.run();
    return;
  }
  window.__adminSnapshotReportLoaded=true;

  function appState(){try{return typeof state!=='undefined'?state:null}catch(e){return null}}
  function smallHash(text){
    const s=String(text||'');
    let h=2166136261;
    for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}
    return (h>>>0).toString(16).padStart(8,'0');
  }
  function safeJsonInfo(name,fn){
    try{
      if(typeof fn!=='function')return{name,ok:false,error:'missing function'};
      const text=fn();
      const parsed=JSON.parse(text);
      return{name,ok:true,bytes:text.length,hash:smallHash(text),topLevelKeys:Object.keys(parsed)};
    }catch(e){return{name,ok:false,error:e.message}}
  }
  function selectedEventSummary(s){
    const e=s?.eventsData?.events?.[s?.selectedEvent];
    if(!e)return null;
    return{id:e.id||'',date:e.date||'',title:e.title||'',sections:Array.isArray(e.sections)?e.sections.length:0,imageUrl:e.imageUrl||''};
  }
  function selectedResidentSummary(s){
    const r=s?.residentsData?.residents?.[s?.selectedResident];
    if(!r)return null;
    return{id:r.id||'',name:r.name||'',city:r.city||'',newsItems:Array.isArray(r.newsItems)?r.newsItems.length:0,releases:Array.isArray(r.releases)?r.releases.length:0};
  }
  function run(){
    const s=appState();
    const report={
      ok:!!s,
      badgeText:document.getElementById('adminBuildBadge')?.textContent||'',
      view:s?.view||'',
      eventTab:s?.eventTab||'',
      residentTab:s?.residentTab||'',
      dirty:!!s?.dirty,
      syncState:s?.syncState||'',
      eventsSha:s?.eventsSha||'',
      residentsSha:s?.residentsSha||'',
      eventsCount:s?.eventsData?.events?.length||0,
      residentsCount:s?.residentsData?.residents?.length||0,
      artistsCount:s?.eventsData?.meta?.artists?.length||0,
      selectedEventIndex:s?.selectedEvent,
      selectedResidentIndex:s?.selectedResident,
      selectedEvent:selectedEventSummary(s),
      selectedResident:selectedResidentSummary(s),
      eventsJson:safeJsonInfo('events',typeof eventsJson==='function'?eventsJson:null),
      residentsJson:safeJsonInfo('residents',typeof residentsJson==='function'?residentsJson:null)
    };
    report.readyForWriteReport=!!s&&!!report.eventsSha&&!!report.residentsSha&&report.eventsJson.ok&&report.residentsJson.ok;
    console.info('[AdminSnapshotReport]',report);
    return report;
  }
  window.AdminV2SnapshotReport={run};
})();
