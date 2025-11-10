from __future__ import annotations

import os
import tempfile
import numpy as np
import time
from typing import Dict, Optional, TYPE_CHECKING, Callable
from datetime import datetime
from dataclasses import asdict
from threading import Event
from pathlib import Path
from core.file_manager import FileManager, SignalMetadata
from core.signal_processor import SignalProcessor
from config.settings import RecordConfig

if TYPE_CHECKING:
    from core.usrp_controller import USRPController


class SignalRecorder:
    """信号录制器"""

    def __init__(
        self,
        usrp_controller: USRPController,
        file_manager: FileManager,
        signal_processor: SignalProcessor,
    ):
        self.usrp = usrp_controller
        self.files = file_manager
        self.processor = signal_processor

    def record_with_power_detection(
        self,
        params: Dict,
        stream_callbacks: Optional[Dict[str, Callable]] = None,
        cancel_event: Optional[Event] = None,
    ) -> bool:
        """带功率检测的信号录制"""
        freq = params.get("freq")
        rate = params.get("rate")
        gain = params.get("gain")
        duration = params.get("duration")
        channel = params.get("channel", 0)
        filename = params.get("filename")
        bandwidth = params.get("bandwidth")
        if bandwidth is None and params.get("bw") is not None:
            bandwidth = params.get("bw")

        callbacks = stream_callbacks or {}
        on_start = callbacks.get("on_start")
        on_chunk = callbacks.get("on_chunk")
        on_complete = callbacks.get("on_complete")

        completed_emitted = False

        def emit_complete(success: bool, payload: Optional[Dict] = None):
            nonlocal completed_emitted
            if completed_emitted:
                return
            completed_emitted = True
            if on_complete:
                try:
                    on_complete(success, payload or {})
                except Exception as cb_exc:
                    print(f"Streaming completion callback error: {cb_exc}")

        samples = np.array([], dtype=np.complex64)
        actual_rate: Optional[float] = None
        expected_samples: Optional[int] = None
        overflow_count = 0
        temp_file: Optional[tempfile.NamedTemporaryFile] = None
        temp_path: Optional[Path] = None
        cleanup_temp = False

        try:
            if freq is None or rate is None or gain is None or duration is None:
                raise ValueError("Missing required recording parameters: freq/rate/gain/duration")

            if not filename:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                freq_mhz = int(freq / 1e6)
                rate_khz = int(rate / 1e3)
                filename = f"hf_record_{freq_mhz}MHz_{rate_khz}kHz_{timestamp}.h5"

            print("\nStarting signal recording...")
            print("Press Ctrl+C to interrupt recording")

            try:
                temp_file = tempfile.NamedTemporaryFile(
                    prefix="rpt_capture_",
                    suffix=".iq",
                    delete=False,
                )
                temp_path = Path(temp_file.name)
            except Exception as temp_exc:
                print(f"Warning: unable to create disk buffer, proceeding without disk safety buffer: {temp_exc}")
                temp_file = None
                temp_path = None

            flush_interval_value = params.get("flush_interval", 1.0)
            try:
                flush_interval = float(flush_interval_value)
            except (TypeError, ValueError):
                flush_interval = 1.0
            flush_interval = max(0.1, flush_interval)
            last_flush = time.time()

            actual_rate = self.usrp.configure_rx(freq, rate, gain, channel, bandwidth=bandwidth)

            # Detect large deviations between requested and actual sample rates and
            # surface clear warnings + metadata so downstream code and users can
            # see why recorded data may not match expectations.
            try:
                requested_rate = float(rate)
                actual_rate_f = float(actual_rate) if actual_rate is not None else 0.0
                rel_diff = abs(actual_rate_f - requested_rate) / max(1e-6, requested_rate)
            except Exception:
                requested_rate = rate
                actual_rate_f = actual_rate
                rel_diff = 0.0

            rate_snapped_info = {
                "requested_sample_rate": requested_rate,
                "actual_sample_rate": actual_rate_f,
                "sample_rate_rel_diff": rel_diff,
                "sample_rate_snapped": bool(rel_diff > 0.10),
            }
            if rate_snapped_info["sample_rate_snapped"]:
                print(
                    "Warning: actual sample rate differs from requested by >10%",
                    f"requested={requested_rate:.3f}, actual={actual_rate_f:.3f}, rel_diff={rel_diff:.3f}",
                )

            if on_start:
                try:
                    on_start(
                        actual_rate,
                        {
                            "freq": freq,
                            "rate": rate,
                            "channel": channel,
                            "bandwidth": bandwidth,
                        },
                    )
                except Exception as cb_exc:
                    print(f"Streaming start callback error: {cb_exc}")

            print("Sample Rate Settings:")
            print(f"  Target Sample Rate: {rate/1e3:.1f} kHz")
            print(f"  Actual Sample Rate: {actual_rate/1e3:.1f} kHz")
            if bandwidth:
                print(f"  Requested Bandwidth: {bandwidth/1e3:.1f} kHz")

            processed_samples = 0
            expected_samples = int(actual_rate * duration) if duration and duration > 0 else None

            def chunk_handler(chunk):
                nonlocal processed_samples, last_flush
                processed_samples += len(chunk)

                if temp_file:
                    try:
                        chunk_view = np.asarray(chunk, dtype=np.complex64)
                        temp_file.write(chunk_view.tobytes())
                        now = time.time()
                        if now - last_flush >= flush_interval:
                            temp_file.flush()
                            os.fsync(temp_file.fileno())
                            last_flush = now
                    except Exception as buffer_exc:
                        print(f"Warning: disk buffer write failed: {buffer_exc}")

                if on_chunk:
                    try:
                        on_chunk(
                            chunk,
                            {
                                "sample_rate": actual_rate,
                                "center_freq": freq,
                                "processed_samples": processed_samples,
                                "expected_samples": expected_samples,
                                "timestamp": time.time(),
                            },
                        )
                    except Exception as cb_exc:
                        print(f"Streaming chunk callback error: {cb_exc}")

            samples, overflow_count = self.usrp.record_samples(
                duration,
                channel,
                chunk_callback=chunk_handler,
                cancel_event=cancel_event,
            )

            samples = np.asarray(samples, dtype=np.complex64)

            if temp_file:
                try:
                    temp_file.flush()
                    os.fsync(temp_file.fileno())
                except Exception as flush_exc:
                    print(f"Warning: unable to flush disk buffer: {flush_exc}")
                finally:
                    temp_file.close()

            disk_samples = None
            if temp_path and temp_path.exists():
                try:
                    disk_samples = np.fromfile(temp_path, dtype=np.complex64)
                except Exception as disk_exc:
                    print(f"Warning: unable to read disk buffer: {disk_exc}")
                    disk_samples = None

            if disk_samples is not None and disk_samples.size:
                if len(samples) != disk_samples.size:
                    print("Warning: mismatch between buffered samples and in-memory samples; using buffered copy to preserve continuity")
                    samples = disk_samples
                cleanup_temp = True

            if len(samples) == 0:
                print("No data recorded")
                emit_complete(False, {"error": "no_samples"})
                return False

            if cancel_event is not None and cancel_event.is_set():
                print("Recording cancelled before completion")
                emit_complete(False, {"cancelled": True})
                return False

            actual_duration = len(samples) / actual_rate if actual_rate else 0.0

            metadata_extra = {
                "target_sample_rate": rate,
                "overflow_count": overflow_count,
                "recording_mode": "power_detection",
            }
            # include rate snapping info so the saved file clearly documents
            # whether the hardware adjusted the sample rate.
            try:
                metadata_extra.update(rate_snapped_info)
            except Exception:
                pass
            if bandwidth is not None:
                metadata_extra["bandwidth"] = float(bandwidth)
            if expected_samples is not None:
                metadata_extra["expected_samples"] = int(expected_samples)
                missing = max(0, expected_samples - len(samples))
                metadata_extra["missing_samples"] = int(missing)

            metadata = SignalMetadata(
                sample_rate=actual_rate or rate,
                center_freq=freq,
                timestamp=datetime.now().isoformat(),
                duration=actual_duration,
                samples_count=len(samples),
                signal_type="complex",
                rf_channel=channel,
                gain=gain,
                additional_metadata=metadata_extra,
            )

            success = self.files.save_signal(samples, metadata, filename)

            if success:
                cleanup_temp = True
                target_path = self.files.base_dir / filename if not Path(filename).is_absolute() else Path(filename)
                try:
                    target_path = target_path.resolve()
                except Exception:
                    target_path = Path(filename)

                validation_ok = self.files.validate_signal_integrity(str(target_path), len(samples))
                if not validation_ok:
                    print("Warning: saved file failed post-write validation; please verify integrity manually")

                print(f"\nSignal saved successfully: {filename}")
                print(f"Actual recording duration: {actual_duration:.2f} seconds")
                print(f"Sample count: {len(samples)}")
                file_info = {}
                file_size_mb = None
                try:
                    file_size_bytes = target_path.stat().st_size
                    file_size_mb = file_size_bytes / (1024 * 1024)
                except Exception as size_exc:
                    print(f"Warning: unable to stat saved file: {size_exc}")

                if file_size_mb is not None:
                    print(f"File size: {file_size_mb:.2f} MB")
                else:
                    print("File size: unavailable")

                try:
                    file_info = self.files.get_file_info(str(target_path))
                except Exception as info_exc:
                    print(f"Warning: unable to read file info: {info_exc}")

                power_stats = self.processor.detect_signal_power(samples)
                print(f"Average Power: {power_stats['average_power_db']:.1f} dB")
                print(f"Peak Power: {power_stats['peak_power_db']:.1f} dB")

                if overflow_count > 0:
                    print(f"Overflow count: {overflow_count}")

                completion_payload = {
                    "metadata": asdict(metadata),
                    "samples_count": len(samples),
                    "overflow_count": overflow_count,
                    "file_path": str(target_path),
                    "validation_passed": bool(validation_ok),
                }

                if file_size_mb is not None:
                    completion_payload["file_size_mb"] = float(file_size_mb)
                if isinstance(file_info, dict) and file_info:
                    completion_payload["file_info"] = file_info

                emit_complete(True, completion_payload)
                return True

            print("Failed to save signal")
            emit_complete(False, {"error": "save_failed"})
            return False

        except Exception as e:
            partial_payload = {"error": str(e)}

            if temp_file and not temp_file.closed:
                try:
                    temp_file.flush()
                    os.fsync(temp_file.fileno())
                except Exception:
                    pass
                temp_file.close()

            buffered_samples = None
            if temp_path and temp_path.exists():
                try:
                    buffered_samples = np.fromfile(temp_path, dtype=np.complex64)
                    partial_payload["buffer_sample_count"] = int(buffered_samples.size)
                except Exception as read_exc:
                    partial_payload["buffer_read_error"] = str(read_exc)
                    buffered_samples = None

            recovered = False
            if buffered_samples is not None and buffered_samples.size > 0:
                try:
                    recovery_rate = actual_rate or rate or 0.0
                    recovery_duration = (
                        buffered_samples.size / recovery_rate if recovery_rate else 0.0
                    )
                    recovery_extra = {
                        "target_sample_rate": rate,
                        "recording_mode": "power_detection_recovery",
                        "overflow_count": overflow_count,
                        "recovered_after_error": True,
                    }
                    if bandwidth is not None:
                        recovery_extra["bandwidth"] = float(bandwidth)

                    recovery_metadata = SignalMetadata(
                        sample_rate=recovery_rate,
                        center_freq=freq or 0.0,
                        timestamp=datetime.now().isoformat(),
                        duration=recovery_duration,
                        samples_count=len(buffered_samples),
                        signal_type="complex",
                        rf_channel=channel or 0,
                        gain=gain or 0.0,
                        additional_metadata=recovery_extra,
                    )

                    if filename:
                        original_path = Path(filename)
                        if original_path.suffix:
                            recovery_name = f"{original_path.stem}_recovered{original_path.suffix}"
                        else:
                            recovery_name = f"{original_path.name}_recovered"
                        recovery_filename = str(original_path.with_name(recovery_name))
                    else:
                        recovery_filename = self._build_recovery_filename(freq, rate)
                    recovery_success = self.files.save_signal(
                        buffered_samples,
                        recovery_metadata,
                        recovery_filename,
                    )

                    if recovery_success:
                        recovered = True
                        cleanup_temp = True
                        recovered_path = (
                            self.files.base_dir / recovery_filename
                            if not Path(recovery_filename).is_absolute()
                            else Path(recovery_filename)
                        )
                        partial_payload["recovered_file"] = str(recovered_path)
                except Exception as recover_exc:
                    partial_payload["recovery_error"] = str(recover_exc)

            partial_payload["recovered"] = recovered
            if temp_path and temp_path.exists() and not recovered:
                partial_payload["buffer_path"] = str(temp_path)

            emit_complete(False, partial_payload)
            print(f"Recording failed: {e}")
            return False

        finally:
            if temp_file and not temp_file.closed:
                try:
                    temp_file.close()
                except Exception:
                    pass
            if temp_path and temp_path.exists():
                if cleanup_temp:
                    try:
                        temp_path.unlink()
                    except Exception as cleanup_exc:
                        print(f"Warning: unable to remove temporary buffer file: {cleanup_exc}")
                else:
                    print(f"Buffered samples retained at {temp_path} for manual recovery")

    def record_with_bandpass_sampling(self, params: Dict) -> bool:
        """带通采样录制"""
        if "bandwidth" not in params and params.get("bw") is not None:
            params["bandwidth"] = params.get("bw")

        # 计算带通采样率
        optimal_rate = self.processor.calculate_bandpass_sample_rate(
            params["freq"], params.get("bw", 20e3)
        )

        if params.get("rate", 0) <= 0:
            params["rate"] = optimal_rate
            print(f"Using calculated bandpass sample rate: {optimal_rate/1e3:.1f} kHz")

        return self.record_with_power_detection(params)

    def _build_recovery_filename(self, freq: Optional[float], rate: Optional[float]) -> str:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        freq_part = f"{int(freq / 1e6)}MHz" if freq else "unknown"
        rate_part = f"{int(rate / 1e3)}kHz" if rate else "unknown"
        return f"hf_record_recovery_{freq_part}_{rate_part}_{timestamp}.h5"

    def record_high_speed(
        self,
        params: Dict,
        stream_callbacks: Optional[Dict[str, Callable]] = None,
        cancel_event: Optional[Event] = None,
    ) -> bool:
        """大带宽高速录制：直接流式写入HDF5，避免内存膨胀"""
        try:
            import h5py  # pylint: disable=import-outside-toplevel
        except Exception as exc:  # pragma: no cover - h5py may be missing
            print(f"High-speed recording requires h5py: {exc}")
            return False

        freq = params.get("freq")
        rate = params.get("rate")
        gain = params.get("gain")
        duration = params.get("duration")
        bandwidth = params.get("bandwidth")
        channel = params.get("channel", 0)
        filename = params.get("filename")

        if freq is None or rate is None or gain is None or duration is None:
            print("Missing required parameters for high-speed recording")
            return False

        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"hf_highspeed_{int(freq/1e6)}MHz_{int(rate/1e6)}Msps_{timestamp}.h5"

        base_path = Path(filename)
        if not base_path.parent or str(base_path.parent) in (".", ""):
            base_path = Path(self.files.base_dir) / base_path
        base_path.parent.mkdir(parents=True, exist_ok=True)

        temp_path = base_path.with_name(f".{base_path.name}.tmp")
        callbacks = stream_callbacks or {}
        on_start = callbacks.get("on_start")
        on_chunk = callbacks.get("on_chunk")
        on_complete = callbacks.get("on_complete")

        completed_emitted = False

        def emit_complete(success: bool, payload: Optional[Dict] = None):
            nonlocal completed_emitted
            if completed_emitted:
                return
            completed_emitted = True
            if on_complete:
                try:
                    on_complete(success, payload or {})
                except Exception as cb_exc:
                    print(f"Streaming completion callback error: {cb_exc}")

        flush_interval_value = params.get("flush_interval", 2.0)
        try:
            flush_interval = max(0.5, float(flush_interval_value))
        except (TypeError, ValueError):
            flush_interval = 2.0

        chunk_samples_value = params.get("chunk_samples", 1024 * 1024)
        try:
            chunk_samples = max(16_384, int(chunk_samples_value))
        except (TypeError, ValueError):
            chunk_samples = 1024 * 1024

        compression = params.get("compression", "lzf")
        if isinstance(compression, str) and compression.lower() in {"none", "off", "false"}:
            compression = None

        print(f"\nStarting high-speed recording at {rate/1e6:.1f} MSps")
        print(f"Expected throughput ~{rate * 8 / 1e6:.1f} MB/s (complex64)")

        actual_rate = self.usrp.configure_rx(
            freq,
            rate,
            gain,
            channel=channel,
            bandwidth=bandwidth,
        )

        # High-speed path: detect significant deviation between requested and
        # actual sample rates and record that information for diagnostics.
        try:
            requested_rate = float(rate)
            actual_rate_f = float(actual_rate) if actual_rate is not None else 0.0
            rel_diff = abs(actual_rate_f - requested_rate) / max(1e-6, requested_rate)
        except Exception:
            requested_rate = rate
            actual_rate_f = actual_rate
            rel_diff = 0.0

        highspeed_rate_info = {
            "requested_sample_rate": requested_rate,
            "actual_sample_rate": actual_rate_f,
            "sample_rate_rel_diff": rel_diff,
            "sample_rate_snapped": bool(rel_diff > 0.10),
        }
        if highspeed_rate_info["sample_rate_snapped"]:
            print(
                "Warning: high-speed actual sample rate differs from requested by >10%",
                f"requested={requested_rate:.3f}, actual={actual_rate_f:.3f}, rel_diff={rel_diff:.3f}",
            )

        if on_start:
            try:
                on_start(
                    actual_rate,
                    {
                        "freq": freq,
                        "rate": rate,
                        "channel": channel,
                        "bandwidth": bandwidth,
                        "mode": "high_speed",
                    },
                )
            except Exception as cb_exc:
                print(f"Streaming start callback error: {cb_exc}")

        processed_samples = 0
        overflow_count = 0
        write_error: Optional[Exception] = None
        total_expected = int(actual_rate * duration) if duration and duration > 0 else None
        last_flush = time.time()
        recording_started = datetime.now().isoformat()

        if cancel_event is None:
            local_cancel = Event()
        else:
            local_cancel = cancel_event

        try:
            with h5py.File(temp_path, "w", libver="latest") as h5f:
                dataset_kwargs = {
                    "shape": (0,),
                    "maxshape": (None,),
                    "dtype": np.complex64,
                    "chunks": (chunk_samples,),
                    "fletcher32": True,
                }
                if compression:
                    dataset_kwargs["compression"] = compression
                    dataset_kwargs["shuffle"] = True

                dataset = h5f.create_dataset("samples", **dataset_kwargs)

                file_attrs = h5f.attrs
                file_attrs["sample_rate"] = float(actual_rate)
                file_attrs["center_freq"] = float(freq)
                file_attrs["timestamp"] = recording_started
                file_attrs["signal_type"] = "complex"
                file_attrs["rf_channel"] = int(channel)
                file_attrs["gain"] = float(gain)
                file_attrs["target_sample_rate"] = float(rate)
                file_attrs["recording_mode"] = "high_speed"
                file_attrs["overflow_count"] = 0
                if bandwidth is not None:
                    file_attrs["bandwidth"] = float(bandwidth)
                try:
                    file_attrs["requested_sample_rate"] = float(highspeed_rate_info.get("requested_sample_rate", 0.0))
                    file_attrs["sample_rate_snapped"] = bool(highspeed_rate_info.get("sample_rate_snapped", False))
                    file_attrs["sample_rate_rel_diff"] = float(highspeed_rate_info.get("sample_rate_rel_diff", 0.0))
                except Exception:
                    pass

                def chunk_handler(chunk: np.ndarray):
                    nonlocal processed_samples, last_flush, write_error, overflow_count
                    if write_error is not None:
                        return
                    try:
                        chunk_view = np.asarray(chunk, dtype=np.complex64)
                        current_size = dataset.shape[0]
                        new_size = current_size + len(chunk_view)
                        dataset.resize((new_size,))
                        dataset[current_size:new_size] = chunk_view
                        processed_samples += len(chunk_view)

                        now = time.time()
                        if now - last_flush >= flush_interval:
                            h5f.flush()
                            last_flush = now

                        if on_chunk:
                            on_chunk(
                                chunk_view,
                                {
                                    "sample_rate": actual_rate,
                                    "processed_samples": processed_samples,
                                    "expected_samples": total_expected,
                                    "timestamp": now,
                                },
                            )
                    except Exception as write_exc:
                        write_error = write_exc
                        if cancel_event is not None:
                            cancel_event.set()
                        else:
                            local_cancel.set()

                samples, overflow_count = self.usrp.record_samples(
                    duration,
                    channel=channel,
                    chunk_callback=chunk_handler,
                    cancel_event=local_cancel,
                    collect_samples=False,
                )

                if samples is not None and len(samples) > 0 and processed_samples == 0:
                    # record_samples might fallback to returning samples if chunk handler was skipped
                    chunk_handler(samples)

                if cancel_event is not None and cancel_event.is_set():
                    print("Recording cancelled before completion")
                    raise RuntimeError("recording_cancelled")
                if write_error is not None:
                    raise write_error

                actual_duration = processed_samples / actual_rate if actual_rate else 0.0
                file_attrs["duration"] = float(actual_duration)
                file_attrs["samples_count"] = int(processed_samples)
                file_attrs["overflow_count"] = int(overflow_count)
                h5f.flush()

            os.replace(temp_path, base_path)

            validation_ok = self._quick_hdf5_validation(base_path, processed_samples)
            file_size_mb = None
            try:
                file_size_bytes = base_path.stat().st_size
                file_size_mb = file_size_bytes / (1024 * 1024)
            except Exception as stat_exc:
                print(f"Warning: unable to stat high-speed file: {stat_exc}")

            print("\nHigh-speed recording completed")
            print(f"  Samples captured : {processed_samples}")
            print(f"  Overflow count   : {overflow_count}")
            if file_size_mb is not None:
                print(f"  File size        : {file_size_mb:.1f} MB")

            extra_meta = {
                "target_sample_rate": rate,
                "recording_mode": "high_speed",
                "overflow_count": overflow_count,
            }
            if bandwidth is not None:
                extra_meta["bandwidth"] = float(bandwidth)
            if total_expected is not None:
                extra_meta["expected_samples"] = int(total_expected)

            metadata = SignalMetadata(
                sample_rate=actual_rate,
                center_freq=freq,
                timestamp=recording_started,
                duration=processed_samples / actual_rate if actual_rate else 0.0,
                samples_count=int(processed_samples),
                signal_type="complex",
                rf_channel=channel,
                gain=gain,
                additional_metadata=extra_meta,
            )

            completion_payload = {
                "metadata": asdict(metadata),
                "samples_count": int(processed_samples),
                "overflow_count": overflow_count,
                "file_path": str(base_path),
                "validation_passed": bool(validation_ok),
            }
            if file_size_mb is not None:
                completion_payload["file_size_mb"] = float(file_size_mb)

            emit_complete(True, completion_payload)
            return True

        except RuntimeError as cancel_exc:
            if str(cancel_exc) == "recording_cancelled":
                emit_complete(False, {"cancelled": True})
            else:
                emit_complete(False, {"error": str(cancel_exc)})
            print("High-speed recording cancelled")
            return False
        except Exception as exc:
            emit_complete(False, {"error": str(exc)})
            print(f"High-speed recording failed: {exc}")
            if temp_path.exists():
                try:
                    temp_path.unlink()
                except Exception:
                    pass
            return False

    def _quick_hdf5_validation(self, path: Path, expected_samples: Optional[int]) -> bool:
        try:
            import h5py  # pylint: disable=import-outside-toplevel
        except Exception:
            return expected_samples is None

        try:
            with h5py.File(path, "r") as h5f:
                if "samples" not in h5f:
                    return False
                sample_count = h5f["samples"].shape[0]
                if expected_samples is not None and sample_count != expected_samples:
                    return False
            return True
        except Exception as exc:
            print(f"Validation warning for {path}: {exc}")
            return False
