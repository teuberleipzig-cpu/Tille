/* Auto-loads Events and Residents without forcing the Settings view.
   Public JSON loading works without a GitHub token. Saving still needs a token.
   Debug logs use [AdminSaveDebug] and never print the token value. */
(function(){
  const DBG='[AdminSaveDebug]';
  function log(step,data){try{console.log(DBG,step,data??'')}catch(e){}}
  function warn(step,data){try{console.warn(DBG,step,data??'')}catch(e){}}
  function err(step,data){try{console.error(DBG,step,data??'')}catch(e){}}
  function artistSnapshot(){const a=currentArtist?.();return a?{index:state.selectedArtist,name:a.name||'',info:a.info||'',link:a.link||''}:null}
  function eventSnapshot(){const d=events?.();return{eventsCount:d?.events?.length||0,artistsCount:artists?.().length||0,selectedArtist:state.selectedArtist,selectedEvent:state.selectedEvent,artist:artistSnapshot(),artistNames:(artists?.()||[]).map(a=>a.name)}}
  function onReady(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn()}
  function val(id){return $(id)?.value?.trim()||''}
  function apiPath(path){return String(path||'').split('/').map(encodeURIComponent).join('/')}
  function rawPath(path){return String(path||'').split('/').map(encodeURIComponent).join('/')}
  function repoApiBase(){return 'https://api.github.com/repos/'+encodeURIComponent(val('ghOwner'))+'/'+encodeURIComponent(val('ghRepo'))}
  function apiUrl(path){return repoApiBase()+'/contents/'+apiPath(path)+'?ref='+encodeURIComponent(val('ghBranch'))+'&t='+Date.now()}
  function apiPutUrl(path){return repoApiBase()+'/contents/'+apiPath(path)}
  function blobUrl(sha){return repoApiBase()+'/git/blobs/'+encodeURIComponent(sha)+'?t='+Date.now()}
  function rawUrl(path){return 'https://raw.githubusercontent.com/'+encodeURIComponent(val('ghOwner'))+'/'+encodeURIComponent(val('ghRepo'))+'/'+encodeURIComponent(val('ghBranch'))+'/'+rawPath(path)+'?t='+Date.now()}
  function localUrl(path){return '../../'+String(path||'').replace(/^public\//,'')+'?t='+Date.now()}
  function publicHeaders(){const h={Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};const token=val('ghToken');if(token){h.Authorization='Bearer '+token}return h}
  function writeHeaders(){return {...publicHeaders(),'Content-Type':'application/json'}}
  function b64DecodeUtf8(str){const bin=atob(String(str||'').replace(/\n/g,''));return new TextDecoder().decode(Uint8Array.from(bin,ch=>ch.charCodeAt(0)))}
  function b64EncodeUtf8(str){const bytes=new TextEncoder().encode(str);let bin='';for(let i=0;i<bytes.length;i+=32768)bin+=String.fromCharCode.apply(null,bytes.subarray(i,i+32768));return btoa(bin)}
  async function fetchJsonUrl(url){log('fetchJsonUrl:start',{url:url.replace(/\?.*$/,'?...')});const res=await fetch(url,{cache:'no-store'});const text=await res.text();log('fetchJsonUrl:response',{status:res.status,ok:res.ok,textLength:text.length});if(!res.ok)throw new Error('Download fehlgeschlagen: '+res.status);if(!text.trim())throw new Error('JSON-Datei ist leer.');return JSON.parse(text)}
  async function fetchBlobJson(sha,path){
    log('fetchBlobJson:start',{path,sha,tokenPresent:!!val('ghToken')});
    const res=await fetch(blobUrl(sha),{headers:publicHeaders(),cache:'no-store'});
    const blob=await res.json().catch(()=>({}));
    log('fetchBlobJson:response',{path,status:res.status,ok:res.ok,sha,encoding:blob.encoding||'',size:blob.size||0,message:blob.message||''});
    if(!res.ok) throw new Error(blob.message||('Git blob laden fehlgeschlagen '+res.status));
    if(blob.encoding!=='base64'||!blob.content) throw new Error('Git blob enthält keinen base64-Inhalt.');
    return JSON.parse(b64DecodeUtf8(blob.content));
  }
  async function fetchMeta(path){log('fetchMeta:start',{path,owner:val('ghOwner'),repo:val('ghRepo'),branch:val('ghBranch'),tokenPresent:!!val('ghToken')});const res=await fetch(apiUrl(path),{headers:publicHeaders(),cache:'no-store'});const meta=await res.json().catch(()=>({}));log('fetchMeta:response',{path,status:res.status,ok:res.ok,sha:meta.sha||'',message:meta.message||'',contentLength:meta.content?meta.content.length:0});if(!res.ok)throw new Error(meta.message||('GitHub Fehler '+res.status));return meta}
  async function loadFile(path){
    try{
      log('loadFile:api:start',{path});
      const meta=await fetchMeta(path);
      let json;
      if(meta.content&&meta.content.trim()){
        log('loadFile:api:contentInline',{path,sha:meta.sha||'',contentLength:meta.content.length});
        json=JSON.parse(b64DecodeUtf8(meta.content));
      }else if(meta.sha){
        log('loadFile:api:contentEmptyUseBlob',{path,sha:meta.sha||''});
        json=await fetchBlobJson(meta.sha,path);
      }else{
        warn('loadFile:api:noShaUseDownloadUrl',{path});
        json=await fetchJsonUrl(meta.download_url||rawUrl(path));
      }
      log('loadFile:api:success',{path,sha:meta.sha||'',keys:Object.keys(json||{}),eventsCount:json?.events?.length,residentsCount:json?.residents?.length,artistsCount:json?.meta?.artists?.length});
      return{json,sha:meta.sha||''};
    }catch(e){warn('loadFile:api:failed',{path,message:e.message})}
    try{log('loadFile:raw:start',{path});return{json:await fetchJsonUrl(rawUrl(path)),sha:''};}catch(e){warn('loadFile:raw:failed',{path,message:e.message})}
    log('loadFile:local:start',{path});
    return{json:await fetchJsonUrl(localUrl(path)),sha:''};
  }
  async function putJsonFile(path,jsonText,message){
    log('putJsonFile:start',{path,message,jsonLength:jsonText.length,jsonHasMetaArtists:jsonText.includes('"artists"'),jsonPreview:jsonText.slice(0,180)});
    async function attempt(sha,label){
      log('putJsonFile:attempt:start',{label,path,sha,branch:val('ghBranch'),contentLength:jsonText.length});
      const body={message,content:b64EncodeUtf8(jsonText),sha,branch:val('ghBranch')};
      const res=await fetch(apiPutUrl(path),{method:'PUT',headers:writeHeaders(),body:JSON.stringify(body)});
      const out=await res.json().catch(()=>({}));
      log('putJsonFile:attempt:response',{label,status:res.status,ok:res.ok,responseMessage:out.message||'',newSha:out.content?.sha||'',documentation_url:out.documentation_url||''});
      return{res,out};
    }
    let meta=await fetchMeta(path);
    log('putJsonFile:freshMetaBeforeFirstPut',{path,sha:meta.sha});
    let first=await attempt(meta.sha,'first');
    if(first.res.ok) return{out:first.out,sha:first.out.content?.sha||meta.sha,retried:false};
    if(first.res.status===409){
      warn('putJsonFile:409:firstAttempt',{path,oldSha:meta.sha,githubMessage:first.out.message||''});
      meta=await fetchMeta(path);
      log('putJsonFile:freshMetaBeforeRetry',{path,sha:meta.sha});
      const second=await attempt(meta.sha,'retry-after-409');
      if(second.res.ok) return{out:second.out,sha:second.out.content?.sha||meta.sha,retried:true};
      err('putJsonFile:retryFailed',{path,status:second.res.status,message:second.out.message||''});
      throw new Error(second.out.message||('Speichern nach SHA-Retry fehlgeschlagen '+second.res.status));
    }
    err('putJsonFile:firstFailedNon409',{path,status:first.res.status,message:first.out.message||''});
    throw new Error(first.out.message||('Speichern fehlgeschlagen '+first.res.status));
  }
  function afterLoad(currentView){
    log('afterLoad:start',{currentView,eventsCount:events().events.length,artistsCount:artists().length,residentsCount:residents().residents.length});
    state.syncState='loaded';
    state.dirty=false;
    ensureEvents();
    ensureResidents();
    state.selectedEvent=events().events.length?0:-1;
    state.selectedArtist=artists().length?0:-1;
    state.selectedResident=residents().residents.length?0:-1;
    renderAll();
    setView(currentView||state.view||'events');
    const top=$('topLoadBtn');if(top)top.textContent='Neu laden';
    updateSaveStatus();
    log('afterLoad:done',eventSnapshot());
  }
  async function loadEventsPublic(){
    const currentView=state.view;
    try{
      log('loadEventsPublic:start',{currentView});
      setStatus('eventEditStatus','Lade Events automatisch...','warn');
      const ev=await loadFile(val('eventsPath'));
      state.eventsData=ev.json;
      state.eventsSha=ev.sha||state.eventsSha||'';
      state.loadedEventCount=(ev.json.events||[]).length;
      ensureEvents();
      state.selectedEvent=events().events.length?0:-1;
      state.selectedArtist=artists().length?0:-1;
      state.syncState='loaded';
      state.dirty=false;
      renderAll();
      setView(currentView||'events');
      const top=$('topLoadBtn');if(top)top.textContent='Neu laden';
      setStatus('eventEditStatus','Events geladen.','ok');
      updateSaveStatus();
      log('loadEventsPublic:done',eventSnapshot());
    }catch(e){err('loadEventsPublic:error',{message:e.message});setStatus('eventEditStatus','Events konnten nicht geladen werden: '+e.message,'err')}
  }
  async function loadResidentsPublic(){
    const currentView=state.view;
    try{
      log('loadResidentsPublic:start',{currentView});
      setStatus('residentStatus','Lade Residents automatisch...','warn');
      const res=await loadFile(val('residentsPath'));
      state.residentsData=res.json;
      state.residentsSha=res.sha||state.residentsSha||'';
      state.loadedResidentCount=(res.json.residents||[]).length;
      ensureResidents();
      state.selectedResident=residents().residents.length?0:-1;
      state.syncState='loaded';
      state.dirty=false;
      renderAll();
      setView(currentView||'residents');
      const top=$('topLoadBtn');if(top)top.textContent='Neu laden';
      setStatus('residentStatus','Residents geladen.','ok');
      updateSaveStatus();
      log('loadResidentsPublic:done',{residentsCount:residents().residents.length,sha:state.residentsSha});
    }catch(e){err('loadResidentsPublic:error',{message:e.message});setStatus('residentStatus','Residents konnten nicht geladen werden: '+e.message,'err')}
  }
  async function autoLoadGithubData(){
    if(!val('ghOwner')||!val('ghRepo')||!val('ghBranch')||!val('eventsPath')||!val('residentsPath')){warn('autoLoadGithubData:missingConfig',{owner:!!val('ghOwner'),repo:!!val('ghRepo'),branch:!!val('ghBranch'),eventsPath:!!val('eventsPath'),residentsPath:!!val('residentsPath')});return;}
    try{
      const currentView=state.view;
      log('autoLoadGithubData:start',{currentView,tokenPresent:!!val('ghToken')});
      setStatus('syncStatus','Lade Daten automatisch...','warn');
      const [ev,res]=await Promise.all([loadFile(val('eventsPath')),loadFile(val('residentsPath'))]);
      state.eventsData=ev.json;
      state.eventsSha=ev.sha||'';
      state.loadedEventCount=(ev.json.events||[]).length;
      state.residentsData=res.json;
      state.residentsSha=res.sha||'';
      state.loadedResidentCount=(res.json.residents||[]).length;
      afterLoad(currentView);
      setStatus('syncStatus','Daten automatisch geladen.','ok');
      log('autoLoadGithubData:done',{eventsSha:state.eventsSha,residentsSha:state.residentsSha});
    }catch(e){
      err('autoLoadGithubData:error',{message:e.message});
      const top=$('topLoadBtn');if(top)top.textContent='Neu laden';
      setStatus('syncStatus','Automatisches Laden fehlgeschlagen: '+e.message,'err');
    }
  }
  function warnSaveNeedsToken(area){
    const statusId=area==='residents'?'residentStatus':'eventEditStatus';
    const ok=!!val('ghToken');
    log('warnSaveNeedsToken:check',{area,tokenPresent:ok});
    if(!ok){setStatus(statusId,'Speichern braucht einen GitHub Token. Laden/Bearbeiten geht ohne Token.','err');return true}
    return false;
  }
  function isInlineMediaValue(value){return /^(data:|blob:)/.test(String(value||''))}
  function sanitizeResidentMediaList(list){
    let removed=0;
    const source=Array.isArray(list)?list:[];
    const items=[];
    source.forEach(item=>{
      const url=typeof item==='string'?item:(item?.url||item?.src||item?.imageUrl||'');
      if(!url||isInlineMediaValue(url)){removed++;return;}
      items.push(typeof item==='string'?{url}:{...item,url});
    });
    return{items,removed};
  }
  function sanitizeResidentsBeforeSave(){
    let removed=0;
    (residents().residents||[]).forEach(r=>{
      if(Array.isArray(r.photoList)){const out=sanitizeResidentMediaList(r.photoList);r.photoList=out.items;removed+=out.removed;}
      if(Array.isArray(r.photos)){const out=sanitizeResidentMediaList(r.photos);r.photos=out.items;removed+=out.removed;}
    });
    log('sanitizeResidentsBeforeSave:done',{removedInlineMedia:removed,residentsCount:residents().residents?.length||0});
    return removed;
  }
  function safeReadEvents(){
    log('safeReadEvents:before',eventSnapshot());
    try{readEventForm();log('safeReadEvents:readEventForm:ok')}catch(e){warn('safeReadEvents:readEventForm:error',{message:e.message})}
    try{readArtistForm();log('safeReadEvents:readArtistForm:ok',artistSnapshot())}catch(e){warn('safeReadEvents:readArtistForm:error',{message:e.message})}
    ensureEvents();
    log('safeReadEvents:after',eventSnapshot());
  }
  function safeReadResidents(){
    try{readResidentForm();log('safeReadResidents:readResidentForm:ok')}catch(e){warn('safeReadResidents:readResidentForm:error',{message:e.message})}
    ensureResidents();
  }
  async function saveEventsStay(){
    const currentView=state.view;
    log('saveEventsStay:clicked',{currentView,button:'events-or-artists-save',config:{owner:val('ghOwner'),repo:val('ghRepo'),branch:val('ghBranch'),path:val('eventsPath'),tokenPresent:!!val('ghToken')}});
    if(warnSaveNeedsToken('events')){warn('saveEventsStay:aborted:noToken');return;}
    try{
      setStatus('eventEditStatus','Speichere Events / Artists...','warn');
      safeReadEvents();
      const jsonText=eventsJson();
      log('saveEventsStay:jsonReady',{eventsCount:events().events?.length||0,artistsCount:artists().length,selectedArtist:state.selectedArtist,currentArtist:artistSnapshot(),jsonLength:jsonText.length,containsCurrentArtist:artistSnapshot()?jsonText.includes(artistSnapshot().name):null});
      if(!events().events?.length) throw new Error('Events: events[] ist leer. Speichern abgebrochen.');
      const saved=await putJsonFile(val('eventsPath'),jsonText,'Update events data from admin v2');
      state.eventsSha=saved.sha;
      state.loadedEventCount=events().events.length;
      state.dirty=false;
      state.syncState='loaded';
      updateSaveStatus();
      setView(currentView||'events');
      renderAll();
      setStatus('eventEditStatus',saved.retried?'Events / Artists nach SHA-Retry gespeichert.':'Events / Artists gespeichert.','ok');
      log('saveEventsStay:success',{sha:state.eventsSha,retried:saved.retried,view:state.view,artistsCount:artists().length});
    }catch(e){err('saveEventsStay:error',{message:e.message,stack:e.stack});state.syncState='conflict';updateSaveStatus();setView(currentView||'events');setStatus('eventEditStatus',e.message,'err')}
  }
  async function saveResidentsStay(){
    const currentView=state.view;
    log('saveResidentsStay:clicked',{currentView,config:{owner:val('ghOwner'),repo:val('ghRepo'),branch:val('ghBranch'),path:val('residentsPath'),tokenPresent:!!val('ghToken')}});
    if(warnSaveNeedsToken('residents')) return;
    try{
      setStatus('residentStatus','Speichere Residents...','warn');
      safeReadResidents();
      const removedInlineMedia=sanitizeResidentsBeforeSave();
      if(!residents().residents?.length) throw new Error('Residents: residents[] ist leer. Speichern abgebrochen.');
      const jsonText=residentsJson();
      log('saveResidentsStay:jsonReady',{residentsCount:residents().residents?.length||0,jsonLength:jsonText.length,removedInlineMedia,hasDataUrl:jsonText.includes('data:'),hasBlobUrl:jsonText.includes('blob:')});
      if(jsonText.includes('data:')||jsonText.includes('blob:')) throw new Error('Residents enthalten noch lokale data/blob-Medien. Bitte neu laden und nur GitHub-Upload verwenden.');
      const saved=await putJsonFile(val('residentsPath'),jsonText,'Update residents data from admin v2');
      state.residentsSha=saved.sha;
      state.loadedResidentCount=residents().residents.length;
      state.dirty=false;
      state.syncState='loaded';
      updateSaveStatus();
      setView(currentView||'residents');
      renderAll();
      setStatus('residentStatus',saved.retried?'Residents nach SHA-Retry gespeichert.':'Residents gespeichert.','ok');
      log('saveResidentsStay:success',{sha:state.residentsSha,retried:saved.retried,residentsCount:residents().residents.length});
    }catch(e){err('saveResidentsStay:error',{message:e.message,stack:e.stack});state.syncState='conflict';updateSaveStatus();setView(currentView||'residents');setStatus('residentStatus',e.message,'err')}
  }
  function rebindButtons(){
    window.loadEventsFromGithub=loadEventsPublic;
    window.loadResidentsFromGithub=loadResidentsPublic;
    window.saveEventsToGithub=saveEventsStay;
    window.saveResidentsToGithub=saveResidentsStay;
    const topLoad=$('topLoadBtn');if(topLoad)topLoad.onclick=()=>state.view==='residents'||state.view==='releases'?loadResidentsPublic():loadEventsPublic();
    const loadEv=$('loadEventsGitBtn');if(loadEv)loadEv.onclick=loadEventsPublic;
    const loadRes=$('loadResidentsGitBtn');if(loadRes)loadRes.onclick=loadResidentsPublic;
    const evSave=$('eventSaveBtn');if(evSave)evSave.onclick=saveEventsStay;
    const artistSave=$('saveArtistsGitBtn');if(artistSave)artistSave.onclick=saveEventsStay;
    const topSave=$('topSaveBtn');if(topSave)topSave.onclick=()=>state.view==='residents'||state.view==='releases'?saveResidentsStay():saveEventsStay();
    const evSettingsSave=$('saveEventsGitBtn');if(evSettingsSave)evSettingsSave.onclick=saveEventsStay;
    const resSettingsSave=$('saveResidentsGitBtn2');if(resSettingsSave)resSettingsSave.onclick=saveResidentsStay;
    const resSave=$('saveResidentsGitBtn');if(resSave)resSave.onclick=saveResidentsStay;
    log('rebindButtons:done',{topLoad:!!topLoad,eventSave:!!evSave,artistSave:!!artistSave,topSave:!!topSave,saveEventsFn:window.saveEventsToGithub?.name||'anonymous'});
  }
  onReady(()=>{
    log('autoGithubLoad:init',{script:'auto-github-load.js',debugVersion:'debug-save-3-sanitize-residents',href:location.href});
    rebindButtons();
    setTimeout(()=>{rebindButtons();autoLoadGithubData()},500);
    setTimeout(rebindButtons,1500);
  });
})();
