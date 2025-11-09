import sys
import pathlib

# ensure repo root on path
repo_root = str(pathlib.Path(__file__).resolve().parents[1])
if repo_root not in sys.path:
    sys.path.insert(0, repo_root)

import numpy as np
import pytest
pytest.importorskip("h5py")
from core.file_manager import FileManager, SignalMetadata
from modules.converter import FormatConverter


def test_convert_h5_to_npy_wav_csv(tmp_path):
    fm = FileManager()
    converter = FormatConverter(fm)

    samples = np.array([0.1 + 0.2j, -0.3 + 0.4j, 0.0 - 0.1j], dtype=np.complex64)
    meta = SignalMetadata(
        sample_rate=16000.0,
        center_freq=1e6,
        timestamp="now",
        duration=len(samples) / 16000.0,
        samples_count=len(samples),
    )

    h5_file = tmp_path / "input.h5"
    assert fm.save_signal(samples, meta, str(h5_file))

    # NPY
    npy_out = tmp_path / "out.npy"
    assert converter.convert_format(str(h5_file), "npy", str(npy_out))
    assert (tmp_path / "out.json").exists()

    # WAV
    wav_out = tmp_path / "out.wav"
    assert converter.convert_format(str(h5_file), "wav", str(wav_out))
    assert wav_out.exists()

    # CSV
    csv_out = tmp_path / "out.csv"
    assert converter.convert_format(str(h5_file), "csv", str(csv_out))
    assert csv_out.exists()
