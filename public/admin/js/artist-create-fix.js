/* Robust +Artist handler for Admin v2.
   Ensures new artists are actually pushed into events.meta.artists. */
(function(){
  const DBG='[AdminArtistDebug]';
  function log(step,data){try{console.log(DBG,step,data??'')}catch(e){}}
  function warn(step,data){try{console.warn(DBG,step,data??'')}catch(e){}}
  function onReady(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn()}
  function snapshot(){
    let list=[];
    try{list=artists()}catch(e){}
    return{view:state?.view,selectedArtist:state?.selectedArtist,artistsCount:list.length,artistNames:list.map(a=>a.name)};
  }
  function createArtist(){
    log('createArtist:clicked:before',snapshot());
    try{if(typeof readArtistForm==='function')readArtistForm()}catch(e){warn('createArtist:readArtistForm:error',{message:e.message})}
    try{
      ensureEvents();
      const list=artists();
      list.push({name:'Neuer Artist',info:'',link:''});
      state.selectedArtist=list.length-1;
      markDirty();
      renderArtists();
      setView('artists');
      setStatus('artistStatus','Neuer Artist angelegt. Name, Info und Link eintragen, dann speichern.','ok');
      setTimeout(()=>{const input=$('artistName');if(input){input.focus();input.select();}},0);
      log('createArtist:done:after',snapshot());
    }catch(e){
      console.error(DBG,'createArtist:error',{message:e.message,stack:e.stack});
      setStatus('artistStatus','Artist konnte nicht angelegt werden: '+e.message,'err');
    }
  }
  function bind(){
    const btn=$('newArtistBtn');
    if(!btn){warn('bind:noNewArtistBtn');return;}
    btn.onclick=createArtist;
    btn.dataset.artistCreateFixBound='1';
    log('bind:done',snapshot());
  }
  onReady(()=>{
    bind();
    setTimeout(bind,600);
    setTimeout(bind,1800);
  });
})();
