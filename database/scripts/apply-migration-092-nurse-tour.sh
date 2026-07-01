#!/usr/bin/env bash
# Migration 092 — tournée infirmier (nurse_tour_plans, nurse_tour_stops)
set -euo pipefail

SSH_KEY="${SSH_KEY:-$HOME/.ssh/oneandlab-key.pem}"
SSH_HOST="${SSH_HOST:-ubuntu@15.236.73.7}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOCAL_ENV="${LOCAL_ENV:-$REPO_ROOT/.env}"
MIGRATION=092_nurse_tour_plans.sql
DO_LOCAL=1
DO_REMOTE=1
for arg in "$@"; do
  case "$arg" in
    --local-only) DO_REMOTE=0 ;;
    --remote-only) DO_LOCAL=0 ;;
  esac
done

apply_local() {
  [[ -f "$LOCAL_ENV" ]] && set -a && source "$LOCAL_ENV" && set +a
  command -v mysql >/dev/null || { echo "⚠️ mysql absent — skip local"; return 0; }
  export MYSQL_PWD="${DB_PASS:-}"
  if mysql -h"${DB_HOST:-127.0.0.1}" -P"${DB_PORT:-3306}" -u"${DB_USER}" "${DB_NAME}" -e "SHOW TABLES LIKE 'nurse_tour_plans';" 2>/dev/null | grep -q nurse_tour_plans; then
    echo "Déjà appliqué (local)."
    return 0
  fi
  echo "==> 092 nurse tour (local)..."
  mysql --default-character-set=utf8mb4 -h"${DB_HOST:-127.0.0.1}" -P"${DB_PORT:-3306}" -u"${DB_USER}" "${DB_NAME}" \
    <"$REPO_ROOT/database/migrations/$MIGRATION"
}

apply_remote() {
  [[ -f "$SSH_KEY" ]] || { echo "⚠️ SSH key absent — skip remote"; return 0; }
  scp -q -o StrictHostKeyChecking=accept-new -i "$SSH_KEY" \
    "$REPO_ROOT/database/migrations/$MIGRATION" "$SSH_HOST:/tmp/oneandlab-092-nurse-tour.sql"
  ssh -o StrictHostKeyChecking=accept-new -i "$SSH_KEY" "$SSH_HOST" bash -s <<'R'
set -euo pipefail
source /var/www/oneandlab/.env
export MYSQL_PWD="$DB_PASS"
if mysql -h"${DB_HOST:-127.0.0.1}" -P"${DB_PORT:-3306}" -u"$DB_USER" "$DB_NAME" -e "SHOW TABLES LIKE 'nurse_tour_plans';" | grep -q nurse_tour_plans; then
  echo "Déjà appliqué (prod)."
else
  mysql --default-character-set=utf8mb4 -h"${DB_HOST:-127.0.0.1}" -P"${DB_PORT:-3306}" -u"$DB_USER" "$DB_NAME" </tmp/oneandlab-092-nurse-tour.sql
  echo "Migration 092 appliquée (prod)."
fi
rm -f /tmp/oneandlab-092-nurse-tour.sql
R
}

[[ "$DO_LOCAL" -eq 1 ]] && apply_local || true
[[ "$DO_REMOTE" -eq 1 ]] && apply_remote || true
echo "✅ Migration 092 terminée"
