import logging
import math
import numpy as np
import threading
import time
import uuid
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

SPECTRUM_ANALYZER_PRESETS = {
    "FAST": {
        "target_fps": 15,
        "rbw": 100e3,
        "sample_rate": 15.36e6,
        "fft_size": 512,
        "dwell_time": 0.005,
        "overlap": 0.2,
        "avg_count": 1,
        "max_segments": 4,
    },
    "BALANCED": {
        "target_fps": 10,
        "rbw": 50e3,
        "sample_rate": 7.68e6,
        "fft_size": 1024,
        "dwell_time": 0.007,
        "overlap": 0.2,
        "avg_count": 1,
        "max_segments": 6,
    },
    "PRECISE": {
        "target_fps": 5,
        "rbw": 25e3,
        "sample_rate": 7.68e6,
        "fft_size": 2048,
        "dwell_time": 0.010,
        "overlap": 0.25,
        "avg_count": 1,
        "max_segments": 8,
    },
}


@dataclass
class ScanConfig:
    start_freq: float = 88e6  # 起始频率 (Hz)
    stop_freq: float = 108e6  # 终止频率 (Hz)
    resolution: float = 100e3  # 分辨率 (Hz)
    dwell_time: float = 0.1  # 驻留时间 (秒)
    sample_rate: float = 2e6  # 采样率 (Hz)
    avg_count: int = 1  # 平均次数
    overlap: float = 0.0  # 重叠比例 (0.0-0.9)
    scan_interval: float = 0.0  # 扫描间隔 (秒)
    continuous: bool = True  # 连续扫描默认开启
    fft_size: Optional[int] = None  # 可选FFT大小覆盖
    preset: Optional[str] = None  # 预设模式标识
    max_segments: Optional[int] = 20  # 期望的最大分段数量（上限20）


logger = logging.getLogger(__name__)


