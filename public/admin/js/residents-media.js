/* Residents photos and embeds editor extension for Admin v2. */
(function(){
  function onReady(fn){
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn);
    else fn();
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
    wrap.innerHTML='<div class="notice" style="margin-top:16px">Fotos werden als Dateien in GitHub gespeichert. Im JSON steht nur der Bildpfad. Embeds werden zeilenweise in <code>embeds</code> gespeichert.</div><div class="head" style="margin-top:18px"><div><b>Fotos</b><div class="muted">Mehrere Fotos pro Resident, 16:9 gecroppt.</div></div><div class="tools media-hidden-url"><button class="tool" id="addResidentPhotoUrlBtn">+ Foto-URL</button><button class="tool" id="uploadResidentPhotoBtn">Foto hochladen</button><input id="residentPhotoFile" type="file" accept="image/*" class="hidden"></div></div><div id="residentPhotosList" class="resident-photo-grid"></div><div class="field full" style="margin-top:18px"><label class="label">Media Embeds, ein Embed oder Link pro Zeile</label><textarea class="input resident-embeds-textarea" id="residentEmbedsTextarea" placeholder="SoundCloud / YouTube / Bandcamp Embed oder URL"></textarea></div>';
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
    listEl.innerHTML=photos.map((p,i)=>'<div class="resident-photo-card"><img src="'+esc(p.url||'')+'" alt=""><textarea class="input media-hidden-url" data-photo-url="'+i+'">'+esc(p.url||'')+'</textarea><div class="tools" style="margin-top:10px"><button class="tool" data-photo-move="'+i+':-1">←</button><button class="tool" data-photo-move="'+i+':1">→</button><button class="tool danger" data-photo-remove="'+i+'">Löschen</button></div></div>').join('')||'<p class="muted">Noch keine Fotos.</p>';
    wirePhotos();
  }
  function wirePhotos(){
    document.querySelectorAll('[data-photo-url]').forEach(el=>{el.oninput=()=>{const r=currentResident();if(!r)return;normalizePhotos(r)[Number(el.dataset.photoUrl)].url=el.value;markDirty();};});
    document.querySelectorAll('[data-photo-remove]').forEach(btn=>{btn.onclick=()=>{const r=currentResident();if(!r)return;normalizePhotos(r).splice(Number(btn.dataset.photoRemove),1);markDirty();renderResidentMedia();};});
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
