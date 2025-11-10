"""Core package exports.

Note: importing `core` should not require UHD/USRP system packages. We import
`USRPController` lazily where possible; if UHD is not available the symbol
will be set to None so tests that only use `file_manager` or `signal_processor`
can run without USRP hardware.
"""

try:
	from .usrp_controller import USRPController
except Exception:
	# UHD or USRP may not be available in test environments; export a placeholder
	USRPController = None

from .signal_processor import SignalProcessor
from .file_manager import FileManager, SignalMetadata

__all__ = ["USRPController", "SignalProcessor", "FileManager", "SignalMetadata"]
