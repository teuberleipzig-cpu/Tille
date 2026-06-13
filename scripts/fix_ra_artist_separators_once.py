#!/usr/bin/env python3
from pathlib import Path

# One-time migration: visually separate RA artists with the original pipe delimiter.
INDEX_PATH = Path("index.html")
text = INDEX_PATH.read_text(encoding="utf-8")
old = ".map(renderArtist).join(' ')"
new = ".map(renderArtist).join(String(event.id||'').startsWith('ra-')?' | ':' ')"
count = text.count(old)
if count != 2:
    raise RuntimeError(f"Expected exactly 2 artist joins, found {count}")
text = text.replace(old, new)
INDEX_PATH.write_text(text, encoding="utf-8")
print("Updated RA artist separators in list and detail views.")
