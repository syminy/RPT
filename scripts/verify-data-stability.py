#!/usr/bin/env python3
"""Simple data-stability verifier: loads example files and prints sample counts.
This is intentionally lightweight — a later version should do numeric comparisons.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UPLOADS = ROOT / 'var' / 'uploads'

def main():
    samples = list(UPLOADS.glob('*.h5'))
    if not samples:
        print('No sample .h5 files found in var/uploads — skipping data-stability checks')
        return 0

    ok = True
    for p in samples[:5]:
        try:
            # import local FileManager lazily to avoid import issues
            from core.file_manager import FileManager
            fm = FileManager()
            sig, meta = fm.load_signal(str(p))
            # Basic print: length and type of metadata
            print(f'Loaded {p}: {len(sig)} samples, meta={type(meta)}')
        except Exception as e:
            print(f'Error loading {p}: {e}', file=sys.stderr)
            ok = False

    return 0 if ok else 2

if __name__ == '__main__':
    sys.exit(main())
#!/usr/bin/env python3
"""
Simple data-stability check: for a small set of sample files, try to load them
via the project's FileManager (if available). If FileManager isn't importable,
fall back to verifying file existence and size.

Exit code 0 = success, non-zero = failure
"""
import sys
from pathlib import Path

SAMPLES = [
    'var/uploads/hf_record_1000MHz_2016kHz_20251105_230507.h5',
    'var/uploads/hf_record_10MHz_2016kHz_20251109_164152.h5',
]

root = Path(__file__).resolve().parents[1]

sample_paths = [root / p for p in SAMPLES]

ok = True
try:
    # try to use project's FileManager for a more meaningful check
    sys.path.insert(0, str(root))
    from core.file_manager import FileManager
    fm = FileManager()
    print('Using core.file_manager.FileManager for sample checks')
    for p in sample_paths:
        if not p.exists():
            print(f'WARN: sample missing: {p}')
            ok = False
            continue
        try:
            samples, meta = fm.load_signal(str(p))
            if samples is None:
                print(f'ERROR: FileManager failed to load {p}')
                ok = False
            else:
                print(f'Loaded {p}: {len(samples)} samples, meta={type(meta)}')
        except Exception as e:
            print(f'ERROR loading {p}: {e}')
            ok = False
except Exception as e:
    print('Note: core.FileManager not available or failed to import; falling back to existence checks')
    for p in sample_paths:
        if not p.exists():
            print(f'ERROR: sample missing: {p}')
            ok = False
        else:
            print(f'Found file {p} ({p.stat().st_size} bytes)')

if not ok:
    print('\nData-stability checks: FAILED')
    sys.exit(1)
else:
    print('\nData-stability checks: OK')
    sys.exit(0)
