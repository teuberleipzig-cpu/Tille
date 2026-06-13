#!/usr/bin/env python3
from pathlib import Path

PATH = Path("public/events/events-createandedit.html")
text = PATH.read_text(encoding="utf-8")

replacements = []

old_css = ".event-list{display:grid;gap:8px}"
new_css = ".event-filters{border:2px solid #000;background:#f3f3f3;padding:10px;margin:0 0 12px}.event-filters .field{margin-bottom:8px}.event-filter-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.event-filter-status{margin-top:8px;font-size:12px;font-weight:900;text-transform:uppercase}.event-list{display:grid;gap:8px}"
replacements.append((old_css, new_css, "CSS"))

old_html = '<aside class="panel"><h2>Eventliste</h2><div class="actions" style="margin:0 0 12px"><button class="primary" id="newEventBtn">Neues Event</button><button id="duplicateEventBtn">Duplizieren</button></div><div id="eventList" class="event-list"></div></aside>'
new_html = '<aside class="panel"><h2>Eventliste</h2><div class="actions" style="margin:0 0 12px"><button class="primary" id="newEventBtn">Neues Event</button><button id="duplicateEventBtn">Duplizieren</button></div><div class="event-filters"><div class="field"><label for="eventListSearch">Suche</label><input id="eventListSearch" type="search" placeholder="Titel, Artist, Beschreibung..."></div><div class="event-filter-grid"><div class="field"><label for="eventDateFrom">Von</label><input id="eventDateFrom" type="date"></div><div class="field"><label for="eventDateTo">Bis</label><input id="eventDateTo" type="date"></div></div><div class="field"><label for="eventSort">Sortierung</label><select id="eventSort"><option value="asc">Datum aufsteigend</option><option value="desc">Datum absteigend</option></select></div><button id="resetEventFiltersBtn" type="button">Filter zurücksetzen</button><div id="eventFilterStatus" class="event-filter-status"></div></div><div id="eventList" class="event-list"></div></aside>'
replacements.append((old_html, new_html, "HTML"))

old_state = "let selectedIndex=-1;"
new_state = "let selectedIndex=-1;\nlet eventListSearch='';\nlet eventListFrom='';\nlet eventListTo='';\nlet eventListSort='asc';"
replacements.append((old_state, new_state, "state"))

old_bind = "function bind(){document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>showTab(btn.dataset.tab)));$('newEventBtn').onclick=newEvent;$('duplicateEventBtn').onclick=duplicateEvent;$('addSectionBtn').onclick=addSection;$('saveEventBtn').onclick=saveEventFromForm;$('deleteEventBtn').onclick=deleteEvent;$('imageFile').onchange=handleImageFile;$('saveMetaBtn').onclick=saveMeta;$('refreshJsonBtn').onclick=renderJson;$('copyJsonBtn').onclick=copyJson;$('downloadJsonBtn').onclick=downloadJson;$('loadFromGithubBtn').onclick=loadFromGithub;$('saveToGithubBtn').onclick=saveToGithub;}"
new_bind = "function bind(){document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>showTab(btn.dataset.tab)));$('newEventBtn').onclick=newEvent;$('duplicateEventBtn').onclick=duplicateEvent;$('addSectionBtn').onclick=addSection;$('saveEventBtn').onclick=saveEventFromForm;$('deleteEventBtn').onclick=deleteEvent;$('imageFile').onchange=handleImageFile;$('saveMetaBtn').onclick=saveMeta;$('refreshJsonBtn').onclick=renderJson;$('copyJsonBtn').onclick=copyJson;$('downloadJsonBtn').onclick=downloadJson;$('loadFromGithubBtn').onclick=loadFromGithub;$('saveToGithubBtn').onclick=saveToGithub;$('eventListSearch').oninput=()=>{eventListSearch=$('eventListSearch').value;renderList();};$('eventDateFrom').onchange=()=>{eventListFrom=$('eventDateFrom').value;renderList();};$('eventDateTo').onchange=()=>{eventListTo=$('eventDateTo').value;renderList();};$('eventSort').onchange=()=>{eventListSort=$('eventSort').value;renderList();};$('resetEventFiltersBtn').onclick=()=>{eventListSearch='';eventListFrom='';eventListTo='';eventListSort='asc';$('eventListSearch').value='';$('eventDateFrom').value='';$('eventDateTo').value='';$('eventSort').value='asc';renderList();};}"
replacements.append((old_bind, new_bind, "bind"))

old_render = "function renderList(){$('eventList').innerHTML=data.events.map((event,i)=>`<button class=\"event-button ${i===selectedIndex?'active':''}\" data-i=\"${i}\"><strong>${esc(event.date||'ohne datum')} – ${esc(event.title||'Ohne Titel')}</strong><span>${esc(event.sections?.length||0)} Abschnitte · ${event.imageUrl?'Bild · ':''}${event.description?'Text · ':''}${esc(colorLabel(event.color))}</span></button>`).join('')||'<p class=\"small\">Noch keine Events.</p>';document.querySelectorAll('.event-button').forEach(btn=>btn.onclick=()=>{readFormIntoEvent();selectedIndex=Number(btn.dataset.i);saveLocal();renderAll();});}"
new_render = "function normalizeEventSearch(value){return String(value??'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLocaleLowerCase('de');}\nfunction eventSearchText(event){return normalizeEventSearch([event.date,event.title,event.description,colorLabel(event.color),...(event.sections||[]).flatMap(section=>[section.label,section.genre,...(section.items||[]).flatMap(item=>[item.name,item.info,item.link])])].join(' '));}\nfunction renderList(){const q=normalizeEventSearch(eventListSearch.trim());const visible=data.events.map((event,index)=>({event,index})).filter(({event})=>{const eventDate=String(event.date||'');if(eventListFrom&&(!eventDate||eventDate<eventListFrom))return false;if(eventListTo&&(!eventDate||eventDate>eventListTo))return false;if(q&&!eventSearchText(event).includes(q))return false;return true;}).sort((a,b)=>{const dateCompare=String(a.event.date||'').localeCompare(String(b.event.date||''));const titleCompare=String(a.event.title||'').localeCompare(String(b.event.title||''),'de');const result=dateCompare||titleCompare;return eventListSort==='desc'?-result:result;});$('eventFilterStatus').textContent=`${visible.length} von ${data.events.length} Events`;$('eventList').innerHTML=visible.map(({event,index})=>`<button class=\"event-button ${index===selectedIndex?'active':''}\" data-i=\"${index}\"><strong>${esc(event.date||'ohne datum')} – ${esc(event.title||'Ohne Titel')}</strong><span>${esc(event.sections?.length||0)} Abschnitte · ${event.imageUrl?'Bild · ':''}${event.description?'Text · ':''}${esc(colorLabel(event.color))}</span></button>`).join('')||'<p class=\"small\">Keine passenden Events gefunden.</p>';document.querySelectorAll('.event-button').forEach(btn=>btn.onclick=()=>{readFormIntoEvent();selectedIndex=Number(btn.dataset.i);saveLocal();renderAll();});}"
replacements.append((old_render, new_render, "renderList"))

for old, new, label in replacements:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, found {count}")
    text = text.replace(old, new, 1)

PATH.write_text(text, encoding="utf-8")
print("Added search, date interval filters and ascending/descending sorting to the event admin list.")
