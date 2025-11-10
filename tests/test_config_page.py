import re
from pathlib import Path


def test_config_buttons_have_fallbacks():
    p = Path('webui/templates/config.html')
    assert p.exists(), 'config.html missing'
    text = p.read_text(encoding='utf8')
    # find all button tags with onclick attribute
    pattern = re.compile(r'<button([^>]*)onclick\s*=\s*(["\'])(.*?)\2([^>]*)>', re.S)
    bad = []
    for m in pattern.finditer(text):
        attrs_before = m.group(1) or ''
        attrs_after = m.group(4) or ''
        combined = attrs_before + attrs_after
        if 'data-old-onclick=' not in combined and 'data-action=' not in combined:
            # capture the snippet for diagnostics
            snippet = m.group(0).strip()
            bad.append(snippet)
    assert not bad, f'Found buttons with raw onclick in config.html (no data-old-onclick/data-action):\n' + '\n'.join(bad)
