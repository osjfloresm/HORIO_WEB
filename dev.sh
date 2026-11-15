#!/usr/bin/env bash
# Starts the existing local installation. Does not modify or seed the database.
set -euo pipefail
project_dir="$(cd "$(dirname "$0")" && pwd)"
if [[ ! -x "$project_dir/horion-backend/venv/bin/python" || ! -f "$project_dir/horion-frontend/node_modules/vite/bin/vite.js" ]]; then
  echo 'Instala primero las dependencias indicadas en README.md.'
  exit 1
fi
cleanup() {
  kill "${backend_pid:-}" "${frontend_pid:-}" 2>/dev/null || true
}
trap cleanup EXIT INT TERM
(cd "$project_dir/horion-backend" && exec venv/bin/python manage.py runserver 127.0.0.1:8000) &
backend_pid=$!
(cd "$project_dir/horion-frontend" && exec node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 3000 --strictPort) &
frontend_pid=$!
wait -n "$backend_pid" "$frontend_pid"
