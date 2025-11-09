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
