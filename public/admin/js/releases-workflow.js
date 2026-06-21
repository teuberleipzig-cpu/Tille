/* Releases workflow for Admin v2.
   Sidebar: artists/residents. Main: releases list + release details. */
(function(){
  function onReady(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn()}
  function allResidents(){return residents().residents||[]}
  function alphaResidents(){return allResidents().map((r,i)=>({r,i})).sort((a,b)=>String(a.r.name||'').localeCompare(String(b.r.name||''),'de',{sensitivity:'base'}))}
  function selectedResident(){return allResidents()[state.releaseResidentIndex||0]||null}
  function releaseList(r){if(!r)return[];if(!Array.isArray(r.releases))r.releases=[];return r.releases}
  function selectedRelease(){return releaseList(selectedResident())[state.releaseIndex||0]||null}
  function splitLines(v){return String(v||'').split(/\n|\|/).map(x=>x.trim()).filter(Boolean)}
  function joinLines(v){return Array.isArray(v)?v.join('\n'):String(v||'')}
  function raw(id){return $(id)?.value??''}
  function clean(id){return String($(id)?.value??'').trim()}
  function bool(id){return !!$(id)?.checked}
  function slugText(value){return String(value||'media').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'media'}
  function residentFolder(r){return slugText(r?.id||r?.name||'resident')}
  function uniqueName(prefix){return slugText(prefix)+'-'+Date.now()+'.jpg'}
  function normalizeRelease(rel){
    rel.published=!!rel.published;
    rel.autoNews=rel.autoNews!==false;
    rel.featured=!!rel.featured;
    rel.releaseDate=rel.releaseDate||'';
    rel.year=rel.year||'';
    rel.title=rel.title||'';
    rel.label=rel.label||'';
    rel.releaseType=rel.releaseType||'';
    rel.format=rel.format||'';
    rel.country=rel.country||'';
    rel.artists=Array.isArray(rel.artists)?rel.artists:splitLines(rel.artists);
    rel.tracks=Array.isArray(rel.tracks)?rel.tracks:splitLines(rel.tracks);
    rel.coverUrl=rel.coverUrl||rel.coverImage||rel.cover||rel.imageUrl||'';
    rel.discogsUrl=rel.discogsUrl||'';
    rel.beatportUrl=rel.beatportUrl||'';
    rel.bandcampUrl=rel.bandcampUrl||'';
    rel.labelUrl=rel.labelUrl||'';
    rel.autoNewsText=rel.autoNewsText||'';
    rel.description=rel.description||'';
    normalizeTracks(rel);
    return rel;
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
    rel.trackDetails=rel.trackDetails.slice(0,rel.tracks.length);
    rel.trackThumbnails=rel.trackThumbnails.slice(0,rel.tracks.length);
  }
  function ensureState(){
    if(state.releaseResidentIndex==null)state.releaseResidentIndex=0;
    if(state.releaseIndex==null)state.releaseIndex=0;
    if(state.releaseResidentIndex>=allResidents().length)state.releaseResidentIndex=Math.max(0,allResidents().length-1);
    const r=selectedResident();
    releaseList(r).forEach(normalizeRelease);
    if(state.releaseIndex>=releaseList(r).length)state.releaseIndex=Math.max(0,releaseList(r).length-1);
  }
  function renderSidebarArtists(){
    const btn=document.querySelector('.nav-btn[data-view="releases"]');
    if(!btn)return;
    let box=$('releaseSidebarArtists');
    if(!box){box=document.createElement('div');box.id='releaseSidebarArtists';box.className='release-sidebar-artists';btn.insertAdjacentElement('afterend',box)}
    box.classList.toggle('hidden',state.view!=='releases');
    if(state.view!=='releases')return;
    box.innerHTML=alphaResidents().map(({r,i})=>'<button class="release-sidebar-artist '+(i===(state.releaseResidentIndex||0)?'active':'')+'" data-release-sidebar-artist="'+i+'">'+esc(r.name||'Ohne Name')+'</button>').join('');
    document.querySelectorAll('[data-release-sidebar-artist]').forEach(b=>b.onclick=()=>{state.releaseResidentIndex=Number(b.dataset.releaseSidebarArtist);state.releaseIndex=0;setView('releases');renderWorkflow()});
  }
  function inject(){
    const root=$('view-releases');
    if(!root||root.dataset.releaseLayout==='list-detail')return;
    root.dataset.releaseLayout='list-detail';
    root.innerHTML='<div class="releases-workflow"><aside class="panel release-list-panel"><div class="head"><div class="title"><span class="icon">R</span><h2>Releases</h2></div></div><div class="release-list-actions"><button class="tool" id="wfNewRelease">+ Release</button><button class="tool" id="wfSort">Sortieren</button><button class="tool" id="wfCsvSample">CSV-Beispiel</button><button class="tool" id="wfCsvImport">CSV importieren</button><input id="wfCsvFile" class="hidden" type="file" accept=".csv,text/csv"></div><div id="wfReleaseList"></div></aside><section class="release-detail-editor"><div id="wfDetail"></div><div class="footer"><div id="wfStatus" class="status muted">Bereit.</div><div class="tools"><button class="btn" id="wfJson">Residents JSON</button><button class="btn primary" id="wfSave">Speichern</button></div></div></section></div>';
    $('wfNewRelease').onclick=newRelease;
    $('wfSort').onclick=sortReleases;
    $('wfCsvSample').onclick=downloadSampleCsv;
    $('wfCsvImport').onclick=()=>$('wfCsvFile').click();
    $('wfCsvFile').onchange=handleCsvImport;
    $('wfJson').onclick=downloadResidents;
    $('wfSave').onclick=()=>{readDetail();saveResidentsToGithub()};
  }
  function renderReleaseList(){
    const r=selectedResident(),list=releaseList(r);
    $('wfReleaseList').innerHTML=list.map((rel,i)=>{normalizeRelease(rel);return '<button class="release-card '+(i===(state.releaseIndex||0)?'active':'')+'" data-wf-release="'+i+'"><strong>'+esc(rel.title||'Ohne Titel')+'</strong><span>'+esc(rel.releaseDate||rel.year||'ohne Datum')+' · '+esc(rel.label||'ohne Label')+'</span></button>'}).join('')||'<p class="muted">Keine Releases.</p>';
    document.querySelectorAll('[data-wf-release]').forEach(b=>b.onclick=()=>{readDetail();state.releaseIndex=Number(b.dataset.wfRelease);renderWorkflow()});
  }
  function field(id,label,value,cls){return '<div class="field"><label class="label">'+label+'</label><textarea class="input auto-textarea '+(cls||'')+'" id="'+id+'">'+esc(value||'')+'</textarea></div>'}
  function small(id,label,value,type){return '<div class="field"><label class="label">'+label+'</label><input class="input" id="'+id+'" type="'+type+'" value="'+esc(value||'')+'"></div>'}
  function renderDetail(){
    const r=selectedResident(),rel=selectedRelease();
    if(!r||!rel){$('wfDetail').innerHTML='<div class="notice">Links in der Sidebar einen Artist wählen und ein Release anlegen.</div>';return}
    normalizeRelease(rel);
    $('wfDetail').innerHTML='<div class="release-detail-header"><div class="release-detail-title"><h2>'+esc(rel.title||'Ohne Titel')+'</h2><p>'+esc(r.name||'Artist')+' · '+esc(rel.releaseDate||rel.year||'ohne Datum')+'</p></div><div class="tools"><button class="tool" id="wfDupRelease">Release duplizieren</button><button class="tool danger" id="wfDeleteRelease">Release löschen</button></div></div><section class="release-detail-section"><h3>Release</h3><div class="release-checks"><label><input id="wfPublished" type="checkbox" '+(rel.published?'checked':'')+'> Published</label><label><input id="wfAutoNews" type="checkbox" '+(rel.autoNews!==false?'checked':'')+'> Auto News</label><label><input id="wfFeatured" type="checkbox" '+(rel.featured?'checked':'')+'> Featured</label></div><div class="form-grid">'+small('wfReleaseDate','Release Date',rel.releaseDate,'date')+small('wfYear','Year',rel.year,'number')+field('wfReleaseTitle','Release-Name',rel.title)+field('wfLabel','Label',rel.label)+field('wfType','Release Type',rel.releaseType)+field('wfFormat','Format',rel.format)+field('wfCountry','Country',rel.country)+field('wfArtists','Artists, eine Zeile pro Artist',joinLines(rel.artists))+'</div></section><section class="release-detail-section"><h3>Thumbnail / Cover</h3><img id="wfCoverPreview" class="release-cover-preview" src="'+esc(rel.coverUrl||'')+'" alt=""><div id="wfCoverDrop"></div></section><section class="release-detail-section"><h3>Tracks</h3><div class="tools" style="margin-bottom:12px"><button class="tool" id="wfNewTrack">+ Track</button></div><div id="wfTracksEditor">'+trackRows(rel)+'</div></section><section class="release-detail-section"><h3>Links</h3><div class="form-grid">'+field('wfDiscogs','Discogs URL',rel.discogsUrl,'link-textarea')+field('wfBeatport','Beatport URL',rel.beatportUrl,'link-textarea')+field('wfBandcamp','Bandcamp URL',rel.bandcampUrl,'link-textarea')+field('wfLabelUrl','Label URL',rel.labelUrl,'link-textarea')+'</div></section><section class="release-detail-section"><h3>Texte</h3>'+field('wfAutoNewsText','Auto News Text',rel.autoNewsText)+field('wfDescription','Release Description',rel.description)+'</section>';
    $('wfDupRelease').onclick=duplicateRelease;$('wfDeleteRelease').onclick=deleteRelease;$('wfNewTrack').onclick=newTrack;
    bindDetailInputs();installReleaseCoverDrop();installTrackThumbnailDrops();
  }
  function trackRows(rel){normalizeTracks(rel);return rel.trackDetails.map((t,i)=>'<div class="release-track-row"><div>'+field('wfTrackTitle'+i,'Track '+(i+1),t.title)+field('wfTrackDescription'+i,'Track-Beschreibung',t.description||'')+'<div class="form-grid">'+field('wfTrackSoundcloud'+i,'SoundCloud URL',t.soundcloudUrl,'link-textarea')+field('wfTrackYoutube'+i,'YouTube URL',t.youtubeUrl,'link-textarea')+field('wfTrackSpotify'+i,'Spotify URL',t.spotifyUrl,'link-textarea')+field('wfTrackBandcamp'+i,'Bandcamp URL',t.bandcampUrl,'link-textarea')+'</div></div><div><img class="track-thumb-preview" id="wfTrackThumbPreview'+i+'" src="'+esc(t.thumbnailUrl||'')+'" alt=""><div class="track-thumb-drop" id="wfTrackThumbDrop'+i+'"></div></div><div class="track-tools"><button class="tool" data-track-move="'+i+':-1">↑</button><button class="tool" data-track-move="'+i+':1">↓</button><button class="tool danger" data-track-delete="'+i+'">×</button></div></div>').join('')||'<p class="muted">Noch keine Tracks.</p>'}
  function readDetail(){
    const rel=selectedRelease();if(!rel||!$('wfReleaseTitle'))return;
    rel.published=bool('wfPublished');rel.autoNews=bool('wfAutoNews');rel.featured=bool('wfFeatured');rel.releaseDate=raw('wfReleaseDate');rel.year=raw('wfYear');rel.title=raw('wfReleaseTitle');rel.label=raw('wfLabel');rel.releaseType=raw('wfType');rel.format=raw('wfFormat');rel.country=raw('wfCountry');rel.artists=splitLines(raw('wfArtists'));
    rel.discogsUrl=clean('wfDiscogs');rel.beatportUrl=clean('wfBeatport');rel.bandcampUrl=clean('wfBandcamp');rel.labelUrl=clean('wfLabelUrl');rel.autoNewsText=raw('wfAutoNewsText');rel.description=raw('wfDescription');
    normalizeTracks(rel);
    rel.trackDetails.forEach((t,i)=>{if($('wfTrackTitle'+i)){t.title=raw('wfTrackTitle'+i);t.description=raw('wfTrackDescription'+i);t.soundcloudUrl=clean('wfTrackSoundcloud'+i);t.youtubeUrl=clean('wfTrackYoutube'+i);t.spotifyUrl=clean('wfTrackSpotify'+i);t.bandcampUrl=clean('wfTrackBandcamp'+i);rel.tracks[i]=t.title;rel.trackThumbnails[i]=t.thumbnailUrl||''}});
  }
  function bindDetailInputs(){document.querySelectorAll('#wfDetail input,#wfDetail textarea').forEach(el=>{el.addEventListener('input',()=>{readDetail();markDirty();renderReleaseList();renderSidebarArtists()});el.addEventListener('blur',()=>renderWorkflow())});document.querySelectorAll('[data-track-move]').forEach(b=>b.onclick=()=>{readDetail();const p=b.dataset.trackMove.split(':').map(Number);moveTrack(p[0],p[0]+p[1])});document.querySelectorAll('[data-track-delete]').forEach(b=>b.onclick=()=>deleteTrack(Number(b.dataset.trackDelete)))}
  function moveTrack(from,to){const rel=selectedRelease();if(!rel)return;normalizeTracks(rel);if(to<0||to>=rel.tracks.length)return;['tracks','trackDetails','trackThumbnails'].forEach(k=>{const item=rel[k].splice(from,1)[0];rel[k].splice(to,0,item)});markDirty();renderWorkflow()}
  function deleteTrack(i){const rel=selectedRelease();if(!rel)return;if(!confirm('Track wirklich löschen?'))return;normalizeTracks(rel);['tracks','trackDetails','trackThumbnails'].forEach(k=>rel[k].splice(i,1));markDirty();renderWorkflow()}
  function renderWorkflow(){inject();ensureState();renderSidebarArtists();renderReleaseList();renderDetail()}
  function newRelease(){const r=selectedResident();if(!r)return;readDetail();releaseList(r).push(normalizeRelease({published:false,autoNews:true,featured:false,releaseDate:'',year:'',title:'Neues Release',label:'',releaseType:'EP',format:'Digital',country:'',artists:[r.name||''],tracks:['Neuer Track'],coverUrl:'',trackDetails:[{title:'Neuer Track',thumbnailUrl:'',soundcloudUrl:'',youtubeUrl:'',spotifyUrl:'',bandcampUrl:'',description:''}],trackThumbnails:['']}));state.releaseIndex=releaseList(r).length-1;markDirty();renderWorkflow()}
  function newTrack(){const rel=selectedRelease();if(!rel)return;readDetail();normalizeTracks(rel);rel.tracks.push('Neuer Track');rel.trackDetails.push({title:'Neuer Track',thumbnailUrl:'',soundcloudUrl:'',youtubeUrl:'',spotifyUrl:'',bandcampUrl:'',description:''});rel.trackThumbnails.push('');markDirty();renderWorkflow()}
  function duplicateRelease(){const r=selectedResident(),rel=selectedRelease();if(!r||!rel)return;readDetail();const c=JSON.parse(JSON.stringify(rel));c.title=(c.title||'Release')+' Kopie';releaseList(r).push(c);state.releaseIndex=releaseList(r).length-1;markDirty();renderWorkflow()}
  function deleteRelease(){const r=selectedResident();if(!r||!selectedRelease())return;if(!confirm('Release wirklich löschen?'))return;releaseList(r).splice(state.releaseIndex,1);state.releaseIndex=Math.max(0,state.releaseIndex-1);markDirty();renderWorkflow()}
  function sortReleases(){const r=selectedResident();if(!r)return;readDetail();releaseList(r).sort((a,b)=>(Number(!!b.featured)-Number(!!a.featured))||String(b.releaseDate||b.year||'').localeCompare(String(a.releaseDate||a.year||''))||String(a.title||'').localeCompare(String(b.title||''),'de'));state.releaseIndex=0;markDirty();renderWorkflow()}
  function csvEscape(v){const s=String(v??'');return /["\n,;]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}
  function downloadSampleCsv(){const r=selectedResident();const row=[r?.id||'resident-id',r?.name||'Artist Name','true','false','false',new Date().toISOString().slice(0,10),new Date().getFullYear(),'Release Titel','Label','EP','Digital','DE','Artist 1|Artist 2','Track 1|Track 2','','','','','','Beschreibung'].map(csvEscape).join(',');const csv='residentId,residentName,published,autoNews,featured,releaseDate,year,title,label,releaseType,format,country,artists,tracks,discogsUrl,beatportUrl,bandcampUrl,labelUrl,autoNewsText,description\n'+row+'\n';const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='releases-import.csv';a.click();URL.revokeObjectURL(a.href)}
  function handleCsvImport(e){setStatus('wfStatus','CSV-Import ist im alten Modul noch vorhanden; ich passe ihn im nächsten Schritt an diese Ansicht an.','warn');e.target.value=''}
  function downloadResidents(){readDetail();const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([residentsJson()],{type:'application/json'}));a.download='residents.json';a.click();URL.revokeObjectURL(a.href)}
  function cfg(){const owner=$('ghOwner')?.value?.trim(),repo=$('ghRepo')?.value?.trim(),branch=$('ghBranch')?.value?.trim(),token=$('ghToken')?.value?.trim();if(!owner||!repo||!branch)throw new Error('GitHub Owner/Repo/Branch fehlen.');if(!token)throw new Error('GitHub Token fehlt.');return{owner,repo,branch,token}}
  function headers(){return {...ghHeaders(),'Content-Type':'application/json'}}
  function bufferToBase64(buffer){let bin='',bytes=new Uint8Array(buffer);for(let i=0;i<bytes.length;i+=32768)bin+=String.fromCharCode.apply(null,bytes.subarray(i,i+32768));return btoa(bin)}
  function canvasBlob(canvas){return new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.86))}
  async function imageBlob(file,ratio){return new Promise((resolve,reject)=>{const img=new Image(),url=URL.createObjectURL(file);img.onload=async()=>{const s=1000,c=document.createElement('canvas'),ctx=c.getContext('2d'),sourceRatio=img.width/img.height;let sx=0,sy=0,sw=img.width,sh=img.height;if(ratio){if(sourceRatio>ratio){sw=img.height*ratio;sx=(img.width-sw)/2}else{sh=img.width/ratio;sy=(img.height-sh)/2}}else{const side=Math.min(img.width,img.height);sx=(img.width-side)/2;sy=(img.height-side)/2;sw=side;sh=side}c.width=s;c.height=ratio?Math.round(s/ratio):s;ctx.drawImage(img,sx,sy,sw,sh,0,0,c.width,c.height);URL.revokeObjectURL(url);resolve(await canvasBlob(c))};img.onerror=()=>reject(new Error('Bild konnte nicht gelesen werden.'));img.src=url})}
  async function uploadImage(file,repoPath,ratio){const c=cfg(),blob=await imageBlob(file,ratio),content=bufferToBase64(await blob.arrayBuffer()),api=repoPath.split('/').map(encodeURIComponent).join('/'),url='https://api.github.com/repos/'+encodeURIComponent(c.owner)+'/'+encodeURIComponent(c.repo)+'/contents/'+api;const res=await fetch(url,{method:'PUT',headers:headers(),body:JSON.stringify({message:'Upload release media '+repoPath,content,branch:c.branch})});const out=await res.json().catch(()=>({}));if(!res.ok)throw new Error(out.message||('Upload fehlgeschlagen '+res.status));return '/'+repoPath.replace(/^public\//,'')}
  function dropzone(id,title,subtitle,onFile){const z=document.createElement('div');z.id=id;z.className='media-dropzone';z.innerHTML='<strong>'+title+'</strong><span>'+subtitle+'</span><div class="media-upload-status"></div><input class="hidden" type="file" accept="image/*">';const input=z.querySelector('input'),st=z.querySelector('.media-upload-status');z.onclick=()=>input.click();input.onchange=e=>{const f=e.target.files&&e.target.files[0];if(f)onFile(f,st);e.target.value=''};['dragenter','dragover'].forEach(evt=>z.addEventListener(evt,e=>{e.preventDefault();z.classList.add('dragover')}));['dragleave','drop'].forEach(evt=>z.addEventListener(evt,e=>{e.preventDefault();z.classList.remove('dragover')}));z.addEventListener('drop',e=>{const f=e.dataTransfer.files&&e.dataTransfer.files[0];if(f)onFile(f,st)});return z}
  function mediaStatus(el,msg,type){if(!el)return;el.textContent=msg;el.className='media-upload-status '+(type||'warn')}
  function installReleaseCoverDrop(){const slot=$('wfCoverDrop');if(!slot)return;slot.innerHTML='';slot.appendChild(dropzone('wfCoverDropzone','Release-Cover hier ablegen','Wird nach GitHub hochgeladen und diesem Release zugeordnet.',async(file,st)=>{try{mediaStatus(st,'Lade Cover nach GitHub...','warn');readDetail();const r=selectedResident(),rel=selectedRelease();const path='public/residents/media/'+residentFolder(r)+'/releases/'+uniqueName((rel.title||'release')+'-cover');const url=await uploadImage(file,path,1);rel.coverUrl=url;if($('wfCoverPreview'))$('wfCoverPreview').src=url;markDirty();mediaStatus(st,'Hochgeladen: '+url,'ok')}catch(err){mediaStatus(st,err.message,'err')}}))}
  function installTrackThumbnailDrops(){const rel=selectedRelease();if(!rel)return;normalizeTracks(rel);rel.trackDetails.forEach((t,i)=>{const slot=$('wfTrackThumbDrop'+i);if(!slot)return;slot.innerHTML='';slot.appendChild(dropzone('wfTrackThumbDropzone'+i,'Track-Thumbnail','Nach GitHub hochladen.',async(file,st)=>{try{mediaStatus(st,'Lade Thumbnail...','warn');readDetail();const r=selectedResident(),rel=selectedRelease();normalizeTracks(rel);const track=rel.trackDetails[i];const path='public/residents/media/'+residentFolder(r)+'/tracks/'+uniqueName((rel.title||'release')+'-'+(track.title||'track')+'-thumb');const url=await uploadImage(file,path,1);track.thumbnailUrl=url;rel.trackThumbnails[i]=url;if($('wfTrackThumbPreview'+i))$('wfTrackThumbPreview'+i).src=url;markDirty();mediaStatus(st,'Hochgeladen: '+url,'ok')}catch(err){mediaStatus(st,err.message,'err')}}))})}
  onReady(()=>{const oldSetView=setView;window.setView=setView=function(v){oldSetView(v);renderSidebarArtists();if(v==='releases')setTimeout(renderWorkflow,0)};window.renderReleases=renderReleases=renderWorkflow;renderSidebarArtists();renderWorkflow()})
})();
