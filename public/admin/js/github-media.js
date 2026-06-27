/* GitHub-backed media helper functions for Admin v2.
   Scope: generic upload/dropzone utilities only. No feature-specific rendering. */
(function(){
  window.__adminLocalMediaPreviews = window.__adminLocalMediaPreviews || new Map();

  function slugText(value){
    return String(value||'media')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-z0-9]+/g,'-')
      .replace(/^-|-$/g,'')||'media';
  }
  function status(el,msg,type){
    if(!el)return;
    el.textContent=msg;
    el.className='media-upload-status '+(type||'warn');
  }
  function settings(){
    const owner=$('ghOwner')?.value?.trim();
    const repo=$('ghRepo')?.value?.trim();
    const branch=$('ghBranch')?.value?.trim();
    const token=$('ghToken')?.value?.trim();
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
  function arrayBufferToBase64(buffer){
    let bin='';
    const bytes=new Uint8Array(buffer);
    for(let i=0;i<bytes.length;i+=32768)bin+=String.fromCharCode.apply(null,bytes.subarray(i,i+32768));
    return btoa(bin);
  }
  function blobToBase64(blob){return blob.arrayBuffer().then(arrayBufferToBase64)}
  function headers(){return {...ghHeaders(),'Content-Type':'application/json'}}
  function publicPathFromRepoPath(path){return path}
  function uniqueName(prefix,ext){return slugText(prefix)+'-'+Date.now()+'.'+(ext||'jpg')}
  function fileExt(file,fallback){
    const name=String(file?.name||'');
    const m=name.match(/\.([a-z0-9]+)$/i);
    return (m?m[1].toLowerCase():fallback||'bin').replace(/[^a-z0-9]/g,'')||fallback||'bin';
  }
  function canvasToBlob(canvas){return new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.86))}
  function prepareImage(file,ratio,width,height){
    return new Promise((resolve,reject)=>{
      const img=new Image();
      const url=URL.createObjectURL(file);
      img.onload=async()=>{
        const targetW=width||1600;
        const targetH=height||Math.round(targetW/(ratio||16/9));
        const sourceRatio=img.width/img.height;
        let sx=0,sy=0,sw=img.width,sh=img.height;
        if(ratio){
          if(sourceRatio>ratio){sw=img.height*ratio;sx=(img.width-sw)/2}
          else{sh=img.width/ratio;sy=(img.height-sh)/2}
        }
        const canvas=document.createElement('canvas');
        canvas.width=targetW;
        canvas.height=targetH;
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
    let zone=$(id);
    if(zone)return zone;
    zone=document.createElement('div');
    zone.id=id;
    zone.className='media-dropzone';
    zone.innerHTML='<strong>'+title+'</strong><span>'+subtitle+'</span><div class="media-upload-status"></div>';
    const input=document.createElement('input');
    input.type='file';
    input.accept=accept||'image/*';
    input.className='hidden';
    zone.appendChild(input);
    zone.onclick=()=>input.click();
    input.onchange=e=>{
      const file=e.target.files&&e.target.files[0];
      if(file)onFile(file,zone.querySelector('.media-upload-status'));
      e.target.value='';
    };
    ['dragenter','dragover'].forEach(evt=>zone.addEventListener(evt,e=>{e.preventDefault();zone.classList.add('dragover')}));
    ['dragleave','drop'].forEach(evt=>zone.addEventListener(evt,e=>{e.preventDefault();zone.classList.remove('dragover')}));
    zone.addEventListener('drop',e=>{
      const file=e.dataTransfer.files&&e.dataTransfer.files[0];
      if(file)onFile(file,zone.querySelector('.media-upload-status'));
    });
    return zone;
  }
  function hideFieldFor(id){
    const el=$(id);
    if(!el)return;
    const field=el.closest('.field')||el.parentElement;
    if(field)field.classList.add('media-hidden-url');
  }
  function setFieldValue(id,value){
    const el=$(id);
    if(!el)return;
    el.value=value;
    el.dispatchEvent(new Event('input',{bubbles:true}));
  }

  window.AdminGithubMedia={
    slugText,
    status,
    rememberPreview,
    localFilePreview,
    uniqueName,
    fileExt,
    makeDropzone,
    hideFieldFor,
    setFieldValue,
    uploadImage,
    uploadRawFile,
    uploadBlobToGithub
  };
  document.dispatchEvent(new Event('admin-github-media-ready'));
})();
