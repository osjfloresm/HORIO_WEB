#!/usr/bin/env bash
# Optional integration check against a disposable local PostgreSQL cluster.
set -euo pipefail
backend_dir="$(cd "$(dirname "$0")/.." && pwd)"
pg_bin="${PG_BIN:-/usr/lib/postgresql/17/bin}"
pg_dir="$(mktemp -d /tmp/horion-postgres.XXXXXX)"
pg_port="${HORION_TEST_PG_PORT:-55439}"
cleanup() {
  "$pg_bin/pg_ctl" -D "$pg_dir" -m immediate stop >/dev/null 2>&1 || true
  rm -rf -- "$pg_dir"
}
trap cleanup EXIT
"$pg_bin/initdb" -D "$pg_dir" --auth-local=trust --auth-host=trust >/dev/null
"$pg_bin/pg_ctl" -D "$pg_dir" -l "$pg_dir/server.log" -o "-p $pg_port -h 127.0.0.1 -k $pg_dir" start >/dev/null
"$pg_bin/createdb" -h 127.0.0.1 -p "$pg_port" horion_test
cd "$backend_dir"
DATABASE_URL="postgresql://$(id -un)@127.0.0.1:$pg_port/horion_test" venv/bin/python manage.py test --verbosity 1
