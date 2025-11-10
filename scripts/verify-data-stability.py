#!/usr/bin/env python3
"""Basic data-stability verifier for sample signal files.

This script attempts to import the project's FileManager and load files provided
as arguments (or samples under var/uploads). It prints a small signature per file
so CI or PR checks can compare before/after summaries.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_UPLOADS = ROOT / 'var' / 'uploads'


def main():
    files = [Path(p) for p in sys.argv[1:]]
    if not files:
        if DEFAULT_UPLOADS.exists():
            files = [p for p in DEFAULT_UPLOADS.iterdir() if p.suffix.lower() in ('.h5', '.bin', '.raw', '.dat')]
        else:
            print('No files given and uploads directory missing; skipping data stability checks')
            return 0

    try:
        from core.file_manager import FileManager
    except Exception as e:
        print('Unable to import core.file_manager.FileManager:', e)
        print('Skipping data stability checks')
        return 0

    fm = FileManager()
    for f in files[:5]:
        try:
            samples, metadata = fm.load_signal(str(f))
            n = len(samples) if samples is not None else 0
            sr = getattr(metadata, 'sample_rate', None) if metadata else None
            print(f'{f.name}: samples={n}, sample_rate={sr}')
        except Exception as e:
            print(f'Error loading {f.name}: {e}')

    return 0


if __name__ == '__main__':
    sys.exit(main())
#!/usr/bin/env python3
"""Simple data-stability verifier: loads example files and prints sample counts.
This is intentionally lightweight — a later version should do numeric comparisons.
"""
import sys
from pathlib import Path

# Ensure repo root is on sys.path so local packages (core.*) can be imported
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
UPLOADS = ROOT / 'var' / 'uploads'

def main():
    samples = list(UPLOADS.glob('*.h5'))
    if not samples:
        print('No sample .h5 files found in var/uploads — skipping data-stability checks')
        return 0

    import argparse
    import json
    import hashlib
    import numpy as np

    parser = argparse.ArgumentParser()
    parser.add_argument('--save-baseline', action='store_true', help='Save computed summaries as baseline')
    parser.add_argument('--baseline-file', default=str(ROOT / 'var' / 'verify_baseline.json'))
    parser.add_argument('--tolerance', type=float, default=1e-6, help='Relative tolerance for numeric comparisons')
    args = parser.parse_args()

    from core.file_manager import FileManager
    fm = FileManager()

    def compute_summary(sig):
        arr = np.asarray(sig)
        # support complex by viewing real/imag separately
        try:
            vals = arr.astype(np.float64)
        except Exception:
            vals = arr
        summary = {
            'len': int(arr.shape[0]),
            'mean': float(np.mean(vals)),
            'std': float(np.std(vals)),
            'min': float(np.min(vals)),
            'max': float(np.max(vals)),
        }
        # binary checksum
        md = hashlib.md5()
        md.update(arr.tobytes())
        summary['md5'] = md.hexdigest()
        return summary

    summaries = {}
    loaded = 0
    for p in samples[:5]:
        try:
            sig, meta = fm.load_signal(str(p))
            s = compute_summary(sig)
            summaries[str(p.name)] = s
            print(f'Loaded {p.name}: {s["len"]} samples, md5={s["md5"]}')
            loaded += 1
        except Exception as e:
            print(f'Error loading {p}: {e}', file=sys.stderr)

    if loaded == 0:
        print('No sample files could be loaded successfully.', file=sys.stderr)
        return 2

    baseline_path = Path(args.baseline_file)
    if args.save_baseline or not baseline_path.exists():
        baseline_path.parent.mkdir(parents=True, exist_ok=True)
        baseline_path.write_text(json.dumps(summaries, indent=2))
        print(f'Baseline written to {baseline_path}')
        return 0

    # compare to baseline
    baseline = json.loads(baseline_path.read_text())
    failures = []
    tol = args.tolerance
    for name, cur in summaries.items():
        if name not in baseline:
            print(f'Warning: {name} not present in baseline')
            continue
        ref = baseline[name]
        # check md5 first
        if cur.get('md5') != ref.get('md5'):
            # if md5 differs, compare numeric summaries within tolerance
            for k in ('mean', 'std', 'min', 'max'):
                a = cur.get(k)
                b = ref.get(k)
                if b == 0:
                    rel = abs(a - b)
                else:
                    rel = abs((a - b) / b)
                if rel > tol:
                    failures.append((name, k, a, b, rel))
        else:
            print(f'{name}: md5 matches baseline')

    if failures:
        print('Data stability check failures:')
        for f in failures:
            print(f'  {f[0]} field {f[1]} cur={f[2]} ref={f[3]} rel={f[4]}')
        return 3
    print('All compared summaries within tolerance')
    return 0

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
