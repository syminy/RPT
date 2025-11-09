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
