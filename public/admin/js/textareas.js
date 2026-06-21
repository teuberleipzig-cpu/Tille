/* Converts normal text inputs in editor areas to textareas and auto-resizes all textareas from one line. */
(function(){
  function onReady(fn){
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn);
    else fn();
  }
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
    el.style.height='44px';
    el.style.height=Math.max(44,el.scrollHeight)+'px';
  }
  function cloneAttrs(from,to){
    Array.from(from.attributes).forEach(attr=>{
      if(attr.name==='type' || attr.name==='value') return;
      to.setAttribute(attr.name,attr.value);
    });
  }
  function bindConvertedTextarea(textarea){
    if(!textarea) return;
    if(textarea.dataset.autoTextareaBound!=='1'){
      textarea.dataset.autoTextareaBound='1';
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
    input.replaceWith(textarea);
    bindConvertedTextarea(textarea);
    return textarea;
  }
  function bindExistingTextareas(){
    document.querySelectorAll('#view-events textarea,#view-artists textarea,#view-residents textarea,#view-releases textarea,.editor textarea').forEach(bindConvertedTextarea);
  }
  function convertAllTextInputs(){
    document.querySelectorAll('input.input').forEach(convertInput);
    bindExistingTextareas();
  }
  onReady(()=>{
    convertAllTextInputs();
    const originalRenderAll=renderAll;
    window.renderAll=renderAll=function(){originalRenderAll();convertAllTextInputs();};
    const originalRenderEventForm=renderEventForm;
    window.renderEventForm=renderEventForm=function(){originalRenderEventForm();convertAllTextInputs();};
    const originalRenderResidentForm=renderResidentForm;
    window.renderResidentForm=renderResidentForm=function(){originalRenderResidentForm();convertAllTextInputs();};
    const originalRenderArtists=renderArtists;
    window.renderArtists=renderArtists=function(){originalRenderArtists();convertAllTextInputs();};
    setInterval(bindExistingTextareas,1000);
  });
})();
