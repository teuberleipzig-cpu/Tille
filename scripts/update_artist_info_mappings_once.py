#!/usr/bin/env python3
import json
import re
import unicodedata
from collections import Counter
from pathlib import Path

EVENTS_PATH = Path("public/events/data/events.json")

TARGETS = {
    "sevensol": "Long Vehicle, Kann",
    "shuraywalle": "Distillery, Leipzig",
    "thomasstieler": "Distillery, Paracou",
    "rosared": "Permanent Vacation",
    "nachtigall": "PX13",
    "vincentneumann": "Distillery, Unitas Multiplex, Leipzig",
    "traxxjr": "MyGrooves, Leipzig",
    "mayo": "Ostend, MorningStretch, Leipzig",
    "diliviuslenni": "Distillery, Leipzig",
    "thomasheinrich": "Stolen Money, Leipzig",
    "janein": "SEELEN",
    "stiqmatique": "Distillery, SEELEN",
    "stigmatique": "Distillery, SEELEN",
}


def normalize_name(value: str) -> str:
    text = unicodedata.normalize("NFKD", str(value or "").casefold())
    text = "".join(char for char in text if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9]+", "", text)


data = json.loads(EVENTS_PATH.read_text(encoding="utf-8"))
updated = Counter()

for event in data.get("events", []):
    for section in event.get("sections") or []:
        for artist in section.get("items") or []:
            key = normalize_name(artist.get("name", ""))
            if key in TARGETS:
                artist["info"] = TARGETS[key]
                updated[key] += 1

if not updated:
    raise RuntimeError("None of the requested artist names were found.")

EVENTS_PATH.write_text(
    json.dumps(data, ensure_ascii=False, indent=2),
    encoding="utf-8",
)

print("Updated artist entries:")
for key in sorted(TARGETS):
    print(f"{key}: {updated[key]}")
