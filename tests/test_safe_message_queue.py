import threading
import time
import random
import asyncio
import os
import sys

# Ensure repo root is on sys.path so 'webui' package can be imported when tests
# are executed in various ways (some pytest invocations may not preset it).
ROOT = os.path.dirname(os.path.dirname(__file__))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from webui.streaming_manager import SafeMessageQueue


def test_put_and_get_with_running_loop():
    """Producer (thread) puts a message while the event loop is running; async get() should receive it."""

    async def coro():
        q = SafeMessageQueue(loop=asyncio.get_running_loop())

        def producer():
            # small delay to allow get() to start waiting
            time.sleep(0.02)
            q.put_from_thread({"msg": "hello"})

        t = threading.Thread(target=producer)
        t.start()

        msg = await q.get()
        t.join()

        assert isinstance(msg, dict)
        assert msg.get("msg") == "hello"

    asyncio.run(coro())


def test_fallback_when_loop_not_running():
    """If the provided loop is not running/closed, SafeMessageQueue should fall back to the thread queue."""

    # create and immediately close a loop to simulate a non-running loop
    loop = asyncio.new_event_loop()
    loop.close()

    q = SafeMessageQueue(loop=loop)

    def producer():
        # direct put_from_thread into fallback
        q.put_from_thread({"ok": True})

    t = threading.Thread(target=producer)
    t.start()

    async def coro():
        msg = await q.get()
        return msg

    res = asyncio.run(coro())
    t.join()

    assert isinstance(res, dict)
    assert res.get("ok") is True


def test_multiple_producers_threadsafe():
    """Multiple threads concurrently put messages; the async consumer should receive them all."""

    async def coro():
        q = SafeMessageQueue(loop=asyncio.get_running_loop())
        n = 20

        def producer(i):
            time.sleep(random.random() * 0.02)
            q.put_from_thread({"i": i})

        threads = [threading.Thread(target=producer, args=(i,)) for i in range(n)]
        for t in threads:
            t.start()

        received = []
        for _ in range(n):
            msg = await q.get()
            received.append(msg.get("i"))

        for t in threads:
            t.join()

        assert set(received) == set(range(n))

    asyncio.run(coro())
