import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.ticker import AutoMinorLocator, MultipleLocator, MaxNLocator
import numpy as np
from scipy.fft import fft, fftshift
from scipy.signal import spectrogram
from typing import Dict, Optional
import scipy.signal as signal
from pathlib import Path
import uuid
import json
import struct
import io
import threading
import time
import logging
from typing import Generator, Tuple, List
from dataclasses import asdict, is_dataclass

from utils.config_manager import FFTWindow, VisualizationConfig, get_config_manager

logger = logging.getLogger(__name__)

class EnhancedSignalVisualizer:
    """Enhanced server-side visualizer that saves PNGs for the web UI.

    Methods:
      - create_analysis_plots(samples, sample_rate, center_freq, filename) -> Dict[name, filename]
      - get_plot_url(filename) -> str
    """

    def __init__(self, plot_dir: str = "var/uploads/plots"):
        plt.rcParams["font.sans-serif"] = [
            "DejaVu Sans",
            "Arial",
            "Liberation Sans",
            "sans-serif",
        ]
        plt.rcParams["axes.unicode_minus"] = False
        plt.rcParams["font.family"] = "sans-serif"

        self.plot_dir = Path(plot_dir)
        self.plot_dir.mkdir(parents=True, exist_ok=True)
        try:
            self.config_manager = get_config_manager()
            self.visualization_config = getattr(self.config_manager, "visualization", VisualizationConfig())
        except Exception:
            # Fallback to defaults if configuration loading fails
            self.config_manager = None
            self.visualization_config = VisualizationConfig()

    def _plot_time_domain(self, ax, samples, sample_rate):
        max_display = min(100, len(samples))
        display = samples[:max_display]
        t = np.arange(len(display)) / sample_rate * 1000.0
        ax.plot(t, np.real(display), "b-", label="I", alpha=0.8)
        ax.plot(t, np.imag(display), "r-", label="Q", alpha=0.8)
        ax.set_title("Time Domain (I & Q)")
        ax.set_xlabel("Time (ms)")
        ax.set_ylabel("Amplitude")
        ax.grid(True, alpha=0.3)
        ax.legend(fontsize=9)
        return "time_domain"

    def _apply_frequency_axis_guides(self, ax):
        cfg = getattr(self, "visualization_config", None)
        show_crosshair = True if cfg is None else getattr(cfg, "show_frequency_crosshair", True)
        if not show_crosshair:
            return
        try:
            ax.axvline(0.0, color="gray", linewidth=0.8, alpha=0.6)
            ax.axhline(0.0, color="gray", linewidth=0.8, alpha=0.6)
        except Exception:
            # keep failures non-fatal for plotting pipeline
            pass

    def _plot_power_spectrum(self, ax, samples, sample_rate):
        fft_size = min(8192, len(samples))
        if fft_size < 256:
            fft_size = 256
        fft_size = 2 ** int(np.log2(fft_size))
        seg = samples[:fft_size]
        window = np.hanning(len(seg))
        wc = np.mean(window**2)
        spec = fft(seg * window)
        spec_s = fftshift(spec)
        freq = fftshift(np.fft.fftfreq(len(seg), 1.0 / sample_rate)) / 1e6
        psd = (np.abs(spec_s) ** 2) / (sample_rate * len(seg) * wc)
        psd_db = 10 * np.log10(psd + 1e-12)
        ax.plot(freq, psd_db, "purple", linewidth=1)
        ax.set_title("Power Spectrum")
        ax.set_xlabel("Frequency Offset (MHz)")
        ax.set_ylabel("PSD (dB)")
        # Configure tick locators and labels so axes remain visible
        try:
            ax.tick_params(axis='both', which='major', labelsize=9)
            ax.xaxis.set_major_locator(MaxNLocator(nbins='auto', prune=None, steps=None, min_n_ticks=5, integer=False, symmetric=False))
            ax.yaxis.set_major_locator(MultipleLocator(10.0))
            ax.yaxis.set_minor_locator(MultipleLocator(2.0))
            ax.xaxis.set_minor_locator(AutoMinorLocator(2))
        except Exception:
            # Fall back silently if the backend lacks these helpers
            pass

        # Configure major/minor grid for clearer readability
        ax.grid(True, which='major', linestyle='-', linewidth=0.6, alpha=0.3)
        try:
            ax.grid(True, which='minor', linestyle='--', linewidth=0.4, alpha=0.1)
        except Exception:
            pass

        # Apply configurable y-axis limits to focus on relevant dynamic range
        cfg = getattr(self, "visualization_config", None)
        y_min = -120.0
        y_max = 20.0
        if cfg is not None:
            y_min = getattr(cfg, "power_spectrum_y_min", y_min)
            y_max = getattr(cfg, "power_spectrum_y_max", y_max)
        if y_min < y_max:
            ax.set_ylim(y_min, y_max)
        self._apply_frequency_axis_guides(ax)
        return "frequency_domain"

    def _plot_spectrogram(self, ax, samples, sample_rate):
        if len(samples) <= 2048:
            ax.text(0.5, 0.5, "Signal too short for spectrogram", ha="center", va="center")
            ax.set_title("Spectrogram")
            return "spectrogram"
        nperseg = min(512, max(128, len(samples) // 8))
        noverlap = nperseg // 2
        f, t, Sxx = spectrogram(samples, fs=sample_rate, nperseg=nperseg, noverlap=noverlap, window='hann', return_onesided=False, scaling='density', mode='complex')
        Sxx_db = 10 * np.log10(np.abs(Sxx) + 1e-12)
        Sxx_db = fftshift(Sxx_db, axes=0)
        f_shift = fftshift(f) / 1e6
        im = ax.pcolormesh(t * 1000.0, f_shift, Sxx_db, shading='gouraud', cmap='viridis')
        ax.set_ylabel('Frequency Offset (MHz)')
        ax.set_xlabel('Time (ms)')
        ax.set_title('Spectrogram')
        plt.colorbar(im, ax=ax, label='Power (dB)')
        return 'spectrogram'

    def _plot_constellation(self, ax, samples):
        step = max(1, len(samples) // 1000)
        pts = samples[::step]
        pts = pts[:2000]
        ax.scatter(np.real(pts), np.imag(pts), s=6, alpha=0.6, c=np.arange(len(pts)), cmap='viridis')
        ax.set_title('Constellation')
        ax.set_xlabel('I')
        ax.set_ylabel('Q')
        ax.axis('equal')
        return 'constellation'

    def _plot_squared_spectrum(self, ax, samples, sample_rate):
        fft_size = min(8192, len(samples))
        if fft_size < 256:
            fft_size = 256
        fft_size = 2 ** int(np.log2(fft_size))
        seg = samples[:fft_size]
        sq = seg ** 2
        window = np.hanning(len(seg))
        spec = fft(sq * window)
        spec_s = fftshift(spec)
        freq = fftshift(np.fft.fftfreq(len(seg), 1.0 / sample_rate)) / 1e6
        power = np.abs(spec_s) ** 2 / (len(seg) * sample_rate)
        db = 10 * np.log10(power + 1e-12)
        ax.plot(freq, db, 'g')
        ax.set_title('Quadratic Spectrum (x^2)')
        ax.set_xlabel('Frequency (MHz)')
        ax.set_ylabel('Power (dB)')
        ax.grid(True, alpha=0.3)
        self._apply_frequency_axis_guides(ax)
        return 'quadratic_spectrum'

    def _plot_quartic_spectrum(self, ax, samples, sample_rate):
        fft_size = min(8192, len(samples))
        if fft_size < 256:
            fft_size = 256
        fft_size = 2 ** int(np.log2(fft_size))
        seg = samples[:fft_size]
        q = seg ** 4
        window = np.hanning(len(seg))
        spec = fft(q * window)
        spec_s = fftshift(spec)
        freq = fftshift(np.fft.fftfreq(len(seg), 1.0 / sample_rate)) / 1e6
        power = np.abs(spec_s) ** 2 / (len(seg) * sample_rate)
        db = 10 * np.log10(power + 1e-12)
        ax.plot(freq, db, 'r')
        ax.set_title('Quartic Spectrum (x^4)')
        ax.set_xlabel('Frequency (MHz)')
        ax.set_ylabel('Power (dB)')
        ax.grid(True, alpha=0.3)
        self._apply_frequency_axis_guides(ax)
        return 'quartic_spectrum'

    def _estimate_bandwidth(self, power_spectrum_db, freq_axis):
        try:
            peak = np.argmax(power_spectrum_db)
            peak_power = power_spectrum_db[peak]
            thr = peak_power - 3.0
            mask = power_spectrum_db >= thr
            if not np.any(mask):
                return 0.0
            idx = np.where(mask)[0]
            bw = freq_axis[idx[-1]] - freq_axis[idx[0]]
            return max(bw, 0.0)
        except Exception:
            return 0.0

    def _find_peaks_with_prominence(self, power_spectrum_db, freq_axis, n_peaks=3):
        try:
            peaks, props = signal.find_peaks(power_spectrum_db, prominence=3, distance=10)
            if len(peaks) == 0:
                return []
            prominences = props.get('prominences', None)
            order = np.argsort(prominences)[::-1] if prominences is not None else np.argsort(power_spectrum_db[peaks])[::-1]
            sel = peaks[order][:n_peaks]
            out = []
            for p in sel:
                out.append((freq_axis[p], power_spectrum_db[p], int(p)))
            return out
        except Exception:
            return []

    def _create_individual_plots(self, samples, sample_rate, center_freq, filename):
        out = {}
        # time
        fig, ax = plt.subplots(figsize=(10, 4))
        self._plot_time_domain(ax, samples, sample_rate)
        name = f"time_domain_{uuid.uuid4().hex[:8]}.png"
        plt.tight_layout()
        plt.savefig(self.plot_dir / name, dpi=100, bbox_inches='tight')
        plt.close(fig)
        out['time_domain_single'] = name
        # frequency
        fig, ax = plt.subplots(figsize=(10, 4))
        self._plot_power_spectrum(ax, samples, sample_rate)
        name = f"frequency_domain_{uuid.uuid4().hex[:8]}.png"
        plt.tight_layout()
        plt.savefig(self.plot_dir / name, dpi=100, bbox_inches='tight')
        plt.close(fig)
        out['frequency_domain_single'] = name
        # constellation
        fig, ax = plt.subplots(figsize=(6, 6))
        self._plot_constellation(ax, samples)
        name = f"constellation_{uuid.uuid4().hex[:8]}.png"
        plt.tight_layout()
        plt.savefig(self.plot_dir / name, dpi=100, bbox_inches='tight')
        plt.close(fig)
        out['constellation_single'] = name
        return out

    def get_plot_url(self, filename: str) -> str:
        return f"/files/plots/{filename}"

    def create_analysis_plots(self, samples, sample_rate, center_freq, filename) -> Dict[str, str]:
        samples = np.asarray(samples)
        results: Dict[str, str] = {}
        # overview 2x2
        try:
            fig, axes = plt.subplots(2, 2, figsize=(12, 8))
            self._plot_time_domain(axes[0, 0], samples, sample_rate)
            self._plot_power_spectrum(axes[0, 1], samples, sample_rate)
            self._plot_constellation(axes[1, 0], samples)
            self._plot_spectrogram(axes[1, 1], samples, sample_rate)
            name = f"overview_{uuid.uuid4().hex[:8]}.png"
            plt.tight_layout()
            plt.savefig(self.plot_dir / name, dpi=120, bbox_inches='tight')
            plt.close(fig)
            results['overview'] = name
        except Exception as e:
            print(f"overview failed: {e}")

        # individual
        try:
            ind = self._create_individual_plots(samples, sample_rate, center_freq, filename)
            results.update(ind)
        except Exception as e:
            print(f"individual plots failed: {e}")

        # higher-order
        try:
            fig, axes = plt.subplots(1, 2, figsize=(12, 5))
            self._plot_squared_spectrum(axes[0], samples, sample_rate)
            self._plot_quartic_spectrum(axes[1], samples, sample_rate)
            name = f"higher_order_{uuid.uuid4().hex[:8]}.png"
            plt.tight_layout()
            plt.savefig(self.plot_dir / name, dpi=120, bbox_inches='tight')
            plt.close(fig)
            results['higher_order'] = name
        except Exception as e:
            print(f"higher order failed: {e}")

        # spectrogram single
        try:
            fig, ax = plt.subplots(figsize=(10, 4))
            self._plot_spectrogram(ax, samples, sample_rate)
            name = f"spectrogram_{uuid.uuid4().hex[:8]}.png"
            plt.tight_layout()
            plt.savefig(self.plot_dir / name, dpi=120, bbox_inches='tight')
            plt.close(fig)
            results['spectrogram'] = name
        except Exception as e:
            print(f"spectrogram single failed: {e}")

        # quadratic & quartic single
        try:
            fig, ax = plt.subplots(figsize=(8, 4))
            self._plot_squared_spectrum(ax, samples, sample_rate)
            name = f"quadratic_{uuid.uuid4().hex[:8]}.png"
            plt.tight_layout()
            plt.savefig(self.plot_dir / name, dpi=120, bbox_inches='tight')
            plt.close(fig)
            results['quadratic_spectrum'] = name
        except Exception as e:
            print(f"quadratic single failed: {e}")

        try:
            fig, ax = plt.subplots(figsize=(8, 4))
            self._plot_quartic_spectrum(ax, samples, sample_rate)
            name = f"quartic_{uuid.uuid4().hex[:8]}.png"
            plt.tight_layout()
            plt.savefig(self.plot_dir / name, dpi=120, bbox_inches='tight')
            plt.close(fig)
            results['quartic_spectrum'] = name
        except Exception as e:
            print(f"quartic single failed: {e}")

        return results


# Backwards-compatible wrapper
class SignalVisualizer(EnhancedSignalVisualizer):
    def __init__(self, plot_dir: str = "var/uploads/plots"):
        super().__init__(plot_dir)

    def plot_time_domain(self, samples, sample_rate, title="Time Domain Waveform"):
        r = self.create_analysis_plots(samples, sample_rate, 0, 'signal')
        return r.get('time_domain') or r.get('time_domain_single')

    def plot_frequency_domain(self, samples, sample_rate, title="Power Spectrum"):
        r = self.create_analysis_plots(samples, sample_rate, 0, 'signal')
        return r.get('frequency_domain') or r.get('frequency_domain_single')

    def plot_constellation(self, samples, sps=None, title="Constellation Diagram"):
        r = self.create_analysis_plots(samples, sample_rate=1, center_freq=0, filename='signal')
        return r.get('constellation') or r.get('constellation_single')


# Streaming/file-based visualizer additions
class FileStreamProcessor:
    """File reading helpers that yield complex sample chunks."""

    @staticmethod
    def read_iq_interleaved(file_path: str, chunk_complex: int = 1024) -> Generator[List[complex], None, None]:
        """Read interleaved float32 I,Q pairs from a binary file in chunks."""
        try:
            with open(file_path, 'rb') as f:
                bytes_per_chunk = chunk_complex * 8
                while True:
                    data = f.read(bytes_per_chunk)
                    if not data:
                        break
                    # ensure buffer length is a multiple of 4 bytes (float32 size)
                    if len(data) % 4 != 0:
                        # drop trailing incomplete bytes
                        trim = (len(data) // 4) * 4
                        # only trim if we have at least one float
                        if trim == 0:
                            # nothing usable in this chunk
                            continue
                        # log trimming for diagnostics
                        try:
                            print(f"read_iq_interleaved: trimming {len(data)-trim} trailing bytes to align to float32")
                        except Exception:
                            pass
                        data = data[:trim]

                    # interpret as float32 pairs using numpy for robustness and speed
                    try:
                        import numpy as _np
                        floats_arr = _np.frombuffer(data, dtype=_np.float32)
                        if floats_arr.size == 0:
                            continue
                        floats = floats_arr.tolist()
                    except Exception:
                        # fallback to struct.iter_unpack if numpy unavailable or fails
                        try:
                            vals = struct.iter_unpack('f', data)
                            floats = [v[0] for v in vals]
                        except Exception as e:
                            print(f"read_iq_interleaved struct iter_unpack error: {e}")
                            continue

                    # if odd length, drop last float to keep pairs
                    if len(floats) % 2 != 0:
                        floats = floats[:-1]

                    samples = [complex(floats[i], floats[i+1]) for i in range(0, len(floats), 2)]
                    if samples:
                        yield samples
        except Exception as e:
            print(f"read_iq_interleaved error: {e}")
            return

    @staticmethod
    def read_complex32(file_path: str, chunk_complex: int = 1024) -> Generator[List[complex], None, None]:
        """Read complex64 (complex64/complex32) binary file in chunks using numpy.frombuffer."""
        try:
            import numpy as _np
            with open(file_path, 'rb') as f:
                bytes_per_chunk = chunk_complex * 8
                while True:
                    data = f.read(bytes_per_chunk)
                    if not data:
                        break
                    arr = _np.frombuffer(data, dtype=_np.complex64)
                    if arr.size == 0:
                        continue
                    yield arr.tolist()
        except Exception as e:
            print(f"read_complex32 error: {e}")
            return


class StreamingSignalVisualizer(EnhancedSignalVisualizer):
    """Visualiser that supports streaming sessions driven by file chunks.

    Use start_file_streaming to create a session_id, then poll SSE endpoint
    which will serve JSON-encoded updates for the session.
    """

    def __init__(self, plot_dir: str = "var/uploads/plots"):
        super().__init__(plot_dir)
        self.file_processor = FileStreamProcessor()
        self.streaming_sessions = {}
        self.session_lock = threading.Lock()
        self.config_manager = get_config_manager()
        logger.info("StreamingSignalVisualizer initialized with configuration support")

    # ------------------------------------------------------------------
    # Session management helpers
    # ------------------------------------------------------------------
    def _normalize_scan_config(self, scan_config) -> Dict[str, object]:
        defaults = {
            'start_freq': 88e6,
            'stop_freq': 108e6,
            'resolution': 100e3,
            'dwell_time': 0.1,
            'sample_rate': 2e6,
            'avg_count': 1,
            'overlap': 0.0,
            'scan_interval': 0.0,
            'continuous': True,
            'fft_size': 0,
            'max_segments': 6,
        }

        resolved = dict(defaults)
        if scan_config is None:
            return resolved

        if isinstance(scan_config, dict):
            source = scan_config
        elif is_dataclass(scan_config):
            try:
                source = asdict(scan_config)
            except Exception:
                source = {}
        else:
            source = {}
            for key in defaults.keys():
                if hasattr(scan_config, key):
                    source[key] = getattr(scan_config, key)

        for key, value in (source or {}).items():
            if value is None:
                continue

            if key == 'continuous':
                resolved[key] = bool(value)
            elif key in {'avg_count'}:
                try:
                    resolved[key] = max(1, int(value))
                except Exception:
                    continue
            elif key == 'overlap':
                try:
                    resolved[key] = max(0.0, min(float(value), 0.9))
                except Exception:
                    continue
            elif key == 'max_segments':
                try:
                    resolved[key] = max(2, min(int(value), 20))
                except Exception:
                    continue
            elif key in defaults:
                try:
                    resolved[key] = float(value)
                except Exception:
                    continue
            else:
                resolved[key] = value

        try:
            resolved['max_segments'] = max(2, min(int(resolved.get('max_segments', 20)), 20))
        except Exception:
            resolved['max_segments'] = 20

        if resolved['start_freq'] >= resolved['stop_freq']:
            resolved['stop_freq'] = resolved['start_freq'] + abs(resolved.get('resolution', defaults['resolution']))

        return resolved

    def create_session(self, session_id: str, mode: str, file_path: Optional[str] = None, config: Optional[Dict[str, object]] = None) -> str:
        """Register or update a streaming session with a specific mode."""
        normalized_mode = mode or 'analysis'
        include_extras = normalized_mode == 'analysis'
        base_record = {
            'session_id': session_id,
            'mode': normalized_mode,
            'include_extras': include_extras,
            'file_path': file_path,
            'config': dict(config or {}),
            'start_time': time.time(),
            'completed': False,
            'error': None,
            'data': None,
            'status': 'starting',
            'last_update': None,
        }

        with self.session_lock:
            existing = self.streaming_sessions.get(session_id)
            if existing:
                existing.update(base_record)
            else:
                self.streaming_sessions[session_id] = base_record

        logger.info("Streaming session registered: session=%s mode=%s", session_id, normalized_mode)
        return session_id

    def should_include_extras(self, session_id: str) -> bool:
        with self.session_lock:
            session = self.streaming_sessions.get(session_id)
            if not session:
                return True
            if 'include_extras' not in session:
                session['include_extras'] = session.get('mode') == 'analysis'
            return bool(session.get('include_extras'))

    def get_session_mode(self, session_id: str) -> str:
        with self.session_lock:
            session = self.streaming_sessions.get(session_id)
            if not session:
                return 'analysis'
            return session.get('mode', 'analysis')

    def update_session_mode(
        self,
        session_id: str,
        mode: str,
        include_extras: Optional[bool] = None,
    ) -> bool:
        normalized_mode = mode or 'analysis'
        with self.session_lock:
            session = self.streaming_sessions.get(session_id)
            if not session:
                return False
            session['mode'] = normalized_mode
            if include_extras is None:
                include_extras = normalized_mode == 'analysis'
            session['include_extras'] = bool(include_extras)
            return True

    def format_stream_payload(self, session_id: str, data_dict: Dict[str, object]) -> Dict[str, object]:
        """Normalize outbound stream payload according to the session mode."""
        if not isinstance(data_dict, dict):
            data_dict = {}

        include_extras = self.should_include_extras(session_id)

        metadata = dict(data_dict.get('metadata') or {})
        metadata['include_extras'] = include_extras

        frequency = data_dict.get('frequency_domain') or self._empty_frequency_domain()

        if include_extras:
            time_domain = data_dict.get('time_domain') or self._empty_time_domain()
            constellation = data_dict.get('constellation') or self._empty_constellation()
            higher_order = data_dict.get('higher_order') or self._empty_higher_order()
            eye_diagram = data_dict.get('eye_diagram') or self._empty_eye_diagram()
        else:
            time_domain = self._empty_time_domain()
            constellation = self._empty_constellation()
            higher_order = self._empty_higher_order()
            eye_diagram = self._empty_eye_diagram()

        final_streams = {
            'frequency_domain': frequency,
            'time_domain': time_domain,
            'constellation': constellation,
            'higher_order': higher_order,
            'eye_diagram': eye_diagram,
            'metadata': metadata,
        }

        payload_meta = {
            'session_id': session_id,
            'include_extras': include_extras,
            'last_update': time.time(),
        }

        with self.session_lock:
            session = self.streaming_sessions.get(session_id)
            if session:
                payload_meta['mode'] = session.get('mode', 'analysis')
                payload_meta['status'] = session.get('status', 'streaming')
                if session.get('scan_settings') is not None:
                    payload_meta['scan_settings'] = session.get('scan_settings')
                if session.get('scan_progress') is not None:
                    payload_meta['scan_progress'] = session.get('scan_progress')
                session['include_extras'] = include_extras
            else:
                payload_meta['mode'] = 'analysis'
                payload_meta['status'] = 'streaming'

        return {'meta': payload_meta, 'streams': final_streams}

    @staticmethod
    def _empty_frequency_domain() -> Dict[str, list]:
        return {'frequency': [], 'power': [], 'phase': []}

    @staticmethod
    def _empty_time_domain() -> Dict[str, list]:
        return {'time': [], 'i_component': [], 'q_component': []}

    @staticmethod
    def _empty_constellation() -> Dict[str, list]:
        return {'i_component': [], 'q_component': []}

    @staticmethod
    def _empty_higher_order() -> Dict[str, list]:
        return {'frequency': [], 'quadratic_power': [], 'quartic_power': []}

    @staticmethod
    def _empty_eye_diagram() -> Dict[str, object]:
        return {
            'time': [],
            'i_traces': [],
            'q_traces': [],
            'samples_per_symbol': 0,
            'window_symbols': 0,
            'sample_rate': 0.0,
        }

    def start_file_streaming(self, file_path: str, file_format: str = 'auto', sample_rate: float = 1e6,
                             center_freq: float = 0.0, chunk_size: int = 4096, update_interval: float = 0.1,
                             loop_enabled: bool = True) -> str:
        session_id = uuid.uuid4().hex
        self.create_session(
            session_id,
            mode='analysis',
            file_path=file_path,
            config={
                'file_format': file_format,
                'sample_rate': sample_rate,
                'center_freq': center_freq,
                'chunk_size': chunk_size,
                'update_interval': update_interval,
                'loop_enabled': loop_enabled,
            },
        )

        def worker():
            streaming_config = getattr(self.config_manager, 'streaming', None)
            min_chunk_cfg = getattr(streaming_config, 'min_chunk_size', 256) if streaming_config else 256
            max_chunk_cfg = getattr(streaming_config, 'max_chunk_size', 16384) if streaming_config else 16384
            if min_chunk_cfg <= 0:
                min_chunk_cfg = 2
            if max_chunk_cfg <= 0:
                max_chunk_cfg = 16384
            if max_chunk_cfg < min_chunk_cfg:
                max_chunk_cfg = max(min_chunk_cfg, 16384)

            def session_record():
                return self.streaming_sessions.get(session_id)

            recent_samples: List[complex] = []
            local_chunk_size = int(chunk_size) if chunk_size else 4096
            if local_chunk_size <= 0:
                local_chunk_size = 4096
            if local_chunk_size > max_chunk_cfg:
                local_chunk_size = max_chunk_cfg
            if local_chunk_size % 2 != 0:
                local_chunk_size -= 1
                if local_chunk_size <= 0:
                    local_chunk_size = 2
            window_limit = max(local_chunk_size * 4, 8192)
            file_total_samples = 0
            try:
                import os
                file_size = os.path.getsize(file_path) if os.path.exists(file_path) else 0
                if file_size > 0:
                    if file_format == 'complex32' or file_path.endswith('.cf32'):
                        file_total_samples = max(file_total_samples, file_size // 8)
                    elif not ((file_format and file_format.lower() in ('h5', 'hdf5')) or file_path.endswith('.h5')):
                        file_total_samples = max(file_total_samples, (file_size // 4) // 2)
                    if 0 < file_total_samples < local_chunk_size:
                        if file_total_samples <= max(2, min_chunk_cfg):
                            local_chunk_size = max(2, file_total_samples)
                        else:
                            adaptive_chunk = max(min_chunk_cfg, file_total_samples // 4)
                            if adaptive_chunk <= 0:
                                adaptive_chunk = min_chunk_cfg
                            if adaptive_chunk > file_total_samples:
                                adaptive_chunk = file_total_samples
                            local_chunk_size = max(2, adaptive_chunk)
                        if local_chunk_size % 2 != 0:
                            local_chunk_size -= 1
                            if local_chunk_size <= 0:
                                local_chunk_size = 2
                    if 0 < file_total_samples < window_limit:
                        window_limit = max(local_chunk_size * 2, file_total_samples)

                session = session_record()
                if session:
                    session['window_limit'] = window_limit

                def build_reader():
                    nonlocal file_total_samples, window_limit, local_chunk_size
                    # Special-case HDF5: read dataset-aware so we can ensure alignment and even I/Q counts
                    if (file_format and file_format.lower() in ('h5', 'hdf5')) or file_path.endswith('.h5'):
                        try:
                            import os
                            import h5py
                            import numpy as _np

                            if not os.path.exists(file_path):
                                msg = f"h5_reader: file not found: {file_path}"
                                try:
                                    logging.getLogger('uvicorn').error(msg)
                                except Exception:
                                    print(msg)
                                self.streaming_sessions[session_id]['error'] = msg
                                return []

                            def h5_reader():
                                nonlocal file_total_samples, local_chunk_size, window_limit
                                with h5py.File(file_path, 'r') as fh:
                                    if 'data' in fh:
                                        dset = fh['data']
                                    elif 'samples' in fh:
                                        dset = fh['samples']
                                    else:
                                        keys = [k for k in fh.keys()]
                                        dset = fh[keys[0]] if len(keys) > 0 else None

                                    if dset is None:
                                        msg = f"h5_reader: no datasets found in {file_path}"
                                        try:
                                            logging.getLogger('uvicorn').error(msg)
                                        except Exception:
                                            print(msg)
                                        self.streaming_sessions[session_id]['error'] = msg
                                        return

                                    try:
                                        if dset.dtype.kind == 'c':
                                            total_local = int(dset.shape[0])
                                            mode_local = 'complex'
                                        elif getattr(dset, 'ndim', 0) == 2 and dset.shape[-1] == 2:
                                            total_local = int(dset.shape[0])
                                            mode_local = '2col'
                                        elif getattr(dset, 'ndim', 0) == 1 and dset.dtype.kind in ('f', 'i'):
                                            total_floats = int(dset.shape[0])
                                            total_local = total_floats // 2
                                            mode_local = 'interleaved'
                                        else:
                                            arr0 = _np.asarray(dset[()])
                                            if arr0.ndim == 1 and arr0.dtype.kind in ('f', 'i'):
                                                total_local = arr0.size // 2
                                                mode_local = 'interleaved'
                                            elif arr0.ndim >= 1:
                                                total_local = arr0.shape[0]
                                                mode_local = 'complex_like'
                                            else:
                                                total_local = 0
                                                mode_local = 'unknown'
                                    except Exception as e:
                                        total_local = 0
                                        mode_local = 'error'
                                        try:
                                            logging.getLogger('uvicorn').error(f"h5_reader: dtype/shape inspect failed: {e}")
                                        except Exception:
                                            print(f"h5_reader: dtype/shape inspect failed: {e}")

                                    if total_local <= 0:
                                        msg = f"h5_reader: dataset appears empty or too small in {file_path} (mode={mode_local})"
                                        try:
                                            logging.getLogger('uvicorn').warning(msg)
                                        except Exception:
                                            print(msg)
                                        self.streaming_sessions[session_id]['error'] = msg
                                        return

                                    file_total_samples = max(file_total_samples, total_local)
                                    if total_local > 0 and local_chunk_size > total_local:
                                        if total_local <= max(2, min_chunk_cfg):
                                            local_chunk_size = max(2, total_local)
                                        else:
                                            adaptive_chunk = max(min_chunk_cfg, total_local // 4)
                                            if adaptive_chunk <= 0:
                                                adaptive_chunk = min_chunk_cfg
                                            if adaptive_chunk > total_local:
                                                adaptive_chunk = total_local
                                            local_chunk_size = max(2, adaptive_chunk)
                                    if local_chunk_size % 2 != 0:
                                        local_chunk_size -= 1
                                        if local_chunk_size <= 0:
                                            local_chunk_size = 2
                                    samples_per_read = local_chunk_size if local_chunk_size > 0 else 1024
                                    if samples_per_read % 2 != 0:
                                        samples_per_read -= 1
                                        if samples_per_read <= 0:
                                            samples_per_read = 2
                                    if 0 < file_total_samples < window_limit:
                                        window_limit = max(local_chunk_size * 2, file_total_samples)

                                    try:
                                        if mode_local == 'complex':
                                            for start in range(0, total_local, samples_per_read):
                                                end = min(start + samples_per_read, total_local)
                                                block = dset[start:end]
                                                arr = _np.asarray(block)
                                                if arr.size == 0:
                                                    continue
                                                yield arr.astype(_np.complex128).tolist()
                                        elif mode_local == '2col':
                                            for start in range(0, total_local, samples_per_read):
                                                end = min(start + samples_per_read, total_local)
                                                block = dset[start:end]
                                                arr = _np.asarray(block)
                                                if arr.size == 0:
                                                    continue
                                                i = arr[:, 0].astype(_np.float64)
                                                q = arr[:, 1].astype(_np.float64)
                                                yield (_np.array(i) + 1j * _np.array(q)).tolist()
                                        elif mode_local == 'interleaved':
                                            total_floats_local = int(dset.shape[0])
                                            for start in range(0, total_local, samples_per_read):
                                                fstart = start * 2
                                                fend = min((start + samples_per_read) * 2, total_floats_local)
                                                block = dset[fstart:fend]
                                                flat = _np.asarray(block).ravel().astype(_np.float64)
                                                if flat.size % 2 != 0:
                                                    flat = flat[:-1]
                                                if flat.size == 0:
                                                    continue
                                                pairs = flat.reshape(-1, 2)
                                                yield (pairs[:, 0] + 1j * pairs[:, 1]).tolist()
                                        else:
                                            raw = dset[()]
                                            flat = _np.asarray(raw).ravel()
                                            if flat.size % 2 != 0:
                                                flat = flat[:-1]
                                            for start in range(0, flat.size // 2, samples_per_read):
                                                s = start * 2
                                                e = min((start + samples_per_read) * 2, flat.size)
                                                block = flat[s:e]
                                                if block.size % 2 != 0:
                                                    block = block[:-1]
                                                if block.size == 0:
                                                    continue
                                                p = block.reshape(-1, 2)
                                                yield (p[:, 0] + 1j * p[:, 1]).tolist()
                                    except Exception as e:
                                        try:
                                            logging.getLogger('uvicorn').error(f"h5_reader: iteration error: {e}")
                                        except Exception:
                                            print(f"h5_reader: iteration error: {e}")
                                        return

                            return h5_reader()
                        except Exception as e:
                            try:
                                logging.getLogger('uvicorn').error(f"h5_reader: failed to open/read HDF5 {file_path}: {e}")
                            except Exception:
                                print(f"h5_reader: failed to open/read HDF5 {file_path}: {e}")

                    if file_format == 'complex32' or file_path.endswith('.cf32'):
                        return self.file_processor.read_complex32(file_path, local_chunk_size)
                    return self.file_processor.read_iq_interleaved(file_path, local_chunk_size)

                loop_count = 0
                processed_total = 0
                frame_index = 0

                while True:
                    session = session_record()
                    if not session or session.get('stopped'):
                        break

                    reader = build_reader()
                    consumed = False

                    for chunk in reader:
                        if not chunk:
                            continue

                        consumed = True
                        session = session_record()
                        if not session or session.get('stopped'):
                            break

                        processed_total += len(chunk)
                        frame_index += 1
                        if file_total_samples > 0:
                            loop_progress = processed_total % file_total_samples
                            if loop_progress == 0 and processed_total > 0:
                                loop_progress = file_total_samples
                        else:
                            loop_progress = processed_total
                        recent_samples.extend(chunk)
                        if len(recent_samples) > window_limit:
                            recent_samples = recent_samples[-window_limit:]

                        window_start = max(0, processed_total - len(recent_samples))

                        try:
                            streams = self.create_streaming_data(
                                recent_samples,
                                sample_rate,
                                center_freq,
                                fft_size=local_chunk_size,
                                start_index=window_start,
                            )
                        except Exception as e:
                            streams = {'error': str(e)}

                        session = session_record()
                        if not session:
                            break

                        frame_timestamp = time.time()

                        meta = streams.setdefault('metadata', {})
                        meta['frame_index'] = frame_index
                        meta['loop_count'] = loop_count
                        meta['samples_processed'] = processed_total
                        meta['window_start'] = window_start
                        meta['sample_clock'] = processed_total
                        meta['sample_rate'] = sample_rate
                        meta['chunk_size'] = len(chunk)
                        meta['window_limit'] = window_limit
                        meta['loop_progress'] = loop_progress
                        meta['last_frame_time'] = frame_timestamp
                        if file_total_samples:
                            meta['file_total_samples'] = file_total_samples

                        streams['total_samples'] = processed_total

                        session['data'] = streams
                        session['total_samples'] = processed_total
                        session['samples_processed'] = processed_total
                        session['frame_index'] = frame_index
                        session['loop_count'] = loop_count
                        session['window_start'] = window_start
                        session['sample_clock'] = processed_total
                        session['sample_rate'] = sample_rate
                        session['last_update'] = frame_timestamp
                        session['file_total_samples'] = file_total_samples
                        session['loop_progress'] = loop_progress
                        session['chunk_size'] = len(chunk)
                        session['window_limit'] = window_limit
                        session['last_frame_time'] = frame_timestamp

                        time.sleep(update_interval)

                    session = session_record()
                    if not session:
                        break

                    if not consumed:
                        session['completed'] = True
                        session['status'] = 'completed'
                        break

                    loop_count += 1
                    session['loop_count'] = loop_count

                    if not session.get('loop', True):
                        session['completed'] = True
                        session['status'] = 'completed'
                        break

                    session['completed'] = False
                    if len(recent_samples) > window_limit:
                        recent_samples = recent_samples[-window_limit:]

                session = session_record()
                if session:
                    session['completed'] = True
                    if not session.get('status'):
                        session['status'] = 'completed'
            except Exception as e:
                session = self.streaming_sessions.get(session_id)
                if session:
                    session['error'] = str(e)
                    session['status'] = 'failed'
            finally:
                session = self.streaming_sessions.get(session_id)
                if session and session.get('stopped'):
                    session['completed'] = True
                    session['status'] = session.get('status') or 'stopped'
                if session:
                    session['thread'] = None
                if session:
                    if session.get('stopped'):
                        self.streaming_sessions.pop(session_id, None)
                    else:
                        session['cleanup_time'] = time.time()

        # initialize session record and start worker
        with self.session_lock:
            session_record = self.streaming_sessions.get(session_id, {})
            session_record.update(
                {
                    'file_path': file_path,
                    'start_time': time.time(),
                    'completed': False,
                    'error': None,
                    'data': None,
                    'total_samples': 0,
                    'samples_processed': 0,
                    'last_update': None,
                    'stopped': False,
                    'thread': None,
                    'loop': loop_enabled,
                    'loop_count': 0,
                    'window_start': 0,
                    'sample_clock': 0,
                    'file_total_samples': 0,
                    'sample_rate': sample_rate,
                    'center_freq': center_freq,
                    'frame_index': 0,
                    'loop_progress': 0,
                    'chunk_size': 0,
                    'window_limit': 0,
                    'last_frame_time': None,
                    'mode': 'analysis',
                    'include_extras': True,
                    'status': 'running',
                    'update_interval': float(update_interval),
                    'final_metadata': {},
                }
            )
            self.streaming_sessions[session_id] = session_record

        thread = threading.Thread(target=worker, daemon=True)
        thread.start()
        with self.session_lock:
            session = self.streaming_sessions.get(session_id)
            if session is not None:
                session['thread'] = thread
        return session_id

    def start_scan_streaming(self, session_id: str, scan_config=None) -> str:
        config = self._normalize_scan_config(scan_config)
        if 'fft_size' in config:
            try:
                config['fft_size'] = int(config['fft_size'])
            except Exception:
                config['fft_size'] = 0
        sample_rate = float(config.get('sample_rate') or 0.0)
        update_interval = float(config.get('scan_interval') or 0.5)

        self.create_session(session_id, mode='scan', config=config)

        try:
            max_segments_val = int(config.get('max_segments') or 0)
        except Exception:
            max_segments_val = 0

        session_record = {
            'file_path': None,
            'start_time': time.time(),
            'completed': False,
            'error': None,
            'data': None,
            'total_samples': 0,
            'samples_processed': 0,
            'last_update': None,
            'stopped': False,
            'thread': None,
            'loop': False,
            'loop_count': 0,
            'window_start': 0,
            'sample_clock': 0,
            'file_total_samples': 0,
            'sample_rate': sample_rate,
            'center_freq': None,
            'frame_index': 0,
            'loop_progress': 0,
            'chunk_size': 0,
            'window_limit': 0,
            'last_frame_time': None,
            'status': 'starting',
            'update_interval': update_interval,
            'final_metadata': {},
            'scan_settings': config,
            'scan_progress': {},
            'fft_size': int(config.get('fft_size') or 0),
            'num_segments': 0,
            'include_extras': False,
            'preset': config.get('preset'),
            'max_segments': max_segments_val,
        }

        with self.session_lock:
            session = self.streaming_sessions.get(session_id, {})
            session.update(session_record)
            session['mode'] = 'scan'
            session['include_extras'] = False
            self.streaming_sessions[session_id] = session

        start_val = config.get('start_freq')
        stop_val = config.get('stop_freq')
        start_mhz = float(start_val) / 1e6 if isinstance(start_val, (int, float)) else 0.0
        stop_mhz = float(stop_val) / 1e6 if isinstance(stop_val, (int, float)) else 0.0
        logger.info(
            "start_scan_streaming: session=%s range=%.3f-%.3f MHz",
            session_id,
            start_mhz,
            stop_mhz,
        )

        return session_id

    def update_scan_session(
        self,
        session_id: str,
        spectrum_data,
        round_count: int,
        fft_size: int,
        num_segments: int,
    ):
        streams = self._format_scan_payload(session_id, spectrum_data, round_count, fft_size)
        if streams is None:
            return
        now = time.time()
        with self.session_lock:
            session = self.streaming_sessions.get(session_id)
            if not session:
                return

            settings = dict(session.get('scan_settings') or {})
            session['data'] = streams
            session['last_update'] = now
            session['status'] = 'streaming'
            session['frame_index'] = int(session.get('frame_index', 0)) + 1
            session['total_samples'] = len(streams.get('frequency_domain', {}).get('frequency', []))
            session['samples_processed'] = session['total_samples']
            session['fft_size'] = int(fft_size)
            session['num_segments'] = int(num_segments)
            session['last_segment'] = spectrum_data if isinstance(spectrum_data, dict) else None

            if isinstance(spectrum_data, dict):
                preset_name = spectrum_data.get('preset')
                if preset_name:
                    settings['preset'] = preset_name
                sr_value = spectrum_data.get('sample_rate')
                if sr_value is not None:
                    try:
                        numeric_sr = float(sr_value)
                        if np.isfinite(numeric_sr) and numeric_sr > 0:
                            settings['sample_rate'] = numeric_sr
                            session['sample_rate'] = numeric_sr
                    except Exception:
                        pass
                max_segments_val = spectrum_data.get('max_segments')
                if max_segments_val is not None:
                    try:
                        numeric_max = int(max_segments_val)
                        if numeric_max > 0:
                            settings['max_segments'] = numeric_max
                            session['max_segments'] = numeric_max
                    except Exception:
                        pass
                if settings:
                    session['scan_settings'] = settings
                preset_meta = spectrum_data.get('preset_settings')
                if isinstance(preset_meta, dict):
                    session['preset_meta'] = preset_meta

            progress = dict(session.get('scan_progress') or {})
            progress['round'] = round_count
            progress['timestamp'] = spectrum_data.get('timestamp') if isinstance(spectrum_data, dict) else None
            if isinstance(spectrum_data, dict):
                try:
                    progress['progress'] = float(spectrum_data.get('progress'))
                except Exception:
                    pass
                try:
                    progress['current_segment'] = int(spectrum_data.get('segment_index'))
                except Exception:
                    pass
                try:
                    progress['segments_total'] = int(spectrum_data.get('segment_count'))
                except Exception:
                    pass
                try:
                    progress['current_center_freq'] = float(spectrum_data.get('center_freq'))
                except Exception:
                    pass
            session['scan_progress'] = progress

        now = time.time()
        with self.session_lock:
            session = self.streaming_sessions.get(session_id)
            if not session:
                return

            settings = dict(session.get('scan_settings') or {})
            session['data'] = streams
            session['last_update'] = now
            session['status'] = 'streaming'
            session['frame_index'] = int(session.get('frame_index', 0)) + 1
            session['total_samples'] = len(streams.get('frequency_domain', {}).get('frequency', []))
            session['samples_processed'] = session['total_samples']
            session['fft_size'] = int(fft_size)
            session['num_segments'] = int(num_segments)
            session['last_segment'] = spectrum_data if isinstance(spectrum_data, dict) else None

            if isinstance(spectrum_data, dict):
                preset_name = spectrum_data.get('preset')
                if preset_name:
                    settings['preset'] = preset_name
                sr_value = spectrum_data.get('sample_rate')
                if sr_value is not None:
                    try:
                        numeric_sr = float(sr_value)
                        if np.isfinite(numeric_sr) and numeric_sr > 0:
                            settings['sample_rate'] = numeric_sr
                            session['sample_rate'] = numeric_sr
                    except Exception:
                        pass
                max_segments_val = spectrum_data.get('max_segments')
                if max_segments_val is not None:
                    try:
                        numeric_max = int(max_segments_val)
                        if numeric_max > 0:
                            settings['max_segments'] = numeric_max
                            session['max_segments'] = numeric_max
                    except Exception:
                        pass
                if settings:
                    session['scan_settings'] = settings
                preset_meta = spectrum_data.get('preset_settings')
                if isinstance(preset_meta, dict):
                    session['preset_meta'] = preset_meta

            progress = dict(session.get('scan_progress') or {})
            progress['round'] = round_count
            progress['timestamp'] = spectrum_data.get('timestamp') if isinstance(spectrum_data, dict) else None
            if isinstance(spectrum_data, dict):
                try:
                    progress['progress'] = float(spectrum_data.get('progress'))
                except Exception:
                    pass
                try:
                    progress['current_segment'] = int(spectrum_data.get('segment_index'))
                except Exception:
                    pass
                try:
                    progress['segments_total'] = int(spectrum_data.get('segment_count'))
                except Exception:
                    pass
                try:
                    progress['current_center_freq'] = float(spectrum_data.get('center_freq'))
                except Exception:
                    pass
            session['scan_progress'] = progress

    def update_scan_progress(self, session_id: str, progress_data):
        if not progress_data:
            return

        now = time.time()
        with self.session_lock:
            session = self.streaming_sessions.get(session_id)
            if not session:
                return

            existing = dict(session.get('scan_progress') or {})
            for key, value in (progress_data or {}).items():
                try:
                    if isinstance(value, np.ndarray):
                        value = value.tolist()
                    elif isinstance(value, np.generic):
                        value = value.item()
                except Exception:
                    pass

                if isinstance(value, (int, float)) and not isinstance(value, bool):
                    existing[key] = float(value)
                else:
                    existing[key] = value
            session['scan_progress'] = existing
            session['last_update'] = now
            if not session.get('status'):
                session['status'] = 'streaming'

    def _format_scan_payload(self, session_id: str, spectrum_data, round_count: int, fft_size: int):
        # only accept dict payloads for scan updates
        if not isinstance(spectrum_data, dict):
            return None

        # For optimized scan mode we do not include extras (time-domain, constellation, higher-order)
        freqs_raw = spectrum_data.get('frequencies') or []
        power_raw = spectrum_data.get('power') or []

        frequencies: List[float] = []
        for val in freqs_raw:
            try:
                # convert Hz -> MHz for front-end
                frequencies.append(float(val) / 1e6)
            except Exception:
                frequencies.append(0.0)

        power: List[float] = []
        for val in power_raw:
            try:
                power.append(float(val))
            except Exception:
                power.append(0.0)

        if not frequencies or not power:
            return None

        # compact payload: only frequency & power arrays and minimal metadata
        return {
            'frequency_domain': {
                'frequency': frequencies,
                'power': power,
            },
            'metadata': {
                'fft_size': int(fft_size) if fft_size else 0,
                'round': round_count,
            },
        }

        

    def start_realtime_streaming(
        self,
        sample_rate: float = 1e6,
        center_freq: float = 0.0,
        chunk_size: Optional[int] = None,
        update_interval: Optional[float] = None,
    ) -> str:
        session_id = uuid.uuid4().hex

        self.create_session(
            session_id,
            mode='realtime',
            config={
                'sample_rate': sample_rate,
                'center_freq': center_freq,
                'chunk_size': chunk_size,
                'update_interval': update_interval,
            },
        )

        streaming_config = getattr(self.config_manager, 'streaming', None)
        sr = float(sample_rate) if sample_rate else 0.0
        cf = float(center_freq) if center_freq else 0.0

        if streaming_config:
            target_fps = max(float(getattr(streaming_config, 'target_fps', 10.0) or 10.0), 1e-3)
            min_chunk = max(2, int(getattr(streaming_config, 'min_chunk_size', 256) or 256))
            max_chunk = max(min_chunk, int(getattr(streaming_config, 'max_chunk_size', 16384) or 16384))
            if chunk_size is None:
                if sr > 0 and target_fps > 0:
                    ideal_chunk = int(sr / target_fps)
                else:
                    ideal_chunk = min_chunk
                chunk_size = max(min_chunk, min(ideal_chunk, max_chunk))
            else:
                chunk_size = max(min_chunk, min(int(chunk_size), max_chunk))

            min_update = max(1e-3, float(getattr(streaming_config, 'min_update_interval', 0.05) or 0.05))
            max_update = max(min_update, float(getattr(streaming_config, 'max_update_interval', 0.5) or 0.5))
            if update_interval is None:
                ideal_interval = 1.0 / target_fps if target_fps > 0 else min_update
                update_interval = max(min_update, min(ideal_interval, max_update))
            else:
                update_interval = max(min_update, min(float(update_interval), max_update))

        if chunk_size is None or chunk_size <= 0:
            chunk_size = 4096
        if update_interval is None or update_interval <= 0:
            update_interval = 0.1

        window_limit = max(int(chunk_size) * 4, 8192)

        session_record = {
            'file_path': None,
            'start_time': time.time(),
            'completed': False,
            'error': None,
            'data': None,
            'total_samples': 0,
            'samples_processed': 0,
            'last_update': None,
            'stopped': False,
            'thread': None,
            'loop': False,
            'loop_count': 0,
            'window_start': 0,
            'sample_clock': 0,
            'file_total_samples': 0,
            'sample_rate': sr,
            'center_freq': cf,
            'frame_index': 0,
            'loop_progress': 0,
            'chunk_size': int(chunk_size),
            'window_limit': int(window_limit),
            'last_frame_time': None,
            'mode': 'realtime',
            'status': 'starting',
            'update_interval': float(update_interval),
            'recent_samples': np.array([], dtype=np.complex128),
            'final_metadata': {},
            'include_extras': False,
        }

        with self.session_lock:
            session = self.streaming_sessions.get(session_id, {})
            session.update(session_record)
            session['include_extras'] = False
            self.streaming_sessions[session_id] = session

        return session_id

    def update_session_metadata(self, session_id: str, updates: Optional[Dict[str, object]] = None):
        if not updates:
            return
        with self.session_lock:
            session = self.streaming_sessions.get(session_id)
            if not session:
                return
            for key, value in updates.items():
                if value is None:
                    continue
                session[key] = value

    def push_realtime_samples(
        self,
        session_id: str,
        samples,
        sample_rate: Optional[float] = None,
        center_freq: Optional[float] = None,
    ):
        if samples is None:
            return

        arr = np.asarray(samples)
        if arr.size == 0:
            return
        arr = arr.astype(np.complex128, copy=False).ravel()
        now = time.time()

        with self.session_lock:
            session = self.streaming_sessions.get(session_id)
            if not session or session.get('mode') != 'realtime' or session.get('completed'):
                return
            if sample_rate is not None:
                session['sample_rate'] = float(sample_rate)
            if center_freq is not None:
                session['center_freq'] = float(center_freq)

            recent = session.get('recent_samples')
            if not isinstance(recent, np.ndarray):
                recent = np.array([], dtype=np.complex128)

            combined = np.concatenate((recent, arr))
            window_limit = int(session.get('window_limit') or max(arr.size * 4, 8192))
            if combined.size > window_limit:
                combined = combined[-window_limit:]

            session['recent_samples'] = combined
            session['total_samples'] = int(session.get('total_samples', 0)) + arr.size
            session['samples_processed'] = session['total_samples']
            session['chunk_size'] = arr.size
            session['window_start'] = max(0, session['total_samples'] - combined.size)
            session['last_chunk_time'] = now
            if session.get('status') in (None, 'starting'):
                session['status'] = 'streaming'

            last_update = session.get('last_update')
            update_interval = float(session.get('update_interval', 0.1) or 0.1)
            should_refresh = last_update is None or (now - last_update) >= update_interval
            sample_rate_val = float(session.get('sample_rate') or sample_rate or 1.0)
            center_freq_val = float(session.get('center_freq') or center_freq or 0.0)
            start_index = session['window_start']
            total_samples = session['total_samples']

        if should_refresh:
            data = self.create_streaming_data(
                combined,
                sample_rate_val,
                center_freq_val,
                start_index=start_index,
            )

            with self.session_lock:
                session = self.streaming_sessions.get(session_id)
                if not session:
                    return
                session['data'] = data
                session['last_update'] = now
                session['frame_index'] = int(session.get('frame_index', 0)) + 1
                session['last_frame_time'] = now

    def finalize_session(
        self,
        session_id: str,
        status: str = 'completed',
        error: Optional[str] = None,
        metadata: Optional[Dict[str, object]] = None,
    ):
        with self.session_lock:
            session = self.streaming_sessions.get(session_id)
            if not session:
                return

            if metadata:
                try:
                    final_meta = session.setdefault('final_metadata', {})
                    final_meta.update(metadata)
                except Exception:
                    session['final_metadata'] = metadata

            if error:
                session['error'] = error

            session['completed'] = True
            session['stopped'] = True
            session['status'] = status
            if status == 'cancelled':
                session['cancelled'] = True
            session['cleanup_time'] = time.time()

    def get_streaming_data(self, session_id: str) -> dict:
        with self.session_lock:
            session = self.streaming_sessions.get(session_id)
            if not session:
                return {'error': 'session not found'}
            session_copy = dict(session)

        if session_copy.get('error'):
            return {'error': session_copy.get('error')}

        raw_streams = session_copy.get('data') or {}
        if isinstance(raw_streams, dict):
            formatted_payload = self.format_stream_payload(session_id, raw_streams)
        else:
            formatted_payload = {'meta': {}, 'streams': raw_streams}

        data = formatted_payload.get('streams', raw_streams)
        meta = {
            'session_id': session_id,
            'file_path': session_copy.get('file_path'),
            'filename': session_copy.get('filename'),
            'total_samples': session_copy.get('total_samples'),
            'completed': session_copy.get('completed'),
            'last_update': session_copy.get('last_update'),
            'loop_count': session_copy.get('loop_count', 0),
            'loop': session_copy.get('loop', True),
            'samples_processed': session_copy.get('samples_processed'),
            'window_start': session_copy.get('window_start'),
            'sample_clock': session_copy.get('sample_clock'),
            'file_total_samples': session_copy.get('file_total_samples'),
            'sample_rate': session_copy.get('sample_rate'),
            'frame_index': session_copy.get('frame_index'),
            'loop_progress': session_copy.get('loop_progress'),
            'chunk_size': session_copy.get('chunk_size'),
            'window_limit': session_copy.get('window_limit'),
            'last_frame_time': session_copy.get('last_frame_time'),
            'center_freq': session_copy.get('center_freq'),
            'mode': session_copy.get('mode', 'file'),
            'status': session_copy.get('status'),
            'cancelled': session_copy.get('cancelled', False),
            'final_metadata': session_copy.get('final_metadata'),
            'expected_duration': session_copy.get('expected_duration'),
            'scan_settings': session_copy.get('scan_settings'),
            'scan_progress': session_copy.get('scan_progress'),
            'fft_size': session_copy.get('fft_size'),
            'num_segments': session_copy.get('num_segments'),
            'include_extras': session_copy.get('include_extras', session_copy.get('mode') == 'analysis'),
        }

        formatted_meta = formatted_payload.get('meta') or {}
        for key, value in formatted_meta.items():
            if key == 'session_id':
                continue
            meta[key] = value
        if 'include_extras' in formatted_meta:
            meta['include_extras'] = formatted_meta['include_extras']

        result = {'meta': meta, 'streams': data}

        with self.session_lock:
            session = self.streaming_sessions.get(session_id)
            if not session:
                return result
            thread = session.get('thread')
            completed = session.get('completed')
            stopped = session.get('stopped')
            cleanup_time = session.get('cleanup_time')

            if completed and (thread is None or not thread.is_alive()):
                if cleanup_time is None:
                    session['cleanup_time'] = time.time()
                elif time.time() - cleanup_time > 2.0:
                    self.streaming_sessions.pop(session_id, None)
            elif stopped and (thread is None or not thread.is_alive()):
                if cleanup_time is None:
                    session['cleanup_time'] = time.time()
                elif time.time() - cleanup_time > 2.0:
                    self.streaming_sessions.pop(session_id, None)

        return result

    def create_streaming_data(
        self,
        samples,
        sample_rate: float,
        center_freq: float,
        fft_size: Optional[int] = None,
        config: Optional[VisualizationConfig] = None,
        start_index: int = 0,
    ) -> Dict[str, object]:
        """生成使用配置参数的流式数据负载"""
        config_obj = config or getattr(self.config_manager, "visualization", None)
        if config_obj is None:
            config_obj = VisualizationConfig()

        try:
            arr = np.asarray(samples)
            arr = arr.astype(np.complex128, copy=False)

            if arr.size == 0:
                empty = {
                    'time_domain': {'time': [], 'i_component': [], 'q_component': []},
                    'frequency_domain': {'frequency': [], 'power': []},
                    'constellation': {'i_component': [], 'q_component': []},
                    'higher_order': {'frequency': [], 'quadratic_power': [], 'quartic_power': []},
                    'eye_diagram': {'time': [], 'i_traces': [], 'q_traces': [], 'samples_per_symbol': 0, 'window_symbols': 0},
                }
                empty['metadata'] = {
                    'fft_size': 0,
                    'freq_resolution': 0,
                    'total_samples': 0,
                    'center_freq': center_freq,
                }
                return empty

            sr = sample_rate if sample_rate and sample_rate > 0 else 1.0
            fft_request = int(fft_size) if fft_size else min(arr.size, 1024)
            fft_request = max(64, fft_request)

            time_domain = self._create_time_domain_data(
                arr,
                sr,
                max(1, getattr(config_obj, 'max_time_points', 256) or 256),
                start_index=start_index,
            )
            frequency_domain, fft_used = self._create_frequency_domain_data(
                arr,
                sr,
                fft_request,
                config_obj,
            )
            constellation = self._create_constellation_data(
                arr,
                max(1, getattr(config_obj, 'max_constellation_points', 2000) or 2000),
            )
            higher_order = self._create_higher_order_data(
                arr,
                sr,
                fft_used,
                config_obj,
            )
            eye_diagram = self._create_eye_diagram_data(
                arr,
                sr,
                config_obj,
            )

            freq_resolution = sr / fft_used if fft_used else 0.0

            return {
                'time_domain': time_domain,
                'frequency_domain': frequency_domain,
                'constellation': constellation,
                'higher_order': higher_order,
                'eye_diagram': eye_diagram,
                'metadata': {
                    'fft_size': fft_used,
                    'freq_resolution': freq_resolution,
                    'total_samples': arr.size,
                    'center_freq': center_freq,
                    'start_index': int(start_index) if start_index is not None else 0,
                    'sample_rate': float(sr),
                },
            }
        except Exception as exc:
            logger.error("Error creating streaming data: %s", exc, exc_info=True)
            return {'error': str(exc)}

    def _create_time_domain_data(
        self,
        signal_data: np.ndarray,
        sample_rate: float,
        max_points: int,
        start_index: int = 0,
    ) -> Dict[str, list]:
        if max_points <= 0:
            max_points = 256
        n = signal_data.size
        if n == 0:
            return {'time': [], 'i_component': [], 'q_component': []}

        if max_points >= n:
            window = signal_data
            indices = np.arange(n)
        else:
            stride = max(1, n // max_points)
            window = signal_data[::stride][:max_points]
            indices = np.arange(window.size) * stride

        base_index = max(0, int(start_index))
        indices = indices + base_index

        if sample_rate > 0:
            time_axis = (indices / sample_rate) * 1000.0
        else:
            time_axis = indices

        return {
            'time': time_axis.tolist(),
            'i_component': np.real(window).tolist(),
            'q_component': np.imag(window).tolist(),
        }

    def _create_frequency_domain_data(
        self,
        signal_data: np.ndarray,
        sample_rate: float,
        fft_size: int,
        config: VisualizationConfig,
    ) -> Tuple[Dict[str, list], int]:
        n = signal_data.size
        if n == 0:
            return ({'frequency': [], 'power': []}, 0)

        sr = sample_rate if sample_rate and sample_rate > 0 else 1.0
        requested_fft = max(64, int(fft_size))
        n_fft = min(requested_fft, n)
        if n_fft <= 0:
            return ({'frequency': [], 'power': []}, 0)

        seg = signal_data[-n_fft:]
        window = self._get_window_function(n_fft, getattr(config, 'fft_window', FFTWindow.HANN))
        spec = fft(seg * window)
        spec_shifted = fftshift(spec)
        freq = fftshift(np.fft.fftfreq(n_fft, 1.0 / sr)) / 1e6
        denom = sr * n_fft * (np.mean(window ** 2) + 1e-12)
        power = (np.abs(spec_shifted) ** 2) / denom
        power_db = 10 * np.log10(power + 1e-12)

        max_points = max(1, getattr(config, 'max_freq_points', 1024) or 1024)
        if len(freq) > max_points:
            step = max(1, int(np.ceil(len(freq) / max_points)))
            freq = freq[::step]
            power_db = power_db[::step]

        return ({'frequency': freq.tolist(), 'power': power_db.tolist()}, n_fft)

    def _get_window_function(self, n_fft: int, window_type: Optional[FFTWindow]) -> np.ndarray:
        if n_fft <= 0:
            return np.ones(1)

        try:
            if isinstance(window_type, FFTWindow):
                key = window_type.value
            elif window_type is None:
                key = 'hann'
            else:
                key = str(window_type).lower()
        except Exception:
            key = 'hann'

        if key in ('hann', 'hanning'):
            return np.hanning(n_fft)
        if key == 'hamming':
            return np.hamming(n_fft)
        if key == 'blackman':
            return np.blackman(n_fft)
        if key == 'rectangular':
            return np.ones(n_fft)
        return np.hanning(n_fft)

    def _create_constellation_data(self, signal_data: np.ndarray, max_points: int) -> Dict[str, list]:
        if max_points <= 0:
            max_points = 2000
        n = signal_data.size
        if n == 0:
            return {'i_component': [], 'q_component': []}

        if max_points >= n:
            pts = signal_data
        else:
            stride = max(1, n // max_points)
            pts = signal_data[::stride][:max_points]

        return {
            'i_component': np.real(pts).tolist(),
            'q_component': np.imag(pts).tolist(),
        }

    def _create_higher_order_data(
        self,
        signal_data: np.ndarray,
        sample_rate: float,
        fft_size: int,
        config: VisualizationConfig,
    ) -> Dict[str, list]:
        if fft_size <= 0 or signal_data.size == 0:
            return {'frequency': [], 'quadratic_power': [], 'quartic_power': []}

        sr = sample_rate if sample_rate and sample_rate > 0 else 1.0
        seg = signal_data[-fft_size:]
        window = self._get_window_function(fft_size, getattr(config, 'fft_window', FFTWindow.HANN))

        quad_spec = fftshift(fft((seg ** 2) * window))
        quad_db = 10 * np.log10(np.abs(quad_spec) ** 2 + 1e-12)

        quart_spec = fftshift(fft((seg ** 4) * window))
        quart_db = 10 * np.log10(np.abs(quart_spec) ** 2 + 1e-12)

        freq = fftshift(np.fft.fftfreq(fft_size, 1.0 / sr)) / 1e6

        max_points = max(1, getattr(config, 'max_freq_points', 1024) or 1024)
        if len(freq) > max_points:
            step = max(1, int(np.ceil(len(freq) / max_points)))
            freq = freq[::step]
            quad_db = quad_db[::step]
            quart_db = quart_db[::step]

        return {
            'frequency': freq.tolist(),
            'quadratic_power': quad_db.tolist(),
            'quartic_power': quart_db.tolist(),
        }

    def _create_eye_diagram_data(
        self,
        signal_data: np.ndarray,
        sample_rate: float,
        config: VisualizationConfig,
    ) -> Dict[str, list]:
        if signal_data.size == 0:
            return {'time': [], 'i_traces': [], 'q_traces': [], 'samples_per_symbol': 0, 'window_symbols': 0}

        enabled = getattr(config, 'eye_diagram_enabled', True)
        if not enabled:
            return {'time': [], 'i_traces': [], 'q_traces': [], 'samples_per_symbol': 0, 'window_symbols': 0}

        try:
            sps = int(round(float(getattr(config, 'eye_diagram_samples_per_symbol', 8))))
        except Exception:
            sps = 8
        if sps < 2:
            sps = 2

        try:
            window_symbols = float(getattr(config, 'eye_diagram_window_symbols', 2.0))
        except Exception:
            window_symbols = 2.0
        if window_symbols <= 0:
            window_symbols = 2.0
        if window_symbols > 4.0:
            window_symbols = 4.0

        samples_per_trace = max(sps + 1, int(round(sps * window_symbols)))

        try:
            max_traces = int(getattr(config, 'eye_diagram_max_traces', 60))
        except Exception:
            max_traces = 60
        if max_traces < 1:
            max_traces = 1
        if max_traces > 200:
            max_traces = 200

        step = max(1, sps)
        needed = samples_per_trace + (max_traces - 1) * step
        if signal_data.size > needed:
            segment = signal_data[-needed:]
        else:
            segment = signal_data

        real_vals = np.real(segment)
        imag_vals = np.imag(segment)

        i_traces: List[List[float]] = []
        q_traces: List[List[float]] = []
        limit = len(real_vals) - samples_per_trace + 1
        for start in range(0, max(0, limit), step):
            end = start + samples_per_trace
            if end > len(real_vals):
                break
            i_slice = real_vals[start:end]
            q_slice = imag_vals[start:end]
            if i_slice.size != samples_per_trace:
                continue
            i_traces.append(i_slice.tolist())
            q_traces.append(q_slice.tolist())
            if len(i_traces) >= max_traces:
                break

        if len(i_traces) == 0 and len(real_vals) >= samples_per_trace:
            i_traces.append(real_vals[-samples_per_trace:].tolist())
            q_traces.append(imag_vals[-samples_per_trace:].tolist())

        try:
            time_axis = (np.linspace(0.0, window_symbols, samples_per_trace, endpoint=False)).tolist()
        except Exception:
            time_axis = list(range(samples_per_trace))

        return {
            'time': time_axis,
            'i_traces': i_traces,
            'q_traces': q_traces,
            'samples_per_symbol': sps,
            'window_symbols': window_symbols,
            'sample_rate': float(sample_rate) if sample_rate else 0.0,
        }

    def get_eye_diagram_payload(
        self,
        samples,
        sample_rate: float,
    ) -> Dict[str, list]:
        try:
            arr = np.asarray(samples).astype(np.complex128, copy=False)
        except Exception:
            arr = np.asarray(samples)
        return self._create_eye_diagram_data(arr, sample_rate, getattr(self, 'visualization_config', VisualizationConfig()))

    def stop_streaming(self, session_id: str):
        with self.session_lock:
            session = self.streaming_sessions.get(session_id)
            if not session:
                return
            thread = session.get('thread')

        self.finalize_session(session_id, status='stopped')

        if thread and thread.is_alive():
            return

        with self.session_lock:
            self.streaming_sessions.pop(session_id, None)

    def list_active_sessions(self) -> List[dict]:
        with self.session_lock:
            sessions = list(self.streaming_sessions.items())

        out = []
        for sid, s in sessions:
            out.append({
                'session_id': sid,
                'file_path': s.get('file_path'),
                'started': s.get('start_time'),
                'completed': s.get('completed'),
                'total_samples': s.get('total_samples'),
                'error': s.get('error'),
                'mode': s.get('mode', 'file'),
                'status': s.get('status'),
                'center_freq': s.get('center_freq'),
                'sample_rate': s.get('sample_rate'),
            })
        return out

