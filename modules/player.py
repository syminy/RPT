from __future__ import annotations

import numpy as np
from typing import Dict, TYPE_CHECKING
from core.file_manager import FileManager

if TYPE_CHECKING:
    from core.usrp_controller import USRPController


class SignalPlayer:
    """信号播放器"""

    def __init__(self, usrp_controller: USRPController, file_manager: FileManager):
        self.usrp = usrp_controller
        self.files = file_manager

    def play_signal(self, filename: str, tx_params: Dict) -> bool:
        """播放信号 - 使用简化的发射方法"""
        try:
            # 加载信号文件
            samples, metadata = self.files.load_signal(filename)
            if samples is None:
                print("Failed to load signal file")
                return False

            # 配置发射参数
            tx_freq = tx_params.get("freq", metadata.center_freq)
            tx_rate = tx_params.get("rate", metadata.sample_rate)
            tx_gain = tx_params.get("gain", 25.0)
            tx_channel = tx_params.get("channel", 0)
            repeat = tx_params.get("repeat", 1)
            tx_scale = float(tx_params.get("scale", 1.0) or 1.0)

            actual_rate = self.usrp.configure_tx(tx_freq, tx_rate, tx_gain, tx_channel)

            # 计算基础统计数据，方便诊断信号幅度
            peak_amp = float(np.max(np.abs(samples))) if samples.size else 0.0
            rms_amp = float(np.sqrt(np.mean(np.abs(samples) ** 2))) if samples.size else 0.0

            recommended_scale = 1.0
            if 0.0 < peak_amp < 0.95:
                recommended_scale = min(1.0, 0.95 / peak_amp)

            print("Playback sample stats:")
            print(f"  Peak amplitude: {peak_amp:.4f}")
            print(f"  RMS amplitude:  {rms_amp:.4f}")
            print(f"  Suggested scale for ~0.95 peak: {recommended_scale:.3f}")
            print(f"  TX scale (applied):            {tx_scale:.3f}")

            playback_samples = np.ascontiguousarray(samples, dtype=np.complex64)
            if tx_scale and tx_scale != 1.0:
                playback_samples = np.ascontiguousarray(
                    playback_samples * tx_scale, dtype=np.complex64
                )

            peak_after = float(np.max(np.abs(playback_samples))) if playback_samples.size else 0.0
            if peak_after > 1.0:
                clip_scale = 0.98 / peak_after
                print(
                    f"Warning: scaled samples exceed full scale (peak {peak_after:.3f}). "
                    f"Applying safety factor {clip_scale:.3f} to avoid distortion."
                )
                playback_samples = np.ascontiguousarray(
                    playback_samples * clip_scale, dtype=np.complex64
                )
                peak_after = float(np.max(np.abs(playback_samples)))

            print(f"\nStarting signal replay...")
            print(f"Transmit Frequency: {tx_freq/1e6:.3f} MHz")
            print(f"Sample Rate: {actual_rate/1e3:.1f} kHz")
            print(f"Transmit Gain: {tx_gain} dB")
            print(f"Repeat Count: {repeat}")
            print(f"Peak amplitude after scaling: {peak_after:.4f}")

            # 发射信号 - 使用简化的发射方法避免时间戳问题
            total_samples = self.usrp.transmit_samples_simple(
                playback_samples, repeat, tx_channel
            )

            print(f"\nReplay completed. Total samples sent: {total_samples}")
            return True

        except Exception as e:
            print(f"Signal playback failed: {e}")
            return False
