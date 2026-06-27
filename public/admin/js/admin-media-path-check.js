/* Admin v2 media path check.
   Scope: read-only diagnostics for visible media URLs. No save calls and no GitHub writes. */
(function(){
  if(window.__adminMediaPathCheckLoaded)return;
  window.__adminMediaPathCheckLoaded=true;

  function mediaImages(){
    return Array.from(document.querySelectorAll('img[src]')).map(img=>img.src).filter(src=>src.includes('/public/residents/media/')||src.includes('/public/events/media/'));
  }
  function unique(items){return Array.from(new Set(items))}
  async function probe(url){
    try{
      const response=await fetch(url,{method:'HEAD',cache:'no-store'});
      return{url,ok:response.ok,status:response.status};
    }catch(error){
      return{url,ok:false,status:0,error:error.message};
    }
  }
  async function run(){
    const urls=unique(mediaImages());
    const results=[];
    for(const url of urls)results.push(await probe(url));
    const missing=results.filter(item=>!item.ok);
    const report={ok:missing.length===0,total:results.length,missing:missing.length,missingItems:missing,results};
    console.info('[AdminMediaPathCheck]',report);
    if(missing.length)console.table(missing);
    return report;
  }
  window.AdminV2MediaPathCheck={run};
})();
