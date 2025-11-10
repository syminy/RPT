import uuid
import asyncio
import time
import threading
import logging
import queue
import os
from typing import Dict, Optional
from dataclasses import dataclass, field

from core.file_manager import FileManager
from core.signal_processor import SignalProcessor
import numpy as np
import traceback


@dataclass
class StreamingSession:
    session_id: str
    filename: str
    sample_rate: float
    center_freq: float
    chunk_size: int = 4096
    update_interval: float = 0.1
    cancel_event: threading.Event = field(default_factory=threading.Event)
    message_queue: object = None
    loop: asyncio.AbstractEventLoop = None


class SafeMessageQueue:
    """A small bridge queue that allows background threads to put messages
    safely while letting async consumers await an async get().

    - put_from_thread(msg): thread-safe; returns immediately
    - async get(): awaitable for consumers (works whether the producer used
      the event loop or a plain thread queue)
    """
    def __init__(self, loop: asyncio.AbstractEventLoop | None = None):
        self._loop = loop if (loop and getattr(loop, 'is_running', lambda: False)()) else None
        # Async queue used when loop is available
        self._async_q: asyncio.Queue | None = asyncio.Queue() if self._loop else None
        # Thread-safe queue used as fallback
        self._thread_q: "queue.Queue" = queue.Queue()

    def put_from_thread(self, msg):
        """Called from background threads. If an active event loop is available,
        schedule a put on the asyncio.Queue; otherwise place into the thread queue."""
        try:
            if self._loop and self._loop.is_running():
                # schedule onto the loop as a coroutine task
                try:
                    self._loop.call_soon_threadsafe(lambda: asyncio.create_task(self._async_q.put(msg)))
                    return
                except Exception:
                    # fall back to thread queue
                    pass
            # fallback: put into thread-safe queue
            self._thread_q.put(msg)
        except Exception:
            # swallow - non-fatal; callers should log if needed
            try:
                logging.getLogger(__name__).exception("SafeMessageQueue.put_from_thread failed")
            except Exception:
                pass

    async def get(self):
        """Await to get next message. Prefer messages from the async queue if present,
        otherwise block on the thread queue using run_in_executor to avoid blocking the event loop."""
        # fast path: if async queue exists, prefer it
        if self._async_q is not None:
            # If there are pending items on the async queue, get immediately.
            try:
                if self._async_q.qsize() > 0:
                    return await self._async_q.get()
            except Exception:
                # fall through to executor-backed thread queue get
                pass

        # check thread queue non-blocking
        try:
            item = self._thread_q.get_nowait()
            return item
        except Exception:
            pass

        # if async queue exists, await on it (this will block until an item is scheduled)
        if self._async_q is not None:
            return await self._async_q.get()

        # final fallback: block on thread queue in executor
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self._thread_q.get)


