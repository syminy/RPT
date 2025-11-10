#!/usr/bin/env python3
"""Scan templates and static files for any `data-old-` fallback attributes.

This is a conservative check that will fail CI if any data-old-* attributes remain.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SEARCH_PATHS = [ROOT / 'webui' / 'templates', ROOT / 'webui' / 'static']
EXTS = ('.html', '.htm', '.js', '.vue')

PATTERN = re.compile(r'data-old-[a-zA-Z0-9_-]+\s*=')

def scan_file(p: Path):
    try:
        txt = p.read_text(encoding='utf-8', errors='ignore')
    except Exception:
        return []
    hits = []
    for i, line in enumerate(txt.splitlines(), start=1):
        if PATTERN.search(line):
            hits.append((i, line.strip()))
    return hits

def main():
    found = 0
    for base in SEARCH_PATHS:
        if not base.exists():
            continue
        for p in base.rglob('*'):
            if p.is_file() and p.suffix.lower() in EXTS:
                hits = scan_file(p)
                if hits:
                    found += len(hits)
                    print(f"{p}:")
                    for ln, txt in hits:
                        print(f"  {ln}: {txt}")

    if found:
        print(f"Found {found} data-old-* fallback occurrences. Please remove them before merging.")
        return 2
    print("No data-old-* fallbacks found.")
    return 0


if __name__ == '__main__':
    sys.exit(main())
