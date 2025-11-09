import sys
import pathlib

# ensure repo root on path
repo_root = str(pathlib.Path(__file__).resolve().parents[1])
if repo_root not in sys.path:
    sys.path.insert(0, repo_root)

import numpy as np
from core.file_manager import FileManager, SignalMetadata


def test_binary_save_and_load(tmp_path):
    fm = FileManager()

    samples = np.array([1 + 1j, 0.5 + 0.2j, -0.1 + 0.3j], dtype=np.complex64)
    meta = SignalMetadata(
        sample_rate=200e3,
        center_freq=10e6,
        timestamp="now",
        duration=len(samples) / 200e3,
        samples_count=len(samples),
    )

    out = tmp_path / "test.bin"
    assert fm.save_signal(samples, meta, str(out)) is True

    # check that sidecar exists
    sidecar = out.with_suffix('.txt')
    assert sidecar.exists()

    loaded, loaded_meta = fm.load_signal(str(out))
    assert loaded is not None
    assert loaded_meta is not None
    assert loaded_meta.samples_count == len(samples)
