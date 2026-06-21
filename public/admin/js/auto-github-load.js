/* Auto-loads Events and Residents without forcing the Settings view.
   Public JSON loading works without a GitHub token. Saving still needs a token. */
(function(){
  function onReady(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn()}
  function val(id){return $(id)?.value?.trim()||''}
  function apiPath(path){return String(path||'').split('/').map(encodeURIComponent).join('/')}
  function rawPath(path){return String(path||'').split('/').map(encodeURIComponent).join('/')}
  function apiUrl(path){return 'https://api.github.com/repos/'+encodeURIComponent(val('ghOwner'))+'/'+encodeURIComponent(val('ghRepo'))+'/contents/'+apiPath(path)+'?ref='+encodeURIComponent(val('ghBranch'))+'&t='+Date.now()}
  function rawUrl(path){return 'https://raw.githubusercontent.com/'+encodeURIComponent(val('ghOwner'))+'/'+encodeURIComponent(val('ghRepo'))+'/'+encodeURIComponent(val('ghBranch'))+'/'+rawPath(path)+'?t='+Date.now()}
  function localUrl(path){return '../../'+String(path||'').replace(/^public\//,'')+'?t='+Date.now()}
  function publicHeaders(){const h={Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};const token=val('ghToken');if(token){h.Authorization='Bearer '+token}return h}
  function b64DecodeUtf8(str){const bin=atob(String(str||'').replace(/\n/g,''));return new TextDecoder().decode(Uint8Array.from(bin,ch=>ch.charCodeAt(0)))}
  async function fetchJsonUrl(url){const res=await fetch(url,{cache:'no-store'});const text=await res.text();if(!res.ok)throw new Error('Download fehlgeschlagen: '+res.status);if(!text.trim())throw new Error('JSON-Datei ist leer.');return JSON.parse(text)}
  async function loadFile(path){
    try{
      const res=await fetch(apiUrl(path),{headers:publicHeaders(),cache:'no-store'});
      const meta=await res.json().catch(()=>({}));
      if(res.ok){
        let json;
        if(meta.content&&meta.content.trim()) json=JSON.parse(b64DecodeUtf8(meta.content));
        else json=await fetchJsonUrl(meta.download_url||rawUrl(path));
        return{json,sha:meta.sha||''};
      }
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
  function rebindButtons(){
    window.loadEventsFromGithub=loadEventsPublic;
    window.loadResidentsFromGithub=loadResidentsPublic;
    const topLoad=$('topLoadBtn');if(topLoad)topLoad.onclick=()=>state.view==='residents'||state.view==='releases'?loadResidentsPublic():loadEventsPublic();
    const loadEv=$('loadEventsGitBtn');if(loadEv)loadEv.onclick=loadEventsPublic;
    const loadRes=$('loadResidentsGitBtn');if(loadRes)loadRes.onclick=loadResidentsPublic;
    const originalSaveEvents=window.saveEventsToGithub;
    const originalSaveResidents=window.saveResidentsToGithub;
    if(originalSaveEvents){window.saveEventsToGithub=async()=>{if(warnSaveNeedsToken('events'))return;return originalSaveEvents()}}
    if(originalSaveResidents){window.saveResidentsToGithub=async()=>{if(warnSaveNeedsToken('residents'))return;return originalSaveResidents()}}
    const evSave=$('eventSaveBtn');if(evSave)evSave.onclick=window.saveEventsToGithub;
    const artistSave=$('saveArtistsGitBtn');if(artistSave)artistSave.onclick=window.saveEventsToGithub;
    const topSave=$('topSaveBtn');if(topSave)topSave.onclick=()=>state.view==='residents'||state.view==='releases'?window.saveResidentsToGithub():window.saveEventsToGithub();
    const evSettingsSave=$('saveEventsGitBtn');if(evSettingsSave)evSettingsSave.onclick=window.saveEventsToGithub;
    const resSettingsSave=$('saveResidentsGitBtn2');if(resSettingsSave)resSettingsSave.onclick=window.saveResidentsToGithub;
    const resSave=$('saveResidentsGitBtn');if(resSave)resSave.onclick=window.saveResidentsToGithub;
  }
  onReady(()=>{
    rebindButtons();
    setTimeout(()=>{rebindButtons();autoLoadGithubData()},500);
  });
})();
