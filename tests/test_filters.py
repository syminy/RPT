import sys
import pathlib

# ensure repo root on path
repo_root = str(pathlib.Path(__file__).resolve().parents[1])
if repo_root not in sys.path:
    sys.path.insert(0, repo_root)

import numpy as np
from utils.filters import FilterDesigner


def test_rrc_taps_basic():
    fd = FilterDesigner()
    taps = fd.rrc_taps(33, 0.35, 8)
    assert taps.size == 33
    # energy normalized
    energy = np.sum(taps**2)
    assert energy > 0