class StreamingSignalAnalyzer:
    def __init__(self):
        self.sessions: Dict[str, StreamingSession] = {}
        self.logger = logging.getLogger(__name__)

    async def create_session(
        self,
        filename: str,
        sample_rate: float,
        center_freq: float,
        chunk_size: int = 4096,
        update_interval: float = 0.1,
    ) -> StreamingSession:
        session_id = str(uuid.uuid4())
        loop = asyncio.get_running_loop()
        # create a SafeMessageQueue that accepts thread puts and provides an async get()
        message_queue = SafeMessageQueue(loop=loop)

        session = StreamingSession(
            session_id=session_id,
            filename=filename,
            sample_rate=sample_rate,
            center_freq=center_freq,
            chunk_size=chunk_size,
            update_interval=update_interval,
            message_queue=message_queue,
            loop=loop,
        )

        self.sessions[session_id] = session
        self.logger.info(f"Created streaming session {session_id} for file {filename}")

        # start background worker thread
        threading.Thread(
            target=self._process_file_worker,
            args=(session,),
            daemon=True,
        ).start()

        # enqueue an immediate diagnostic 'session_started' message onto the session queue
        # Controlled via environment variable RPT_STREAM_SESSION_ACK (true/false). Defaults to True
        try:
            ack = os.getenv('RPT_STREAM_SESSION_ACK', 'true').lower() in ('1', 'true', 'yes')
            if ack:
                start_msg = {"type": "session_started", "session_id": session_id}
                session.message_queue.put_from_thread(start_msg)
        except Exception:
            # non-fatal; just log and continue
            self.logger.debug("Failed to enqueue session_started message for %s", session_id)

        return session

    def stop_session(self, session_id: str):
        if session_id in self.sessions:
            self.sessions[session_id].cancel_event.set()
            self.logger.info(f"Stopped streaming session {session_id}")

    def _process_file_worker(self, session: StreamingSession):
        """Background file processing worker that puts messages into the asyncio Queue."""
        try:
            # debug: write basic session/thread info to a local file
            try:
                # structured logging instead of ad-hoc /tmp file writes
                self.logger.debug(
                    "Worker start: session=%s thread=%s loop=%s",
                    getattr(session, 'session_id', None),
                    threading.current_thread().name,
                    getattr(session, 'loop', None),
                )
            except Exception:
                # best-effort; don't fail the worker startup
                try:
                    self.logger.debug("Worker start: session=%s (failed to log loop info)", getattr(session, 'session_id', None))
                except Exception:
                    pass
            file_manager = FileManager()
            signal_processor = SignalProcessor()

            samples, metadata = file_manager.load_signal(session.filename)
            if samples is None:
                raise RuntimeError("Failed to load samples for streaming")

            total_samples = len(samples)
            processed_samples = 0
            sequence_num = 0

            while not session.cancel_event.is_set() and processed_samples < total_samples:
                chunk_end = min(processed_samples + session.chunk_size, total_samples)
                chunk_data = samples[processed_samples:chunk_end]

                if len(chunk_data) == 0:
                    break

                try:
                    processing_result = self._process_signal_chunk(chunk_data, signal_processor, session)
                except Exception as ex_chunk:
                    import traceback
                    tb = traceback.format_exc()
                    self.logger.error("Exception while processing chunk for session %s: %s", session.session_id, tb)
                    # send error into queue and stop
                    error_msg = {"type": "error", "error": str(ex_chunk), "traceback": tb}
                    try:
                        session.message_queue.put_from_thread(error_msg)
                    except Exception:
                        self.logger.exception("Failed to enqueue error_msg for session %s", session.session_id)
                    break

                message = {
                    "type": "data",
                    "meta": {
                        "seq": sequence_num,
                        # use time.time() because this runs in a background thread
                        "timestamp": time.time(),
                        "processed_samples": processed_samples,
                        "total_samples": total_samples,
                    },
                    "streams": processing_result,
                }

                # enqueue message (thread-safe wrapper handles loop or fallback)
                try:
                    session.message_queue.put_from_thread(message)
                except Exception:
                    self.logger.exception("Failed to enqueue message for session %s", session.session_id)

                processed_samples += len(chunk_data)
                sequence_num += 1

                # sleep with cancellation check
                session.cancel_event.wait(session.update_interval)

            completion_msg = {"type": "analysis_complete", "meta": {"total_processed": processed_samples}}
            try:
                session.message_queue.put_from_thread(completion_msg)
            except Exception:
                self.logger.exception("Failed to enqueue completion_msg for session %s", getattr(session, 'session_id', None))

        except Exception as e:
            # capture traceback and write to a local debug file (helps when logging config is limited)
            tb = traceback.format_exc()
            # log error with traceback via structured logging
            try:
                self.logger.error("Session %s worker error: %s", getattr(session, 'session_id', None), str(e))
                self.logger.debug(tb)
            except Exception:
                # fallback to exception logger
                try:
                    self.logger.exception("Error in processing worker for session %s", getattr(session, 'session_id', None))
                except Exception:
                    pass

            error_msg = {"type": "error", "error": str(e), "traceback": tb}
            try:
                # use SafeMessageQueue bridge so this works even if the captured loop is closed
                if session and getattr(session, 'message_queue', None) is not None:
                    session.message_queue.put_from_thread(error_msg)
            except Exception:
                self.logger.exception("Failed to enqueue error_msg for session %s during exception handling", getattr(session, 'session_id', None))

    def _process_signal_chunk(self, chunk_data, signal_processor, session):
        # time domain
        time_domain = self._compute_time_domain(chunk_data, signal_processor)

        # frequency domain
        frequency_domain = self._compute_frequency_domain(chunk_data, signal_processor, session.sample_rate)

        # constellation
        constellation = self._compute_constellation(chunk_data, signal_processor)

        # higher order (best-effort)
        higher_order = self._compute_higher_order(chunk_data, signal_processor, session.sample_rate)

        return {
            "time_domain": time_domain,
            "frequency_domain": frequency_domain,
            "constellation": constellation,
            "higher_order": higher_order,
        }

    def _compute_time_domain(self, data, processor):
        time_axis = list(range(len(data)))
        i_component = [float(np.real(s)) for s in data]
        q_component = [float(np.imag(s)) for s in data]

        # limit points to avoid huge payloads
        limit = 1000
        return {
            "time": time_axis[:limit],
            "i_component": i_component[:limit],
            "q_component": q_component[:limit],
        }

    def _compute_frequency_domain(self, data, processor, sample_rate):
        try:
            freqs, power = processor.calculate_spectrum(data, sample_rate)
            return {"frequency": freqs.tolist(), "power": power.tolist()}
        except Exception:
            self.logger.exception("Frequency domain calc failed")
            return {"frequency": [], "power": []}

    def _compute_constellation(self, data, processor):
        step = max(1, len(data) // 1000)
        i_components = [float(np.real(s)) for s in data[::step]]
        q_components = [float(np.imag(s)) for s in data[::step]]
        return {"i_component": i_components, "q_component": q_components}

    def _compute_higher_order(self, data, processor, sample_rate):
        # Try to call methods if they exist; otherwise return empty
        try:
            quad = []
            quart = []
            if hasattr(processor, "compute_quadratic_spectrum"):
                quad = processor.compute_quadratic_spectrum(data, sample_rate)
            if hasattr(processor, "compute_quartic_spectrum"):
                quart = processor.compute_quartic_spectrum(data, sample_rate)

            # quad/quart expected as (freqs, power)
            quad_freq = quad[0].tolist() if quad else []
            quad_power = quad[1].tolist() if quad else []
            quart_power = quart[1].tolist() if quart else []

            return {"frequency": quad_freq, "quadratic_power": quad_power, "quartic_power": quart_power}
        except Exception:
            self.logger.exception("HOS calc failed")
            return {"frequency": [], "quadratic_power": [], "quartic_power": []}
