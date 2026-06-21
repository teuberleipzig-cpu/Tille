/* Converts normal text inputs in editor areas to textareas, auto-resizes them, and preserves spaces. */
(function(){
  function onReady(fn){
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn);
    else fn();
  }
  function isLinkField(el){
    if(!el) return false;
    const id=String(el.id||'');
    if(el.dataset && Object.prototype.hasOwnProperty.call(el.dataset,'artistLink')) return true;
    const exactIds=new Set([
      'evMoreUrl','evImageUrl','artistLink',
      'resInstagram','resSoundcloud','resRA','resDiscogs','resBandcamp','resBooking','resPresskit',
      'rCover','rDiscogs','rBeatport','rBandcamp','rLabelUrl'
    ]);
    if(exactIds.has(id)) return true;
    return /Url$|URL$|Link$/.test(id);
  }
  function raw(id){return $(id)?.value??''}
  function url(id){return String($(id)?.value??'').trim()}
  function shouldConvert(input){
    if(!input || input.tagName!=='INPUT') return false;
    if(input.dataset.keepInput==='1' || input.dataset.textareaConverted==='1') return false;
    const type=(input.getAttribute('type')||'text').toLowerCase();
    if(!['text','url','email','search'].includes(type)) return false;
    if(input.closest('.search')) return false;
    if(input.closest('#view-settings')) return false;
    if(input.closest('.topbar')) return false;
    if(input.id==='globalSearch') return false;
    if(input.id==='ghToken') return false;
    return !!input.closest('.editor') || !!input.closest('.section-card') || !!input.closest('#view-artists') || !!input.closest('#view-residents') || !!input.closest('#view-releases');
  }
  function autoResize(el){
    if(!el || el.classList.contains('media-hidden-url')) return;
    if(isLinkField(el) || el.classList.contains('link-textarea')){
      if(isLinkField(el)) el.classList.add('link-textarea');
      el.style.height='44px';
      return;
    }
    el.classList.remove('link-textarea');
    el.style.height='44px';
    el.style.height=Math.max(44,el.scrollHeight)+'px';
  }
  function cloneAttrs(from,to){
    Array.from(from.attributes).forEach(attr=>{
      if(attr.name==='type' || attr.name==='value') return;
      to.setAttribute(attr.name,attr.value);
    });
  }
  function safeSplit(value){return String(value||'').split(',').map(x=>x.trim()).filter(Boolean)}
  function safeReadEventForm(){
    const e=currentEvent();if(!e)return;
    e.date=$('evDate').value;
    e.title=raw('evTitle');
    e.color=$('evColor').value;
    e.moreUrl=url('evMoreUrl')||'#';
    e.imageUrl=url('evImageUrl');
    e.description=raw('evDescription');
    e.id=e.id||slug((e.date||'')+' '+((e.title||'').trim()||'event'));
    document.querySelectorAll('[data-section-label]').forEach(i=>{const si=Number(i.dataset.sectionLabel);if(e.sections[si])e.sections[si].label=i.value});
    document.querySelectorAll('[data-section-genre]').forEach(i=>{const si=Number(i.dataset.sectionGenre);if(e.sections[si])e.sections[si].genre=i.value});
    document.querySelectorAll('[data-artist-name]').forEach(i=>{const[si,ai]=i.dataset.artistName.split(':').map(Number);if(e.sections[si]?.items?.[ai])e.sections[si].items[ai].name=i.value});
    document.querySelectorAll('[data-artist-info]').forEach(i=>{const[si,ai]=i.dataset.artistInfo.split(':').map(Number);if(e.sections[si]?.items?.[ai])e.sections[si].items[ai].info=i.value});
    document.querySelectorAll('[data-artist-link]').forEach(i=>{const[si,ai]=i.dataset.artistLink.split(':').map(Number);if(e.sections[si]?.items?.[ai])e.sections[si].items[ai].link=i.value.trim()});
  }
  function safeReadResidentForm(){
    const r=currentResident();if(!r)return;
    r.name=raw('resName');
    r.city=raw('resCity');
    r.genre=raw('resGenre');
    r.labels=safeSplit(raw('resLabels'));
    r.relatedProjects=safeSplit(raw('resRelated'));
    setR(r,['bio','description','text','about'],raw('resBio'));
    setR(r,['instagramUrl','instagram','instagramLink'],url('resInstagram'));
    setR(r,['soundcloudUrl','soundcloud','soundcloudLink'],url('resSoundcloud'));
    setR(r,['raUrl','residentAdvisorUrl','ra','residentAdvisor'],url('resRA'));
    setR(r,['discogsUrl','discogs'],url('resDiscogs'));
    setR(r,['bandcampUrl','bandcamp'],url('resBandcamp'));
    setR(r,['bookingEmail','booking','email'],url('resBooking'));
    setR(r,['imageUrl','image','photo','portrait'],url('resImage'));
    setR(r,['presskitUrl','presskit','pressKitUrl'],url('resPresskit'));
    r.id=r.id||slug((r.name||'resident').trim()||'resident');
  }
  function safeReadArtistForm(){
    const a=currentArtist();
    if(a){a.name=raw('artistName');a.info=raw('artistInfo');a.link=url('artistLink')}
  }
  function installSafeReaders(){
    window.readEventForm=readEventForm=safeReadEventForm;
    window.readResidentForm=readResidentForm=safeReadResidentForm;
    window.readArtistForm=readArtistForm=safeReadArtistForm;
  }
  function bindConvertedTextarea(textarea){
    if(!textarea) return;
    if(isLinkField(textarea)) textarea.classList.add('link-textarea');
    else textarea.classList.remove('link-textarea');
    if(textarea.dataset.autoTextareaBound!=='1'){
      textarea.dataset.autoTextareaBound='1';
      textarea.addEventListener('keydown',e=>{
        if(e.key===' ' || e.key==='Enter') e.stopPropagation();
      });
      textarea.addEventListener('input',()=>{
        autoResize(textarea);
        try{
          if(textarea.closest('#view-events')){
            readEventForm();markDirty();updateEditorHeader();renderEventList();renderPreview();renderEventsJson();
          }else if(textarea.closest('#view-artists')){
            readArtistForm();markDirty();renderArtists();
          }else if(textarea.closest('#view-residents')){
            readResidentForm();markDirty();renderResidentList();renderStats();
          }else if(textarea.closest('#view-releases')){
            markDirty();
          }else{
            markDirty();
          }
        }catch(e){console.warn('Textarea update failed',e);}
      });
    }
    requestAnimationFrame(()=>autoResize(textarea));
  }
  function convertInput(input){
    if(!shouldConvert(input)) return null;
    const textarea=document.createElement('textarea');
    cloneAttrs(input,textarea);
    textarea.value=input.value||'';
    textarea.dataset.textareaConverted='1';
    textarea.className=(input.className||'input')+' auto-textarea';
    if(isLinkField(input)) textarea.classList.add('link-textarea');
    input.replaceWith(textarea);
    bindConvertedTextarea(textarea);
    return textarea;
  }
  function bindExistingTextareas(){
    document.querySelectorAll('#view-events textarea,#view-artists textarea,#view-residents textarea,#view-releases textarea,.editor textarea').forEach(bindConvertedTextarea);
  }
  function convertAllTextInputs(){
    installSafeReaders();
    document.querySelectorAll('input.input').forEach(convertInput);
    bindExistingTextareas();
  }
  onReady(()=>{
    installSafeReaders();
    convertAllTextInputs();
    const originalRenderAll=renderAll;
    window.renderAll=renderAll=function(){installSafeReaders();originalRenderAll();convertAllTextInputs();};
    const originalRenderEventForm=renderEventForm;
    window.renderEventForm=renderEventForm=function(){installSafeReaders();originalRenderEventForm();convertAllTextInputs();};
    const originalRenderResidentForm=renderResidentForm;
    window.renderResidentForm=renderResidentForm=function(){installSafeReaders();originalRenderResidentForm();convertAllTextInputs();};
    const originalRenderArtists=renderArtists;
    window.renderArtists=renderArtists=function(){installSafeReaders();originalRenderArtists();convertAllTextInputs();};
    setInterval(()=>{installSafeReaders();bindExistingTextareas();},1000);
  });
})();
