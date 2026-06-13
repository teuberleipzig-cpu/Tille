#!/usr/bin/env python3
import csv
import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

EVENTS_PATH = Path("public/events/data/events.json")
TXT_PATH = Path("reports/updated_placeholder_artist_list.txt")
CSV_PATH = Path("reports/updated_placeholder_artist_sources.csv")
CUTOFF_DATE = "2025-01-01"

# Klammerangaben, die der Nutzer in seiner Liste bereits ergänzt hat.
USER_INFO = {
    "0dimensional": ("0-Dimensional", "Distillery, Leipzig"),
    "abu": ("A.B.U.", "Hamburg"),
    "ama": ("Ama", "UK"),
    "andreaseckhardt": ("Andreas Eckhardt", "Distillery, Leipzig"),
    "barbarapreisinger": ("Barbara Preisinger", "Slice of Life, Berlin"),
    "bennet": ("Bennet", "DE"),
    "bigalke": ("BIGALKE", "Distillery, Leipzig"),
    "borisdavy": ("Boris & Davy", "Creme Club, Leipzig"),
    "bunnytsukino": ("Bunny Tsukino", "Hotshot, Leipzig"),
    "butschi": ("Butschi", "Leipzig"),
    "bzzhound": ("BZZHOUND", "Madrid"),
    "cafgar": ("Cafgar", "Leipzig"),
    "caiva": ("CAIVA", "Femme Frequency"),
    "campa": ("CAMPA", "Leider9, Leipzig"),
    "cargo": ("CARGO", "Berlin"),
    "carinaposse": ("Carina Posse", "Muna, Leipzig"),
    "carlobonanza": ("Carlo Bonanza", "AROMA+, Leipzig"),
    "carlottajacobi": ("Carlotta Jacobi", "Leipzig"),
    "carotin": ("Carotin", "Dresden"),
    "catjes": ("catjes", "Hypress, Leipzig"),
    "ch4r20tte": ("ch4r20tte", "propperpullposse, Leipzig"),
    "chami": ("Chami", "Berlin"),
    "charleenherzig": ("Charleen Herzig", "Berlin"),
    "chloe": ("Chloé", "Paris"),
    "chrisliebing": ("Chris Liebing", "clr.net, FFM"),
    "chrismanura": ("Chris Manura", "Distillery, Leipzig"),
    "chrisschwarzwalder": ("Chris Schwarzwälder", "Katermukke, Laut & Luise, Heinz Music, URSL"),
    "cinthie": ("Cinthie", "Beste Modus, Watergate, Berlin"),
    "cargo": ("CARGO", "Berlin"),
    "cuepric": ("Cuepric", "Bass Focu"),
    "cyan85": ("Cyan85", "Curtis Electronix"),
    "cynthiamatisse": ("Cynthia Matisse", "Weimar"),
    "damonjee": ("Damon Jee", "Dischi Autunno, Correspondant, Critical Monday"),
    "danielstefanik": ("Daniel Stefanik", "Distillery, Leipzig"),
    "deniserabe": ("Denise Rabe", "Stroboscopic Artefacts"),
    "djdustin": ("DJ Dustin", "Giegling"),
    "djhdgdl": ("DJ HDGDL", "Stolen Money, Leipzig"),
    "djstimula": ("DJ STIMULA", "Leipzig"),
    "filburt": ("Filburt", "Leipzig"),
    "grandmalheur": ("grandmalheur", "Leipzig"),
    "hanniephi": ("Hannie Phi", "Berlin"),
    "hock": ("HOCK", "DE"),
    "ia": ("I$A", "Leipzig"),
    "kichererbsenstampf": ("kichererbsenstampf", "Leipzig"),
    "kleinschmageraudio": ("Kleinschmager Audio", "Leipzig"),
    "laurix": ("LAURIX", "DE"),
    "lenaxx": ("lena xx", "Leipzig"),
    "lia": ("LIA", "Berlin"),
    "lulunell": ("Lulu & Nell", "Creme Club, Leipzig"),
    "lydiaeisenblatter": ("Lydia Eisenblätter", "Leipzig"),
    "manon": ("Manon", "Robert Johnson, Offenbach"),
    "mathiasache": ("Mathias Ache", "Leipzig"),
    "mathiaskaden": ("Mathias Kaden", "Paracou"),
    "medha": ("Medha", "Leipzig"),
    "mpulle": ("mp.ulle", "METRO, Leipzig"),
    "mule": ("muLe", "Leipzig"),
    "naomi": ("Naomi", "Berlin"),
    "napoleondynamite": ("Napoleon Dynamite", "Fäncy, Leipzig"),
    "neele": ("Neele", "Leipzig"),
    "nicipalm": ("NICI PALM", "Distillery, Leipzig"),
    "obi": ("O.B.I.", "DE"),
    "oliv": ("OLIV", "Leipzig"),
    "sam": ("SAM", "Leipzig"),
    "sventasnadi": ("Sven Tasnadi", "Leipzig"),
    "templeton": ("Templeton", "Hypress, Leipzig"),
    "timstagram": ("Timstagram", "Keinkollektiv, Leipzig"),
    "vanta": ("Vanta", "DE"),
    "zacharias": ("Zacharias", "Leipzig"),
    "zischko": ("Zischko", "Leipzig"),
    "zisko": ("Zisko", "Leipzig"),
}


