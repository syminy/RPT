#!/usr/bin/env python3
"""Create a small test signal file in var/uploads without initializing HFReplaySystem.

Usage: from the project root run:
  PYTHONPATH=. python3 scripts/create_test_file.py

This script avoids creating heavy objects (USRPController) by using FileManager directly.
"""
from core.file_manager import FileManager, SignalMetadata
import numpy as np
from datetime import datetime
from pathlib import Path


def main():
    out_dir = Path("var/uploads")
    out_dir.mkdir(parents=True, exist_ok=True)

    fm = FileManager()

    fs = 200000.0
    t = np.arange(0, 0.5, 1 / fs)
    freq = 1000
    samples = (0.7 * np.exp(1j * 2 * np.pi * freq * t)).astype(np.complex64)

    meta = SignalMetadata(
        sample_rate=fs,
        center_freq=100e6,
        timestamp=datetime.now().isoformat(),
        duration=len(samples) / fs,
        samples_count=len(samples),
        signal_type="TEST",
    )

    fn = out_dir / "test_cancel.bin"
    ok = fm.save_signal(samples, meta, str(fn))
    print(f"saved {fn} ok={ok}")


if __name__ == "__main__":
    main()
