import numpy as np
import scipy.signal as signal
from scipy.fft import fft, fftshift
import matplotlib.pyplot as plt
from typing import Dict, Tuple, Optional, Callable
from core.signal_processor import SignalProcessor
from utils.visualizer import SignalVisualizer
import threading


class SignalAnalyzer:
    """信号分析器"""

    def __init__(self, signal_processor: SignalProcessor, visualizer: SignalVisualizer):
        self.processor = signal_processor
        self.visualizer = visualizer

    def comprehensive_analysis(
        self,
        samples: np.ndarray,
        sample_rate: float,
        progress_callback: Optional[Callable[[int, Optional[str]], None]] = None,
        cancel_event: Optional["threading.Event"] = None,
    ) -> Dict:
        """综合分析

        Supports cooperative cancellation and progress reporting via:
        - progress_callback(percent:int, message:str)
        - cancel_event: threading.Event (if set(), function should abort)
        """
        results: Dict = {}

        def _check_cancel():
            if cancel_event is not None and getattr(cancel_event, "is_set", lambda: False)():
                if progress_callback:
                    try:
                        progress_callback(0, "cancelled")
                    except Exception:
                        pass
                raise RuntimeError("cancelled")

        # 1) 时域分析
        if progress_callback:
            try:
                progress_callback(5, "starting time-domain analysis")
            except Exception:
                pass
        _check_cancel()
        results["time_domain"] = self._time_domain_analysis(samples)

        # 2) 频域分析
        if progress_callback:
            try:
                progress_callback(25, "starting frequency-domain analysis")
            except Exception:
                pass
        _check_cancel()
        results["frequency_domain"] = self._frequency_domain_analysis(samples, sample_rate)

        # 3) 星座图分析
        if progress_callback:
            try:
                progress_callback(55, "starting constellation analysis")
            except Exception:
                pass
        _check_cancel()
        results["constellation"] = self._constellation_analysis(samples)

        # 4) 调制识别
        if progress_callback:
            try:
                progress_callback(75, "starting modulation recognition")
            except Exception:
                pass
        _check_cancel()
        results["modulation"] = self._modulation_recognition(samples)

        # 5) 质量评估
        if progress_callback:
            try:
                progress_callback(85, "starting quality assessment")
            except Exception:
                pass
        _check_cancel()
        results["quality"] = self._quality_assessment(samples)

        if progress_callback:
            try:
                progress_callback(95, "finalizing")
            except Exception:
                pass

        return results

    def _time_domain_analysis(self, samples: np.ndarray) -> Dict:
        """时域分析"""
        magnitude = np.abs(samples)
        i_data = np.real(samples)
        q_data = np.imag(samples)

        return {
            "average_power": np.mean(magnitude**2),
            "peak_power": np.max(magnitude**2),
            "rms_amplitude": np.sqrt(np.mean(magnitude**2)),
            "peak_amplitude": np.max(magnitude),
            "i_std": np.std(i_data),
            "q_std": np.std(q_data),
            "iq_imbalance": np.std(i_data) - np.std(q_data),
            "dc_offset": np.abs(np.mean(samples)),
        }

    def _frequency_domain_analysis(
        self, samples: np.ndarray, sample_rate: float
    ) -> Dict:
        """频域分析"""
        freq_axis, power_spectrum = self.processor.calculate_spectrum(
            samples, sample_rate
        )
        power_spectrum_db = 10 * np.log10(power_spectrum + 1e-12)

        # 计算峰值频率
        peak_idx = np.argmax(power_spectrum_db)
        peak_freq = freq_axis[peak_idx]
        peak_power = power_spectrum_db[peak_idx]

        # 估计带宽
        bandwidth = self.processor.estimate_bandwidth(power_spectrum_db, freq_axis)

        return {
            "frequencies": freq_axis,
            "spectrum": power_spectrum_db,
            "peak_frequency": peak_freq,
            "peak_power": peak_power,
            "bandwidth": bandwidth,
        }

    def _constellation_analysis(self, samples: np.ndarray) -> Dict:
        """星座图分析"""
        # 简单抽取符号
        step = max(1, len(samples) // 1000)
        constellation_points = samples[::step]

        return {
            "points": constellation_points,
            "symbol_count": len(constellation_points),
        }

    def _modulation_recognition(self, samples: np.ndarray) -> str:
        """调制识别"""
        # 简化的调制识别逻辑
        magnitude = np.abs(samples)
        phase = np.angle(samples)

        # 检查幅度变化
        magnitude_cv = (
            np.std(magnitude) / np.mean(magnitude)
            if np.mean(magnitude) > 0
            else float("inf")
        )

        # 检查相位分布
        phase_hist, _ = np.histogram(phase, bins=36, range=(-np.pi, np.pi))
        phase_peaks = len(
            signal.find_peaks(phase_hist, height=np.max(phase_hist) * 0.3)[0]
        )

        if magnitude_cv < 0.3 and phase_peaks >= 3:
            return "QPSK"
        elif magnitude_cv < 0.1:
            return "BPSK"
        else:
            return "Unknown"

    def _quality_assessment(self, samples: np.ndarray) -> Dict:
        """质量评估"""
        power_stats = self.processor.detect_signal_power(samples)

        return {
            "dynamic_range": 20
            * np.log10(np.max(np.abs(samples)) / (np.std(samples) + 1e-12)),
            "dc_offset": np.abs(np.mean(samples)),
            "power_stats": power_stats,
        }
