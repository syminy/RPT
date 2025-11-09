import sys
import pathlib

# ensure repo root on path
repo_root = str(pathlib.Path(__file__).resolve().parents[1])
if repo_root not in sys.path:
    sys.path.insert(0, repo_root)

import numpy as np
from core.signal_processor import SignalProcessor


def test_normalize_and_power():
    sp = SignalProcessor()
    # create a signal with peak 10
    samples = np.array([0.0, 10 + 0j, -5 + 0j, 2 + 0j], dtype=np.complex64)
    normalized = sp.normalize_signal(samples, target_peak=1.0)
    assert np.max(np.abs(normalized)) <= 0.8 + 1e-6

    power_stats = sp.detect_signal_power(normalized)
    assert "average_power" in power_stats
    assert "average_power_db" in power_stats


def test_spectrum_and_bandwidth():
    sp = SignalProcessor()
    # generate a sinusoid at 1kHz sampled at 8kHz
    fs = 8000.0
    t = np.arange(0, 1.0, 1.0 / fs)
    f0 = 1000.0
    sig = np.exp(1j * 2 * np.pi * f0 * t[:4096])

    freq_axis, power = sp.calculate_spectrum(sig, fs)
    assert len(freq_axis) == len(power)

    ps_db = 10 * np.log10(power + 1e-12)
    bw = sp.estimate_bandwidth(ps_db, freq_axis)
    assert isinstance(bw, float)


def test_bandpass_sample_rate():
    sp = SignalProcessor()
    # center freq 10 MHz, signal BW 20 kHz
    fs = sp.calculate_bandpass_sample_rate(10e6, 20e3)
    assert fs > 0
