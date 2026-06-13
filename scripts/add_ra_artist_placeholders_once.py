#!/usr/bin/env python3
import json
from pathlib import Path

EVENTS_PATH = Path("public/events/data/events.json")

data = json.loads(EVENTS_PATH.read_text(encoding="utf-8"))
changed_events = 0
changed_artists = 0

for event in data.get("events", []):
    if not str(event.get("id", "")).startswith("ra-"):
        continue

    event_changed = False

    for section in event.get("sections") or []:
        for artist in section.get("items") or []:
            if not str(artist.get("info", "")).strip():
                artist["info"] = "..."
                changed_artists += 1
                event_changed = True

    if event_changed:
        changed_events += 1

EVENTS_PATH.write_text(
    json.dumps(data, ensure_ascii=False, indent=2),
    encoding="utf-8",
)

print(f"Updated RA events: {changed_events}")
print(f"Updated RA artists: {changed_artists}")
