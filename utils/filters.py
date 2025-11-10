import numpy as np
import scipy.signal as signal
from typing import Optional


class FilterDesigner:
    """滤波器设计器"""

    @staticmethod
    def rrc_taps(num_taps: int, alpha: float, sps: int) -> np.ndarray:
        """
        生成根升余弦 (RRC) 滤波器系数
        num_taps: 总抽头数（奇数）
        alpha: 滚降因子 (0~1)
        sps: 每符号采样点数
        """
        # 确保抽头数为奇数
        if num_taps % 2 == 0:
            num_taps += 1

        half_len = num_taps // 2
        t = np.arange(-half_len, half_len + 1) / sps  # 时间向量（单位：符号周期）
        taps = np.zeros_like(t)

        for i, ti in enumerate(t):
            if abs(ti) < 1e-8:  # t = 0
                taps[i] = 1.0 - alpha + 4 * alpha / np.pi
            elif abs(abs(ti) - 1 / (4 * alpha)) < 1e-8:  # 奇异点
                term1 = (1 + 2 / np.pi) * np.sin(np.pi / (4 * alpha))
                term2 = (1 - 2 / np.pi) * np.cos(np.pi / (4 * alpha))
                taps[i] = (alpha / np.sqrt(2)) * (term1 + term2)
            else:
                # 标准根升余弦公式
                pi_t = np.pi * ti
                pi_alpha_t = np.pi * alpha * ti
                numerator = np.sin(pi_t * (1 - alpha)) + 4 * alpha * ti * np.cos(
                    pi_t * (1 + alpha)
                )
                denominator = pi_t * (1 - (4 * alpha * ti) ** 2)
                taps[i] = numerator / denominator

        # 归一化能量
        energy = np.sqrt(np.sum(taps**2))
        if energy > 0:
            taps = taps / energy

        return taps

    @staticmethod
    def corrected_rrc_taps(num_taps: int, alpha: float, sps: int) -> np.ndarray:
        """
        修正的根升余弦滤波器设计
        """
        # 确保时间轴对称
        t = np.arange(num_taps) - (num_taps - 1) / 2
        t = t / sps  # 归一化到符号周期

        taps = np.zeros_like(t, dtype=float)

        for i in range(len(t)):
            ti = t[i]
            if abs(ti) < 1e-10:  # t = 0
                taps[i] = 1.0 - alpha + (4 * alpha / np.pi)
            elif (
                abs(4 * alpha * ti - 1) < 1e-10 or abs(4 * alpha * ti + 1) < 1e-10
            ):  # 奇异点
                value = (alpha / np.sqrt(2)) * (
                    (1 + 2 / np.pi) * np.sin(np.pi / (4 * alpha))
                    + (1 - 2 / np.pi) * np.cos(np.pi / (4 * alpha))
                )
                taps[i] = value
            else:
                pi_t = np.pi * ti
                pi_alpha_t = np.pi * alpha * ti
                numerator = np.sin(pi_t * (1 - alpha)) + 4 * alpha * ti * np.cos(
                    pi_t * (1 + alpha)
                )
                denominator = pi_t * (1 - (4 * alpha * ti) ** 2)
                taps[i] = numerator / denominator

        # 能量归一化 - 确保滤波器不改变信号功率
        energy = np.sum(taps**2)
        if energy > 0:
            taps = taps / np.sqrt(energy)

        return taps
