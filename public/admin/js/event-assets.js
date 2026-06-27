/* Event asset path normalization for Admin v2.
   Scope: display-only URL resolving in the Admin UI. JSON values are not rewritten. */
(function(){
  if(window.__adminEventAssetsLoaded){
    if(typeof window.fixAdminEventImagePaths==='function')window.fixAdminEventImagePaths();
    return;
  }
  window.__adminEventAssetsLoaded=true;

  function adminPublicPrefix(){
    const path=location.pathname;
    const idx=path.indexOf('/public/');
    return idx>=0?path.slice(0,idx)+'/public':'';
  }
  function eventAssetUrl(value){
    const raw=String(value||'').trim();
    if(!raw)return raw;
    const previews=window.__adminLocalMediaPreviews;
    if(previews&&previews.has(raw))return previews.get(raw);
    if(/^(https?:|data:|blob:)/.test(raw))return raw;
    if(raw.startsWith('public/events/')){
      const publicUrl='/events/'+raw.split('public/events/')[1];
      if(previews&&previews.has(publicUrl))return previews.get(publicUrl);
      const prefix=adminPublicPrefix();
      return prefix?prefix+publicUrl:'../'+raw.replace(/^public\//,'');
    }
    if(raw.startsWith('/events/')){
      const prefix=adminPublicPrefix();
      return prefix?prefix+raw:raw;
    }
    if(raw.startsWith('events/'))return '../'+raw;
    return raw;
  }
  function looksWrongAdminEventsUrl(src){
    return String(src||'').includes('/public/admin/public/events/');
  }
  function repairWrongAbsoluteUrl(src){
    const raw=String(src||'');
    const marker='/public/admin/public/events/';
    const idx=raw.indexOf(marker);
    if(idx<0)return raw;
    const prefix=raw.slice(0,idx)+'/public/events/';
    return prefix+raw.slice(idx+marker.length);
  }
  function fixImage(img){
    if(!img)return;
    const attr=img.getAttribute('src')||'';
    if(attr.startsWith('public/events/')||attr.startsWith('/events/')||attr.startsWith('events/')){
      img.src=eventAssetUrl(attr);
      return;
    }
    if(looksWrongAdminEventsUrl(img.src))img.src=repairWrongAbsoluteUrl(img.src);
  }
  function fixAdminEventImagePaths(){
    fixImage(document.getElementById('eventImagePreview'));
    document.querySelectorAll('#eventPreview img,img[data-event-image]').forEach(fixImage);
  }
  function wrapRenderer(name){
    if(window['__adminEventAssetsWrapped_'+name])return;
    if(typeof window[name]!=='function')return;
    window['__adminEventAssetsWrapped_'+name]=true;
    const original=window[name];
    window[name]=function(){
      const result=original.apply(this,arguments);
      fixAdminEventImagePaths();
      return result;
    };
  }
  window.eventAdminAssetUrl=eventAssetUrl;
  window.fixAdminEventImagePaths=fixAdminEventImagePaths;
  function install(){
    wrapRenderer('renderEventForm');
    wrapRenderer('updateEditorHeader');
    wrapRenderer('renderPreview');
    fixAdminEventImagePaths();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);
  else install();
})();
