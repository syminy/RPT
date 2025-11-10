"""
Minimal ASGI app used by CI to start a lightweight test server.
Provides a single /api/status endpoint returning JSON {"status":"ok"}.

This avoids adding heavy web framework deps during CI for simple smoke checks.
"""
import json

async def app(scope, receive, send):
    # Only handle HTTP requests
    if scope.get("type") != "http":
        return

    path = scope.get("path", "")
    method = scope.get("method", "GET").upper()

    if method == "GET" and path == "/api/status":
        body = json.dumps({"status": "ok"}).encode("utf-8")
        headers = [(b"content-type", b"application/json")]
        await send({"type": "http.response.start", "status": 200, "headers": headers})
        await send({"type": "http.response.body", "body": body})
        return

    # Default 404
    await send({"type": "http.response.start", "status": 404, "headers": [(b"content-type", b"text/plain")]})
    await send({"type": "http.response.body", "body": b"not found"})
