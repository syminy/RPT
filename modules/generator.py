import math
import numpy as np
import scipy.signal as signal
from typing import Dict, Optional
from core.signal_processor import SignalProcessor
from utils.filters import FilterDesigner


class SignalGenerator:
    """信号生成器"""

    def __init__(self, signal_processor: SignalProcessor):
        self.processor = signal_processor
        self.filter_designer = FilterDesigner()

    def generate_qpsk(self, params: Dict) -> np.ndarray:
        """生成QPSK信号"""
        # 参数提取
        symbol_rate = params.get("symbol_rate", 500e3)
        sample_rate = params.get("sample_rate", 2e6)
        requested_duration = params.get("duration")
        num_symbols = params.get("num_symbols")
        alpha = params.get("alpha", 0.35)
        span = params.get("span", 6)

        # 计算每符号采样数
        sps = max(8, int(round(sample_rate / symbol_rate)))

        target_samples: Optional[int] = None
        if requested_duration is not None:
            try:
                duration_val = float(requested_duration)
            except (TypeError, ValueError):
                duration_val = 0.0
            if duration_val > 0 and sample_rate > 0:
                target_samples = max(int(round(duration_val * sample_rate)), sps)

        if target_samples is not None:
            num_symbols = max(1, int(math.ceil(target_samples / sps)))
        else:
            try:
                num_symbols = int(num_symbols) if num_symbols is not None else 1000
            except (TypeError, ValueError):
                num_symbols = 1000
            if num_symbols <= 0:
                num_symbols = 1000

        print(f"Generating QPSK signal...")
        print(f"  Samples per symbol: {sps}")
        print(f"  Actual sample rate: {sample_rate/1e3:.1f} kHz")
        print(f"  Generating {num_symbols} symbols")
        if target_samples is not None:
            print(f"  Target samples: {target_samples}")

        # 生成随机比特
        bits = np.random.randint(0, 2, num_symbols * 2)

        # QPSK调制
        symbols = self._qpsk_modulate(bits)

        # 脉冲成形
        shaped_signal = self._pulse_shape(symbols, sps, alpha, span)

        # 信号归一化
        normalized_signal = self.processor.normalize_signal(shaped_signal)

        if target_samples is not None and len(normalized_signal) > target_samples:
            normalized_signal = normalized_signal[:target_samples]
        elif target_samples is not None and len(normalized_signal) < target_samples:
            pad_width = target_samples - len(normalized_signal)
            normalized_signal = np.pad(normalized_signal, (0, pad_width), mode="constant")

        actual_duration = len(normalized_signal) / sample_rate if sample_rate else 0.0
        print(f"  Generated signal duration: {actual_duration:.3f} seconds")

        return normalized_signal

    def _qpsk_modulate(self, bits: np.ndarray) -> np.ndarray:
        """QPSK调制"""
        if len(bits) % 2 != 0:
            bits = np.append(bits, 0)  # 填充0

        # 格雷码映射
        gray_map = {(0, 0): 0, (0, 1): 1, (1, 1): 2, (1, 0): 3}
        constellation = np.array([1 + 1j, -1 + 1j, -1 - 1j, 1 - 1j]) / np.sqrt(2)

        symbols = []
        for i in range(0, len(bits), 2):
            symbol_idx = gray_map[(bits[i], bits[i + 1])]
            symbols.append(constellation[symbol_idx])

        return np.array(symbols)

    def _pulse_shape(
        self, symbols: np.ndarray, sps: int, alpha: float, span: int
    ) -> np.ndarray:
        """脉冲成形"""
        # 设计RRC滤波器
        num_taps = span * sps
        if num_taps % 2 == 0:
            num_taps += 1

        rrc_taps = self.filter_designer.rrc_taps(num_taps, alpha, sps)

        # 上采样
        upsampled = np.zeros(len(symbols) * sps, dtype=complex)
        upsampled[::sps] = symbols

        # 卷积
        shaped_signal = signal.convolve(upsampled, rrc_taps, mode="same")

        return shaped_signal

    def generate_prbs(self, length: int) -> np.ndarray:
        """生成PRBS序列"""
        state = 0xACE1
        prbs = []

        for _ in range(length):
            new_bit = (state ^ (state >> 1)) & 1
            state = (state >> 1) | (new_bit << 15)
            prbs.append(new_bit)

        return np.array(prbs, dtype=int)
