#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"

echo "1) Backing up webui/static/app.js"
BACKUP=$(./scripts/backup_app.sh || true) || true
if [ $? -eq 2 ]; then
  echo "Backup skipped: app.js not found";
else
  echo "Backup saved to: $BACKUP"
fi

echo "\n2) Scanning templates for inline onclick handlers"
node ./scripts/check-no-onclick.js || (echo 'check-no-onclick failed' >&2; exit 1)

echo "\n3) Running basic data-stability checks"
python3 ./scripts/verify-data-stability.py || (echo 'verify-data-stability failed' >&2; exit 1)

echo "\nSmoke checks completed successfully"
