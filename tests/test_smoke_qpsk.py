def test_qpsk_generation_and_load(tmp_path):
    """Smoke test: generate QPSK signal and verify saved file can be loaded by FileManager."""
    import sys
    import pathlib
    import pytest
    pytest.importorskip("h5py")

    # Ensure repo root is on sys.path so imports like `main` work when pytest runs
    repo_root = str(pathlib.Path(__file__).resolve().parents[1])
    if repo_root not in sys.path:
        sys.path.insert(0, repo_root)

    # Inject mock USRPController before importing main so hardware-dependent code is mocked
    import importlib
    import core.usrp_controller as usrp_mod
    from tests.mock_usrp_controller import MockUSRPController
    usrp_mod.USRPController = MockUSRPController
    importlib.reload(usrp_mod)

    from main import HFReplaySystem

    system = HFReplaySystem()
    out = tmp_path / "qpsk_test.h5"

    params = {
        "center_freq": 100e6,
        "symbol_rate": 500e3,
        "sample_rate": 2e6,
        "tx_gain": 25,
        "duration": 0,
        "channel": 0,
        "save_file": str(out),
        "transmit": False,
    }

    assert system.run_qpsk_generation(params) is True

    samples, meta = system.file_manager.load_signal(str(out))
    assert samples is not None
    assert meta is not None
    assert meta.samples_count == len(samples)


def test_qpsk_duration_matches_request(tmp_path):
    import sys
    import pathlib
    import pytest

    pytest.importorskip("h5py")

    repo_root = str(pathlib.Path(__file__).resolve().parents[1])
    if repo_root not in sys.path:
        sys.path.insert(0, repo_root)

    import importlib
    import core.usrp_controller as usrp_mod
    from tests.mock_usrp_controller import MockUSRPController

    usrp_mod.USRPController = MockUSRPController
    importlib.reload(usrp_mod)

    from main import HFReplaySystem

    system = HFReplaySystem()
    out = tmp_path / "qpsk_duration.h5"

    sample_rate = 1e6
    duration = 0.0123
    params = {
        "center_freq": 90e6,
        "symbol_rate": 250e3,
        "sample_rate": sample_rate,
        "duration": duration,
        "channel": 0,
        "save_file": str(out),
    }

    assert system.run_qpsk_generation(params) is True

    samples, meta = system.file_manager.load_signal(str(out))
    assert len(samples) == meta.samples_count
    expected_samples = int(round(sample_rate * duration))
    assert len(samples) == expected_samples
