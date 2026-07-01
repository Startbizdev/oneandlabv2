#!/usr/bin/env bash
# Migrations 085–087 — Phase 4 voix, tendances, feedback
set -euo pipefail

SSH_KEY="${SSH_KEY:-$HOME/.ssh/oneandlab-key.pem}"
SSH_HOST="${SSH_HOST:-ubuntu@15.236.73.7}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOCAL_ENV="${LOCAL_ENV:-$REPO_ROOT/.env}"
MIGRATIONS=(085_voice_sessions.sql 086_ai_trends.sql 087_ai_feedback.sql)
DO_LOCAL=1; DO_REMOTE=1
for arg in "$@"; do case "$arg" in --local-only) DO_REMOTE=0 ;; --remote-only) DO_LOCAL=0 ;; esac; done

apply_sql() {
  export MYSQL_PWD="${DB_PASS:-}"
  for f in "${MIGRATIONS[@]}"; do
    echo "==> $f"
    mysql --default-character-set=utf8mb4 -h"$1" -P"${2:-3306}" -u"$3" "$4" <"$REPO_ROOT/database/migrations/$f"
  done
}

apply_local() {
  [[ -f "$LOCAL_ENV" ]] && set -a && source "$LOCAL_ENV" && set +a
  command -v mysql >/dev/null || return 0
  if mysql -h"${DB_HOST}" -P"${DB_PORT:-3306}" -u"$DB_USER" "$DB_NAME" -e "SHOW TABLES LIKE 'voice_sessions';" 2>/dev/null | grep -q voice_sessions; then
    echo "Déjà appliqué (local)."; return 0
  fi
  apply_sql "${DB_HOST}" "${DB_PORT:-3306}" "$DB_USER" "$DB_NAME"
}

apply_remote() {
  [[ -f "$SSH_KEY" ]] || exit 1
  TMP="/tmp/oneandlab-p4-$$.sql"
  { for f in "${MIGRATIONS[@]}"; do cat "$REPO_ROOT/database/migrations/$f"; echo; done; } >"$TMP"
  scp -q -i "$SSH_KEY" "$TMP" "$SSH_HOST:/tmp/oneandlab-p4.sql"; rm -f "$TMP"
  ssh -i "$SSH_KEY" "$SSH_HOST" bash -s <<'R'
set -euo pipefail
source /var/www/oneandlab/.env
export MYSQL_PWD="$DB_PASS"
if mysql -h"${DB_HOST:-127.0.0.1}" -P"${DB_PORT:-3306}" -u"$DB_USER" "$DB_NAME" -e "SHOW TABLES LIKE 'voice_sessions';" | grep -q voice_sessions; then
  echo "Déjà appliqué (prod)."
else
  mysql -h"${DB_HOST:-127.0.0.1}" -P"${DB_PORT:-3306}" -u"$DB_USER" "$DB_NAME" </tmp/oneandlab-p4.sql
  echo "Migrations 085–087 appliquées."
fi
rm -f /tmp/oneandlab-p4.sql
R
}

[[ "$DO_LOCAL" -eq 1 ]] && apply_local
[[ "$DO_REMOTE" -eq 1 ]] && apply_remote
