import logging
import threading
import time
import uuid
from typing import Dict, Optional

import numpy as np

from core.file_manager import FileManager
from utils.config_manager import StreamingConfig, get_config_manager
from utils.visualizer import StreamingSignalVisualizer

logger = logging.getLogger(__name__)


class StreamingSession:
    """流式处理会话，使用配置管理器提供的默认参数"""

    def __init__(
        self,
        session_id: str,
        filename: str,
        sample_rate: Optional[float] = None,
        center_freq: Optional[float] = None,
        custom_config: Optional[StreamingConfig] = None,
    ) -> None:
        self.session_id = session_id
        self.filename = filename

        config_manager = get_config_manager()

        self.sample_rate = sample_rate or config_manager.usrp.default_sample_rate
        self.center_freq = center_freq or config_manager.usrp.default_center_freq
        self.config = custom_config or config_manager.streaming

        self.chunk_size: int = self.config.max_chunk_size
        self.update_interval: float = self.config.min_update_interval
        self.fft_size: int = self.config.default_fft_size
        self.overlap_ratio: float = getattr(self.config, "overlap_ratio", 0.0)

        self.cancel_event: Optional[threading.Event] = None
        self.is_active: bool = False

        self._calculate_dynamic_params()

    def _calculate_dynamic_params(self) -> None:
        """根据配置计算动态参数"""
        if self.sample_rate <= 0:
            logger.warning("Invalid sample rate %s, fallback to 1e6", self.sample_rate)
            self.sample_rate = 1e6

        target_fps = max(self.config.target_fps, 1e-3)
        ideal_chunk_size = int(self.sample_rate / target_fps)
        self.chunk_size = max(
            self.config.min_chunk_size,
            min(ideal_chunk_size, self.config.max_chunk_size),
        )

        ideal_interval = 1.0 / target_fps
        self.update_interval = max(
            self.config.min_update_interval,
            min(ideal_interval, self.config.max_update_interval),
        )

        ideal_fft_size = int(self.sample_rate / max(self.config.target_freq_resolution, 1))
        if ideal_fft_size <= 0:
            ideal_fft_size = self.config.default_fft_size
        self.fft_size = self._get_optimal_fft_size(ideal_fft_size)

        if not (0.0 <= self.overlap_ratio <= 0.95):
            self.overlap_ratio = 0.0

        logger.info(
            "Streaming session params: chunk_size=%s, update_interval=%.3fs, fft_size=%s",
            self.chunk_size,
            self.update_interval,
            self.fft_size,
        )

    @staticmethod
    def _get_optimal_fft_size(ideal_size: int) -> int:
        """找到最接近的理想 FFT 大小（2 的幂次方）"""
        power_of_two_sizes = [64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536]
        optimal_size = power_of_two_sizes[0]
        min_diff = float("inf")

        for size in power_of_two_sizes:
            diff = abs(size - ideal_size)
            if diff < min_diff:
                min_diff = diff
                optimal_size = size

        return optimal_size

    def update_config(self, new_config: StreamingConfig) -> None:
        """更新会话配置并重新计算参数"""
        self.config = new_config
        self.overlap_ratio = getattr(new_config, "overlap_ratio", self.overlap_ratio)
        self._calculate_dynamic_params()


