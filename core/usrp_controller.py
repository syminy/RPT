try:
    import uhd
    UHD_AVAILABLE = True
except Exception:
    uhd = None
    UHD_AVAILABLE = False

import numpy as np
import time
import threading
from typing import Tuple, Optional, Dict, List, Callable
from dataclasses import dataclass
from config.settings import USRPConfig


class USRPController:
    """USRP设备控制器"""

    def __init__(self, config: USRPConfig):
        self.config = config
        self.usrp = None
        self.is_connected = False

    def connect(self, address: str = None) -> bool:
        """连接USRP设备"""
        if not UHD_AVAILABLE:
            print("Warning: UHD Python bindings not available; USRP functionality disabled.")
            self.is_connected = False
            return False

        try:
            usrp_addr = address or self.config.address
            print("Connecting to USRP device...")
            self.usrp = uhd.usrp.MultiUSRP(usrp_addr)

            # 如果配置了主时钟频率，尽量应用
            master_clock = getattr(self.config, "master_clock_rate", None)
            if master_clock:
                try:
                    current_clock = self.usrp.get_master_clock_rate()
                except Exception:
                    current_clock = None

                try:
                    if not current_clock or abs(current_clock - master_clock) / master_clock > 0.001:
                        print(f"Setting USRP master clock rate to {master_clock/1e6:.3f} MHz")
                        self.usrp.set_master_clock_rate(master_clock)
                        # allow hardware a brief moment to settle
                        time.sleep(0.05)
                        updated_clock = self.usrp.get_master_clock_rate()
                        print(f"Master clock rate applied: {updated_clock/1e6:.3f} MHz")
                except Exception as clock_exc:
                    print(f"Warning: failed to set master clock rate: {clock_exc}")

            # 测试连接
            info = self.usrp.get_usrp_rx_info()
            print(f"Successfully connected to USRP {info.get('mboard_id', 'Unknown')}")
            print(f"Serial: {info.get('mboard_serial', 'Unknown')}")
            print(f"Available channels: 4 RX/TX channels (RF0-RF3)")

            self.is_connected = True
            return True

        except Exception as e:
            print(f"USRP connection failed: {e}")
            return False

    def disconnect(self):
        """断开USRP连接"""
        if self.usrp:
            self.usrp = None
        self.is_connected = False
        print("USRP disconnected")

    def configure_rx(
        self,
        freq: float,
        rate: float,
        gain: float,
        channel: int = 0,
        bandwidth: Optional[float] = None,
    ):
        """配置接收参数"""
        if not self.is_connected:
            raise RuntimeError("USRP not connected")

        # 找到最接近的可用采样率
        available_rates = self.config.sample_rates
        closest_rate = min(available_rates, key=lambda x: abs(x - rate))

        if abs(closest_rate - rate) / rate > 0.1:
            print(f"Warning: Target rate {rate/1e3:.1f} kHz not available")
            print(f"Using closest available rate: {closest_rate/1e3:.1f} kHz")
            rate = closest_rate

        self.usrp.set_rx_rate(rate, channel)
        actual_rate = self.usrp.get_rx_rate(channel)

        try:
            self.usrp.set_tx_antenna("TX/RX", channel)
        except Exception as exc:
            print(f"Warning: failed to set TX antenna for channel {channel}: {exc}")

        nominal_rate = float(actual_rate) if actual_rate else float(rate)
        if nominal_rate <= 0:
            nominal_rate = float(rate)

        try:
            target_bw = nominal_rate * 1.1
            self.usrp.set_tx_bandwidth(target_bw, channel)
        except Exception as exc:
            print(f"Warning: failed to set TX bandwidth: {exc}")

        try:
            self.usrp.set_tx_enabled(True, channel)
        except Exception:
            pass
        try:
            print(
                "RX sample rate configured:",
                f"requested={rate/1e6:.3f} MSps",
                f"actual={actual_rate/1e6:.3f} MSps",
            )
        except Exception:
            pass
        self.usrp.set_rx_freq(uhd.types.TuneRequest(freq), channel)
        self.usrp.set_rx_gain(gain, channel)

        try:
            self.usrp.set_rx_antenna("RX2", channel)
        except Exception:
            pass

        if bandwidth and bandwidth > 0:
            try:
                self.usrp.set_rx_bandwidth(bandwidth, channel)
            except Exception as exc:
                print(
                    f"Warning: failed to set RX bandwidth to {bandwidth/1e3:.1f} kHz: {exc}"
                )

        return actual_rate

    def configure_tx(self, freq: float, rate: float, gain: float, channel: int = 0):
        """配置发射参数"""
        if not self.is_connected:
            raise RuntimeError("USRP not connected")

        # 找到最接近的可用采样率
        available_rates = self.config.sample_rates
        closest_rate = min(available_rates, key=lambda x: abs(x - rate))

        if abs(closest_rate - rate) / rate > 0.1:
            print(f"Warning: Target rate {rate/1e3:.1f} kHz not available")
            print(f"Using closest available rate: {closest_rate/1e3:.1f} kHz")
            rate = closest_rate

        self.usrp.set_tx_rate(rate, channel)
        actual_rate = self.usrp.get_tx_rate(channel)
        self.usrp.set_tx_freq(uhd.types.TuneRequest(freq), channel)
        self.usrp.set_tx_gain(gain, channel)

        return actual_rate

    def record_samples(
        self,
        duration: float,
        channel: int = 0,
        chunk_callback: Optional[Callable[[np.ndarray], None]] = None,
        cancel_event: Optional["threading.Event"] = None,
        collect_samples: bool = True,
    ) -> Tuple[np.ndarray, int]:
        """录制样本"""
        if not self.is_connected:
            raise RuntimeError("USRP not connected")

        sample_rate = self.usrp.get_rx_rate(channel)
        num_samps = int(duration * sample_rate)
        if num_samps <= 0:
            return np.array([], dtype=np.complex64), 0

        # 配置接收流
        channels = [channel]
        st_args = uhd.usrp.StreamArgs("fc32", "sc16")
        st_args.channels = channels
        rx_stream = self.usrp.get_rx_stream(st_args)

        samples_per_buffer = rx_stream.get_max_num_samps()
        recv_buffer = np.zeros((len(channels), samples_per_buffer), dtype=np.complex64)
        metadata = uhd.types.RXMetadata()

        collected_chunks: List[np.ndarray] = [] if collect_samples else []
        received_samples = 0
        overflow_count = 0

        # 开始接收
        stream_cmd = uhd.types.StreamCMD(uhd.types.StreamMode.start_cont)
        stream_cmd.stream_now = True
        rx_stream.issue_stream_cmd(stream_cmd)

        try:
            while received_samples < num_samps:
                if cancel_event is not None and cancel_event.is_set():
                    print("Recording cancelled by user request")
                    break
                num_rx = rx_stream.recv(recv_buffer, metadata, timeout=1.0)

                if metadata.error_code == uhd.types.RXMetadataErrorCode.overflow:
                    overflow_count += 1
                    if overflow_count <= 3:
                        print(f"Overflow warning #{overflow_count}: Data loss!")
                    if overflow_count >= 3:
                        print("Multiple overflows, stopping recording")
                        break
                    continue
                elif metadata.error_code != uhd.types.RXMetadataErrorCode.none:
                    print(f"Receive error: {metadata.strerror()}")
                    break

                if num_rx > 0:
                    chunk = recv_buffer[0, :num_rx].copy()
                    received_samples += num_rx
                    if collect_samples:
                        collected_chunks.append(chunk)
                    if chunk_callback is not None:
                        try:
                            chunk_callback(chunk)
                        except Exception as callback_exc:
                            print(f"Recording chunk callback error: {callback_exc}")
                if cancel_event is not None and cancel_event.is_set():
                    print("Recording cancelled by user request after chunk")
                    break

        except KeyboardInterrupt:
            print("\nRecording interrupted by user")
        finally:
            # 停止接收
            rx_stream.issue_stream_cmd(
                uhd.types.StreamCMD(uhd.types.StreamMode.stop_cont)
            )

        if collect_samples and collected_chunks:
            return np.concatenate(collected_chunks), overflow_count
        return np.array([], dtype=np.complex64), overflow_count

    def transmit_samples(
        self, samples: np.ndarray, repeat: int = 1, channel: int = 0
    ) -> int:
        """发射样本 - 修复时间戳问题"""
        if not self.is_connected:
            raise RuntimeError("USRP not connected")

        # 配置发射流
        channels = [channel]
        st_args = uhd.usrp.StreamArgs("fc32", "sc16")
        st_args.channels = channels
        tx_stream = self.usrp.get_tx_stream(st_args)

        # 准备数据
        samples_2d = samples.reshape(1, -1)
        sample_len = samples_2d.shape[1]
        sample_rate = self.usrp.get_tx_rate(channel)
        burst_duration = sample_len / sample_rate

        # 修复时间戳问题 - 使用正确的时间规格
        usrp_time = self.usrp.get_time_now()
        start_time = usrp_time + uhd.types.TimeSpec(0.2)  # 200ms后启动

        # 配置metadata
        metadata = uhd.types.TXMetadata()
        metadata.has_time_spec = True
        metadata.start_of_burst = True
        metadata.end_of_burst = False

        total_samples = 0
        iteration = 0

        # 支持无限循环（repeat=0）
        max_iterations = repeat if repeat > 0 else float("inf")

        while iteration < max_iterations:
            # 计算下一次发送的时间戳 - 修复时间规格
            time_offset = iteration * (burst_duration + 0.1)  # 加100ms间隔
            metadata.time_spec = start_time + uhd.types.TimeSpec(time_offset)

            # 发送
            num_tx = tx_stream.send(samples_2d, metadata)
            total_samples += num_tx

            # 只在第一次设置start_of_burst
            metadata.start_of_burst = False

            iteration += 1

            # 非无限循环时，提前退出
            if repeat > 0 and iteration >= repeat:
                break

        # 发送EOF（空burst）
        metadata.end_of_burst = True
        tx_stream.send(np.zeros((1, 1000), dtype=np.complex64), metadata)

        return total_samples

    def transmit_samples_simple(
        self, samples: np.ndarray, repeat: int = 1, channel: int = 0
    ) -> int:
        """简化的发射样本 - 不使用时间戳"""
        if not self.is_connected:
            raise RuntimeError("USRP not connected")

        # 配置发射流
        channels = [channel]
        st_args = uhd.usrp.StreamArgs("fc32", "sc16")
        st_args.channels = channels
        tx_stream = self.usrp.get_tx_stream(st_args)

        # UHD 发送期望float32复数，确保数据符合要求且是连续内存
        samples_c = np.ascontiguousarray(samples, dtype=np.complex64)
        if samples_c.ndim != 1:
            samples_c = samples_c.reshape(-1)
        samples_c = samples_c.reshape(1, -1)

        max_chunk = tx_stream.get_max_num_samps()
        if max_chunk <= 0:
            max_chunk = 4096

        total_samples = 0
        num_source_samples = samples_c.shape[1]

        # 支持无限循环（repeat=0）
        max_iterations = repeat if repeat > 0 else float("inf")
        iteration = 0

        while iteration < max_iterations:
            offset = 0
            while offset < num_source_samples:
                chunk_end = min(offset + max_chunk, num_source_samples)
                chunk = samples_c[:, offset:chunk_end]
                metadata = uhd.types.TXMetadata()
                metadata.has_time_spec = False
                metadata.start_of_burst = offset == 0

                # 在当前迭代的最后一个chunk上标记end_of_burst
                is_last_chunk = chunk_end >= num_source_samples
                is_last_iteration = repeat > 0 and (iteration == max_iterations - 1)
                metadata.end_of_burst = is_last_chunk and is_last_iteration

                num_tx = tx_stream.send(chunk, metadata)
                if num_tx <= 0:
                    raise RuntimeError("USRP transmit returned 0 samples; aborting burst")
                total_samples += num_tx
                offset += num_tx

            iteration += 1

            # 如果是无限循环或还有剩余迭代，在下一次循环前重置offset即可

        # UHD在部分固件上需要显式EOF脉冲，若最后一次迭代未标记end_of_burst，则发送空burst
        eof_meta = uhd.types.TXMetadata()
        eof_meta.has_time_spec = False
        eof_meta.start_of_burst = False
        eof_meta.end_of_burst = True
        tx_stream.send(np.zeros((1, 1), dtype=np.complex64), eof_meta)

        return total_samples

    def get_device_info(self) -> dict:
        """获取设备信息"""
        if not self.is_connected:
            return {}

        info = self.usrp.get_usrp_rx_info()
        return {
            "mboard_id": info.get("mboard_id", "Unknown"),
            "mboard_serial": info.get("mboard_serial", "Unknown"),
            "rx_channels": 4,
            "tx_channels": 4,
        }

    def detect_signal_power(
        self,
        freq: float,
        rate: float,
        gain: float,
        channel: int = 0,
        duration: float = 0.5,
    ) -> Tuple[float, float, bool]:
        """检测信号功率"""
        try:
            print("Scanning for signal presence...")

            # 配置接收器进行快速扫描
            actual_rate = self.configure_rx(freq, rate, gain, channel)

            # 快速采集
            samples, _ = self.record_samples(duration, channel)

            if len(samples) > 0:
                power = np.mean(np.abs(samples) ** 2)
                peak_power = np.max(np.abs(samples) ** 2)
                power_db = 10 * np.log10(power + 1e-12)
                peak_db = 10 * np.log10(peak_power + 1e-12)

                # 信号存在检测
                noise_floor = np.percentile(np.abs(samples), 10)  # 估计噪声基底
                signal_present = peak_power > 4 * noise_floor**2  # 简单阈值

                print(f"Signal Power Analysis:")
                print(f"  Average Power: {power_db:.1f} dB")
                print(f"  Peak Power: {peak_db:.1f} dB")
                print(f"  Signal Detected: {'Yes' if signal_present else 'No'}")

                return power_db, peak_db, signal_present
            else:
                print("No samples captured during power detection")
                return -120, -120, False

        except Exception as e:
            print(f"Power detection failed: {e}")
            return -120, -120, False
