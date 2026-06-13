#!/usr/bin/env python3
import json
from pathlib import Path

EVENTS_PATH = Path("public/events/data/events.json")
TARGET_INFO = "Distillery, vaertism, Leipzig"

data = json.loads(EVENTS_PATH.read_text(encoding="utf-8"))
updated = 0

for event in data.get("events", []):
    for section in event.get("sections") or []:
        for artist in section.get("items") or []:
            artist_name = str(artist.get("name", "")).strip().casefold()
            if artist_name == "submod":
                artist["info"] = TARGET_INFO
                updated += 1

if updated == 0:
    raise RuntimeError("No artist entries named Submod were found.")

EVENTS_PATH.write_text(
    json.dumps(data, ensure_ascii=False, indent=2),
    encoding="utf-8",
)

print(f"Updated Submod artist entries: {updated}")
