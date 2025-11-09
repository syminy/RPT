#!/usr/bin/env python3
import sys
from pathlib import Path

files = [
    Path('webui/templates/index.html'),
    Path('webui/templates/index-old.html'),
    Path('webui/templates/index-new-bak.html'),
    Path('webui/templates/index-new-bak2.html'),
]

def backup(p: Path, ts: str):
    bak = p.with_suffix(p.suffix + f'.bak.{ts}')
    p.write_bytes(p.read_bytes())  # touch
    p.rename(p)  # no-op to ensure file exists
    # Use copy
    import shutil
    shutil.copy2(p, bak)
    return bak

def process(p: Path):
    txt = p.read_text(encoding='utf8')
    orig = txt

    # 1) Convert occurrences: data-action="..." onclick="..."  -> keep data-action and add data-old-onclick, remove onclick
    import re
    def replace_data_action(match):
        data_action = match.group(1)
        onclick = match.group(2)
        # if data-old-onclick already present, keep as is
        if 'data-old-onclick=' in match.group(0):
            return match.group(0)
        return f'{data_action} data-old-onclick="{onclick}"'

    txt = re.sub(r'(data-action="[^"]+")\s+onclick="([^"]+)"', replace_data_action, txt)

    # 2) For buttons with onclick document.getElementById('fileInput').click() that lack data-action, add data-action & data-old-onclick
    def replace_upload(m):
        before = m.group(1) or ''
        after = m.group(2) or ''
        # if data-action already present, skip
        if 'data-action=' in before + after:
            return m.group(0)
        return f'<button data-action="upload-files" data-old-onclick="document.getElementById(\'fileInput\').click()"{before}{after}>'

    txt = re.sub(r'<button([^>]*)onclick="document\.getElementById\(\'fileInput\'\)\.click\(\)"([^>]*)>', replace_upload, txt)

    if txt != orig:
        ts = __import__('datetime').datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        bak = p.parent / (p.name + f'.bak.{ts}')
        import shutil
        shutil.copy2(p, bak)
        p.write_text(txt, encoding='utf8')
        return str(bak)
    return None

def main():
    any_changes = False
    for p in files:
        if not p.exists():
            print(f'Skip missing {p}')
            continue
        print(f'Processing {p}')
        bak = process(p)
        if bak:
            print(f'Wrote backup {bak} and updated {p}')
            any_changes = True
        else:
            print(f'No changes needed for {p}')
    if not any_changes:
        print('No files changed')

if __name__ == '__main__':
    main()
