/* GitHub-backed media uploads for Admin v2.
   UI: drag/drop upload areas. JSON stores only public paths, never Data-URLs. */
(function(){
  window.__adminLocalMediaPreviews = window.__adminLocalMediaPreviews || new Map();
  function onReady(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn()}
  function slugText(value){return String(value||'media').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'media'}
  function status(el,msg,type){if(!el)return;el.textContent=msg;el.className='media-upload-status '+(type||'warn')}
  function settings(){
    const owner=$('ghOwner')?.value?.trim(),repo=$('ghRepo')?.value?.trim(),branch=$('ghBranch')?.value?.trim(),token=$('ghToken')?.value?.trim();
    if(!owner||!repo||!branch)throw new Error('GitHub Owner/Repo/Branch fehlen in Einstellungen.');
    if(!token)throw new Error('GitHub Token fehlt. Bitte in Einstellungen eintragen.');
    return{owner,repo,branch,token};
  }
  function rememberPreview(path,blobUrl){
    if(!path||!blobUrl)return;
    const map=window.__adminLocalMediaPreviews;
    map.set(path,blobUrl);
    if(path.startsWith('public/'))map.set('../'+path.replace(/^public\//,''),blobUrl);
    if(path.startsWith('public/events/'))map.set('/events/'+path.split('public/events/')[1],blobUrl);
    if(path.startsWith('public/residents/'))map.set('/residents/'+path.split('public/residents/')[1],blobUrl);
    if(location.pathname.includes('/public/')){
      const prefix=location.pathname.slice(0,location.pathname.indexOf('/public/'))+'/public/';
      map.set(prefix+path.replace(/^public\//,''),blobUrl);
    }
  }
  function localFilePreview(file){return URL.createObjectURL(file)}
  function arrayBufferToBase64(buffer){let bin='',bytes=new Uint8Array(buffer);for(let i=0;i<bytes.length;i+=32768)bin+=String.fromCharCode.apply(null,bytes.subarray(i,i+32768));return btoa(bin)}
  function blobToBase64(blob){return blob.arrayBuffer().then(arrayBufferToBase64)}
  function headers(){return {...ghHeaders(),'Content-Type':'application/json'}}
  function publicPathFromRepoPath(path){return path}
  function uniqueName(prefix,ext){return slugText(prefix)+'-'+Date.now()+'.'+(ext||'jpg')}
  function fileExt(file,fallback){const name=String(file?.name||'');const m=name.match(/\.([a-z0-9]+)$/i);return (m?m[1].toLowerCase():fallback||'bin').replace(/[^a-z0-9]/g,'')||fallback||'bin'}
  function canvasToBlob(canvas){return new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.86))}
  function prepareImage(file,ratio,width,height){
    return new Promise((resolve,reject)=>{
      const img=new Image(),url=URL.createObjectURL(file);
      img.onload=async()=>{
        const targetW=width||1600,targetH=height||Math.round(targetW/(ratio||16/9));
        const sourceRatio=img.width/img.height;
        let sx=0,sy=0,sw=img.width,sh=img.height;
        if(ratio){
          if(sourceRatio>ratio){sw=img.height*ratio;sx=(img.width-sw)/2}else{sh=img.width/ratio;sy=(img.height-sh)/2}
        }
        const canvas=document.createElement('canvas');
        canvas.width=targetW;canvas.height=targetH;
        canvas.getContext('2d').drawImage(img,sx,sy,sw,sh,0,0,targetW,targetH);
        URL.revokeObjectURL(url);
        resolve(await canvasToBlob(canvas));
      };
      img.onerror=()=>reject(new Error('Bild konnte nicht gelesen werden.'));
      img.src=url;
    });
  }
  async function uploadBlobToGithub(blob,repoPath,message){
    const cfg=settings();
    const content=await blobToBase64(blob);
    const apiPath=repoPath.split('/').map(encodeURIComponent).join('/');
    const url='https://api.github.com/repos/'+encodeURIComponent(cfg.owner)+'/'+encodeURIComponent(cfg.repo)+'/contents/'+apiPath;
    const body={message:message||('Upload media '+repoPath),content,branch:cfg.branch};
    const res=await fetch(url,{method:'PUT',headers:headers(),body:JSON.stringify(body)});
    const out=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(out.message||('Upload fehlgeschlagen '+res.status));
    return publicPathFromRepoPath(repoPath);
  }
  async function uploadImage(file,repoPath,ratio,w,h){
    const blob=await prepareImage(file,ratio,w,h);
    return uploadBlobToGithub(blob,repoPath,'Upload admin image '+repoPath);
  }
  async function uploadRawFile(file,repoPath){
    return uploadBlobToGithub(file,repoPath,'Upload admin file '+repoPath);
  }
  function makeDropzone(id,title,subtitle,onFile,accept){
    let z=$(id);
    if(z)return z;
    z=document.createElement('div');
    z.id=id;
    z.className='media-dropzone';
    z.innerHTML='<strong>'+title+'</strong><span>'+subtitle+'</span><div class="media-upload-status"></div>';
    const input=document.createElement('input');
    input.type='file';input.accept=accept||'image/*';input.className='hidden';
    z.appendChild(input);
    z.onclick=()=>input.click();
    input.onchange=e=>{const f=e.target.files&&e.target.files[0];if(f)onFile(f,z.querySelector('.media-upload-status'));e.target.value=''};
    ['dragenter','dragover'].forEach(evt=>z.addEventListener(evt,e=>{e.preventDefault();z.classList.add('dragover')}));
    ['dragleave','drop'].forEach(evt=>z.addEventListener(evt,e=>{e.preventDefault();z.classList.remove('dragover')}));
    z.addEventListener('drop',e=>{const f=e.dataTransfer.files&&e.dataTransfer.files[0];if(f)onFile(f,z.querySelector('.media-upload-status'))});
    return z;
  }
  function currentRelease(){const r=(residents().residents||[])[state.releaseResidentIndex||0];const a=r&&Array.isArray(r.releases)?r.releases:[];return a[state.releaseIndex||0]||null}
  function photosFor(r){if(!r)return[];if(!Array.isArray(r.photoList))r.photoList=Array.isArray(r.photos)?r.photos:[];r.photoList=r.photoList.map(p=>typeof p==='string'?{url:p}:p);return r.photoList}
  function residentFolder(r){return slugText(r?.id||r?.name||'resident')}
  function hideFieldFor(id){const el=$(id);if(!el)return;const field=el.closest('.field')||el.parentElement;if(field)field.classList.add('media-hidden-url')}
  function setFieldValue(id,value){const el=$(id);if(!el)return;el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}))}
  function enhanceEventImage(){
    const panel=$('event-tab-image');if(!panel||$('eventImageGithubDrop'))return;
    hideFieldFor('evImageUrl');hideFieldFor('evImageFile');
    const zone=makeDropzone('eventImageGithubDrop','Eventbild hier ablegen','Wird nach GitHub hochgeladen und als Pfad gespeichert.',async(file,st)=>{
      const local=localFilePreview(file);
      try{
        status(st,'Lade Eventbild nach GitHub...','warn');
        if($('eventImagePreview'))$('eventImagePreview').src=local;
        const previewImg=$('eventPreview')?.querySelector('img');
        if(previewImg)previewImg.src=local;
        readEventForm();
        const e=currentEvent();if(!e)throw new Error('Kein Event ausgewählt.');
        const folder=slugText((e.date||'event')+'-'+(e.title||e.id||'event'));
        const path='public/events/media/'+folder+'/'+uniqueName('event');
        const url=await uploadImage(file,path,16/9,1600,900);
        rememberPreview(url,local);
        setFieldValue('evImageUrl',url);
        readEventForm();markDirty();renderPreview();
        if($('eventImagePreview'))$('eventImagePreview').src=local;
        const nextPreviewImg=$('eventPreview')?.querySelector('img');
        if(nextPreviewImg)nextPreviewImg.src=local;
        status(st,'Hochgeladen: '+url+' · lokale Vorschau aktiv','ok');
      }catch(err){status(st,err.message,'err')}
    },'image/*');
    panel.prepend(zone);
  }
  function hideResidentPortrait(){hideFieldFor('resImage');const old=$('residentPortraitGithubDrop');if(old)old.remove()}
  function enhanceResidentPresskit(){
    const panel=$('resident-tab-media');if(!panel||$('residentPresskitGithubDrop'))return;
    hideFieldFor('resPresskit');
    const zone=makeDropzone('residentPresskitGithubDrop','Presskit hier ablegen','PDF oder ZIP wird nach GitHub hochgeladen und als Pfad gespeichert.',async(file,st)=>{
      try{status(st,'Lade Presskit nach GitHub...','warn');readResidentForm();const r=currentResident();if(!r)throw new Error('Kein Resident ausgewählt.');const ext=fileExt(file,'zip');const path='public/residents/media/'+residentFolder(r)+'/presskit/'+uniqueName('presskit',ext);const url=await uploadRawFile(file,path);setFieldValue('resPresskit',url);readResidentForm();markDirty();status(st,'Hochgeladen: '+url,'ok')}catch(err){status(st,err.message,'err')}},'.pdf,.zip,application/pdf,application/zip,application/x-zip-compressed');
    const slot=$('residentPresskitSlot');
    if(slot)slot.appendChild(zone);else panel.appendChild(zone);
  }
  function enhanceResidentPhotos(){
    const panel=$('resident-tab-media');if(!panel)return;
    const add=$('addResidentPhotoUrlBtn');if(add)add.classList.add('media-hidden-url');
    const oldUpload=$('uploadResidentPhotoBtn');if(oldUpload)oldUpload.classList.add('media-hidden-url');
    document.querySelectorAll('[data-photo-url]').forEach(el=>el.classList.add('media-hidden-url'));
    if($('residentPhotosGithubDrop'))return;
    const slot=$('residentPhotosDropSlot'),list=$('residentPhotosList');
    const zone=makeDropzone('residentPhotosGithubDrop','Bild hier ablegen','Wird nach GitHub hochgeladen und der Fotoliste hinzugefügt.',async(file,st)=>{
      const local=localFilePreview(file);
      try{
        status(st,'Lade Foto nach GitHub...','warn');
        readResidentForm();const r=currentResident();if(!r)throw new Error('Kein Resident ausgewählt.');
        const path='public/residents/media/'+residentFolder(r)+'/photos/'+uniqueName('photo');
        const url=await uploadImage(file,path,16/9,1600,900);
        rememberPreview(url,local);
        photosFor(r).push({url});
        markDirty();renderResidentForm();
        const imgs=document.querySelectorAll('#residentPhotosList img,.resident-photo-card img');
        if(imgs.length)imgs[imgs.length-1].src=local;
        status(st,'Hochgeladen: '+url+' · lokale Vorschau aktiv','ok');
      }catch(err){status(st,err.message,'err')}
    },'image/*');
    if(slot)slot.appendChild(zone);else if(list)list.before(zone);else panel.appendChild(zone);
  }
  function enhanceReleaseCover(){
    const field=$('rCover');if(!field)return;
    hideFieldFor('rCover');
    if(!$('releaseCoverGithubDrop')){
      const zone=makeDropzone('releaseCoverGithubDrop','Release-Thumbnail / Cover hier ablegen','Wird nach GitHub hochgeladen und als Cover-Pfad gespeichert.',async(file,st)=>{
        const local=localFilePreview(file);
        try{status(st,'Lade Cover nach GitHub...','warn');const r=(residents().residents||[])[state.releaseResidentIndex||0],rel=currentRelease();if(!r||!rel)throw new Error('Kein Release ausgewählt.');const name=slugText(rel.title||'release');const path='public/residents/media/'+residentFolder(r)+'/releases/'+uniqueName(name+'-cover');const url=await uploadImage(file,path,1,1000,1000);rememberPreview(url,local);rel.coverUrl=url;setFieldValue('rCover',url);markDirty();if(window.renderReleases)window.renderReleases();document.querySelectorAll('img').forEach(img=>{if((img.getAttribute('src')||'')===url)img.src=local});status(st,'Hochgeladen: '+url+' · lokale Vorschau aktiv','ok')}catch(err){status(st,err.message,'err')}},'image/*');
      const tools=$('relCoverTools');
      if(tools)tools.before(zone);else field.after(zone);
    }
    const oldUpload=$('relCoverUploadBtn');if(oldUpload)oldUpload.classList.add('media-hidden-url');
  }
  function enhanceAllMediaUploads(){enhanceEventImage();hideResidentPortrait();enhanceResidentPresskit();enhanceResidentPhotos();enhanceReleaseCover()}
  onReady(()=>{setInterval(enhanceAllMediaUploads,700);enhanceAllMediaUploads()});
})();
