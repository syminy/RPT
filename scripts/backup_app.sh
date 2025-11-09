#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
APP="$ROOT/webui/static/app.js"
if [ ! -f "$APP" ]; then
  echo "Warning: webui/static/app.js not found; nothing to back up"
  # exit with code 2 to indicate skip (kept for compatibility with other scripts)
  exit 2
fi
TS=$(date +%Y%m%d_%H%M%S)
DEST="$ROOT/webui/static/app.js.bak.$TS"
cp -p "$APP" "$DEST"
echo "$DEST"
exit 0
#!/usr/bin/env bash
set -euo pipefail
TS=$(date +%Y%m%d_%H%M%S)
SRC="webui/static/app.js"
DST_DIR="webui/static"
mkdir -p "$DST_DIR"
if [ ! -f "$SRC" ]; then
  echo "Warning: $SRC not found; nothing to back up" >&2
  exit 2
fi
DST="$DST_DIR/app.js.bak.$TS"
cp -p "$SRC" "$DST"
echo "$DST"
