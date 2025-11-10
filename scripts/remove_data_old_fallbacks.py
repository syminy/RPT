#!/usr/bin/env python3
"""Remove data-old-* fallback attributes from templates and static files.

This script edits files in place. It is intended to be run on a branch where
you want to remove the fallbacks after reviewers approved the migration.
Use with care and review diffs before committing.
"""
import re
from pathlib import Path
from typing import List

ROOT = Path(__file__).resolve().parents[1]
SEARCH_PATHS = [ROOT / 'webui' / 'templates', ROOT / 'webui' / 'static']
EXTS = ('.html', '.htm', '.js', '.vue')

# matches attributes like:  data-old-onclick="..."  or data-old-onchange='...'
ATTR_RE = re.compile(r"\sdata-old-[a-zA-Z0-9_-]+\s*=\s*(?:\"[^\"]*\"|'[^']*')")

def find_files() -> List[Path]:
    files = []
    for base in SEARCH_PATHS:
        if not base.exists():
            continue
        for p in base.rglob('*'):
            if p.is_file() and p.suffix.lower() in EXTS:
                files.append(p)
    return files

def remove_attrs_from_text(text: str) -> str:
    return ATTR_RE.sub('', text)

def process_file(p: Path) -> bool:
    txt = p.read_text(encoding='utf-8', errors='ignore')
    new = remove_attrs_from_text(txt)
    if new != txt:
        p.write_text(new, encoding='utf-8')
        return True
    return False

def main():
    files = find_files()
    touched = []
    for f in files:
        try:
            if process_file(f):
                touched.append(f)
        except Exception as e:
            print(f"Failed to process {f}: {e}")

    if touched:
        print(f"Removed data-old-* attributes from {len(touched)} files:")
        for t in touched:
            print(f"  {t}")
    else:
        print("No data-old-* attributes found.")

if __name__ == '__main__':
    main()
