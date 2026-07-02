#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SQL="$ROOT/database/migrations/093_nurse_passage_series.sql"
if [[ ! -f "$SQL" ]]; then
  echo "Missing $SQL" >&2
  exit 1
fi
# shellcheck source=/dev/null
source "$ROOT/.env" 2>/dev/null || true
: "${DB_HOST:=127.0.0.1}"
: "${DB_PORT:=3306}"
: "${DB_NAME:?Set DB_NAME}"
: "${DB_USER:?Set DB_USER}"
: "${DB_PASSWORD:?Set DB_PASSWORD}"
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$SQL"
echo "Migration 093 applied."
