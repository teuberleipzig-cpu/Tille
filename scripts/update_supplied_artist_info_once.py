#!/usr/bin/env python3
import json
import re
import unicodedata
from collections import Counter
from pathlib import Path

EVENTS_PATH = Path("public/events/data/events.json")
REPORT_PATH = Path("reports/supplied_artist_info_update_report.txt")

ARTIST_INFO_PAIRS = [
    ("0-Dimensional", "Distillery, Leipzig"),
    ("A.B.U.", "Hamburg"),
    ("ACE", "Fat Bemme"),
    ("Adriana Lopez", "Grey Report, Modularz, Semantica, Pole Group, Barcelona"),
    ("Afem Syko", "R Label Group"),
    ("Ama", "UK"),
    ("Amotik", "47, Amotik, Berlin"),
    ("Andreas Eckhardt", "Distillery, Leipzig"),
    ("Anja Schneider", "Mobilee, Berlin"),
    ("Anka", "Italo Fundamentalo"),
    ("audite", "Boundless Beatz, Leipzig"),
    ("Barbara Preisinger", "Slice of Life, Berlin"),
    ("Bennet", "DE"),
    ("BIGALKE", "Distillery, Leipzig"),
    ("Boris & Davy", "Creme Club, Leipzig"),
    ("Britta Arnold", "KaterMukke, Dantze, Berlin"),
    ("Bunny Tsukino", "Hotshot, Leipzig"),
    ("Butschi", "Leipzig"),
    ("BZZHOUND", "Madrid"),
    ("Cafgar", "Leipzig"),
    ("CAIVA", "Femme Frequency"),
    ("CAMPA", "Leider9, Leipzig"),
    ("CARGO", "Berlin"),
    ("Carina Posse", "Muna, Leipzig"),
    ("Carlo Bonanza", "AROMA+, Leipzig"),
    ("Carlotta Jacobi", "Leipzig"),
    ("Carotin", "Dresden"),
    ("catjes", "Hypress, Leipzig"),
    ("ch4r20tte", "propperpullposse, Leipzig"),
    ("Chami", "Berlin"),
    ("Charleen Herzig", "Berlin"),
    ("Chloé", "Paris"),
    ("Chris Liebing", "clr.net, FFM"),
    ("Chris Manura", "Distillery, Leipzig"),
    ("Chris Schwarzwälder", "Katermukke, Laut & Luise, Heinz Music, URSL"),
    ("Cinthie", "Beste Modus, Watergate, Berlin"),
    ("Cuepric", "Bass Focu"),
    ("Cyan85", "Curtis Electronix"),
    ("Cynthia Matisse", "Weimar"),
    ("Damon Jee", "Dischi Autunno, Correspondant, Critical Monday"),
    ("Daniel Stefanik", "Distillery, Leipzig"),
    ("Denise Rabe", "Stroboscopic Artefacts"),
    ("DJ Dustin", "Giegling"),
    ("DJ HDGDL", "Stolen Money, Leipzig"),
    ("DJ Hell", "International Deejay Gigolos"),
    ("DJ STIMULA", "Leipzig"),
    ("DjBadshape", "Leipzig"),
    ("Dominik Eulberg", "k7!"),
    ("Dubbalot", "Boundless Beatz, Leipzig"),
    ("Efdemin", "Dial, Records, Ostgut, Berlin"),
    ("Ellen Allien", "BPitch, Berlin"),
    ("Fadi Mohem", "Werk-Music"),
    ("Fiedel", "Berghain, Ostgut Ton, Berlin"),
    ("Filburt", "Leipzig"),
    ("fr. JPLA", "Rillendisco, IfZ"),
    ("Frankey & Sandrino", "Innervisions, Drumpoet Community, Mood Music"),
    ("Franz!", "Kalif Storch, Muna Musik, Paracou"),
    ("Franziska Berns", "Robert Johnson"),
    ("Gourski", "Nibirii"),
    ("grandmalheur", "Leipzig"),
    ("Gunjah", "Showboxx, Funkwelt, Dresden"),
    ("Hannie Phi", "Berlin"),
    ("Henning Baer", "Grounded Theory"),
    ("HOCK", "DE"),
    ("I$A", "Leipzig"),
    ("In Verruf", "R Label Group"),
    ("Johannes Albert", "Frank Music"),
    ("Jonathan Kaspar", "Pets Recordings, Objektivity, KX"),
    ("JONATHOM", "Leipzig"),
    ("karete bu", "DRIVE, G-Edit"),
    ("kichererbsenstampf", "Leipzig"),
    ("Kleinschmager Audio", "Leipzig"),
    ("LAURIX", "DE"),
    ("Len Faki", "Len Series, Ostgut Ton, Podium, Figure, Berghain, Berlin"),
    ("lena xx", "Leipzig"),
    ("LIA", "Berlin"),
    ("Lucinee", "Voxnox Records, EXHALE, Space Trax, RAW"),
    ("Lulu & Nell", "Creme Club, Leipzig"),
    ("LUVLESS", "Tsuba, Rose Records Leipzig"),
    ("LXC", "Alphacut, 45Seven, Leipzig"),
    ("Lydia Eisenblätter", "Leipzig"),
    ("Mac-Kee", "Dirtydrivesounds, Sparte 13"),
    ("Malena", "Konnektivmusik, Dresden"),
    ("Manon", "Robert Johnson, Offenbach"),
    ("Massimiliano Pagliara", "LARJ, Ostgut Ton"),
    ("Mathias Ache", "Leipzig"),
    ("Mathias Kaden", "Paracou"),
    ("Matrixxman", "Dekmantel, Ghostly International"),
    ("Medha", "Leipzig"),
    ("Michael Mayer", "Kompakt, Köln"),
    ("Mila Stern", "Station Endlos"),
    ("Mira", "Kater Blau, URSL, Berlin"),
    ("mp.ulle", "METRO, Leipzig"),
    ("muLe", "Leipzig"),
    ("Möbelnder Pop", "Italo Fundamentalo"),
    ("Nadine Talakovics", "Distillery"),
    ("Naomi", "Berlin"),
    ("Napoleon Dynamite", "Fäncy, Leipzig"),
    ("nd_baumecker", "Ostgut Ton, Freeride Millenium"),
    ("Neele", "Leipzig"),
    ("Neonlight", "Lifted Music, BSE, Trust in Music, Leipzig"),
    ("NICI PALM", "Distillery, Leipzig"),
    ("Ninette", "Distillery, LÄRM"),
    ("noxsonos", "Leipzig"),
    ("O.B.I.", "DE"),
    ("OLIV", "Leipzig"),
    ("Oliver Rosemann", "Recorded Things, Mindtrip, Mord"),
    ("Perel", "O*RS, Berlin"),
    ("Peter Invasion", "Riotvan, Leipzig"),
    ("RIKHTER", "R Label Group"),
    ("Robag Wruhme", "Pampa, Hart & Tief, Kompakt, Weimar Innenstadt"),
    ("Ron Deacon", "Distillery"),
    ("Ruede Hagelstein", "Upon You, Watergate, Berlin"),
    ("Ryan Elliott", "Ghostly, Spectral Sound"),
    ("Rødhåd", "Dystopian"),
    ("SAM", "Leipzig"),
    ("Sarah Wild", "Tal der Verwirrung, Gutzeit, Berlin"),
    ("Schlepp Geist", "URSL"),
    ("Shaleen", "SEELEN., BPitch"),
    ("Shinedoe", "Intacto, MTM Records"),
    ("Subtrak", "Where the Buffalo Roam, Leipzig"),
    ("Sue Lèwig", "SEELEN."),
    ("Sugar D.", "exLEpäng!"),
    ("Sven Tasnadi", "Leipzig"),
    ("Templeton", "Hypress, Leipzig"),
    ("Theus Mago", "Turbo, Correspondant"),
    ("Tijana T", "Abe Duque Records, Belgrad"),
    ("Timstagram", "Keinkollektiv, Leipzig"),
    ("Tommy Four Seven", "47, Berlin"),
    ("Tsorn", "No Show"),
    ("Vanaenae", "G-Edit, Music Of Color"),
    ("Vanta", "DE"),
    ("VRUM", "Boundless Beatz"),
    ("Wintermute", "Blackout / Boundless Beatz"),
    ("Zacharias", "Leipzig"),
    ("Zischko", "Leipzig"),
    ("Zisko", "Leipzig"),
]


