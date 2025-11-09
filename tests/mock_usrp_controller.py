import numpy as np


class MockUSRPController:
    """A minimal mock USRPController for tests (no UHD dependency)."""

    def __init__(self, config=None):
        self.config = config
        self.is_connected = True

    def connect(self, address: str = None) -> bool:
        self.is_connected = True
        return True

    def disconnect(self):
        self.is_connected = False

    def configure_rx(self, freq, rate, gain, channel=0, bandwidth=None):
        # Return the requested rate as the "actual" rate
        return rate

    def configure_tx(self, freq, rate, gain, channel=0):
        return rate

    def record_samples(self, duration, channel=0, chunk_callback=None, cancel_event=None, collect_samples=True):
        # Generate a small array of complex samples proportional to duration
        sample_rate = 1e6
        n = max(1, int(duration * sample_rate))
        samples = (np.random.randn(n) + 1j * np.random.randn(n)).astype(np.complex64)
        if chunk_callback:
            chunk_callback(samples)
        return samples if collect_samples else np.array([], dtype=np.complex64), 0

    def transmit_samples(self, samples, repeat=1, channel=0):
        return samples.size * repeat

    def transmit_samples_simple(self, samples, repeat=1, channel=0):
        return samples.size * repeat

    def get_rx_rate(self, channel=0):
        return 1e6

    def get_tx_rate(self, channel=0):
        return 1e6

    def get_time_now(self):
        return 0

    def get_device_info(self):
        return {"mboard_id": "MOCK", "mboard_serial": "MOCK1234"}
