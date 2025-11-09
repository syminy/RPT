import numpy as np
import h5py
import os
from modules.generator import SignalGenerator

OUT_DIR = os.path.join(os.path.dirname(__file__), 'var', 'uploads')
os.makedirs(OUT_DIR, exist_ok=True)


def create_qpsk_file(filename='qpsk_test.h5', duration=1.0, sample_rate=2e6):
    """Create a simple QPSK signal and save as an HDF5 file using FileManager if available.

    Falls back to raw numpy save if h5py/FileManager unavailable.
    """
    sg = SignalGenerator()
    params = {
        'center_freq': 100e6,
        'symbol_rate': 500e3,
        'sample_rate': sample_rate,
        'tx_gain': 25,
        'duration': duration,
        'channel': 0,
        'save_file': None,
        'transmit': False,
    }
    samples = sg.generate_qpsk(symbol_rate=params['symbol_rate'], sample_rate=params['sample_rate'], duration=params['duration'])

    out_path = os.path.join(OUT_DIR, filename)
    try:
        with h5py.File(out_path, 'w') as f:
            f.create_dataset('iq', data=samples.astype(np.complex64))
            f.attrs['center_freq'] = params['center_freq']
            f.attrs['sample_rate'] = params['sample_rate']
        print(f"Saved HDF5 test signal to {out_path}")
    except Exception as e:
        # Fallback: save as npy
        np.save(out_path + '.npy', samples)
        print(f"h5py unavailable or failed, saved as numpy file {out_path}.npy")


if __name__ == '__main__':
    create_qpsk_file()
