def test_file_save_and_load(tmp_path):
    import sys
    import pathlib
    import numpy as np
    import pytest
    pytest.importorskip("h5py")

    # Ensure repo root is on sys.path so imports like `core.*` work when pytest runs
    repo_root = str(pathlib.Path(__file__).resolve().parents[1])
    if repo_root not in sys.path:
        sys.path.insert(0, repo_root)

    from core.file_manager import FileManager, SignalMetadata

    fm = FileManager()

    samples = np.array([1 + 1j, 0.5 + 0.2j], dtype=np.complex64)
    meta = SignalMetadata(
        sample_rate=2e6,
        center_freq=100e6,
        timestamp="now",
        duration=len(samples) / 2e6,
        samples_count=len(samples),
    )

    out = tmp_path / "test.h5"
    assert fm.save_signal(samples, meta, str(out)) is True

    loaded_samples, loaded_meta = fm.load_signal(str(out))
    assert loaded_samples is not None
    assert loaded_meta is not None
    assert loaded_meta.samples_count == len(samples)
