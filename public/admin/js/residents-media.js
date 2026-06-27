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
    if(!path||!path.startsWith('public/residents/media/'))return{skipped:true};
    const owner=$('ghOwner')?.value?.trim(),repo=$('ghRepo')?.value?.trim(),branch=$('ghBranch')?.value?.trim();
    if(!owner||!repo||!branch)throw new Error('GitHub Owner/Repo/Branch fehlen in Einstellungen.');
    const apiPath=path.split('/').map(encodeURIComponent).join('/');
    const base='https://api.github.com/repos/'+encodeURIComponent(owner)+'/'+encodeURIComponent(repo)+'/contents/'+apiPath;
    const metaRes=await fetch(base+'?ref='+encodeURIComponent(branch)+'&t='+Date.now(),{headers:ghHeaders(),cache:'no-store'});
    if(metaRes.status===404)return{missing:true};
    const meta=await metaRes.json().catch(()=>({}));
    if(!metaRes.ok)throw new Error(meta.message||'GitHub-Datei konnte nicht geprüft werden.');
    const delRes=await fetch(base,{method:'DELETE',headers:{...ghHeaders(),'Content-Type':'application/json'},body:JSON.stringify({message:'Delete resident media '+path,sha:meta.sha,branch})});
    const out=await delRes.json().catch(()=>({}));
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
  function injectMediaUi(){
    const panel=$('resident-tab-media');
    if(!panel || $('residentPhotosList')) return;
    const wrap=document.createElement('div');
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
  }
  function wirePhotos(){
    document.querySelectorAll('[data-photo-url]').forEach(el=>{el.oninput=()=>{const r=currentResident();if(!r)return;normalizePhotos(r)[Number(el.dataset.photoUrl)].url=el.value;markDirty();};});
    document.querySelectorAll('[data-photo-remove]').forEach(btn=>{btn.onclick=async()=>{const r=currentResident();if(!r)return;const index=Number(btn.dataset.photoRemove);const list=normalizePhotos(r);const url=list[index]?.url||'';if(!confirm('Foto wirklich aus GitHub löschen?'))return;setStatus('residentStatus','Lösche Foto aus GitHub...','warn');try{await deleteMediaFileFromGithub(url);list.splice(index,1);markDirty();renderResidentMedia();setStatus('residentStatus','Foto gelöscht. Residents speichern, damit die JSON-Liste aktualisiert wird.','ok')}catch(err){setStatus('residentStatus',err.message,'err')}};});
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
