#!/usr/bin/env bash
# Migrations 081–084 — RAG & intelligence profonde (Phase 3 IA)
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
  "081_ai_memory.sql"
  "082_ai_patient_signals.sql"
  "083_ai_reports_summaries.sql"
  "084_ai_conversation_attachments.sql"
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
    echo "==> Application $file ..."
    mysql --default-character-set=utf8mb4 -h"$host" -P"$port" -u"$user" "$db" <"$REPO_ROOT/database/migrations/$file"
  done
}

apply_local() {
  if [[ -f "$LOCAL_ENV" ]]; then set -a; source "$LOCAL_ENV"; set +a; fi
  if ! command -v mysql >/dev/null 2>&1; then echo "==> mysql absent — skip local."; return 0; fi
  if mysql --default-character-set=utf8mb4 -h"${DB_HOST}" -P"${DB_PORT:-3306}" -u"$DB_USER" "$DB_NAME" \
    -e "SHOW TABLES LIKE 'ai_user_memory';" 2>/dev/null | grep -q ai_user_memory; then
    echo "==> Migrations 081–084 déjà appliquées (local)."
    return 0
  fi
  apply_sql_files "${DB_HOST}" "${DB_PORT:-3306}" "$DB_USER" "$DB_NAME"
  echo "==> OK local — migrations RAG 081–084."
}

apply_remote() {
  [[ -f "$SSH_KEY" ]] || { echo "Cle SSH introuvable: $SSH_KEY" >&2; exit 1; }
  TMP="/tmp/oneandlab-rag-migrations-$$.$RANDOM.sql"
  { for f in "${MIGRATIONS[@]}"; do echo "-- $f"; cat "$REPO_ROOT/database/migrations/$f"; echo; done; } >"$TMP"
  scp -q -o StrictHostKeyChecking=accept-new -i "$SSH_KEY" "$TMP" "$SSH_HOST:/tmp/oneandlab-rag-migrations.sql"
  rm -f "$TMP"
  ssh -o StrictHostKeyChecking=accept-new -i "$SSH_KEY" "$SSH_HOST" bash -s <<'REMOTE'
set -euo pipefail
source /var/www/oneandlab/.env
export MYSQL_PWD="$DB_PASS"
H="${DB_HOST:-127.0.0.1}"; P="${DB_PORT:-3306}"; U="$DB_USER"; D="$DB_NAME"
if mysql --default-character-set=utf8mb4 -h"$H" -P"$P" -u"$U" "$D" -e "SHOW TABLES LIKE 'ai_user_memory';" 2>/dev/null | grep -q ai_user_memory; then
  echo "Migrations 081–084 déjà appliquées."
else
  mysql --default-character-set=utf8mb4 -h"$H" -P"$P" -u"$U" "$D" </tmp/oneandlab-rag-migrations.sql
  echo "Migrations 081–084 appliquées."
fi
rm -f /tmp/oneandlab-rag-migrations.sql
REMOTE
  echo "==> OK distant — migrations RAG 081–084."
}

[[ "$DO_LOCAL" -eq 1 ]] && apply_local
[[ "$DO_REMOTE" -eq 1 ]] && apply_remote
