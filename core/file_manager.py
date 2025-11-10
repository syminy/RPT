import logging
import os

try:
    import h5py
    H5PY_AVAILABLE = True
except Exception:  # pragma: no cover - environment may lack h5py
    h5py = None
    H5PY_AVAILABLE = False
import numpy as np
from pathlib import Path
from typing import Tuple, List, Dict, Optional
from dataclasses import dataclass, field
from datetime import datetime


logger = logging.getLogger(__name__)


@dataclass
class SignalMetadata:
    """信号元数据"""

    sample_rate: float
    center_freq: float
    timestamp: str
    duration: float
    samples_count: int
    signal_type: str = "unknown"
    rf_channel: int = 0
    gain: float = 0.0
    additional_metadata: Dict = field(default_factory=dict)


class FileManager:
    """文件管理器"""

    def __init__(self):
        self.supported_formats = [".h5", ".dat", ".complex", ".raw", ".bin"]
        # Base directory to save/load files from. Can be set by caller (web UI) to the uploads folder.
        self.base_dir = Path('.')

    def save_signal(
        self, samples: np.ndarray, metadata: SignalMetadata, filename: str
    ) -> bool:
        """保存信号到文件"""
        temp_paths = []
        try:
            file_path = Path(filename)
            if not file_path.parent or str(file_path.parent) in ('.', ''):
                file_path = Path(self.base_dir) / file_path
            file_path.parent.mkdir(parents=True, exist_ok=True)

            logger.info(
                "FileManager.save_signal -> %s (format=%s, samples=%s)",
                file_path,
                file_path.suffix.lower() or 'unknown',
                len(samples),
            )

            if file_path.suffix.lower() == ".h5":
                temp_path = self._build_temp_path(file_path)
                temp_paths.append(temp_path)

                if not self._save_hdf5(samples, metadata, str(temp_path)):
                    return False

                self._fsync_file(temp_path)
                os.replace(temp_path, file_path)
                self._sync_directory(file_path.parent)
                return True

            return self._save_binary_atomic(samples, metadata, file_path, temp_paths)

        except Exception:
            logger.exception("FileManager.save_signal failed for %s", filename)
            return False
        finally:
            for path in temp_paths:
                if path.exists():
                    path.unlink(missing_ok=True)

    def _save_hdf5(
        self, samples: np.ndarray, metadata: SignalMetadata, filename: str
    ) -> bool:
        """保存为HDF5格式"""
        if not H5PY_AVAILABLE:
            logger.error("h5py not available: cannot save HDF5 file")
            return False
        try:
            with h5py.File(filename, "w") as f:
                # 保存样本数据
                f.create_dataset("samples", data=samples, compression="gzip")

                # 保存元数据
                f.attrs["sample_rate"] = metadata.sample_rate
                f.attrs["center_freq"] = metadata.center_freq
                f.attrs["timestamp"] = metadata.timestamp
                f.attrs["duration"] = metadata.duration
                f.attrs["samples_count"] = metadata.samples_count
                f.attrs["signal_type"] = metadata.signal_type
                f.attrs["rf_channel"] = metadata.rf_channel
                f.attrs["gain"] = metadata.gain
                f.attrs["file_version"] = "1.2"

                # 保存附加元数据
                for key, value in metadata.additional_metadata.items():
                    if isinstance(value, (str, int, float, bool)):
                        f.attrs[key] = value

                f.flush()

            return True
        except Exception as e:
            logger.exception("Error saving HDF5 file: %s", filename)
            return False

    def _save_binary_atomic(
        self,
        samples: np.ndarray,
        metadata: SignalMetadata,
        file_path: Path,
        temp_paths: List[Path],
    ) -> bool:
        temp_data_path = self._build_temp_path(file_path)
        temp_meta_path = self._build_temp_path(file_path.with_suffix(".txt"))
        temp_paths.extend([temp_data_path, temp_meta_path])

        if not self._write_binary_data(samples, temp_data_path):
            return False

        if not self._write_binary_metadata(metadata, temp_meta_path):
            return False

        self._fsync_file(temp_data_path)
        os.replace(temp_data_path, file_path)
        self._sync_directory(file_path.parent)

        self._fsync_file(temp_meta_path)
        os.replace(temp_meta_path, file_path.with_suffix(".txt"))
        self._sync_directory(file_path.parent)

        return True

    def _write_binary_data(self, samples: np.ndarray, path: Path) -> bool:
        try:
            interleaved = np.zeros(2 * len(samples), dtype=np.float32)
            interleaved[0::2] = np.real(samples)
            interleaved[1::2] = np.imag(samples)

            with open(path, "wb") as data_file:
                interleaved.tofile(data_file)
                data_file.flush()
                os.fsync(data_file.fileno())

            return True
        except Exception:
            logger.exception("Error writing binary data to %s", path)
            return False

    def _write_binary_metadata(self, metadata: SignalMetadata, path: Path) -> bool:
        try:
            with open(path, "w") as f:
                f.write(f"Sample_Rate: {metadata.sample_rate}\n")
                f.write(f"Center_Freq: {metadata.center_freq}\n")
                f.write(f"Timestamp: {metadata.timestamp}\n")
                f.write(f"Duration: {metadata.duration}\n")
                f.write(f"Samples_Count: {metadata.samples_count}\n")
                f.write(f"Signal_Type: {metadata.signal_type}\n")
                f.write(f"RF_Channel: {metadata.rf_channel}\n")
                f.write(f"Gain: {metadata.gain}\n")
                f.flush()
                os.fsync(f.fileno())

            return True
        except Exception:
            logger.exception("Error writing binary metadata to %s", path)
            return False

    def _build_temp_path(self, target: Path) -> Path:
        suffix = target.suffix
        if suffix:
            return target.with_suffix(f"{suffix}.tmp")
        return target.with_name(f"{target.name}.tmp")

    def _fsync_file(self, path: Path) -> None:
        try:
            with open(path, "rb") as handle:
                os.fsync(handle.fileno())
        except FileNotFoundError:
            pass
        except Exception as exc:
            logger.debug("Unable to fsync %s: %s", path, exc)

    def _sync_directory(self, directory: Path) -> None:
        try:
            dir_fd = os.open(str(directory), os.O_RDONLY)
            try:
                os.fsync(dir_fd)
            finally:
                os.close(dir_fd)
        except Exception as exc:
            logger.debug("Unable to sync directory %s: %s", directory, exc)

    def load_signal(
        self, filename: str
    ) -> Tuple[Optional[np.ndarray], Optional[SignalMetadata]]:
        """加载信号文件"""
        try:
            file_path = Path(filename)

            if file_path.suffix.lower() == ".h5":
                return self._load_hdf5(filename)
            else:
                return self._load_binary(filename)

        except Exception as e:
            print(f"Error loading signal: {e}")
            return None, None

    def validate_signal_integrity(
        self, filename: str, expected_samples: Optional[int] = None
    ) -> bool:
        """验证保存的文件是否完整"""
        try:
            samples, _ = self.load_signal(filename)
            if samples is None:
                logger.error("Integrity check failed: unable to load %s", filename)
                return False

            if expected_samples is not None and len(samples) != expected_samples:
                logger.error(
                    "Integrity check failed for %s: expected %s samples, got %s",
                    filename,
                    expected_samples,
                    len(samples),
                )
                return False

            return True
        except Exception:
            logger.exception("Integrity check encountered an error for %s", filename)
            return False

    def _load_hdf5(
        self, filename: str
    ) -> Tuple[Optional[np.ndarray], Optional[SignalMetadata]]:
        """加载HDF5文件"""
        if not H5PY_AVAILABLE:
            print("h5py not available: cannot load HDF5 file")
            return None, None
        try:
            with h5py.File(filename, "r") as f:
                # 加载样本数据
                if "samples" in f:
                    samples = f["samples"][:]
                else:
                    # 尝试其他数据集名称
                    datasets = list(f.keys())
                    if datasets:
                        samples = f[datasets[0]][:]
                    else:
                        raise ValueError("No datasets found in file")

                # 加载元数据
                metadata = SignalMetadata(
                    sample_rate=f.attrs.get("sample_rate", 0),
                    center_freq=f.attrs.get("center_freq", 0),
                    timestamp=f.attrs.get("timestamp", ""),
                    duration=f.attrs.get("duration", 0),
                    samples_count=f.attrs.get("samples_count", len(samples)),
                    signal_type=f.attrs.get("signal_type", "unknown"),
                    rf_channel=f.attrs.get("rf_channel", 0),
                    gain=f.attrs.get("gain", 0.0),
                )

                # 加载附加元数据
                for key in f.attrs:
                    if key not in [
                        "sample_rate",
                        "center_freq",
                        "timestamp",
                        "duration",
                        "samples_count",
                        "signal_type",
                        "rf_channel",
                        "gain",
                    ]:
                        metadata.additional_metadata[key] = f.attrs[key]

            return samples, metadata
        except Exception as e:
            print(f"Error loading HDF5 file: {e}")
            return None, None

    def _load_binary(
        self, filename: str
    ) -> Tuple[Optional[np.ndarray], Optional[SignalMetadata]]:
        """加载二进制文件"""
        try:
            # 读取二进制数据
            interleaved = np.fromfile(filename, dtype=np.float32)

            # 转换为复数
            if len(interleaved) % 2 != 0:
                print("Warning: Binary file has odd number of floats, truncating")
                interleaved = interleaved[: len(interleaved) // 2 * 2]

            samples = interleaved[0::2] + 1j * interleaved[1::2]

            # 尝试加载元数据
            meta_file = Path(filename).with_suffix(".txt")
            metadata = SignalMetadata(
                sample_rate=200e3,  # 默认值
                center_freq=10e6,
                timestamp=datetime.now().isoformat(),
                duration=len(samples) / 200e3,
                samples_count=len(samples),
            )

            if meta_file.exists():
                with open(meta_file, "r") as f:
                    for line in f:
                        if ":" in line:
                            key, value = line.strip().split(":", 1)
                            key = key.strip()
                            value = value.strip()

                            if key == "Sample_Rate":
                                metadata.sample_rate = float(value)
                            elif key == "Center_Freq":
                                metadata.center_freq = float(value)
                            elif key == "Timestamp":
                                metadata.timestamp = value
                            elif key == "Duration":
                                metadata.duration = float(value)
                            elif key == "Samples_Count":
                                metadata.samples_count = int(value)
                            elif key == "Signal_Type":
                                metadata.signal_type = value
                            elif key == "RF_Channel":
                                metadata.rf_channel = int(value)
                            elif key == "Gain":
                                metadata.gain = float(value)

            return samples, metadata
        except Exception as e:
            print(f"Error loading binary file: {e}")
            return None, None

    def get_file_info(self, filename: str) -> Dict:
        """获取文件信息"""
        samples, metadata = self.load_signal(filename)

        if samples is None:
            return {"error": "Failed to load file"}

        file_path = Path(filename)
        file_size = file_path.stat().st_size

        power_stats = {
            "average_power": np.mean(np.abs(samples) ** 2),
            "peak_power": np.max(np.abs(samples) ** 2),
        }

        return {
            "filename": filename,
            "file_size": file_size,
            "file_size_mb": file_size / 1024 / 1024,
            "samples_count": len(samples),
            "duration": len(samples) / metadata.sample_rate,
            "sample_rate": metadata.sample_rate,
            "center_freq": metadata.center_freq,
            "signal_type": metadata.signal_type,
            "rf_channel": metadata.rf_channel,
            "gain": metadata.gain,
            "power_stats": power_stats,
        }

    def list_available_files(self, directory: str = ".") -> List[Dict]:
        """列出可用文件"""
        dir_path = Path(directory)
        signal_files = []

        for fmt in self.supported_formats:
            for file_path in dir_path.glob(f"*{fmt}"):
                file_info = self.get_file_info(str(file_path))
                signal_files.append(file_info)

        return signal_files
