import numpy as np
import scipy.signal as signal
from scipy.fft import fft, fftshift
from typing import Tuple, Dict, Any
from dataclasses import dataclass


@dataclass
class ProcessingConfig:
    """信号处理配置"""

    fft_size: int = 8192
    filter_alpha: float = 0.35
    filter_span: int = 6


class SignalProcessor:
    """信号处理器"""

    def __init__(self, config: ProcessingConfig = None):
        self.config = config or ProcessingConfig()

    def normalize_signal(
        self, samples: np.ndarray, target_peak: float = 0.7
    ) -> np.ndarray:
        """信号归一化"""
        peak_value = np.max(np.abs(samples))

        if peak_value > 0:
            scale_factor = target_peak / peak_value
            normalized_signal = samples * scale_factor

            # 检查峰值，避免削波
            new_peak = np.max(np.abs(normalized_signal))
            if new_peak > 0.8:
                additional_scale = 0.8 / new_peak
                normalized_signal = normalized_signal * additional_scale

        else:
            normalized_signal = samples

        return normalized_signal

    def detect_signal_power(self, samples: np.ndarray) -> Dict[str, float]:
        """检测信号功率"""
        if len(samples) == 0:
            return {
                "average_power": 0,
                "average_power_db": -120,
                "peak_power": 0,
                "peak_power_db": -120,
                "rms_amplitude": 0,
                "peak_amplitude": 0,
            }

        power = np.mean(np.abs(samples) ** 2)
        peak_power = np.max(np.abs(samples) ** 2)

        return {
            "average_power": power,
            "average_power_db": 10 * np.log10(power + 1e-12),
            "peak_power": peak_power,
            "peak_power_db": 10 * np.log10(peak_power + 1e-12),
            "rms_amplitude": np.sqrt(power),
            "peak_amplitude": np.sqrt(peak_power),
        }

    def calculate_spectrum(
        self, samples: np.ndarray, sample_rate: float
    ) -> Tuple[np.ndarray, np.ndarray]:
        """计算频谱"""
        fft_size = min(self.config.fft_size, len(samples))

        # 如果没有样本，返回空数组（避免对空数组取平均/除以0）
        if fft_size <= 0:
            return np.array([]), np.array([])

        # 应用窗函数
        window = np.hanning(fft_size)
        # window_correction 是窗的二范数均值，用于能量归一化
        window_correction = np.mean(window**2) if window.size > 0 else 0.0
        # 保护性地清理输入片段中的 NaN/Inf，避免在后续运算中产生 RuntimeWarning
        segment = samples[:fft_size]
        segment = np.nan_to_num(segment, nan=0.0, posinf=0.0, neginf=0.0)
        windowed_signal = segment * window

        # 计算频谱
        spectrum = fft(windowed_signal)
        spectrum_shifted = fftshift(spectrum)

        # 创建频率轴
        freq_axis = fftshift(np.fft.fftfreq(fft_size, 1.0 / sample_rate))

        # 计算功率谱
        denominator = sample_rate * fft_size * window_correction
    
        # 添加安全检查，避免除以0或NaN
        if not np.isfinite(denominator) or denominator <= 0:
            raise ValueError(
                f"无效的分母参数: sample_rate={sample_rate}, fft_size={fft_size}, window_correction={window_correction}"
            )

        # 计算幅度平方并清理 NaN/Inf 值，再进行除法（保证返回实数能量谱）
        mag2 = np.abs(spectrum_shifted) ** 2
        mag2 = np.nan_to_num(mag2, nan=0.0, posinf=0.0, neginf=0.0)
        power_spectrum = (mag2 / float(denominator)).astype(float)

        return freq_axis, power_spectrum

    def estimate_bandwidth(
        self, power_spectrum_db: np.ndarray, freq_axis: np.ndarray
    ) -> float:
        """估计信号带宽"""
        try:
            # 找到峰值
            peak_idx = np.argmax(power_spectrum_db)
            peak_power = power_spectrum_db[peak_idx]

            # 计算-3dB带宽
            threshold = peak_power - 3
            above_threshold = power_spectrum_db >= threshold

            # 找到带宽边界
            if np.any(above_threshold):
                indices = np.where(above_threshold)[0]
                lower_idx = indices[0]
                upper_idx = indices[-1]
                bandwidth = freq_axis[upper_idx] - freq_axis[lower_idx]
                return max(bandwidth, 0)
            else:
                return 0
        except:
            return 0

    def calculate_bandpass_sample_rate(
        self, center_freq: float, signal_bw: float
    ) -> float:
        """计算带通采样率"""
        # USRP支持的常用采样率
        available_rates = [200e3, 500e3, 1e6, 2e6, 5e6, 10e6, 20e6, 40e6, 61.44e6]

        f_max = center_freq + signal_bw / 2
        f_min = center_freq - signal_bw / 2
        B = signal_bw

        # 带通采样定理：2B ≤ fs ≤ 2f_min / (k+1)，k ∈ [0, floor(f_min / B)]
        k_max = int(f_min // B)
        candidates = []
        for k in range(k_max + 1):
            fs_min = 2 * B
            fs_max = 2 * f_min / (k + 1)
            if fs_min <= fs_max:
                candidates.append((fs_min + fs_max) / 2)

        if not candidates:
            return 2 * f_max  # 回退到奈奎斯特

        # 选择最接近USRP支持率的中值
        closest = min(candidates, key=lambda x: abs(x - 2e6))  # 默认2MHz

        return closest
