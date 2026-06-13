#!/usr/bin/env python3
from pathlib import Path

source_path = Path("scripts/update_supplied_artist_info_once.py")
source = source_path.read_text(encoding="utf-8")
source = source.replace(
    r'\s*\([^()]*)\)\s*$',
    r'\s*\([^()]*\)\s*$',
)
code = compile(source, str(source_path), "exec")
exec(code, {"__name__": "__main__", "__file__": str(source_path)})
