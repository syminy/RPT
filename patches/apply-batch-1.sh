#!/usr/bin/env bash
set -eu

# Wrapper that calls the Python-based safe replacer for batch-1.
PY=patches/apply_batch1.py
if [ ! -f "$PY" ]; then
  echo "Missing $PY" >&2
  exit 2
fi

python3 "$PY"

echo "Batch-1 apply complete. Review changes before committing."
