#!/usr/bin/env python3
import json
from collections import Counter
from pathlib import Path

EVENTS_PATH = Path("public/events/data/events.json")
REPORT_PATH = Path("reports/artists_with_placeholder.txt")

data = json.loads(EVENTS_PATH.read_text(encoding="utf-8"))
counts = Counter()
examples = {}

for event in data.get("events", []):
    for section in event.get("sections") or []:
        for artist in section.get("items") or []:
            if str(artist.get("info", "")).strip() == "...":
                name = str(artist.get("name", "")).strip()
                if not name:
                    continue
                counts[name] += 1
                examples.setdefault(name, [])
                if len(examples[name]) < 3:
                    examples[name].append(
                        f"{event.get('date', '')} — {event.get('title', '')}"
                    )

REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
lines = [f"TOTAL_UNIQUE={len(counts)}", f"TOTAL_ENTRIES={sum(counts.values())}", ""]
for name in sorted(counts, key=lambda value: value.casefold()):
    lines.append(f"{name}\t{counts[name]}")
    for example in examples[name]:
        lines.append(f"  - {example}")

REPORT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
print(f"Unique artists: {len(counts)}")
print(f"Placeholder entries: {sum(counts.values())}")