def strip_trailing_parenthetical(value: str) -> str:
    return re.sub(r"\s*\([^()]*)\)\s*$", "", str(value or "").strip()).strip()


def normalize_name(value: str) -> str:
    text = strip_trailing_parenthetical(value)
    text = unicodedata.normalize("NFKD", text.casefold())
    text = "".join(char for char in text if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9]+", "", text)


mapping = {normalize_name(name): (name, info) for name, info in ARTIST_INFO_PAIRS}
if len(mapping) != len(ARTIST_INFO_PAIRS):
    raise RuntimeError("Duplicate normalized artist names in mapping.")

data = json.loads(EVENTS_PATH.read_text(encoding="utf-8"))
matched_entries = Counter()
changed_entries = Counter()
already_correct_entries = Counter()
matched_variants = {key: set() for key in mapping}

for event in data.get("events", []):
    for section in event.get("sections") or []:
        for artist in section.get("items") or []:
            raw_name = str(artist.get("name", "")).strip()
            key = normalize_name(raw_name)
            if key not in mapping:
                continue

            canonical_name, target_info = mapping[key]
            matched_entries[key] += 1
            matched_variants[key].add(raw_name)

            if str(artist.get("info", "")).strip() == target_info:
                already_correct_entries[key] += 1
            else:
                artist["info"] = target_info
                changed_entries[key] += 1

