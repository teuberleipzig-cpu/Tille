/* Auto-loads Events and Residents without forcing the Settings view.
   Public JSON loading works without a GitHub token. Saving still needs a token. */
(function(){
  function onReady(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn()}
  function val(id){return $(id)?.value?.trim()||''}
  function apiPath(path){return String(path||'').split('/').map(encodeURIComponent).join('/')}
  function rawPath(path){return String(path||'').split('/').map(encodeURIComponent).join('/')}
  function apiUrl(path){return 'https://api.github.com/repos/'+encodeURIComponent(val('ghOwner'))+'/'+encodeURIComponent(val('ghRepo'))+'/contents/'+apiPath(path)+'?ref='+encodeURIComponent(val('ghBranch'))+'&t='+Date.now()}
  function apiPutUrl(path){return 'https://api.github.com/repos/'+encodeURIComponent(val('ghOwner'))+'/'+encodeURIComponent(val('ghRepo'))+'/contents/'+apiPath(path)}
  function rawUrl(path){return 'https://raw.githubusercontent.com/'+encodeURIComponent(val('ghOwner'))+'/'+encodeURIComponent(val('ghRepo'))+'/'+encodeURIComponent(val('ghBranch'))+'/'+rawPath(path)+'?t='+Date.now()}
  function localUrl(path){return '../../'+String(path||'').replace(/^public\//,'')+'?t='+Date.now()}
  function publicHeaders(){const h={Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};const token=val('ghToken');if(token){h.Authorization='Bearer '+token}return h}
  function writeHeaders(){return {...publicHeaders(),'Content-Type':'application/json'}}
  function b64DecodeUtf8(str){const bin=atob(String(str||'').replace(/\n/g,''));return new TextDecoder().decode(Uint8Array.from(bin,ch=>ch.charCodeAt(0)))}
  function b64EncodeUtf8(str){const bytes=new TextEncoder().encode(str);let bin='';for(let i=0;i<bytes.length;i+=32768)bin+=String.fromCharCode.apply(null,bytes.subarray(i,i+32768));return btoa(bin)}
  async function fetchJsonUrl(url){const res=await fetch(url,{cache:'no-store'});const text=await res.text();if(!res.ok)throw new Error('Download fehlgeschlagen: '+res.status);if(!text.trim())throw new Error('JSON-Datei ist leer.');return JSON.parse(text)}
  async function fetchMeta(path){const res=await fetch(apiUrl(path),{headers:publicHeaders(),cache:'no-store'});const meta=await res.json().catch(()=>({}));if(!res.ok)throw new Error(meta.message||('GitHub Fehler '+res.status));return meta}
  async function loadFile(path){
    try{
      const meta=await fetchMeta(path);
      let json;
      if(meta.content&&meta.content.trim()) json=JSON.parse(b64DecodeUtf8(meta.content));
      else json=await fetchJsonUrl(meta.download_url||rawUrl(path));
      return{json,sha:meta.sha||''};
    }catch(e){}
    try{return{json:await fetchJsonUrl(rawUrl(path)),sha:''};}catch(e){}
    return{json:await fetchJsonUrl(localUrl(path)),sha:''};
  }
  function afterLoad(currentView){
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
  }
  async function loadEventsPublic(){
    const currentView=state.view;
    try{
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
    }catch(e){setStatus('eventEditStatus','Events konnten nicht geladen werden: '+e.message,'err')}
  }
  async function loadResidentsPublic(){
    const currentView=state.view;
    try{
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
    }catch(e){setStatus('residentStatus','Residents konnten nicht geladen werden: '+e.message,'err')}
  }
  async function autoLoadGithubData(){
    if(!val('ghOwner')||!val('ghRepo')||!val('ghBranch')||!val('eventsPath')||!val('residentsPath')) return;
    try{
      const currentView=state.view;
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
    }catch(e){
      const top=$('topLoadBtn');if(top)top.textContent='Neu laden';
      setStatus('syncStatus','Automatisches Laden fehlgeschlagen: '+e.message,'err');
    }
  }
  function warnSaveNeedsToken(area){
    const statusId=area==='residents'?'residentStatus':'eventEditStatus';
    if(!val('ghToken')){setStatus(statusId,'Speichern braucht einen GitHub Token. Laden/Bearbeiten geht ohne Token.','err');return true}
    return false;
  }
  function safeReadEvents(){
    try{readEventForm()}catch(e){}
    try{readArtistForm()}catch(e){}
    ensureEvents();
  }
  function safeReadResidents(){
    try{readResidentForm()}catch(e){}
    ensureResidents();
  }
  async function saveEventsStay(){
    const currentView=state.view;
    if(warnSaveNeedsToken('events')) return;
    try{
      setStatus('eventEditStatus','Speichere Events / Artists...','warn');
      safeReadEvents();
      if(!events().events?.length) throw new Error('Events: events[] ist leer. Speichern abgebrochen.');
      const remote=await fetchMeta(val('eventsPath'));
      if(state.eventsSha && remote.sha!==state.eventsSha) throw new Error('Events: GitHub-Datei wurde seit dem Laden verändert. Bitte neu laden.');
      const body={message:'Update events data from admin v2',content:b64EncodeUtf8(eventsJson()),sha:remote.sha,branch:val('ghBranch')};
      const res=await fetch(apiPutUrl(val('eventsPath')),{method:'PUT',headers:writeHeaders(),body:JSON.stringify(body)});
      const out=await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(out.message||('Events speichern fehlgeschlagen '+res.status));
      state.eventsSha=out.content?.sha||remote.sha;
      state.loadedEventCount=events().events.length;
      state.dirty=false;
      state.syncState='loaded';
      updateSaveStatus();
      setView(currentView||'events');
      renderAll();
      setStatus('eventEditStatus','Events / Artists gespeichert.','ok');
    }catch(e){state.syncState='conflict';updateSaveStatus();setView(currentView||'events');setStatus('eventEditStatus',e.message,'err')}
  }
  async function saveResidentsStay(){
    const currentView=state.view;
    if(warnSaveNeedsToken('residents')) return;
    try{
      setStatus('residentStatus','Speichere Residents...','warn');
      safeReadResidents();
      if(!residents().residents?.length) throw new Error('Residents: residents[] ist leer. Speichern abgebrochen.');
      const remote=await fetchMeta(val('residentsPath'));
      if(state.residentsSha && remote.sha!==state.residentsSha) throw new Error('Residents: GitHub-Datei wurde seit dem Laden verändert. Bitte neu laden.');
      const body={message:'Update residents data from admin v2',content:b64EncodeUtf8(residentsJson()),sha:remote.sha,branch:val('ghBranch')};
      const res=await fetch(apiPutUrl(val('residentsPath')),{method:'PUT',headers:writeHeaders(),body:JSON.stringify(body)});
      const out=await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(out.message||('Residents speichern fehlgeschlagen '+res.status));
      state.residentsSha=out.content?.sha||remote.sha;
      state.loadedResidentCount=residents().residents.length;
      state.dirty=false;
      state.syncState='loaded';
      updateSaveStatus();
      setView(currentView||'residents');
      renderAll();
      setStatus('residentStatus','Residents gespeichert.','ok');
    }catch(e){state.syncState='conflict';updateSaveStatus();setView(currentView||'residents');setStatus('residentStatus',e.message,'err')}
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
  }
  onReady(()=>{
    rebindButtons();
    setTimeout(()=>{rebindButtons();autoLoadGithubData()},500);
    setTimeout(rebindButtons,1500);
  });
})();
