/* Residents photos and embeds editor extension for Admin v2. */
(function(){
  function onReady(fn){
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn);
    else fn();
  }
  function assetUrl(value){
    const url=String(value||'');
    if(!url)return url;
    const previews=window.__adminLocalMediaPreviews;
    if(previews&&previews.has(url))return previews.get(url);
    if(/^(https?:|data:|blob:)/.test(url))return url;
    if(url.startsWith('public/residents/')){
      const publicUrl='/residents/'+url.split('public/residents/')[1];
      if(previews&&previews.has(publicUrl))return previews.get(publicUrl);
      if(location.pathname.includes('/public/')){
        const prefix=location.pathname.slice(0,location.pathname.indexOf('/public/'))+'/public';
        return prefix+publicUrl;
      }
      return '../'+url.replace(/^public\//,'');
    }
    if(url.startsWith('/residents/')&&location.pathname.includes('/public/')){
      const prefix=location.pathname.slice(0,location.pathname.indexOf('/public/'))+'/public';
      const resolved=prefix+url;
      if(previews&&previews.has(resolved))return previews.get(resolved);
      return resolved;
    }
    return url;
  }
  function repoPathFromPublicUrl(value){
    const raw=String(value||'').trim();
    if(!raw||raw.startsWith('blob:')||raw.startsWith('data:'))return'';
    if(raw.startsWith('public/'))return raw;
    const marker='/residents/';
    const index=raw.indexOf(marker);
    if(index>=0)return'public'+raw.slice(index);
    return raw.replace(/^\/+/, '');
  }
  async function deleteMediaFileFromGithub(publicUrl){
    const path=repoPathFromPublicUrl(publicUrl);
    if(!path||!path.startsWith('public/residents/media/'))return{skipped:true,path};
    const owner=$('ghOwner')?.value?.trim(),repo=$('ghRepo')?.value?.trim(),branch=$('ghBranch')?.value?.trim();
    if(!owner||!repo||!branch)throw new Error('GitHub Owner/Repo/Branch fehlen in Einstellungen.');
    const apiPath=path.split('/').map(encodeURIComponent).join('/');
    const base='https://api.github.com/repos/'+encodeURIComponent(owner)+'/'+encodeURIComponent(repo)+'/contents/'+apiPath;
    const metaRes=await fetch(base+'?ref='+encodeURIComponent(branch)+'&t='+Date.now(),{headers:ghHeaders(),cache:'no-store'});
    if(metaRes.status===404)return{missing:true,path};
    const meta=await metaRes.json().catch(()=>({}));
    if(!metaRes.ok)throw new Error(meta.message||'GitHub-Datei konnte nicht geprüft werden.');
    const delRes=await fetch(base,{method:'DELETE',headers:{...ghHeaders(),'Content-Type':'application/json'},body:JSON.stringify({message:'Delete resident media '+path,sha:meta.sha,branch})});
    const out=await delRes.json().catch(()=>({}));
    if(delRes.status===404)return{missing:true,path};
    if(!delRes.ok)throw new Error(out.message||'GitHub-Datei konnte nicht gelöscht werden.');
    return{deleted:true,path};
  }
  function normalizePhotos(r){
    if(!r) return [];
    if(!Array.isArray(r.photoList)){
      if(Array.isArray(r.photos)) r.photoList=r.photos;
      else r.photoList=[];
    }
    r.photoList=r.photoList.map(p=>typeof p==='string'?{url:p}:{url:p.url||p.src||p.imageUrl||''});
    return r.photoList;
  }
  function getEmbeds(r){
    if(!r) return [];
    if(Array.isArray(r.embeds)) return r.embeds;
    if(Array.isArray(r.mediaEmbeds)){r.embeds=r.mediaEmbeds;return r.embeds;}
    if(typeof r.embeds==='string') r.embeds=String(r.embeds).split(/\n+/).map(x=>x.trim()).filter(Boolean);
    else r.embeds=[];
    return r.embeds;
  }
  function residentFolder(r){
    const helper=window.AdminGithubMedia;
    const source=r?.id||r?.name||'resident';
    return helper&&helper.slugText?helper.slugText(source):String(source).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'resident';
  }
  function hideLegacyMediaShell(){
    const panel=$('resident-tab-media');
    if(!panel)return;
    panel.querySelectorAll('.notice').forEach(el=>{
      if(String(el.textContent||'').includes('werden hier aber noch nicht bearbeitet'))el.style.display='none';
    });
    ['resImage','resPresskit'].forEach(id=>{
      const field=$(id)?.closest('.field');
      if(field)field.classList.add('media-hidden-url');
    });
  }
  function placeExistingDropzones(){
    const presskit=$('residentPresskitGithubDrop');
    const presskitSlot=$('residentPresskitSlot');
    if(presskit&&presskitSlot&&presskit.parentElement!==presskitSlot)presskitSlot.appendChild(presskit);
    const photos=$('residentPhotosGithubDrop');
    const photosSlot=$('residentPhotosDropSlot');
    if(photos&&photosSlot&&photos.parentElement!==photosSlot)photosSlot.appendChild(photos);
  }
  function installUploadDropzones(){
    const helper=window.AdminGithubMedia;
    const panel=$('resident-tab-media');
    if(!helper||!panel)return;
    helper.hideFieldFor?.('resImage');
    helper.hideFieldFor?.('resPresskit');
    const oldPortrait=$('residentPortraitGithubDrop');
    if(oldPortrait)oldPortrait.remove();

    if(!$('residentPresskitGithubDrop')){
      const zone=helper.makeDropzone('residentPresskitGithubDrop','Presskit hier ablegen','PDF oder ZIP wird nach GitHub hochgeladen und als Pfad gespeichert.',async(file,st)=>{
        try{
          helper.status(st,'Lade Presskit nach GitHub...','warn');
          readResidentForm();
          const r=currentResident();
          if(!r)throw new Error('Kein Resident ausgewählt.');
          const ext=helper.fileExt(file,'zip');
          const path='public/residents/media/'+residentFolder(r)+'/presskit/'+helper.uniqueName('presskit',ext);
          const url=await helper.uploadRawFile(file,path);
          helper.setFieldValue('resPresskit',url);
          readResidentForm();
          markDirty();
          helper.status(st,'Hochgeladen: '+url,'ok');
        }catch(err){helper.status(st,err.message,'err')}
      },'.pdf,.zip,application/pdf,application/zip,application/x-zip-compressed');
      const slot=$('residentPresskitSlot');
      if(slot)slot.appendChild(zone);
      else panel.appendChild(zone);
    }

    if(!$('residentPhotosGithubDrop')){
      const zone=helper.makeDropzone('residentPhotosGithubDrop','Bild hier ablegen','Wird nach GitHub hochgeladen und der Fotoliste hinzugefügt.',async(file,st)=>{
        const local=helper.localFilePreview(file);
        try{
          helper.status(st,'Lade Foto nach GitHub...','warn');
          readResidentForm();
          const r=currentResident();
          if(!r)throw new Error('Kein Resident ausgewählt.');
          const path='public/residents/media/'+residentFolder(r)+'/photos/'+helper.uniqueName('photo');
          const url=await helper.uploadImage(file,path,16/9,1600,900);
          helper.rememberPreview(url,local);
          normalizePhotos(r).push({url});
          markDirty();
          renderResidentMedia();
          const imgs=document.querySelectorAll('#residentPhotosList img,.resident-photo-card img');
          if(imgs.length)imgs[imgs.length-1].src=local;
          helper.status(st,'Hochgeladen: '+url+' · lokale Vorschau aktiv','ok');
        }catch(err){helper.status(st,err.message,'err')}
      },'image/*');
      const slot=$('residentPhotosDropSlot'),list=$('residentPhotosList');
      if(slot)slot.appendChild(zone);
      else if(list)list.before(zone);
      else panel.appendChild(zone);
    }
    const add=$('addResidentPhotoUrlBtn');
    if(add)add.classList.add('media-hidden-url');
    const upload=$('uploadResidentPhotoBtn');
    if(upload)upload.classList.add('media-hidden-url');
    document.querySelectorAll('[data-photo-url]').forEach(el=>el.classList.add('media-hidden-url'));
    placeExistingDropzones();
  }
  function refreshUploadDropzones(){
    installUploadDropzones();
    placeExistingDropzones();
  }
  function injectMediaUi(){
    const panel=$('resident-tab-media');
    if(!panel) return;
    hideLegacyMediaShell();
    if(!$('residentPhotosList')){
      const wrap=document.createElement('div');
      wrap.id='residentMediaEditor';
      wrap.innerHTML='<section class="media-section" id="residentPresskitBlock"><h3 class="media-section-title">Presskit</h3><p class="media-section-note">PDF oder ZIP per Drag & Drop hochladen. Im JSON steht nur der Pfad.</p><div id="residentPresskitSlot"></div></section><section class="media-section" id="residentPhotosBlock"><h3 class="media-section-title">Slide-Bilder</h3><p class="media-section-note">Mehrere 16:9-Bilder für die Resident-Seite.</p><div class="tools media-hidden-url"><button class="tool" id="addResidentPhotoUrlBtn">+ Foto-URL</button><button class="tool" id="uploadResidentPhotoBtn">Foto hochladen</button><input id="residentPhotoFile" type="file" accept="image/*" class="hidden"></div><div id="residentPhotosDropSlot"></div><div id="residentPhotosList" class="resident-photo-grid"></div></section><section class="media-section" id="residentEmbedsBlock"><h3 class="media-section-title">Media Embeds</h3><p class="media-section-note">Ein Embed oder Link pro Zeile.</p><div class="field full"><textarea class="input resident-embeds-textarea" id="residentEmbedsTextarea" placeholder="SoundCloud / YouTube / Bandcamp Embed oder URL"></textarea></div></section>';
      panel.appendChild(wrap);
      const add=$('addResidentPhotoUrlBtn');
      if(add)add.onclick=()=>{const r=currentResident();if(!r)return;normalizePhotos(r).push({url:''});markDirty();renderResidentMedia();};
      const upload=$('uploadResidentPhotoBtn');
      if(upload)upload.onclick=()=>$('residentPhotoFile').click();
      const file=$('residentPhotoFile');
      if(file)file.onchange=handleResidentPhotoUpload;
      $('residentEmbedsTextarea').addEventListener('input',()=>{readResidentMedia();markDirty();});
    }
    refreshUploadDropzones();
  }
  function renderResidentMedia(){
    injectMediaUi();
    const r=currentResident();
    const listEl=$('residentPhotosList');
    const embedsEl=$('residentEmbedsTextarea');
    if(!listEl || !embedsEl) return;
    if(!r){listEl.innerHTML='<p class="muted">Kein Resident ausgewählt.</p>';embedsEl.value='';return;}
    const photos=normalizePhotos(r);
    embedsEl.value=getEmbeds(r).join('\n');
    listEl.innerHTML=photos.map((p,i)=>'<div class="resident-photo-card"><img src="'+esc(assetUrl(p.url||''))+'" alt=""><textarea class="input media-hidden-url" data-photo-url="'+i+'">'+esc(p.url||'')+'</textarea><div class="tools" style="margin-top:10px"><button class="tool" data-photo-move="'+i+':-1">←</button><button class="tool" data-photo-move="'+i+':1">→</button><button class="tool danger" data-photo-remove="'+i+'">Löschen</button></div></div>').join('')||'<p class="muted">Noch keine Fotos.</p>';
    wirePhotos();
    refreshUploadDropzones();
  }
  function wirePhotos(){
    document.querySelectorAll('[data-photo-url]').forEach(el=>{el.oninput=()=>{const r=currentResident();if(!r)return;normalizePhotos(r)[Number(el.dataset.photoUrl)].url=el.value;markDirty();};});
    document.querySelectorAll('[data-photo-remove]').forEach(btn=>{btn.onclick=async()=>{const r=currentResident();if(!r)return;const index=Number(btn.dataset.photoRemove);const list=normalizePhotos(r);const url=list[index]?.url||'';if(!confirm('Foto aus der Liste entfernen? Falls eine Repo-Datei existiert, wird sie zusätzlich gelöscht.'))return;setStatus('residentStatus','Entferne Foto...','warn');try{const result=await deleteMediaFileFromGithub(url);list.splice(index,1);markDirty();renderResidentMedia();const detail=result.deleted?'Datei aus GitHub gelöscht.':result.missing?'Repo-Datei fehlte bereits.':result.skipped?'Kein löschbarer Repo-Pfad erkannt.':'';setStatus('residentStatus','Foto aus der Liste entfernt. '+detail+' Residents speichern, damit die JSON-Liste aktualisiert wird.','ok')}catch(err){setStatus('residentStatus',err.message,'err')}};});
    document.querySelectorAll('[data-photo-move]').forEach(btn=>{btn.onclick=()=>{const r=currentResident();if(!r)return;const parts=btn.dataset.photoMove.split(':').map(Number);const from=parts[0],to=from+parts[1],list=normalizePhotos(r);if(to<0||to>=list.length)return;const item=list.splice(from,1)[0];list.splice(to,0,item);markDirty();renderResidentMedia();};});
  }
  function readResidentMedia(){
    const r=currentResident();
    if(!r) return;
    const photos=normalizePhotos(r);
    document.querySelectorAll('[data-photo-url]').forEach(el=>{if(photos[Number(el.dataset.photoUrl)]) photos[Number(el.dataset.photoUrl)].url=el.value;});
    if($('residentEmbedsTextarea')) r.embeds=$('residentEmbedsTextarea').value.split(/\n+/).map(x=>x.trim()).filter(Boolean);
  }
  function handleResidentPhotoUpload(e){
    const file=e.target.files?.[0];
    if(!file||!currentResident()) return;
    cropResidentPhoto(file).then(dataUrl=>{
      normalizePhotos(currentResident()).push({url:dataUrl});
      markDirty();
      renderResidentMedia();
      setStatus('residentStatus','Foto eingefügt. Speichern nicht vergessen.','ok');
      e.target.value='';
    }).catch(err=>setStatus('residentStatus',err.message,'err'));
  }
  function cropResidentPhoto(file){
    return new Promise((resolve,reject)=>{
      const img=new Image(),url=URL.createObjectURL(file);
      img.onload=()=>{const tw=1280,th=720,ratio=16/9,sr=img.width/img.height;let sx=0,sy=0,sw=img.width,sh=img.height;if(sr>ratio){sw=img.height*ratio;sx=(img.width-sw)/2}else{sh=img.width/ratio;sy=(img.height-sh)/2}const c=document.createElement('canvas');c.width=tw;c.height=th;c.getContext('2d').drawImage(img,sx,sy,sw,sh,0,0,tw,th);URL.revokeObjectURL(url);resolve(c.toDataURL('image/jpeg',0.84));};
      img.onerror=()=>reject(new Error('Foto konnte nicht gelesen werden.'));
      img.src=url;
    });
  }
  onReady(()=>{
    injectMediaUi();
    document.addEventListener('admin-github-media-ready',refreshUploadDropzones);
    const originalEnsureResidents=ensureResidents;
    window.ensureResidents=ensureResidents=function(){originalEnsureResidents();(residents().residents||[]).forEach(r=>{normalizePhotos(r);getEmbeds(r);});};
    const originalRenderResidentForm=renderResidentForm;
    window.renderResidentForm=renderResidentForm=function(){originalRenderResidentForm();renderResidentMedia();};
    const originalReadResidentForm=readResidentForm;
    window.readResidentForm=readResidentForm=function(){originalReadResidentForm();readResidentMedia();};
    ensureResidents();
    renderResidentMedia();
  });
})();