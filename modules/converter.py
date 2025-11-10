import numpy as np
import scipy.io.wavfile as wavfile
from pathlib import Path
from typing import Dict, List, Tuple
from core.file_manager import FileManager
from datetime import datetime
import json


class FormatConverter:
    """格式转换器"""

    def __init__(self, file_manager: FileManager):
        self.files = file_manager

    def convert_format(
        self, input_file: str, output_format: str, output_file: str = None
    ) -> bool:
        """转换格式"""
        # 加载输入文件
        samples, metadata = self.files.load_signal(input_file)
        if samples is None:
            return False

        input_path = Path(input_file)

        # 确定输出文件名
        if output_file is None:
            base_name = input_path.stem
            output_file = f"{base_name}.{output_format}"

        try:
            if output_format.lower() == "h5":
                return self._convert_to_hdf5(samples, metadata, output_file)
            elif output_format.lower() == "wav":
                return self._convert_to_wav(samples, metadata, output_file)
            elif output_format.lower() == "csv":
                return self._convert_to_csv(samples, metadata, output_file)
            elif output_format.lower() == "npy":
                return self._convert_to_npy(samples, metadata, output_file)
            else:
                print(f"Unsupported output format: {output_format}")
                return False

        except Exception as e:
            print(f"Format conversion failed: {e}")
            return False

    def _convert_to_hdf5(self, samples: np.ndarray, metadata, output_file: str) -> bool:
        """转换为HDF5格式"""
        return self.files.save_signal(samples, metadata, output_file)

    def _convert_to_wav(self, samples: np.ndarray, metadata, output_file: str) -> bool:
        """转换为WAV格式"""
        try:
            # 使用实部作为音频数据
            audio_data = np.real(samples)

            # 归一化音频数据
            max_audio = np.max(np.abs(audio_data))
            if max_audio > 0:
                audio_data = audio_data / max_audio

            audio_int16 = (audio_data * 32767).astype(np.int16)
            wavfile.write(output_file, int(metadata.sample_rate), audio_int16)

            print(f"Converted to WAV file: {output_file}")
            print(f"Duration: {len(audio_data)/metadata.sample_rate:.2f} seconds")
            return True
        except Exception as e:
            print(f"WAV conversion failed: {e}")
            return False

    def _convert_to_csv(self, samples: np.ndarray, metadata, output_file: str) -> bool:
        """转换为CSV格式"""
        try:
            max_samples = min(10000, len(samples))  # 限制CSV文件大小
            export_samples = samples[:max_samples]

            with open(output_file, "w") as f:
                f.write("Sample_Index,I_Component,Q_Component,Magnitude,Phase\n")
                for i, sample in enumerate(export_samples):
                    f.write(
                        f"{i},{np.real(sample):.6f},{np.imag(sample):.6f},{np.abs(sample):.6f},{np.angle(sample):.6f}\n"
                    )

            print(f"Converted to CSV file (first {max_samples} samples): {output_file}")
            return True
        except Exception as e:
            print(f"CSV conversion failed: {e}")
            return False

    def _convert_to_npy(self, samples: np.ndarray, metadata, output_file: str) -> bool:
        """转换为NumPy格式"""
        try:
            np.save(output_file, samples)

            # 保存元数据
            meta_file = Path(output_file).with_suffix(".json")
            # coerce numpy scalar types to native Python types so json.dump won't fail
            def _to_py(v):
                try:
                    # numpy scalar and other single-value wrappers
                    if hasattr(v, "item"):
                        return v.item()
                except Exception:
                    pass
                # fallback for basic types
                if isinstance(v, (np.integer,)):
                    return int(v)
                if isinstance(v, (np.floating,)):
                    return float(v)
                return v

            meta_data = {
                "sample_rate": _to_py(metadata.sample_rate),
                "center_freq": _to_py(metadata.center_freq),
                "timestamp": _to_py(metadata.timestamp),
                "duration": _to_py(metadata.duration),
                "samples_count": _to_py(metadata.samples_count),
                "signal_type": _to_py(metadata.signal_type),
                "rf_channel": _to_py(metadata.rf_channel),
                "gain": _to_py(metadata.gain),
                "conversion_time": datetime.now().isoformat(),
            }

            with open(meta_file, "w") as f:
                json.dump(meta_data, f, indent=2)

            print(f"Converted to NumPy .npy format: {output_file}")
            print(f"Metadata saved to: {meta_file}")
            return True
        except Exception as e:
            print(f"NumPy conversion failed: {e}")
            return False