class SpectrumScanner:
    def __init__(self, usrp_controller, signal_processor):
        self.usrp = usrp_controller
        self.processor = signal_processor
        self.scanning = False
        self.scan_thread = None
        self.current_session = None
        self.visualizer = None
        self._stop_event = threading.Event()
        self._rx_channel = 0
        self._hardware_available = bool(
            self.usrp and getattr(self.usrp, "is_connected", False)
        )
        self._scan_lock = threading.Lock()
        self._max_segments_default = 20

    def set_visualizer(self, visualizer):
        self.visualizer = visualizer

    def _reset_realtime_state(self):
        """Reset throttling state so each scan session starts clean."""
        return

    def _get_supported_sample_rates(self) -> Optional[List[float]]:
        config = getattr(self.usrp, "config", None)
        rates = getattr(config, "sample_rates", None) if config else None
        if not rates:
            return None

        normalized: List[float] = []
        for rate in rates:
            try:
                value = float(rate)
            except (TypeError, ValueError):
                continue
            if math.isfinite(value) and value > 0:
                normalized.append(value)

        if not normalized:
            return None

        return sorted(set(normalized))

    def _select_supported_rate(self, required_rate: float) -> float:
        supported = self._get_supported_sample_rates()
        if not supported:
            return required_rate

        for rate in supported:
            if rate >= required_rate:
                return rate
        return supported[-1]

    def _apply_segment_budget(self, freq_span: float, overlap: float, sample_rate: float, target_segments: int) -> float:
        freq_span = float(freq_span)
        if freq_span <= 0:
            return sample_rate

        overlap = min(0.9, max(0.0, overlap))
        coverage = sample_rate * (1.0 - overlap)
        if coverage <= 0:
            return sample_rate

        target_segments = int(target_segments) if target_segments else self._max_segments_default
        if target_segments <= 1:
            return sample_rate
        target_segments = max(2, min(target_segments, self._max_segments_default))

        predicted_segments = math.ceil(freq_span / coverage) + 1
        if predicted_segments <= target_segments:
            return sample_rate

        required_coverage = freq_span / max(target_segments - 1, 1)
        required_rate = required_coverage / max(1e-6, (1.0 - overlap))
        required_rate = max(required_rate, sample_rate)

        adjusted_rate = self._select_supported_rate(required_rate)
        if adjusted_rate <= 0:
            return sample_rate

        return float(adjusted_rate)

    def _synchronize_sample_rate(self, actual_rate: Optional[float], config: ScanConfig):
        """Align in-memory session/config state with the hardware-reported sample rate."""
        if actual_rate is None:
            return

        try:
            actual = float(actual_rate)
        except (TypeError, ValueError):
            return

        if not math.isfinite(actual) or actual <= 0:
            return

        previous = float(getattr(config, "sample_rate", 0.0) or 0.0)
        if previous <= 0 or not math.isclose(actual, previous, rel_tol=1e-6, abs_tol=1.0):
            config.sample_rate = actual

        overlap = min(0.9, max(0.0, config.overlap))
        step_size = actual * (1.0 - overlap)
        if step_size <= 0:
            step_size = max(actual, 1.0)
        step_size = max(step_size, 1.0)

        freq_span = max(0.0, config.stop_freq - config.start_freq)
        target_segments = getattr(config, "max_segments", None) or self._max_segments_default
        try:
            target_segments = max(2, min(int(target_segments), self._max_segments_default))
        except (TypeError, ValueError):
            target_segments = self._max_segments_default

        desired_step = freq_span / max(target_segments - 1, 1) if freq_span > 0 else step_size
        if desired_step > 0 and step_size < desired_step:
            step_size = desired_step

        num_segments = 1
        if freq_span > 0:
            num_segments = max(1, int(freq_span / step_size)) + 1
        if num_segments > target_segments:
            num_segments = target_segments
            step_size = freq_span / max(target_segments - 1, 1) if target_segments > 1 else freq_span
            if step_size <= 0:
                step_size = max(desired_step, 1.0)

        resolved_fft = None
        if not getattr(config, "fft_size", None):
            resolved_fft = self._compute_fft_size(actual, config.resolution)
            config.fft_size = resolved_fft

        with self._scan_lock:
            session = self.current_session
            if not session or session.get("session_id") is None:
                return

            session["sample_rate"] = actual
            session["step_size"] = step_size
            session["num_segments"] = num_segments
            session["max_segments"] = target_segments
            if getattr(config, "max_segments", None):
                try:
                    session["max_segments"] = int(config.max_segments)
                except (TypeError, ValueError):
                    pass
            if resolved_fft:
                session["fft_size"] = resolved_fft

            session_config = session.get("config")
            if isinstance(session_config, ScanConfig):
                session_config.sample_rate = config.sample_rate
                try:
                    session_config.max_segments = target_segments
                except Exception:
                    pass
                if resolved_fft and not getattr(session_config, "fft_size", None):
                    session_config.fft_size = resolved_fft

    def start_scanning(self, config: ScanConfig):
        """启动频谱扫描"""
        with self._scan_lock:
            if self.scanning:
                raise RuntimeError("已有频谱扫描在进行中，请先停止当前扫描")

            self.scanning = True
            self._stop_event.clear()
            self._hardware_available = bool(
                self.usrp and getattr(self.usrp, "is_connected", False)
            )
            if not self._hardware_available:
                self.scanning = False
                logger.warning("Spectrum scan requested but USRP is not connected")
                raise RuntimeError("USRP 未连接，无法执行频谱扫描")
            session_id = str(uuid.uuid4())

            self._reset_realtime_state()

            # Skip applying any preset; use the provided config directly
            applied_config = config
            preset_meta = {}

            freq_span = max(0.0, applied_config.stop_freq - applied_config.start_freq)
            overlap = min(0.9, max(0.0, applied_config.overlap))
            target_segments = getattr(applied_config, "max_segments", None) or self._max_segments_default
            try:
                target_segments = max(2, min(int(target_segments), self._max_segments_default))
            except (TypeError, ValueError):
                target_segments = self._max_segments_default
            applied_config.max_segments = target_segments

            adjusted_rate = self._apply_segment_budget(freq_span, overlap, applied_config.sample_rate, target_segments)
            if not math.isclose(adjusted_rate, applied_config.sample_rate, rel_tol=1e-6, abs_tol=1.0):
                applied_config.sample_rate = adjusted_rate

            desired_step = freq_span / max(target_segments - 1, 1) if freq_span > 0 else applied_config.sample_rate
            step_size = applied_config.sample_rate * (1 - overlap)
            if desired_step > 0 and step_size < desired_step:
                required_rate = desired_step / max(1e-6, (1.0 - overlap))
                bumped_rate = self._select_supported_rate(required_rate)
                if bumped_rate > applied_config.sample_rate:
                    applied_config.sample_rate = bumped_rate
                    step_size = applied_config.sample_rate * (1 - overlap)
                if step_size < desired_step:
                    step_size = desired_step

            if step_size <= 0:
                step_size = max(desired_step, 1.0)

            num_segments = max(1, int(freq_span / step_size)) + 1 if freq_span > 0 else 1
            if num_segments > target_segments:
                num_segments = target_segments
                step_size = freq_span / max(target_segments - 1, 1) if target_segments > 1 else freq_span
                if step_size <= 0:
                    step_size = max(desired_step, 1.0)
            fft_size = applied_config.fft_size or self._compute_fft_size(
                applied_config.sample_rate,
                applied_config.resolution,
            )

            self.current_session = {
                "session_id": session_id,
                "config": applied_config,
                "scan_round": 0,
                "num_segments": num_segments,
                "fft_size": fft_size,
                "step_size": step_size,
                "start_time": time.time(),
                "preset": None,
                "preset_meta": preset_meta,
                "target_fps": None,
                "sample_rate": applied_config.sample_rate,
                "max_segments": applied_config.max_segments,
            }

            applied_config.fft_size = fft_size

            self.scan_thread = threading.Thread(
                target=self._scan_loop,
                args=(session_id, applied_config),
                daemon=True,
            )
            self.scan_thread.start()

            logger.info(
                "Spectrum scan started: session=%s span=%.3f-%.3f MHz step=%.3f MHz",
                session_id,
                config.start_freq / 1e6,
                config.stop_freq / 1e6,
                step_size / 1e6,
            )

            return session_id

    def _compute_fft_size(self, sample_rate, resolution):
        """计算合适的FFT大小（2的幂次）"""
        min_fft = sample_rate / resolution
        fft_size = 64  # 最小值
        while fft_size < min_fft and fft_size < 65536:  # 最大值
            fft_size *= 2
        return fft_size

    @staticmethod
    def _calculate_visual_density(frequencies, config: ScanConfig, display_width: int = 800, optimal_points_per_pixel: float = 2.0) -> int:
        """计算在目标显示宽度下的最佳可视化数据密度。"""
        if frequencies is None:
            return 1

        if isinstance(frequencies, list):
            point_count = len(frequencies)
        else:
            try:
                point_count = int(frequencies.size)
            except AttributeError:
                point_count = len(frequencies)

        if point_count <= 0 or display_width <= 0 or optimal_points_per_pixel <= 0:
            return 1

        raw_points_per_pixel = point_count / float(display_width)
        if raw_points_per_pixel <= optimal_points_per_pixel:
            return 1

        ratio = int(raw_points_per_pixel / optimal_points_per_pixel)
        return max(1, ratio)

    def _adaptive_downsample(self, frequencies, power_spectrum, config: ScanConfig):
        """根据扫描频宽决定基础降采样率，同时兼容列表与数组输入。"""
        if frequencies is None or power_spectrum is None:
            return frequencies, power_spectrum

        fft_hint = getattr(config, "fft_size", None)
        if fft_hint and fft_hint <= 2048:
            return frequencies, power_spectrum

        if isinstance(frequencies, list):
            freq_array = np.asarray(frequencies)
        else:
            freq_array = frequencies

        if isinstance(power_spectrum, list):
            power_array = np.asarray(power_spectrum)
        else:
            power_array = power_spectrum

        if freq_array.size == 0 or power_array.size == 0:
            return frequencies, power_spectrum

        scan_span = float(config.stop_freq - config.start_freq)
        if scan_span <= 0:
            return frequencies, power_spectrum

        if scan_span > 500e6:
            ratio = 8
        elif scan_span > 100e6:
            ratio = 4
        elif scan_span > 20e6:
            ratio = 2
        else:
            ratio = 1

        if ratio <= 1:
            return frequencies, power_spectrum

        indices = np.arange(0, freq_array.size, ratio, dtype=int)
        downsampled_freqs = freq_array[indices]
        downsampled_power = power_array[indices]

        if isinstance(frequencies, list):
            downsampled_freqs = downsampled_freqs.tolist()
        if isinstance(power_spectrum, list):
            downsampled_power = downsampled_power.tolist()

        return downsampled_freqs, downsampled_power

    def stop_scanning(self):
        """停止频谱扫描"""
        with self._scan_lock:
            if not self.scanning:
                return False

            self.scanning = False
            self._stop_event.set()
            thread = self.scan_thread
            session_info = self.current_session

        if thread and thread.is_alive():
            thread.join(timeout=5.0)
            if thread.is_alive():
                logger.warning("Spectrum scan thread did not terminate within timeout")

        with self._scan_lock:
            if session_info and self.visualizer:
                try:
                    self.visualizer.finalize_session(
                        session_info["session_id"],
                        status="stopped",
                    )
                except Exception as exc:
                    logger.warning("Failed to finalize scan session %s: %s", session_info.get("session_id"), exc)
            self.current_session = None
            self.scan_thread = None

        self._reset_realtime_state()

        return True

    def get_active_config(self) -> Optional[ScanConfig]:
        """返回当前会话使用的扫描配置。"""
        with self._scan_lock:
            session = self.current_session
            if not session:
                return None
            return session.get("config")

    def _scan_loop(self, session_id, config):
        """扫描主循环"""
        round_count = 0

        while (
            self.scanning
            and not self._stop_event.is_set()
            and self.current_session
            and self.current_session["session_id"] == session_id
        ):
            print(f"开始第 {round_count + 1} 轮频谱扫描...")
            full_spectrum = self._execute_single_sweep(config, round_count, session_id)

            if full_spectrum and self.visualizer:
                self.visualizer.update_scan_session(
                    session_id,
                    full_spectrum,
                    round_count,
                    self.current_session["fft_size"],
                    self.current_session["num_segments"],
                )

            round_count += 1
            self.current_session["scan_round"] = round_count

            if not config.continuous:
                break

            # 等待下一轮扫描
            if (
                self.scanning
                and not self._stop_event.is_set()
                and config.scan_interval > 0
            ):
                self._stop_event.wait(config.scan_interval)

        print("频谱扫描结束")
        natural_completion = not self._stop_event.is_set()
        session_info = None
        with self._scan_lock:
            self.scanning = False
            if natural_completion:
                session_info = self.current_session
                self.current_session = None
                self.scan_thread = None

        if natural_completion and session_info and self.visualizer:
            try:
                self.visualizer.finalize_session(session_info["session_id"], status="completed")
            except Exception as exc:
                logger.warning("Failed to finalize naturally completed scan %s: %s", session_info.get("session_id"), exc)

        if natural_completion:
            self._reset_realtime_state()

    def _execute_single_sweep(self, config, round_count, session_id):
        """执行单次扫频（按分段收集、实时发布，最后合并）"""
        all_segment_data = []  # 存储所有分段数据

        current_freq = config.start_freq
        segment_idx = 0
        while (
            current_freq <= config.stop_freq
            and self.scanning
            and not self._stop_event.is_set()
        ):
            try:
                # 配置USRP（若硬件可用）
                actual_rate = self._configure_receiver(current_freq, config.sample_rate)
                self._synchronize_sample_rate(actual_rate, config)

                session_snapshot = self.current_session or {}
                total_segments = max(1, int(session_snapshot.get("num_segments") or 1))

                # 短暂稳定时间
                time.sleep(0.01)

                # 采集并处理样本
                segment_data = self._capture_and_process_segment(
                    current_freq, config, segment_idx
                )

                if segment_data:
                    all_segment_data.append(segment_data)

                    # 实时更新进度
                    self._publish_spectrum_update(
                        session_id=session_id,
                        frequencies=segment_data["frequencies"],
                        power=segment_data["power"],
                        segment_index=segment_idx,
                        total_segments=total_segments,
                        current_freq=current_freq,
                        round_count=round_count,
                    )

                current_freq += self.current_session["step_size"]
                segment_idx += 1

            except Exception as e:
                print(f"频段 {current_freq/1e6:.2f}MHz 扫描失败: {e}")
                current_freq += self.current_session["step_size"]
                segment_idx += 1
                continue

        # 合并所有分段数据
        if all_segment_data:
            all_frequencies = []
            all_power = []
            for segment in all_segment_data:
                all_frequencies.extend(segment["frequencies"])
                all_power.extend(segment["power"])

            # 按频率排序并去重
            combined = sorted(zip(all_frequencies, all_power), key=lambda item: item[0])
            unique_freqs = []
            unique_power = []
            last_freq = None

            for freq, power in combined:
                if last_freq is None or abs(freq - last_freq) > 1:  # 1Hz 容差
                    unique_freqs.append(freq)
                    unique_power.append(power)
                    last_freq = freq

            return {
                "frequencies": unique_freqs,
                "power": unique_power,
                "round": round_count,
                "timestamp": time.time(),
                "segment_count": len(all_segment_data),
            }
        else:
            return {
                "frequencies": [],
                "power": [],
                "round": round_count,
                "timestamp": time.time(),
                "segment_count": 0,
            }

    def _capture_and_process_segment(self, center_freq, config, segment_idx):
        """采集并处理单个频段（无平均处理）"""
        processor_cfg = getattr(self.processor, "config", None)
        fft_override = getattr(config, "fft_size", None)
        previous_fft = None
        if fft_override and processor_cfg is not None:
            try:
                previous_fft = getattr(processor_cfg, "fft_size", None)
                processor_cfg.fft_size = int(fft_override)
            except Exception:
                previous_fft = None

        try:
            # 直接采集样本，不进行平均
            if not self.scanning or self._stop_event.is_set():
                return None

            # 采集样本（硬件或模拟）
            samples = self._acquire_samples(config, center_freq)

            if samples is not None and len(samples) > 0:
                # 计算频谱
                freqs, spectrum_power = self.processor.calculate_spectrum(
                    samples, config.sample_rate
                )
                spectrum_db = 10 * np.log10(np.maximum(spectrum_power, 1e-12))

                # 调整频率为中心频率
                adjusted_freqs = freqs + center_freq

                # 简化降采样逻辑
                freq_ds, power_ds = adjusted_freqs, spectrum_db

                # 只在必要时进行降采样
                if len(freq_ds) > 10000:  # 只有在数据点过多时才降采样
                    freq_ds, power_ds = self._adaptive_downsample(freq_ds, power_ds, config)

                # 保持原有的频率范围过滤逻辑
                band_start = float(getattr(config, 'start_freq', 0.0) or 0.0)
                band_stop = float(getattr(config, 'stop_freq', 0.0) or 0.0)
                if band_stop < band_start:
                    band_start, band_stop = band_stop, band_start

                if band_stop > band_start:
                    filtered_freqs = []
                    filtered_power = []
                    for idx, freq_val in enumerate(freq_ds):
                        try:
                            freq_numeric = float(freq_val)
                        except (TypeError, ValueError):
                            continue
                        if band_start <= freq_numeric <= band_stop:
                            filtered_freqs.append(freq_numeric)
                            if idx < len(power_ds):
                                filtered_power.append(power_ds[idx])
                    if filtered_freqs:
                        freq_ds = filtered_freqs
                        power_ds = filtered_power[: len(filtered_freqs)]

                center_freq_clamped = center_freq
                if band_stop > band_start:
                    try:
                        center_freq_clamped = min(max(float(center_freq), band_start), band_stop)
                    except (TypeError, ValueError):
                        center_freq_clamped = center_freq

                return {
                    "frequencies": freq_ds.tolist() if hasattr(freq_ds, 'tolist') else list(freq_ds),
                    "power": power_ds.tolist() if hasattr(power_ds, 'tolist') else list(power_ds),
                    "segment_index": segment_idx,
                    "center_freq": center_freq_clamped,
                    "timestamp": time.time(),
                }

            return None
        finally:
            if previous_fft is not None and processor_cfg is not None:
                try:
                    processor_cfg.fft_size = previous_fft
                except Exception:
                    pass


    def _configure_receiver(self, freq_hz: float, sample_rate: float):
        """配置接收机，如果硬件不可用则快速返回。"""
        actual_rate = sample_rate
        if not self._hardware_available or not self.usrp:
            return actual_rate

        try:
            result = self.usrp.configure_rx(freq_hz, sample_rate, 30.0, self._rx_channel)
            if result is not None:
                actual_rate = float(result)
        except TypeError:
            # 回退到关键字形式以兼容旧实现
            try:
                result = self.usrp.configure_rx(
                    freq=freq_hz,
                    rate=sample_rate,
                    gain=30.0,
                    channel=self._rx_channel,
                )
                if result is not None:
                    actual_rate = float(result)
            except Exception as exc:
                print(f"配置接收机失败: {exc}")
        except Exception as exc:
            print(f"配置接收机失败: {exc}")

        return actual_rate

    def _acquire_samples(self, config: ScanConfig, center_freq: float):
        """从硬件或模拟源获取样本。"""
        num_samples = max(1024, int(config.dwell_time * config.sample_rate))

        if self._hardware_available and self.usrp:
            try:
                if hasattr(self.usrp, "capture_samples"):
                    return self.usrp.capture_samples(num_samples, channel=self._rx_channel)

                if hasattr(self.usrp, "record_samples"):
                    result = self.usrp.record_samples(
                        config.dwell_time,
                        channel=self._rx_channel,
                    )
                    if isinstance(result, tuple):
                        return result[0]
                    return result
            except Exception as exc:
                print(f"硬件采样失败，切换到模拟数据: {exc}")

        # 生成模拟信号：窄带正弦 + 噪声
        t = np.arange(num_samples) / config.sample_rate
        base_freq = (center_freq % config.sample_rate) / config.sample_rate
        tone = np.exp(1j * 2 * np.pi * base_freq * np.arange(num_samples))
        noise = 0.05 * (
            np.random.randn(num_samples) + 1j * np.random.randn(num_samples)
        )
        return tone + noise

    def _publish_spectrum_update(
        self,
        session_id: str,
        frequencies: List[float],
        power: List[float],
        segment_index: int,
        total_segments: int,
        current_freq: float,
        round_count: int,
    ) -> None:
        if not self.visualizer or not frequencies or not power:
            return

        session_info = self.current_session or {}
        fft_size = int(session_info.get("fft_size") or len(frequencies))
        if fft_size <= 0:
            fft_size = len(frequencies)

        max_segments = int(session_info.get("num_segments") or total_segments or 1)
        progress = 0.0
        if total_segments:
            progress = (segment_index + 1) / max(1, total_segments) * 100.0

        payload = {
            "type": "spectrum_full",
            "session_id": session_id,
            "segment_index": segment_index,
            "segment_count": max(1, total_segments),
            "total_segments": max(1, total_segments),
            "frequencies": frequencies,
            "power": power,
            "center_freq": current_freq,
            "progress": progress,
            "round": round_count,
            "timestamp": time.time(),
            "fft_size": fft_size,
        }

        if session_info:
            preset_name = session_info.get("preset")
            if preset_name:
                payload["preset"] = preset_name
            preset_meta = session_info.get("preset_meta") or {}
            if preset_meta:
                payload["preset_settings"] = preset_meta

            sample_rate_val = session_info.get("sample_rate")
            if sample_rate_val:
                try:
                    payload["sample_rate"] = float(sample_rate_val)
                except (TypeError, ValueError):
                    pass

            max_segments_val = session_info.get("max_segments")
            if max_segments_val:
                try:
                    payload["max_segments"] = int(max_segments_val)
                except (TypeError, ValueError):
                    pass

        try:
            self.visualizer.update_scan_session(
                session_id,
                payload,
                round_count,
                fft_size,
                max_segments,
            )
            self.visualizer.update_scan_progress(
                session_id,
                {
                    "current_segment": segment_index,
                    "segments_total": max(1, total_segments),
                    "progress": progress,
                    "current_center_freq": current_freq,
                    "round": round_count,
                },
            )
        except Exception as exc:
            logger.debug(
                "Failed to publish spectrum update session=%s idx=%s: %s",
                session_id,
                segment_index,
                exc,
            )
