#!/usr/bin/env python3
"""Scan templates and static files for inline `onclick=` occurrences.

This is a simple preflight check used by PRs to detect remaining inline handlers.
It strips HTML comments and basic JS comments before searching to reduce false positives.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SEARCH_PATHS = [ROOT / 'webui' / 'templates', ROOT / 'webui' / 'static']
EXTS = ('.html', '.htm', '.js', '.vue')

def strip_html_comments(text: str) -> str:
    return re.sub(r'<!--.*?-->', '', text, flags=re.S)

def strip_js_comments(text: str) -> str:
    # remove /* ... */ and //...
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.S)
    text = re.sub(r'//.*$', '', text, flags=re.M)
    return text

def find_onclick_in_file(p: Path):
    try:
        txt = p.read_text(encoding='utf-8', errors='ignore')
    except Exception:
        return []

    if p.suffix in ('.html', '.htm', '.vue'):
        txt = strip_html_comments(txt)
    if p.suffix == '.js' or p.suffix == '.vue':
        txt = strip_js_comments(txt)

    hits = []
    # Match onclick= occurrences but ignore our preserved data-old-onclick attribute
    pattern = re.compile(r'(?<!data-old-)onclick\s*=')
    for i, line in enumerate(txt.splitlines(), start=1):
        if pattern.search(line):
            hits.append((i, line.strip()))
    return hits

def main():
    found = 0
    for base in SEARCH_PATHS:
        if not base.exists():
            continue
        for p in base.rglob('*'):
            if p.is_file() and p.suffix.lower() in EXTS:
                hits = find_onclick_in_file(p)
                if hits:
                    found += len(hits)
                    print(f"{p}:")
                    for ln, txt in hits:
                        print(f"  {ln}: {txt}")

    if found:
        print(f"Found {found} inline onclick occurrences. Please replace with data-action delegation or comment/backup.")
        return 2
    print("No inline onclick occurrences found.")
    return 0


if __name__ == '__main__':
    sys.exit(main())
#!/usr/bin/env python3
"""Scan templates and static files for inline `onclick=` occurrences.

This is a simple preflight check used by PRs to detect remaining inline handlers.
It strips HTML comments and basic JS comments before searching to reduce false positives.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SEARCH_PATHS = [ROOT / 'webui' / 'templates', ROOT / 'webui' / 'static']
EXTS = ('.html', '.htm', '.js', '.vue')

def strip_html_comments(text: str) -> str:
    return re.sub(r'<!--.*?-->', '', text, flags=re.S)

def strip_js_comments(text: str) -> str:
    # remove /* ... */ and //...
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.S)
    text = re.sub(r'//.*$', '', text, flags=re.M)
    return text

def find_onclick_in_file(p: Path):
    try:
        txt = p.read_text(encoding='utf-8', errors='ignore')
    except Exception:
        return []

    if p.suffix in ('.html', '.htm', '.vue'):
        txt = strip_html_comments(txt)
    if p.suffix == '.js' or p.suffix == '.vue':
        txt = strip_js_comments(txt)

    hits = []
    # Match onclick= occurrences but ignore our preserved data-old-onclick attribute
    pattern = re.compile(r'(?<!data-old-)onclick\s*=')
    for i, line in enumerate(txt.splitlines(), start=1):
        if pattern.search(line):
            hits.append((i, line.strip()))
    return hits

def main():
    found = 0
    for base in SEARCH_PATHS:
        if not base.exists():
            continue
        for p in base.rglob('*'):
            if p.is_file() and p.suffix.lower() in EXTS:
                hits = find_onclick_in_file(p)
                if hits:
                    found += len(hits)
                    print(f"{p}:")
                    for ln, txt in hits:
                        print(f"  {ln}: {txt}")

    if found:
        print(f"Found {found} inline onclick occurrences. Please replace with data-action delegation or comment/backup.")
        return 2
    print("No inline onclick occurrences found.")
    return 0


if __name__ == '__main__':
    sys.exit(main())
