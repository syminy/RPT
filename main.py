"""Minimal application entrypoint used by unit tests.

This lightweight HFReplaySystem provides just enough behavior for the
CI/unit-tests: a `run_qpsk_generation(params)` helper and a `file_manager`
attribute. It intentionally avoids hardware access and re-uses existing
library components (SignalGenerator, FileManager, SignalProcessor).
"""
from __future__ import annotations

from typing import Optional
import pathlib

from core.file_manager import FileManager, SignalMetadata
from core.signal_processor import SignalProcessor
from modules.generator import SignalGenerator
from dataclasses import asdict
import numpy as np
from datetime import datetime


class HFReplaySystem:
    def __init__(self, config: Optional[object] = None):
        # Minimal components used by tests
        self.file_manager = FileManager()
        self.signal_processor = SignalProcessor()
        self.generator = SignalGenerator(self.signal_processor)

    def run_qpsk_generation(self, params: dict) -> bool:
        """Generate a QPSK signal and save it using FileManager.

        Expected params (tests provide):
          - save_file: path to save (string) OR save filename
          - sample_rate, symbol_rate, duration or num_symbols
        """
        try:
            # generate samples
            samples = self.generator.generate_qpsk(params)

            # build metadata
            sr = float(params.get("sample_rate", 1e6))
            duration = len(samples) / sr if sr and len(samples) else 0.0
            meta = SignalMetadata(
                sample_rate=sr,
                center_freq=float(params.get("center_freq", 0.0)),
                timestamp=datetime.now().isoformat(),
                duration=duration,
                samples_count=len(samples),
            )

            save_file = params.get("save_file") or params.get("filename") or params.get("save_path")
            if not save_file:
                # put in current dir
                save_file = f"generated_{int(datetime.now().timestamp())}.h5"

            # ensure base dir exists
            repo_root = pathlib.Path(__file__).resolve().parent
            # if user passed relative path, keep it under repo root
            if not pathlib.Path(save_file).is_absolute():
                save_file = str(repo_root / save_file)

            ok = self.file_manager.save_signal(samples, meta, save_file)
            return bool(ok)
        except Exception:
            return False


__all__ = ["HFReplaySystem"]
