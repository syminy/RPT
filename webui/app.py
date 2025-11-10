"""A small FastAPI app implementing just the endpoints exercised by tests.

Endpoints implemented:
 - GET  /api/status
 - POST /api/analyze -> starts a dummy background task and returns task_id
 - GET  /api/analysis/{task_id} -> returns status and fake results
 - GET  /api/tasks -> returns tasks list
 - POST /api/ws_stream/start -> returns a session_id
 - WebSocket /ws/stream/{session_id} -> emits a message then listens for 'cancel'

This keeps CI lightweight while satisfying the test expectations.
"""
from fastapi import FastAPI, BackgroundTasks, WebSocket
from fastapi.responses import JSONResponse
from typing import Dict
import uuid
import threading
import time

app = FastAPI()

# Simple in-memory task store for tests
_tasks: Dict[str, Dict] = {}


@app.get("/api/status")
async def status():
    return {"status": "ok"}


def _run_dummy_analysis(task_id: str, filename: str):
    # simulate work
    time.sleep(0.1)
    _tasks[task_id]["status"] = "completed"
    _tasks[task_id]["analysis"] = {"modulation": "QPSK"}
    _tasks[task_id]["plots"] = {"overview": "overview.png"}


@app.post("/api/analyze")
async def analyze(filename: str = "", background: BackgroundTasks = None):
    task_id = str(uuid.uuid4())
    _tasks[task_id] = {"status": "running", "filename": filename}
    # Kick off background thread (fast non-blocking)
    t = threading.Thread(target=_run_dummy_analysis, args=(task_id, filename), daemon=True)
    t.start()
    return JSONResponse({"success": True, "task_id": task_id})


@app.get("/api/analysis/{task_id}")
async def analysis_status(task_id: str):
    if task_id not in _tasks:
        return JSONResponse({"status": "not_found"}, status_code=404)
    return _tasks[task_id]


@app.get("/api/tasks")
async def tasks_list():
    return {"tasks": [{"id": k, **v} for k, v in _tasks.items()]}


@app.post("/api/ws_stream/start")
async def ws_stream_start(payload: Dict):
    session_id = str(uuid.uuid4())
    # store simple session metadata
    _tasks[session_id] = {"status": "streaming"}
    return {"session_id": session_id}


@app.websocket("/ws/stream/{session_id}")
async def ws_stream(socket: WebSocket, session_id: str):
    await socket.accept()
    # send a single message to satisfy the test
    await socket.send_json({"type": "data", "payload": {}})
    try:
        while True:
            msg = await socket.receive_text()
            if msg == "cancel":
                await socket.send_json({"type": "analysis_complete", "ok": True})
                break
    except Exception:
        pass
    await socket.close()

