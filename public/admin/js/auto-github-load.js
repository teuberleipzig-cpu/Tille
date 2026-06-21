/* Auto-loads Events and Residents from GitHub on admin startup.
   The manual button remains as "Neu laden" for refresh/conflict cases. */
(function(){
  function onReady(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn()}
  function val(id){return $(id)?.value?.trim()||''}
  function apiPath(path){return String(path||'').split('/').map(encodeURIComponent).join('/')}
  function apiUrl(path){return 'https://api.github.com/repos/'+encodeURIComponent(val('ghOwner'))+'/'+encodeURIComponent(val('ghRepo'))+'/contents/'+apiPath(path)+'?ref='+encodeURIComponent(val('ghBranch'))+'&t='+Date.now()}
  function publicHeaders(){const h={Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};const token=val('ghToken');if(token){h.Authorization='Bearer '+token}return h}
  function b64DecodeUtf8(str){const bin=atob(String(str||'').replace(/\n/g,''));return new TextDecoder().decode(Uint8Array.from(bin,ch=>ch.charCodeAt(0)))}
  async function loadFile(path){
    const res=await fetch(apiUrl(path),{headers:publicHeaders(),cache:'no-store'});
    const meta=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(meta.message||('GitHub Laden fehlgeschlagen '+res.status));
    let json;
    if(meta.content&&meta.content.trim()) json=JSON.parse(b64DecodeUtf8(meta.content));
    else{
      const raw=meta.download_url||('https://raw.githubusercontent.com/'+encodeURIComponent(val('ghOwner'))+'/'+encodeURIComponent(val('ghRepo'))+'/'+encodeURIComponent(val('ghBranch'))+'/'+apiPath(path)+'?t='+Date.now());
      const r=await fetch(raw,{cache:'no-store'});
      const text=await r.text();
      if(!r.ok)throw new Error('Raw-Download fehlgeschlagen: '+r.status);
      json=JSON.parse(text);
    }
    return{json,sha:meta.sha};
  }
  async function autoLoadGithubData(){
    if(!val('ghOwner')||!val('ghRepo')||!val('ghBranch')||!val('eventsPath')||!val('residentsPath')) return;
    try{
      const currentView=state.view;
      setStatus('syncStatus','Lade Daten automatisch aus GitHub...','warn');
      const [ev,res]=await Promise.all([loadFile(val('eventsPath')),loadFile(val('residentsPath'))]);
      state.eventsData=ev.json;
      state.eventsSha=ev.sha;
      state.loadedEventCount=(ev.json.events||[]).length;
      state.residentsData=res.json;
      state.residentsSha=res.sha;
      state.loadedResidentCount=(res.json.residents||[]).length;
      state.syncState='loaded';
      state.dirty=false;
      ensureEvents();
      ensureResidents();
      state.selectedEvent=events().events.length?0:-1;
      state.selectedArtist=artists().length?0:-1;
      state.selectedResident=residents().residents.length?0:-1;
      renderAll();
      setView(currentView||'events');
      const top=$('topLoadBtn');if(top)top.textContent='Neu laden';
      setStatus('syncStatus','Daten automatisch aus GitHub geladen. Events SHA: '+state.eventsSha+' · Residents SHA: '+state.residentsSha,'ok');
      updateSaveStatus();
    }catch(e){
      const top=$('topLoadBtn');if(top)top.textContent='GitHub laden';
      state.syncState='conflict';
      updateSaveStatus();
      setStatus('syncStatus','Automatisches Laden fehlgeschlagen: '+e.message,'err');
    }
  }
  onReady(()=>setTimeout(autoLoadGithubData,500));
})();
