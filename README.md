# RPT

## Runtime configuration

You can control a small diagnostic behaviour used by the streaming subsystem. In CI and during development we send an immediate `session_started` acknowledgement so tests and UI code receive a prompt confirmation that a streaming session was created. In production you may want to disable this diagnostic message.

To control it, set the environment variable `RPT_STREAM_SESSION_ACK` to `true` or `false` (default: `true`):

```bash
# enable the diagnostic (default)
export RPT_STREAM_SESSION_ACK=true

# disable the diagnostic in production
export RPT_STREAM_SESSION_ACK=false
```

This does not alter the streaming data flow; it only controls whether a small `session_started` message is sent immediately after session creation.