def strip_trailing_parenthetical(value: str) -> str:
    text = str(value or "").strip()
    return re.sub(r"\s*\([^()]*)\)\s*$", "", text).strip()


def strip_numeric_disambiguator(value: str) -> str:
    text = str(value or "").strip()
    return re.sub(r"\s*\(\d+\)\s*$", "", text).strip()


def normalize_name(value: str) -> str:
    text = strip_trailing_parenthetical(value)
    text = unicodedata.normalize("NFKD", text.casefold())
    text = "".join(char for char in text if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9]+", "", text)


def meaningful_info(value: str) -> bool:
    info = str(value or "").strip()
    return bool(info) and info != "..."


data = json.loads(EVENTS_PATH.read_text(encoding="utf-8"))

# Alle aktuell noch offenen Platzhalter-Acts sammeln.
placeholder_names = defaultdict(list)
for event in data.get("events", []):
    for section in event.get("sections") or []:
        for artist in section.get("items") or []:
            if str(artist.get("info", "")).strip() != "...":
                continue
            raw_name = str(artist.get("name", "")).strip()
            if not raw_name:
                continue
            placeholder_names[normalize_name(raw_name)].append(raw_name)

# Für jeden Namen die jüngste Info aus einer Veranstaltung vor 2025 suchen.
latest_old_info = {}
for event in data.get("events", []):
    event_date = str(event.get("date", ""))
    if not event_date or event_date >= CUTOFF_DATE:
        continue
    for section in event.get("sections") or []:
        for artist in section.get("items") or []:
            info = str(artist.get("info", "")).strip()
            if not meaningful_info(info):
                continue
            raw_name = str(artist.get("name", "")).strip()
            key = normalize_name(raw_name)
            if not key:
                continue
            previous = latest_old_info.get(key)
            if previous is None or event_date > previous[0]:
                latest_old_info[key] = (
                    event_date,
                    info,
                    str(event.get("title", "")).strip(),
                    raw_name,
                )

with_bracket = []
without_bracket = []
source_rows = []

for key, variants in placeholder_names.items():
    # Bevorzugt die Schreibweise ohne numerische RA-Disambiguierung.
    raw_name = sorted(variants, key=lambda value: ("(" in value, value.casefold()))[0]
    display_name = strip_numeric_disambiguator(raw_name)

    if key in USER_INFO:
        desired_name, info = USER_INFO[key]
        line = f"{desired_name} ({info})"
        with_bracket.append(line)
        source_rows.append({
            "artist": desired_name,
            "info": info,
            "source": "user_list",
            "source_date": "",
            "source_event": "",
        })
        continue

    old = latest_old_info.get(key)
    if old:
        source_date, info, source_event, source_artist_name = old
        line = f"{display_name} ({info})"
        with_bracket.append(line)
        source_rows.append({
            "artist": display_name,
            "info": info,
            "source": "latest_pre_2025_event",
            "source_date": source_date,
            "source_event": source_event,
        })
    else:
        without_bracket.append(display_name)
        source_rows.append({
            "artist": display_name,
            "info": "",
            "source": "not_found_in_pre_2025_events",
            "source_date": "",
            "source_event": "",
        })

with_bracket = sorted(set(with_bracket), key=str.casefold)
without_bracket = sorted(set(without_bracket), key=str.casefold)

TXT_PATH.parent.mkdir(parents=True, exist_ok=True)
text_lines = [
    f"MIT_KLAMMER={len(with_bracket)}",
    f"OHNE_KLAMMER={len(without_bracket)}",
    "",
    "=== BEREITS / JETZT MIT KLAMMER ===",
    *with_bracket,
    "",
    "=== NOCH OHNE KLAMMER ===",
    *without_bracket,
    "",
]
TXT_PATH.write_text("\n".join(text_lines), encoding="utf-8")

with CSV_PATH.open("w", newline="", encoding="utf-8-sig") as file:
    writer = csv.DictWriter(
        file,
        fieldnames=["artist", "info", "source", "source_date", "source_event"],
        delimiter=";",
    )
    writer.writeheader()
    writer.writerows(sorted(source_rows, key=lambda row: row["artist"].casefold()))

print(f"With bracket: {len(with_bracket)}")
print(f"Without bracket: {len(without_bracket)}")
