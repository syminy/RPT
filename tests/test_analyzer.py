import sys
import pathlib

# ensure repo root on path
repo_root = str(pathlib.Path(__file__).resolve().parents[1])
if repo_root not in sys.path:
    sys.path.insert(0, repo_root)

import numpy as np
from core.signal_processor import SignalProcessor
from modules.generator import SignalGenerator
from modules.analyzer import SignalAnalyzer
from utils.visualizer import SignalVisualizer


def test_qpsk_analysis_recognized():
    processor = SignalProcessor()
    gen = SignalGenerator(processor)

    params = {"symbol_rate": 1000.0, "sample_rate": 8000.0, "num_symbols": 200}
    # make generation deterministic for the test
    np.random.seed(0)
    samples = gen.generate_qpsk(params)

    analyzer = SignalAnalyzer(processor, SignalVisualizer())
    results = analyzer.comprehensive_analysis(samples, params["sample_rate"])

    assert "modulation" in results
    # QPSK generator should be recognized as QPSK by the heuristic
    assert results["modulation"] == "QPSK"
