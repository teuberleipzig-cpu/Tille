(function(root){
  'use strict';

  const COLUMNS=['date','title','color','moreUrl','imageUrl','description','section_label','section_genre','artist_name','artist_info','artist_link','event_id'];
  const REQUIRED=['date','title'];
  const COLOR_MAP={orange:'orange',olive:'olive',yellow:'yellow','saturday rave':'orange','friday club':'olive',special:'yellow'};
  let pending=null;

  function clean(value){return String(value==null?'':value).trim()}
  function globalValue(name){
    try{if(typeof root.eval==='function'){const value=root.eval(name);if(value!=null)return value}}catch(error){}
    return root[name];
  }
  function adminDependencies(){return{events:globalValue('events'),ensureEvents:globalValue('ensureEvents'),markDirty:globalValue('markDirty'),renderAll:globalValue('renderAll'),state:globalValue('state')}}
  function eventKey(row){return clean(row.event_id)?'id:'+clean(row.event_id).toLowerCase():'date-title:'+clean(row.date).toLowerCase()+'\u0000'+clean(row.title).toLowerCase()}
  function detectDelimiter(text){
    const candidates=[',',';','\t'];let best={delimiter:',',count:-1};
    candidates.forEach(delimiter=>{let count=0,quoted=false;for(let i=0;i<text.length;i++){const ch=text[i];if(ch==='"'){if(quoted&&text[i+1]==='"')i++;else quoted=!quoted}else if(!quoted&&ch===delimiter)count++;else if(!quoted&&(ch==='\n'||ch==='\r'))break}if(count>best.count)best={delimiter,count}});
    return best.delimiter;
  }
  function parseCsv(text){
    text=String(text||'').replace(/^\uFEFF/,'');const delimiter=detectDelimiter(text);const records=[];let fields=[],field='',quoted=false,line=1,rowLine=1;
    for(let i=0;i<text.length;i++){
      const ch=text[i];
      if(quoted){if(ch==='"'){if(text[i+1]==='"'){field+='"';i++}else quoted=false}else{field+=ch;if(ch==='\n')line++}continue}
      if(ch==='"'&&field===''){quoted=true;continue}
      if(ch===delimiter){fields.push(field);field='';continue}
      if(ch==='\n'||ch==='\r'){
        if(ch==='\r'&&text[i+1]==='\n')i++;fields.push(field);if(fields.some(value=>clean(value)!==''))records.push({line:rowLine,fields});fields=[];field='';line++;rowLine=line;continue
      }
      field+=ch;
    }
    if(quoted)throw new Error('Nicht geschlossenes Anführungszeichen ab Zeile '+rowLine+'.');
    fields.push(field);if(fields.some(value=>clean(value)!==''))records.push({line:rowLine,fields});
    return {delimiter,records};
  }
  function normalizeColor(value,warnings,line){const key=clean(value).toLowerCase();if(!key){warnings.push({line,message:'Farbe fehlt; orange wird verwendet.'});return'orange'}if(!COLOR_MAP[key])return null;return COLOR_MAP[key]}
  function blockedUrl(value){return /^(data|blob):/i.test(clean(value))}
  function validateCsv(text,existingEvents){
    const errors=[],warnings=[];let parsed;
    try{parsed=parseCsv(text)}catch(error){return{delimiter:null,errors:[{line:0,message:error.message}],warnings,events:[],duplicates:[]}}
    if(!parsed.records.length)return{delimiter:parsed.delimiter,errors:[{line:0,message:'Die CSV ist leer.'}],warnings,events:[],duplicates:[]};
    const headers=parsed.records[0].fields.map((value,index)=>clean(value)||(index===0?'':('_leer_'+index)));const headerSet=new Set(headers);
    REQUIRED.forEach(name=>{if(!headerSet.has(name))errors.push({line:parsed.records[0].line,message:'Pflichtspalte fehlt: '+name})});
    headers.filter(name=>name&&!COLUMNS.includes(name)&&!name.startsWith('_leer_')).forEach(name=>warnings.push({line:parsed.records[0].line,message:'Unbekannte Spalte wird ignoriert: '+name}));
    const grouped=new Map();
    parsed.records.slice(1).forEach(record=>{
      const row={};headers.forEach((name,index)=>{if(COLUMNS.includes(name))row[name]=record.fields[index]||''});
      REQUIRED.forEach(name=>{if(!clean(row[name]))errors.push({line:record.line,message:name+' ist Pflicht.'})});
      ['moreUrl','imageUrl','artist_link'].forEach(name=>{if(blockedUrl(row[name]))errors.push({line:record.line,message:name+' darf keine data:- oder blob:-URL sein.'})});
      const color=normalizeColor(row.color,warnings,record.line);if(!color)errors.push({line:record.line,message:'Ungültige Farbe: '+clean(row.color)});
      const key=eventKey(row);let entry=grouped.get(key);
      if(!entry){entry={line:record.line,event:{id:clean(row.event_id),date:clean(row.date),title:clean(row.title),color:color||'orange',moreUrl:clean(row.moreUrl)||'#',imageUrl:clean(row.imageUrl),description:String(row.description||''),sections:[]}};grouped.set(key,entry)}
      else if(entry.event.date!==clean(row.date)||entry.event.title!==clean(row.title))errors.push({line:record.line,message:'event_id wird für unterschiedliche Events verwendet.'});
      const label=clean(row.section_label),genre=clean(row.section_genre),artist=clean(row.artist_name);
      if(label||genre||artist){let section=entry.event.sections.find(item=>item.label===label&&item.genre===genre);if(!section){section={label,genre,items:[]};entry.event.sections.push(section)}if(artist)section.items.push({name:artist,info:clean(row.artist_info),link:clean(row.artist_link)});else if(clean(row.artist_info)||clean(row.artist_link))warnings.push({line:record.line,message:'Artist-Info/Link ohne artist_name wird ignoriert.'})}
    });
    const existing=Array.isArray(existingEvents)?existingEvents:[];const existingIds=new Set(existing.map(item=>clean(item.id).toLowerCase()).filter(Boolean));const existingPairs=new Set(existing.map(item=>clean(item.date).toLowerCase()+'\u0000'+clean(item.title).toLowerCase()));const events=[],duplicates=[];
    grouped.forEach(entry=>{const item=entry.event;if(!item.id)item.id=slugValue(item.date+' '+item.title);const duplicate=(item.id&&existingIds.has(item.id.toLowerCase()))||existingPairs.has(item.date.toLowerCase()+'\u0000'+item.title.toLowerCase());if(duplicate){duplicates.push({line:entry.line,event:item});warnings.push({line:entry.line,message:'Bereits vorhandenes Event wird übersprungen: '+item.date+' '+item.title})}else events.push(item)});
    return{delimiter:parsed.delimiter,errors,warnings,events,duplicates};
  }
  function slugValue(value){if(typeof root.slug==='function')return root.slug(value);return clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'event'}
  function escapeHtml(value){return String(value==null?'':value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
  function delimiterName(value){return value==='\t'?'Tab':value===';'?'Semikolon':'Komma'}
  function renderResult(result){
    const summary=document.getElementById('csvImportSummary'),issues=document.getElementById('csvImportIssues'),preview=document.getElementById('csvImportPreview'),button=document.getElementById('csvImportApply');
    summary.textContent=`${result.events.length} neue Events · ${result.duplicates.length} Duplikate übersprungen · ${result.errors.length} Fehler · Trennzeichen: ${delimiterName(result.delimiter)}`;
    const all=result.errors.map(x=>({...x,type:'Fehler'})).concat(result.warnings.map(x=>({...x,type:'Warnung'})));issues.innerHTML=all.length?'<ul>'+all.map(x=>`<li class="${x.type==='Fehler'?'csv-error':'csv-warning'}"><b>${x.type}${x.line?' in Zeile '+x.line:''}:</b> ${escapeHtml(x.message)}</li>`).join('')+'</ul>':'<p class="status ok">Keine Fehler oder Warnungen.</p>';
    const rows=result.events.map(x=>`<tr><td>${escapeHtml(x.date)}</td><td>${escapeHtml(x.title)}</td><td>${escapeHtml(x.color)}</td><td>${x.sections.length}</td><td>Neu</td></tr>`).concat(result.duplicates.map(x=>`<tr class="csv-skipped"><td>${escapeHtml(x.event.date)}</td><td>${escapeHtml(x.event.title)}</td><td>${escapeHtml(x.event.color)}</td><td>${x.event.sections.length}</td><td>Übersprungen</td></tr>`));
    preview.innerHTML=rows.length?'<div class="csv-table-wrap"><table><thead><tr><th>Datum</th><th>Titel</th><th>Farbe</th><th>Sections</th><th>Status</th></tr></thead><tbody>'+rows.join('')+'</tbody></table></div>':'<p class="muted">Keine importierbaren Events.</p>';
    button.disabled=!!result.errors.length||!result.events.length;
  }
  function check(){const text=document.getElementById('csvImportText').value;if(!text.trim()){pending=null;renderResult({delimiter:',',errors:[{line:0,message:'Bitte eine CSV-Datei wählen oder CSV-Text einfügen.'}],warnings:[],events:[],duplicates:[]});return}const deps=adminDependencies();if(typeof deps.events!=='function'){pending=null;renderResult({delimiter:',',errors:[{line:0,message:'Globale Admin-Funktion events() ist nicht verfügbar. Admin V2 bitte neu laden.'}],warnings:[],events:[],duplicates:[]});return}const data=deps.events();pending=validateCsv(text,data&&data.events);renderResult(pending)}
  function importIntoDraft(result,dependencies){
    throw new Error('Eventimport erfolgt aktuell über FileMaker.');
  }
  function applyImport(){
    if(!pending||pending.errors.length||!pending.events.length){document.getElementById('csvImportSummary').textContent='Kein gültiger Import vorbereitet. Zuerst CSV prüfen.';return}
    let imported;try{imported=importIntoDraft(pending,adminDependencies())}catch(error){document.getElementById('csvImportSummary').textContent='Import abgebrochen: '+error.message;return}pending=null;const setTab=globalValue('setEventTab');if(typeof setTab==='function')setTab('csv-import');document.getElementById('csvImportSummary').textContent=imported+' Events in events().events übernommen. GitHub wurde nicht beschrieben; zum Veröffentlichen den bestehenden Speichern-Button nutzen.';document.getElementById('csvImportApply').disabled=true;
  }
  function downloadExample(){const text='date;title;color;moreUrl;imageUrl;description;section_label;section_genre;artist_name;artist_info;artist_link\r\n2026-09-12;CSV Test Night;Saturday Rave;https://example.com;;;up:;House;Test Artist;Live;https://example.com/artist\r\n2026-09-12;CSV Test Night;Saturday Rave;https://example.com;;;up:;House;Second Artist;DJ Set;\r\n';const url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='events-beispiel.csv';link.click();URL.revokeObjectURL(url)}
  function install(){
    const tabs=document.querySelector('#view-events .tabs'),body=document.querySelector('#view-events .editor-body');if(!tabs||!body||document.getElementById('event-tab-csv-import'))return;
    const tab=document.createElement('button');tab.className='tab';tab.type='button';tab.dataset.eventTab='csv-import';tab.textContent='CSV-Import';tab.onclick=()=>{if(typeof root.setEventTab==='function')root.setEventTab('csv-import')};tabs.appendChild(tab);
    const panel=document.createElement('div');panel.id='event-tab-csv-import';panel.className='event-tab-panel hidden csv-import';panel.innerHTML='<div class="notice"><b>Events aus CSV in den Entwurf übernehmen</b><br>UTF-8 verwenden. Der Import speichert nicht auf GitHub; veröffentlicht wird erst mit dem bestehenden Speichern-Button.</div><div class="csv-actions"><button class="btn" type="button" id="csvImportExample">Beispiel-CSV herunterladen</button></div><div class="field"><label class="label" for="csvImportFile">CSV-Datei</label><input class="input" id="csvImportFile" type="file" accept=".csv,text/csv"></div><div class="field"><label class="label" for="csvImportText">Oder CSV einfügen</label><textarea class="textarea csv-text" id="csvImportText" placeholder="date;title;color;..."></textarea></div><div class="csv-actions"><button class="btn" type="button" id="csvImportCheck">CSV prüfen</button><button class="btn primary" type="button" id="csvImportApply" disabled>Import in Entwurf übernehmen</button></div><p id="csvImportSummary" class="status muted" aria-live="polite">Noch keine CSV geprüft.</p><div id="csvImportIssues" class="csv-issues" aria-live="polite"></div><div id="csvImportPreview"><p class="muted">Die Vorschau erscheint nach der Prüfung.</p></div>';
    body.appendChild(panel);['csvImportExample','csvImportFile','csvImportText','csvImportCheck','csvImportApply'].forEach(id=>{const el=document.getElementById(id);if(el){el.disabled=true;el.setAttribute('aria-disabled','true')}});document.getElementById('csvImportSummary').textContent='Eventimport erfolgt aktuell über FileMaker.';document.getElementById('csvImportIssues').innerHTML='<p class="status warn">CSV-Import ist im Event-Image-only-Modus deaktiviert.</p>';
  }

  const api={detectDelimiter,parseCsv,validateCsv,importIntoDraft};root.AdminEventsCsvImport=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;if(typeof document!=='undefined')install();
})(typeof window!=='undefined'?window:globalThis);
