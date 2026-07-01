#!/usr/bin/env bash
# Migrations 079–080 — Santé connectée (Phase 2 IA)
#
# Usage :
#   ./database/scripts/apply-migration-079-080-health.sh
#   ./database/scripts/apply-migration-079-080-health.sh --remote-only
#   ./database/scripts/apply-migration-079-080-health.sh --local-only
set -euo pipefail

SSH_KEY="${SSH_KEY:-$HOME/.ssh/oneandlab-key.pem}"
if [[ ! -f "$SSH_KEY" && -f "$HOME/Desktop/oneandlab-key.pem" ]]; then
  SSH_KEY="$HOME/Desktop/oneandlab-key.pem"
fi
SSH_HOST="${SSH_HOST:-ubuntu@15.236.73.7}"
REMOTE_ENV="${REMOTE_ENV:-/var/www/oneandlab/.env}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOCAL_ENV="${LOCAL_ENV:-$REPO_ROOT/.env}"

MIGRATIONS=(
  "079_health_metrics.sql"
  "080_connected_devices.sql"
)

DO_LOCAL=1
DO_REMOTE=1
for arg in "$@"; do
  case "$arg" in
    --local-only) DO_REMOTE=0 ;;
    --remote-only) DO_LOCAL=0 ;;
  esac
done

apply_sql_files() {
  local host="$1" port="$2" user="$3" db="$4"
  export MYSQL_PWD="${DB_PASS:-}"
  for file in "${MIGRATIONS[@]}"; do
    local path="$REPO_ROOT/database/migrations/$file"
    if [[ ! -f "$path" ]]; then
      echo "Fichier SQL introuvable: $path" >&2
      exit 1
    fi
    echo "==> Application $file ..."
    mysql --default-character-set=utf8mb4 -h"$host" -P"$port" -u"$user" "$db" <"$path"
  done
}

apply_local() {
  if [[ -f "$LOCAL_ENV" ]]; then
    set -a
    # shellcheck source=/dev/null
    source "$LOCAL_ENV"
    set +a
  fi
  if ! command -v mysql >/dev/null 2>&1; then
    echo "==> mysql CLI absent — skip local."
    return 0
  fi
  if mysql --default-character-set=utf8mb4 \
    -h"${DB_HOST}" -P"${DB_PORT:-3306}" -u"$DB_USER" "$DB_NAME" \
    -e "SHOW TABLES LIKE 'health_sources';" 2>/dev/null | grep -q health_sources; then
    echo "==> Migrations 079–080 déjà appliquées (local)."
    return 0
  fi
  apply_sql_files "${DB_HOST}" "${DB_PORT:-3306}" "$DB_USER" "$DB_NAME"
  echo "==> OK local — migrations santé 079–080."
}

apply_remote() {
  if [[ ! -f "$SSH_KEY" ]]; then
    echo "Cle SSH introuvable: $SSH_KEY" >&2
    exit 1
  fi

  REMOTE_TMP="/tmp/oneandlab-health-migrations-$$.$RANDOM.sql"
  {
    for file in "${MIGRATIONS[@]}"; do
      echo "-- $file"
      cat "$REPO_ROOT/database/migrations/$file"
      echo
    done
  } >"$REMOTE_TMP"

  echo "==> Copie SQL combiné vers $SSH_HOST..."
  scp -q -o StrictHostKeyChecking=accept-new -o ConnectTimeout=25 -i "$SSH_KEY" "$REMOTE_TMP" "$SSH_HOST:/tmp/oneandlab-health-migrations.sql"
  rm -f "$REMOTE_TMP"

  echo "==> Application migrations 079–080 sur MySQL prod..."
  ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=25 -i "$SSH_KEY" "$SSH_HOST" bash -s <<'REMOTE_EOF'
set -euo pipefail
REMOTE_ENV='/var/www/oneandlab/.env'
set -a
# shellcheck source=/dev/null
source "$REMOTE_ENV"
set +a
export MYSQL_PWD="$DB_PASS"
H="${DB_HOST:-127.0.0.1}"
P="${DB_PORT:-3306}"
U="$DB_USER"
D="$DB_NAME"
if mysql --default-character-set=utf8mb4 -h"$H" -P"$P" -u"$U" "$D" \
  -e "SHOW TABLES LIKE 'health_sources';" 2>/dev/null | grep -q health_sources; then
  echo "Migrations 079–080 déjà appliquées (health_sources existe)."
else
  mysql --default-character-set=utf8mb4 -h"$H" -P"$P" -u"$U" "$D" </tmp/oneandlab-health-migrations.sql
  echo "Migrations 079–080 appliquées."
fi
rm -f /tmp/oneandlab-health-migrations.sql
REMOTE_EOF

  echo "==> OK distant — migrations santé 079–080."
}

if [[ "$DO_LOCAL" -eq 1 ]]; then apply_local; fi
if [[ "$DO_REMOTE" -eq 1 ]]; then apply_remote; fi