unmatched = [key for key in mapping if matched_entries[key] == 0]

EVENTS_PATH.write_text(
    json.dumps(data, ensure_ascii=False, indent=2),
    encoding="utf-8",
)

REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
lines = [
    f"TARGET_ARTISTS={len(mapping)}",
    f"MATCHED_ARTISTS={len(mapping) - len(unmatched)}",
    f"UNMATCHED_ARTISTS={len(unmatched)}",
    f"MATCHED_EVENT_ENTRIES={sum(matched_entries.values())}",
    f"CHANGED_EVENT_ENTRIES={sum(changed_entries.values())}",
    f"ALREADY_CORRECT_ENTRIES={sum(already_correct_entries.values())}",
    "",
    "=== MATCHED ===",
]

for key in sorted((key for key in mapping if matched_entries[key]), key=lambda item: mapping[item][0].casefold()):
    canonical_name, target_info = mapping[key]
    variants = ", ".join(sorted(matched_variants[key], key=str.casefold))
    lines.append(
        f"{canonical_name} ({target_info}) | entries={matched_entries[key]} | changed={changed_entries[key]} | variants={variants}"
    )

lines.extend(["", "=== UNMATCHED ==="])
for key in sorted(unmatched, key=lambda item: mapping[item][0].casefold()):
    canonical_name, target_info = mapping[key]
    lines.append(f"{canonical_name} ({target_info})")

REPORT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")

print(f"Target artists: {len(mapping)}")
print(f"Matched artists: {len(mapping) - len(unmatched)}")
print(f"Unmatched artists: {len(unmatched)}")
print(f"Matched event entries: {sum(matched_entries.values())}")
print(f"Changed event entries: {sum(changed_entries.values())}")
print(f"Already correct entries: {sum(already_correct_entries.values())}")
