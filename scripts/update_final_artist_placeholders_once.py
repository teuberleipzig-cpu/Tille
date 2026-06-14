#!/usr/bin/env python3
import json,re,unicodedata
from collections import Counter
from pathlib import Path

EVENTS=Path('public/events/data/events.json')
REPORT=Path('reports/final_artist_placeholder_update_report.txt')
RAW='''2D1G|Metro, Leipzig
50PHIE|G-Edit, remoto rec.
a:technuk|Leipzig
abs8lute|Vénus Club
Adrija|apostrophé, Leipzig
Aender|KOSMOS, Leipzig
AgainstMe|Berlin
AGY3NA|Leipzig
Aio|Stil vor Talent
Aivee|Leipzig
Akua|Brooklyn / Berlin
Alexa Fluor|Another Records
Anna Hjalmarsson|Frankfurt
Annie O|KitKatClub, Berlin
apøllo|apostrophé, Leipzig
ASEC|Berlin
Axoon|quartal, Sektor Evolution
BAUGRUPPE90|Berlin
beccslyn|Leipzig
Ben Derris|Berlin
Bephål|Leipzig
Berny|In Dark We Trust, geisha prive
Biesmans|Berlin
Bonjour Ben|Rostock
Budino|Berlin
Claudio PRC|Berlin
Colin Benders|Utrecht
CRAVO|HAYES, KLOCKWORKS, SK11, ANAØH, Lisboa
DELIKAT|alsob sounds , Leipzig
Delirante|Leipzig
DiscoDaisy|Berlin
DJ Annita|Leipzig
DJ Balduin|Leipzig
DJ Fairytail|Leipzig
DJ Ferrari|Leipzig
DJ G1NA R.|Leipzig
DJ IBON|Copenhagen
Multifun|Berlin
Nat Wendell|Depth Of My Soul, Berlin
Nicolas Lutz|My Own Jupiter
V:SONNTAG|focus, Leipzig
XDB|Göttingen'''

def norm(v):
    v=re.sub(r'\s*\([^()]*\)\s*$','',str(v or '').strip())
    v=unicodedata.normalize('NFKD',v.casefold())
    v=''.join(c for c in v if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9]+','',v)

pairs=[line.split('|',1) for line in RAW.splitlines() if line.strip()]
mapping={norm(name):(name,info) for name,info in pairs}
data=json.loads(EVENTS.read_text(encoding='utf-8'))
matched=Counter(); changed=Counter(); correct=Counter(); variants={k:set() for k in mapping}
cleared=Counter()
for event in data.get('events',[]):
    for section in event.get('sections') or []:
        for artist in section.get('items') or []:
            name=str(artist.get('name','')).strip(); key=norm(name)
            if key in mapping:
                target=mapping[key][1]; matched[key]+=1; variants[key].add(name)
                if str(artist.get('info','')).strip()==target: correct[key]+=1
                else: artist['info']=target; changed[key]+=1
for event in data.get('events',[]):
    for section in event.get('sections') or []:
        for artist in section.get('items') or []:
            if str(artist.get('info','')).strip()=='...':
                cleared[str(artist.get('name','')).strip()]+=1; artist['info']=''
EVENTS.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
unmatched=[k for k in mapping if not matched[k]]
lines=[f'SUPPLIED_ARTISTS={len(mapping)}',f'MATCHED_ARTISTS={len(mapping)-len(unmatched)}',f'UNMATCHED_ARTISTS={len(unmatched)}',f'MATCHED_EVENT_ENTRIES={sum(matched.values())}',f'CHANGED_EVENT_ENTRIES={sum(changed.values())}',f'ALREADY_CORRECT_ENTRIES={sum(correct.values())}',f'REMOVED_PLACEHOLDER_ENTRIES={sum(cleared.values())}',f'REMOVED_PLACEHOLDER_ARTISTS={len(cleared)}','', '=== UPDATED VALUES ===']
for k in sorted(mapping,key=lambda x:mapping[x][0].casefold()):
    n,i=mapping[k]; vv=', '.join(sorted(variants[k],key=str.casefold)) or 'NOT FOUND'; lines.append(f'{n} ({i}) | entries={matched[k]} | changed={changed[k]} | variants={vv}')
lines+=['','=== REMOVED REMAINING PLACEHOLDERS ===']
for n,c in sorted(cleared.items(),key=lambda x:x[0].casefold()): lines.append(f'{n} | entries={c}')
REPORT.parent.mkdir(parents=True,exist_ok=True); REPORT.write_text('\n'.join(lines)+'\n',encoding='utf-8')
print('\n'.join(lines[:8]))
