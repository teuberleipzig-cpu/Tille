/* Track-focused Releases workflow for Admin v2.
   Left: artists/residents. Middle: tracks. Right: track details and thumbnail upload. */
(function(){
  function onReady(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn()}
  function allResidents(){return residents().residents||[]}
  function selectedResident(){return allResidents()[state.releaseResidentIndex||0]||null}
  function releaseList(r){if(!r)return[];if(!Array.isArray(r.releases))r.releases=[];return r.releases}
  function selectedRelease(){return releaseList(selectedResident())[state.releaseIndex||0]||null}
  function selectedTrack(){const rel=selectedRelease();if(!rel)return null;normalizeTracks(rel);return rel.trackDetails[state.releaseTrackIndex||0]||null}
  function splitLines(v){return String(v||'').split(/\n|\|/).map(x=>x.trim()).filter(Boolean)}
  function joinLines(v){return Array.isArray(v)?v.join('\n'):String(v||'')}
  function raw(id){return $(id)?.value??''}
  function link(id){return String($(id)?.value??'').trim()}
  function bool(id){return !!$(id)?.checked}
  function slugText(value){return String(value||'media').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'media'}
  function residentFolder(r){return slugText(r?.id||r?.name||'resident')}
  function uniqueName(prefix){return slugText(prefix)+'-'+Date.now()+'.jpg'}
  function normalizeRelease(rel){
    rel.published=!!rel.published;rel.autoNews=rel.autoNews!==false;rel.featured=!!rel.featured;
    rel.releaseDate=rel.releaseDate||'';rel.year=rel.year||'';rel.title=rel.title||'';rel.label=rel.label||'';
    rel.releaseType=rel.releaseType||'';rel.format=rel.format||'';rel.country=rel.country||'';
    rel.artists=Array.isArray(rel.artists)?rel.artists:splitLines(rel.artists);
    rel.tracks=Array.isArray(rel.tracks)?rel.tracks:splitLines(rel.tracks);
    rel.coverUrl=rel.coverUrl||rel.coverImage||rel.cover||rel.imageUrl||'';
    rel.discogsUrl=rel.discogsUrl||'';rel.beatportUrl=rel.beatportUrl||'';rel.bandcampUrl=rel.bandcampUrl||'';rel.labelUrl=rel.labelUrl||'';
    rel.autoNewsText=rel.autoNewsText||'';rel.description=rel.description||'';
    normalizeTracks(rel);return rel;
  }
  function trackTitle(t){return typeof t==='string'?t:(t?.title||t?.name||'')}
  function normalizeTracks(rel){
    rel.tracks=Array.isArray(rel.tracks)?rel.tracks:splitLines(rel.tracks);
    rel.trackDetails=Array.isArray(rel.trackDetails)?rel.trackDetails:[];
    rel.trackThumbnails=Array.isArray(rel.trackThumbnails)?rel.trackThumbnails:[];
    rel.tracks=rel.tracks.map((t,i)=>{
      const title=trackTitle(t);
      const old=typeof t==='object'?t:{};
      const detail=rel.trackDetails[i]||{};
      rel.trackDetails[i]={
        title:title||detail.title||'',
        thumbnailUrl:detail.thumbnailUrl||detail.thumbnail||old.thumbnailUrl||old.thumbnail||rel.trackThumbnails[i]||'',
        soundcloudUrl:detail.soundcloudUrl||old.soundcloudUrl||'',
        youtubeUrl:detail.youtubeUrl||old.youtubeUrl||'',
        spotifyUrl:detail.spotifyUrl||old.spotifyUrl||'',
        bandcampUrl:detail.bandcampUrl||old.bandcampUrl||'',
        description:detail.description||old.description||''
      };
      rel.trackThumbnails[i]=rel.trackDetails[i].thumbnailUrl||'';
      return rel.trackDetails[i].title;
    });
    if(!rel.tracks.length){rel.tracks.push('Neuer Track');rel.trackDetails.push({title:'Neuer Track',thumbnailUrl:'',soundcloudUrl:'',youtubeUrl:'',spotifyUrl:'',bandcampUrl:'',description:''});rel.trackThumbnails.push('')}
    rel.trackDetails=rel.trackDetails.slice(0,rel.tracks.length);
    rel.trackThumbnails=rel.trackThumbnails.slice(0,rel.tracks.length);
    if((state.releaseTrackIndex||0)>=rel.tracks.length)state.releaseTrackIndex=Math.max(0,rel.tracks.length-1);
  }
  function ensureState(){
    if(state.releaseResidentIndex==null)state.releaseResidentIndex=0;
    if(state.releaseIndex==null)state.releaseIndex=0;
    if(state.releaseTrackIndex==null)state.releaseTrackIndex=0;
    if(state.releaseResidentIndex>=allResidents().length)state.releaseResidentIndex=Math.max(0,allResidents().length-1);
    const r=selectedResident();releaseList(r).forEach(normalizeRelease);
    if(state.releaseIndex>=releaseList(r).length)state.releaseIndex=Math.max(0,releaseList(r).length-1);
    const rel=selectedRelease();if(rel)normalizeTracks(rel);
  }
  function inject(){
    const root=$('view-releases');if(!root||root.dataset.workflowReady==='1')return;
    root.dataset.workflowReady='1';
    root.innerHTML='<div class="releases-workflow"><aside class="panel release-side"><div class="head"><div class="title"><span class="icon">A</span><h2>Artists</h2></div></div><div id="wfArtistList" class="list"></div></aside><aside class="panel track-side"><div class="head"><div class="title"><span class="icon">T</span><h2>Tracks</h2></div></div><div class="tools" style="margin-bottom:12px"><button class="tool" id="wfNewRelease">+ Release</button><button class="tool" id="wfNewTrack">+ Track</button><button class="tool" id="wfSort">Sortieren</button></div><div id="wfTrackList"></div></aside><section class="editor"><div class="editor-head"><div class="editor-title"><span class="icon">✎</span><div><h2 id="wfDetailTitle">Track auswählen</h2><div id="wfDetailMeta" class="editor-meta">Artist links wählen, dann Track wählen.</div></div></div><div class="tools"><button class="tool" id="wfDupRelease">Release duplizieren</button><button class="tool danger" id="wfDeleteRelease">Release löschen</button></div></div><div id="wfDetail"></div><div class="footer"><div id="wfStatus" class="status muted">Bereit.</div><div class="tools"><button class="btn" id="wfJson">Residents JSON</button><button class="btn primary" id="wfSave">Speichern</button></div></div></section></div>';
    $('wfNewRelease').onclick=newRelease;$('wfNewTrack').onclick=newTrack;$('wfSort').onclick=sortReleases;$('wfDupRelease').onclick=duplicateRelease;$('wfDeleteRelease').onclick=deleteRelease;$('wfJson').onclick=downloadResidents;$('wfSave').onclick=()=>{readDetail();saveResidentsToGithub()};
  }
  function renderArtists(){
    const list=allResidents();
    $('wfArtistList').innerHTML=list.map((r,i)=>'<div class="item release-artist-row '+(i===(state.releaseResidentIndex||0)?'active':'')+'"><button class="release-artist-main" data-wf-artist="'+i+'"><strong>'+esc(r.name||'Ohne Name')+'</strong><span>'+releaseList(r).length+' Releases</span></button></div>').join('')||'<p class="muted">Keine Residents geladen.</p>';
    document.querySelectorAll('[data-wf-artist]').forEach(btn=>btn.onclick=()=>{readDetail();state.releaseResidentIndex=Number(btn.dataset.wfArtist);state.releaseIndex=0;state.releaseTrackIndex=0;renderWorkflow()});
  }
  function renderTracks(){
    const r=selectedResident(),rels=releaseList(r);
    $('wfTrackList').innerHTML=rels.map((rel,ri)=>{normalizeRelease(rel);const tracks=rel.trackDetails.map((t,ti)=>'<button class="track-button '+(ri===state.releaseIndex&&ti===state.releaseTrackIndex?'active':'')+'" data-wf-track="'+ri+':'+ti+'"><strong>'+esc(t.title||'Ohne Titel')+'</strong><span>'+esc(rel.title||'Ohne Release')+'</span></button>').join('');return '<div class="release-track-group"><button class="release-track-head '+(ri===state.releaseIndex?'active':'')+'" data-wf-release="'+ri+'"><strong>'+esc(rel.title||'Ohne Release')+'</strong><span>'+esc(rel.releaseDate||rel.year||'ohne Datum')+' · '+esc(rel.label||'ohne Label')+'</span></button><div class="release-track-list">'+tracks+'</div></div>'}).join('')||'<p class="muted">Keine Releases/Tracks.</p>';
    document.querySelectorAll('[data-wf-release]').forEach(btn=>btn.onclick=()=>{readDetail();state.releaseIndex=Number(btn.dataset.wfRelease);state.releaseTrackIndex=0;renderWorkflow()});
    document.querySelectorAll('[data-wf-track]').forEach(btn=>btn.onclick=()=>{readDetail();const p=btn.dataset.wfTrack.split(':').map(Number);state.releaseIndex=p[0];state.releaseTrackIndex=p[1];renderWorkflow()});
  }
  function field(id,label,value,cls){return '<div class="field"><label class="label">'+label+'</label><textarea class="input auto-textarea '+(cls||'')+'" id="'+id+'">'+esc(value||'')+'</textarea></div>'}
  function small(id,label,value,type){return '<div class="field"><label class="label">'+label+'</label><input class="input" id="'+id+'" type="'+type+'" value="'+esc(value||'')+'"></div>'}
  function renderDetail(){
    const r=selectedResident(),rel=selectedRelease(),track=selectedTrack();
    if(!r||!rel||!track){$('wfDetailTitle').textContent='Track auswählen';$('wfDetail').innerHTML='<div class="notice">Kein Track ausgewählt.</div>';return}
    $('wfDetailTitle').textContent=track.title||'Ohne Titel';$('wfDetailMeta').textContent=(r.name||'Artist')+' · '+(rel.title||'Release');
    $('wfDetail').innerHTML='<section class="detail-section"><h3>Track</h3>'+field('wfTrackTitle','Track-Name',track.title)+'<div id="wfTrackThumbBlock"><label class="label">Thumbnail</label><img id="wfTrackThumbPreview" class="track-thumb-preview" src="'+esc(track.thumbnailUrl||'')+'" alt=""><div id="wfTrackThumbDrop"></div></div>'+field('wfTrackDescription','Track-Beschreibung',track.description||'')+'</section><section class="detail-section"><h3>Release</h3><div class="release-checks"><label><input id="wfPublished" type="checkbox" '+(rel.published?'checked':'')+'> Published</label><label><input id="wfAutoNews" type="checkbox" '+(rel.autoNews!==false?'checked':'')+'> Auto News</label><label><input id="wfFeatured" type="checkbox" '+(rel.featured?'checked':'')+'> Featured</label></div><div class="form-grid" style="margin-top:16px">'+small('wfReleaseDate','Release Date',rel.releaseDate,'date')+small('wfYear','Year',rel.year,'number')+field('wfReleaseTitle','Release-Name',rel.title)+field('wfLabel','Label',rel.label)+field('wfType','Release Type',rel.releaseType)+field('wfFormat','Format',rel.format)+field('wfCountry','Country',rel.country)+field('wfArtists','Artists, eine Zeile pro Artist',joinLines(rel.artists))+'</div></section><section class="detail-section"><h3>Links</h3><div class="form-grid">'+field('wfDiscogs','Discogs URL',rel.discogsUrl,'link-textarea')+field('wfBeatport','Beatport URL',rel.beatportUrl,'link-textarea')+field('wfBandcamp','Bandcamp URL',rel.bandcampUrl,'link-textarea')+field('wfLabelUrl','Label URL',rel.labelUrl,'link-textarea')+field('wfTrackSoundcloud','Track SoundCloud URL',track.soundcloudUrl,'link-textarea')+field('wfTrackYoutube','Track YouTube URL',track.youtubeUrl,'link-textarea')+field('wfTrackSpotify','Track Spotify URL',track.spotifyUrl,'link-textarea')+field('wfTrackBandcamp','Track Bandcamp URL',track.bandcampUrl,'link-textarea')+'</div></section><section class="detail-section"><h3>Texte</h3>'+field('wfAutoNewsText','Auto News Text',rel.autoNewsText)+field('wfDescription','Release Description',rel.description)+'</section>';
    bindDetailInputs();installTrackThumbnailDrop();
  }
  function bindDetailInputs(){document.querySelectorAll('#wfDetail input,#wfDetail textarea').forEach(el=>el.addEventListener('input',()=>{readDetail();markDirty();renderTracks();}))}
  function readDetail(){
    const rel=selectedRelease(),track=selectedTrack();if(!rel||!track||!$('wfTrackTitle'))return;
    track.title=raw('wfTrackTitle');rel.tracks[state.releaseTrackIndex||0]=track.title;track.description=raw('wfTrackDescription');
    rel.published=bool('wfPublished');rel.autoNews=bool('wfAutoNews');rel.featured=bool('wfFeatured');rel.releaseDate=raw('wfReleaseDate');rel.year=raw('wfYear');rel.title=raw('wfReleaseTitle');rel.label=raw('wfLabel');rel.releaseType=raw('wfType');rel.format=raw('wfFormat');rel.country=raw('wfCountry');rel.artists=splitLines(raw('wfArtists'));
    rel.discogsUrl=link('wfDiscogs');rel.beatportUrl=link('wfBeatport');rel.bandcampUrl=link('wfBandcamp');rel.labelUrl=link('wfLabelUrl');rel.autoNewsText=raw('wfAutoNewsText');rel.description=raw('wfDescription');
    track.soundcloudUrl=link('wfTrackSoundcloud');track.youtubeUrl=link('wfTrackYoutube');track.spotifyUrl=link('wfTrackSpotify');track.bandcampUrl=link('wfTrackBandcamp');rel.trackThumbnails[state.releaseTrackIndex||0]=track.thumbnailUrl||'';
  }
  function installTrackThumbnailDrop(){
    const slot=$('wfTrackThumbDrop');if(!slot||$('wfTrackThumbDropzone'))return;const zone=document.createElement('div');zone.id='wfTrackThumbDropzone';zone.className='media-dropzone';zone.innerHTML='<strong>Track-Thumbnail hier ablegen</strong><span>Wird nach GitHub hochgeladen und diesem Track zugeordnet.</span><div class="media-upload-status"></div><input class="hidden" type="file" accept="image/*">';slot.appendChild(zone);const input=zone.querySelector('input');zone.onclick=()=>input.click();input.onchange=e=>{const f=e.target.files&&e.target.files[0];if(f)uploadTrackThumbnail(f,zone.querySelector('.media-upload-status'));e.target.value=''};['dragenter','dragover'].forEach(evt=>zone.addEventListener(evt,e=>{e.preventDefault();zone.classList.add('dragover')}));['dragleave','drop'].forEach(evt=>zone.addEventListener(evt,e=>{e.preventDefault();zone.classList.remove('dragover')}));zone.addEventListener('drop',e=>{const f=e.dataTransfer.files&&e.dataTransfer.files[0];if(f)uploadTrackThumbnail(f,zone.querySelector('.media-upload-status'))})
  }
  function mediaStatus(el,msg,type){if(!el)return;el.textContent=msg;el.className='media-upload-status '+(type||'warn')}
  function cfg(){const owner=$('ghOwner')?.value?.trim(),repo=$('ghRepo')?.value?.trim(),branch=$('ghBranch')?.value?.trim(),token=$('ghToken')?.value?.trim();if(!owner||!repo||!branch)throw new Error('GitHub Owner/Repo/Branch fehlen.');if(!token)throw new Error('GitHub Token fehlt.');return{owner,repo,branch,token}}
  function headers(){return {...ghHeaders(),'Content-Type':'application/json'}}
  function pathPublic(p){return '/'+p.replace(/^public\//,'')}
  function bufferToBase64(buffer){let bin='',bytes=new Uint8Array(buffer);for(let i=0;i<bytes.length;i+=32768)bin+=String.fromCharCode.apply(null,bytes.subarray(i,i+32768));return btoa(bin)}
  function canvasBlob(canvas){return new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.86))}
  async function imageBlob(file){return new Promise((resolve,reject)=>{const img=new Image(),url=URL.createObjectURL(file);img.onload=async()=>{const s=1000,c=document.createElement('canvas'),ctx=c.getContext('2d'),side=Math.min(img.width,img.height),sx=(img.width-side)/2,sy=(img.height-side)/2;c.width=s;c.height=s;ctx.drawImage(img,sx,sy,side,side,0,0,s,s);URL.revokeObjectURL(url);resolve(await canvasBlob(c))};img.onerror=()=>reject(new Error('Thumbnail konnte nicht gelesen werden.'));img.src=url})}
  async function uploadTrackThumbnail(file,st){try{mediaStatus(st,'Lade Thumbnail nach GitHub...','warn');readDetail();const r=selectedResident(),rel=selectedRelease(),track=selectedTrack();if(!r||!rel||!track)throw new Error('Kein Track ausgewählt.');const blob=await imageBlob(file),content=bufferToBase64(await blob.arrayBuffer()),repoPath='public/residents/media/'+residentFolder(r)+'/tracks/'+uniqueName((rel.title||'release')+'-'+(track.title||'track')+'-thumb'),c=cfg(),api=repoPath.split('/').map(encodeURIComponent).join('/'),url='https://api.github.com/repos/'+encodeURIComponent(c.owner)+'/'+encodeURIComponent(c.repo)+'/contents/'+api;const res=await fetch(url,{method:'PUT',headers:headers(),body:JSON.stringify({message:'Upload track thumbnail '+repoPath,content,branch:c.branch})});const out=await res.json().catch(()=>({}));if(!res.ok)throw new Error(out.message||('Upload fehlgeschlagen '+res.status));track.thumbnailUrl=pathPublic(repoPath);selectedRelease().trackThumbnails[state.releaseTrackIndex||0]=track.thumbnailUrl;if($('wfTrackThumbPreview'))$('wfTrackThumbPreview').src=track.thumbnailUrl;markDirty();mediaStatus(st,'Hochgeladen: '+track.thumbnailUrl,'ok')}catch(err){mediaStatus(st,err.message,'err')}}
  function renderWorkflow(){inject();ensureState();renderArtists();renderTracks();renderDetail()}
  function newRelease(){const r=selectedResident();if(!r)return;readDetail();releaseList(r).push(normalizeRelease({published:false,autoNews:true,featured:false,releaseDate:'',year:'',title:'Neues Release',label:'',releaseType:'EP',format:'Digital',country:'',artists:[r.name||''],tracks:['Neuer Track'],trackDetails:[{title:'Neuer Track',thumbnailUrl:''}],trackThumbnails:['']}));state.releaseIndex=releaseList(r).length-1;state.releaseTrackIndex=0;markDirty();renderWorkflow()}
  function newTrack(){const rel=selectedRelease();if(!rel)return;readDetail();normalizeTracks(rel);rel.tracks.push('Neuer Track');rel.trackDetails.push({title:'Neuer Track',thumbnailUrl:'',soundcloudUrl:'',youtubeUrl:'',spotifyUrl:'',bandcampUrl:'',description:''});rel.trackThumbnails.push('');state.releaseTrackIndex=rel.tracks.length-1;markDirty();renderWorkflow()}
  function duplicateRelease(){const r=selectedResident(),rel=selectedRelease();if(!r||!rel)return;readDetail();const c=JSON.parse(JSON.stringify(rel));c.title=(c.title||'Release')+' Kopie';releaseList(r).push(c);state.releaseIndex=releaseList(r).length-1;state.releaseTrackIndex=0;markDirty();renderWorkflow()}
  function deleteRelease(){const r=selectedResident();if(!r||!selectedRelease())return;if(!confirm('Release wirklich löschen?'))return;releaseList(r).splice(state.releaseIndex,1);state.releaseIndex=Math.max(0,state.releaseIndex-1);state.releaseTrackIndex=0;markDirty();renderWorkflow()}
  function sortReleases(){const r=selectedResident();if(!r)return;readDetail();releaseList(r).sort((a,b)=>(Number(!!b.featured)-Number(!!a.featured))||String(b.releaseDate||b.year||'').localeCompare(String(a.releaseDate||a.year||''))||String(a.title||'').localeCompare(String(b.title||''),'de'));state.releaseIndex=0;state.releaseTrackIndex=0;markDirty();renderWorkflow()}
  function downloadResidents(){readDetail();const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([residentsJson()],{type:'application/json'}));a.download='residents.json';a.click();URL.revokeObjectURL(a.href)}
  onReady(()=>{window.renderReleases=renderReleases=renderWorkflow;renderWorkflow()})
})();
