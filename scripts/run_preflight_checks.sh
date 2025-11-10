#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "[1/3] Backing up frontend files"
bash "$ROOT_DIR/scripts/backup_frontend.sh"

echo "[2/4] Scanning for inline onclick handlers"
python3 "$ROOT_DIR/scripts/check-no-onclick.py"

echo "[3/4] Scanning for leftover data-old-* fallback attributes"
# This script exits with non-zero when any data-old-* attributes are found so preflight fails
python3 "$ROOT_DIR/scripts/check-no-data-old.py"

echo "[4/4] Verifying data stability for sample uploads (if any)"
python3 "$ROOT_DIR/scripts/verify-data-stability.py"

echo "Preflight checks complete"
