/* Residents news editor extension for Admin v2. Scope: Resident News tab only. */
(function(){
  if(window.__adminResidentsNewsModuleLoaded){
    if(typeof window.renderResidentNews==='function')window.renderResidentNews();
    return;
  }
  window.__adminResidentsNewsModuleLoaded=true;
  function onReady(fn){
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn);
    else fn();
  }
  function today(){return new Date().toISOString().slice(0,10)}
  function normalizeNews(r){
    if(!r) return [];
    if(!Array.isArray(r.newsItems)){
      if(Array.isArray(r.news)) r.newsItems=r.news;
      else r.newsItems=[];
    }
    r.newsItems=r.newsItems.map(n=>typeof n==='string'?{date:'',text:n}:{date:n.date||'',text:n.text||''});
    return r.newsItems;
  }
  function sortNews(r){
    return normalizeNews(r).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||String(a.text||'').localeCompare(String(b.text||''),'de'));
  }
  function injectResidentsNewsUi(){
    const tabs=document.querySelector('#view-residents .tabs');
    const linksPanel=$('resident-tab-links');
    if(!tabs||!linksPanel) return;
    if(!document.querySelector('[data-resident-tab="news"]')){
      const btn=document.createElement('button');
      btn.className='tab';
      btn.dataset.residentTab='news';
      btn.textContent='News';
      btn.onclick=()=>setResidentTab('news');
      const media=document.querySelector('[data-resident-tab="media"]');
      tabs.insertBefore(btn,media||null);
    }
    if(!$('resident-tab-news')){
      const panel=document.createElement('div');
      panel.id='resident-tab-news';
      panel.className='resident-tab-panel hidden';
      panel.innerHTML='<div class="head"><div><b>News</b><div class="muted">News-Einträge pro Resident.</div></div><div class="tools"><button class="tool" id="addResidentNewsBtn">+ News</button><button class="tool" id="sortResidentNewsBtn">Nach Datum sortieren</button></div></div><div id="residentNewsList" class="section-list"></div>';
      linksPanel.after(panel);
    }
    const add=$('addResidentNewsBtn');
    if(add&&add.dataset.bound!=='1'){
      add.dataset.bound='1';
      add.onclick=()=>{
        readResidentForm();
        const r=currentResident();
        if(!r) return;
        normalizeNews(r).unshift({date:today(),text:''});
        markDirty();
        renderResidentForm();
        setResidentTab('news');
      };
    }
    const sort=$('sortResidentNewsBtn');
    if(sort&&sort.dataset.bound!=='1'){
      sort.dataset.bound='1';
      sort.onclick=()=>{
        const r=currentResident();
        if(!r) return;
        sortNews(r);
        markDirty();
        renderResidentNews();
        setStatus('residentStatus','News nach Datum sortiert. Noch nicht veröffentlicht.','ok');
      };
    }
  }
  function renderResidentNews(){
    injectResidentsNewsUi();
    const box=$('residentNewsList');
    if(!box) return;
    const r=currentResident();
    if(!r){box.innerHTML='<p class="muted">Kein Resident ausgewählt.</p>';return;}
    const list=normalizeNews(r);
    if(!list.length){box.innerHTML='<p class="muted">Noch keine News für diesen Resident.</p>';return;}
    box.innerHTML=list.map((n,i)=>'<div class="section-card resident-news-card"><div class="section-body"><div class="form-grid"><div class="field"><label class="label">Datum</label><input class="input" type="date" data-news-date="'+i+'" value="'+esc(n.date||'')+'"></div><div class="field"><label class="label">Aktionen</label><div class="tools"><button class="tool" data-news-move="'+i+':-1">↑</button><button class="tool" data-news-move="'+i+':1">↓</button><button class="tool danger" data-news-remove="'+i+'">Löschen</button></div></div><div class="field full"><label class="label">Text</label><textarea class="textarea" data-news-text="'+i+'">'+esc(n.text||'')+'</textarea></div></div></div></div>').join('');
    wireResidentNews();
  }
  function wireResidentNews(){
    document.querySelectorAll('[data-news-date]').forEach(el=>{el.oninput=()=>{const r=currentResident();if(!r)return;normalizeNews(r)[Number(el.dataset.newsDate)].date=el.value;markDirty();};});
    document.querySelectorAll('[data-news-text]').forEach(el=>{el.oninput=()=>{const r=currentResident();if(!r)return;normalizeNews(r)[Number(el.dataset.newsText)].text=el.value;markDirty();};});
    document.querySelectorAll('[data-news-remove]').forEach(btn=>{btn.onclick=()=>{const r=currentResident();if(!r)return;normalizeNews(r).splice(Number(btn.dataset.newsRemove),1);markDirty();renderResidentNews();};});
    document.querySelectorAll('[data-news-move]').forEach(btn=>{btn.onclick=()=>{const r=currentResident();if(!r)return;const parts=btn.dataset.newsMove.split(':').map(Number);const from=parts[0],to=from+parts[1],list=normalizeNews(r);if(to<0||to>=list.length)return;const item=list.splice(from,1)[0];list.splice(to,0,item);markDirty();renderResidentNews();};});
  }
  function readResidentNews(){
    const r=currentResident();
    if(!r) return;
    const list=normalizeNews(r);
    document.querySelectorAll('[data-news-date]').forEach(el=>{if(list[Number(el.dataset.newsDate)]) list[Number(el.dataset.newsDate)].date=el.value;});
    document.querySelectorAll('[data-news-text]').forEach(el=>{if(list[Number(el.dataset.newsText)]) list[Number(el.dataset.newsText)].text=el.value;});
    sortNews(r);
  }
  window.renderResidentNews=renderResidentNews;
  window.readResidentNews=readResidentNews;
  onReady(()=>{
    injectResidentsNewsUi();
    if(!window.__adminResidentsNewsEnsureWrapped){
      window.__adminResidentsNewsEnsureWrapped=true;
      const originalEnsureResidents=ensureResidents;
      window.ensureResidents=ensureResidents=function(){originalEnsureResidents();(residents().residents||[]).forEach(normalizeNews);};
    }
    if(!window.__adminResidentsNewsRenderWrapped){
      window.__adminResidentsNewsRenderWrapped=true;
      const originalRenderResidentForm=renderResidentForm;
      window.renderResidentForm=renderResidentForm=function(){injectResidentsNewsUi();originalRenderResidentForm();renderResidentNews();};
    }
    if(!window.__adminResidentsNewsReadWrapped){
      window.__adminResidentsNewsReadWrapped=true;
      const originalReadResidentForm=readResidentForm;
      window.readResidentForm=readResidentForm=function(){originalReadResidentForm();readResidentNews();};
    }
    ensureResidents();
    renderResidentNews();
  });
})();