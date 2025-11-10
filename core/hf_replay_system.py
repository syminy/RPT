from __future__ import annotations

import logging
from typing import Optional, Dict, Any

from config.settings import AppSettings
from main import HFReplaySystem as BaseHFReplaySystem
from modules.spectrum_scanner import SpectrumScanner, ScanConfig
from utils.visualizer import StreamingSignalVisualizer

logger = logging.getLogger(__name__)


class HFReplaySystem(BaseHFReplaySystem):
    """Extended HF replay system with streaming visualizer and spectrum scan support."""

    def __init__(self, config: Optional[AppSettings] = None):
        super().__init__(config)

        # Replace the base visualizer with streaming-capable variant for web integrations.
        self.streaming_visualizer = StreamingSignalVisualizer()
        self.visualizer = self.streaming_visualizer
        if hasattr(self, "analyzer") and self.analyzer is not None:
            self.analyzer.visualizer = self.visualizer

        # Wire up spectrum scanner module.
        self.spectrum_scanner = SpectrumScanner(self.usrp_controller, self.signal_processor)
        self.spectrum_scanner.set_visualizer(self.visualizer)

        logger.debug("HFReplaySystem initialized with streaming visualizer and spectrum scanner")

    def start_spectrum_scan(self, config_dict: Dict[str, Any]) -> str:
        """Start a spectrum scanning session using provided configuration dictionary."""
        config = config_dict if isinstance(config_dict, ScanConfig) else ScanConfig(**config_dict)
        return self.spectrum_scanner.start_scanning(config)

    def stop_spectrum_scan(self) -> None:
        """Stop any active spectrum scanning session."""
        self.spectrum_scanner.stop_scanning()


_system_instance: Optional[HFReplaySystem] = None


def get_system() -> HFReplaySystem:
    """Return a singleton HFReplaySystem instance for application-wide reuse."""
    global _system_instance
    if _system_instance is None:
        _system_instance = HFReplaySystem()
    return _system_instance
