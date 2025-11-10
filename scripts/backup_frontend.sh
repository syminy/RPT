#!/usr/bin/env bash
# Backup webui frontend bundle(s) with timestamp
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
STATIC_DIR="$ROOT_DIR/webui/static"
TS=$(date +%Y%m%d_%H%M%S)

mkdir -p "$ROOT_DIR/backups/frontend"

if [ -f "$STATIC_DIR/app.js" ]; then
  cp "$STATIC_DIR/app.js" "$ROOT_DIR/backups/frontend/app.js.bak_$TS"
  echo "Backed up app.js -> backups/frontend/app.js.bak_$TS"
else
  echo "No app.js found at $STATIC_DIR/app.js; skipping backup"
fi

if [ -f "$STATIC_DIR/init-action-delegates.js" ]; then
  cp "$STATIC_DIR/init-action-delegates.js" "$ROOT_DIR/backups/frontend/init-action-delegates.js.bak_$TS"
  echo "Backed up init-action-delegates.js -> backups/frontend/init-action-delegates.js.bak_$TS"
fi

exit 0
#!/usr/bin/env bash
# Backup script for frontend single-file fallback
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${ROOT_DIR}/webui/static/app.js"
BACKUP_DIR="${ROOT_DIR}/backups/frontend"
ts=$(date +"%Y%m%d_%H%M%S")
mkdir -p "${BACKUP_DIR}"
if [ ! -f "${SRC}" ]; then
  echo "Source file not found: ${SRC}" >&2
  exit 2
fi
dst="${BACKUP_DIR}/app.js.bak.${ts}"
cp -a "${SRC}" "${dst}"
echo "Created backup: ${dst}"
echo "To restore: cp ${dst} ${SRC} && git add ${SRC} && git commit -m 'rollback: restore app.js from backup ${ts}'"
