/* Converts normal text inputs in editor areas to textareas so line breaks and blank lines work consistently. */
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
    return !!input.closest('.editor') || !!input.closest('.section-card') || !!input.closest('#view-artists') || !!input.closest('#view-residents');
  }
  function cloneAttrs(from,to){
    Array.from(from.attributes).forEach(attr=>{
      if(attr.name==='type' || attr.name==='value') return;
      to.setAttribute(attr.name,attr.value);
    });
  }
  function convertInput(input){
    if(!shouldConvert(input)) return null;
    const textarea=document.createElement('textarea');
    cloneAttrs(input,textarea);
    textarea.value=input.value||'';
    textarea.dataset.textareaConverted='1';
    textarea.className=(input.className||'input')+' auto-textarea';
    if(input.id && /bio|description|embeds|presskit|image|url|link/i.test(input.id)) textarea.classList.add('medium');
    input.replaceWith(textarea);
    textarea.dispatchEvent(new Event('input',{bubbles:true}));
    return textarea;
  }
  function convertAllTextInputs(){
    document.querySelectorAll('input.input').forEach(convertInput);
  }
  onReady(()=>{
    convertAllTextInputs();
    const originalRenderAll=renderAll;
    window.renderAll=renderAll=function(){
      originalRenderAll();
      convertAllTextInputs();
    };
    const originalRenderEventForm=renderEventForm;
    window.renderEventForm=renderEventForm=function(){
      originalRenderEventForm();
      convertAllTextInputs();
    };
    const originalRenderResidentForm=renderResidentForm;
    window.renderResidentForm=renderResidentForm=function(){
      originalRenderResidentForm();
      convertAllTextInputs();
    };
    const originalRenderArtists=renderArtists;
    window.renderArtists=renderArtists=function(){
      originalRenderArtists();
      convertAllTextInputs();
    };
  });
})();
