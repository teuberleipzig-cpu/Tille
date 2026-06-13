#!/usr/bin/env python3
from pathlib import Path

INDEX_PATH = Path("index.html")
text = INDEX_PATH.read_text(encoding="utf-8")
old = ".map(renderArtist).join(String(event.id||'').startsWith('ra-')?' | ':' ')"
new = ".map(renderArtist).join(' ')"
count = text.count(old)
if count != 2:
    raise RuntimeError(f"Expected exactly 2 RA-specific joins, found {count}")
text = text.replace(old, new)
INDEX_PATH.write_text(text, encoding="utf-8")
print("Restored standard individual artist rendering in list and detail views.")