class StreamingSignalAnalyzer:
    """流式信号分析器，集成配置管理器"""

    def __init__(self) -> None:
        self.file_manager = FileManager()
        self.visualizer = StreamingSignalVisualizer()
        self.active_sessions: Dict[str, StreamingSession] = {}
        self.config_manager = get_config_manager()
        logger.info("Streaming analyzer initialized with configuration")

    def start_session(self, session: StreamingSession) -> str:
        """启动流式处理会话"""
        session_id = session.session_id
        session.cancel_event = threading.Event()
        session.is_active = True
        self.active_sessions[session_id] = session

        thread = threading.Thread(
            target=self._process_file_worker,
            args=(session,),
            daemon=True,
            name=f"stream-worker-{session_id}",
        )
        thread.start()

        logger.info("Started streaming session: %s", session_id)
        return session_id

    def stop_session(self, session_id: str) -> None:
        """停止流式处理会话"""
        session = self.active_sessions.get(session_id)
        if not session:
            return
        if session.cancel_event:
            session.cancel_event.set()
        session.is_active = False
        self.active_sessions.pop(session_id, None)
        logger.info("Stopped streaming session: %s", session_id)

    def _process_file_worker(self, session: StreamingSession) -> None:
        """流式处理工作线程"""
        try:
            samples, metadata = self.file_manager.load_signal(session.filename)
            if samples is None:
                raise RuntimeError("Failed to load samples for streaming")

            signal_data = np.asarray(samples)
            total_samples = signal_data.size

            if total_samples == 0:
                raise RuntimeError("Signal file is empty")

            if session.chunk_size > total_samples:
                session.chunk_size = min(session.config.max_chunk_size, total_samples)
                logger.warning(
                    "Adjusted chunk_size to %s (exceeds total samples %s)",
                    session.chunk_size,
                    total_samples,
                )

            position = 0
            sent_chunks = 0
            start_time = time.time()

            while position < total_samples and session.cancel_event and not session.cancel_event.is_set():
                end_pos = min(position + session.chunk_size, total_samples)
                chunk = signal_data[position:end_pos]

                if chunk.size == 0:
                    break

                stream_data = self.visualizer.create_streaming_data(
                    chunk,
                    sample_rate=session.sample_rate,
                    center_freq=session.center_freq,
                    fft_size=session.fft_size,
                    config=self.config_manager.visualization,
                )

                self._send_stream_data(session, stream_data, position, total_samples)

                sent_chunks += 1
                elapsed = max(time.time() - start_time, 1e-6)
                actual_fps = sent_chunks / elapsed

                if session.config.enable_dynamic_adjustment:
                    self._dynamic_adjustment(session, actual_fps, sent_chunks)

                overlap = int(session.chunk_size * session.overlap_ratio)
                advance = max(1, session.chunk_size - overlap)
                position += advance

                if position >= total_samples and overlap > 0 and end_pos < total_samples:
                    position = end_pos

                if session.cancel_event:
                    session.cancel_event.wait(session.update_interval)

            self._send_completion(session, total_samples)
        except Exception as exc:
            logger.error("Stream processing error: %s", exc, exc_info=True)
            self._send_error(session, str(exc))
        finally:
            session.is_active = False

    def _dynamic_adjustment(self, session: StreamingSession, actual_fps: float, sent_chunks: int) -> None:
        """动态调整参数以维持目标性能"""
        if sent_chunks == 0:
            return
        if sent_chunks % 10 != 0:
            return

        target_fps = session.config.target_fps
        if target_fps <= 0:
            return

        fps_ratio = actual_fps / target_fps
        if abs(1.0 - fps_ratio) <= 0.2:
            return

        new_interval = session.update_interval * fps_ratio
        new_interval = max(
            session.config.min_update_interval,
            min(new_interval, session.config.max_update_interval),
        )

        if abs(new_interval - session.update_interval) > 0.001:
            session.update_interval = new_interval
            logger.debug(
                "Dynamic adjustment: actual_fps=%.2f, target_fps=%.2f, new_interval=%.3fs",
                actual_fps,
                target_fps,
                new_interval,
            )

    def _send_stream_data(self, session: StreamingSession, stream_data: Dict, position: int, total_samples: int) -> None:
        """发送流数据到客户端（当前实现为日志占位）"""
        try:
            progress = (position / total_samples) * 100 if total_samples else 0
            logger.debug(
                "Session %s: progress %.1f%%, position %s/%s",
                session.session_id,
                progress,
                position,
                total_samples,
            )
            # TODO: Integrate with WebSocket/SSE manager
        except Exception as exc:
            logger.error("Failed to send stream data: %s", exc)

    @staticmethod
    def _send_completion(session: StreamingSession, total_samples: int) -> None:
        """发送完成信号（当前实现为日志占位）"""
        logger.info(
            "Analysis completed for session %s (total_samples=%s)",
            session.session_id,
            total_samples,
        )

    @staticmethod
    def _send_error(session: StreamingSession, error_message: str) -> None:
        """发送错误信息（当前实现为日志占位）"""
        logger.error(
            "Analysis error for session %s: %s",
            session.session_id,
            error_message,
        )


def get_stream_analyzer() -> StreamingSignalAnalyzer:
    """获取全局流式分析器实例"""
    global _stream_analyzer
    if _stream_analyzer is None:
        _stream_analyzer = StreamingSignalAnalyzer()
    return _stream_analyzer


def create_streaming_session(
    filename: str,
    sample_rate: Optional[float] = None,
    center_freq: Optional[float] = None,
    custom_config: Optional[StreamingConfig] = None,
) -> StreamingSession:
    """创建一个新的流式处理会话对象"""
    session_id = uuid.uuid4().hex
    return StreamingSession(
        session_id=session_id,
        filename=filename,
        sample_rate=sample_rate,
        center_freq=center_freq,
        custom_config=custom_config,
    )


_stream_analyzer: Optional[StreamingSignalAnalyzer] = None
