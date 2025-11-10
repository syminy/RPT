"""Minimal settings dataclasses used by tests.

These provide a small surface area (RecordConfig, USRPConfig, AppSettings)
so module imports like `from config.settings import RecordConfig` succeed in
CI and unit tests. Values are conservative defaults and safe for test use.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class RecordConfig:
    base_dir: str = "/tmp"
    flush_interval: float = 1.0


@dataclass
class USRPConfig:
    address: Optional[str] = None
    master_clock_rate: Optional[float] = None
    # A minimal list of plausible sample rates used by controllers in tests
    sample_rates: List[float] = (2_000_000.0, 1_000_000.0, 250_000.0)


@dataclass
class AppSettings:
    debug: bool = False
    # Use default_factory to avoid mutable-default dataclass import errors
    usrp: USRPConfig = field(default_factory=USRPConfig)
    record: RecordConfig = field(default_factory=RecordConfig)


# Export names for convenience
__all__ = ["RecordConfig", "USRPConfig", "AppSettings"]
