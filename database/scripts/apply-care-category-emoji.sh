#!/usr/bin/env bash
# Applique database/migrations/065_care_categories_emoji_icons.sql
# (emoji dans care_categories.icon, image_url = NULL)
#
# Usage :
#   ./database/scripts/apply-care-category-emoji.sh              # local + prod
#   ./database/scripts/apply-care-category-emoji.sh --local-only
#   ./database/scripts/apply-care-category-emoji.sh --remote-only
#
# Variables : SSH_KEY, SSH_HOST, REMOTE_ENV, LOCAL_ENV
set -euo pipefail

SSH_KEY="${SSH_KEY:-$HOME/Desktop/oneandlab-key.pem}"
SSH_HOST="${SSH_HOST:-ubuntu@ec2-15-188-11-249.eu-west-3.compute.amazonaws.com}"
REMOTE_ENV="${REMOTE_ENV:-/var/www/oneandlab/.env}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOCAL_ENV="${LOCAL_ENV:-$REPO_ROOT/.env}"
if [[ ! -f "$LOCAL_ENV" && -f "$REPO_ROOT/backend/.env" ]]; then
  LOCAL_ENV="$REPO_ROOT/backend/.env"
fi
SQL_FILE="$REPO_ROOT/database/migrations/065_care_categories_emoji_icons.sql"

DO_LOCAL=1
DO_REMOTE=1
for arg in "$@"; do
  case "$arg" in
    --local-only) DO_REMOTE=0 ;;
    --remote-only) DO_LOCAL=0 ;;
    -h|--help)
      echo "Usage: $0 [--local-only] [--remote-only]"
      exit 0
      ;;
  esac
done

if [[ ! -f "$SQL_FILE" ]]; then
  echo "Fichier SQL introuvable: $SQL_FILE" >&2
  exit 1
fi

apply_local() {
  if [[ -f "$LOCAL_ENV" ]]; then
    set -a
    # shellcheck source=/dev/null
    source "$LOCAL_ENV"
    set +a
  fi

  if [[ -n "${DATABASE_URL:-}" ]]; then
    mysql --default-character-set=utf8mb4 "$DATABASE_URL" < "$SQL_FILE"
  elif [[ -n "${DB_HOST:-}" ]] && [[ -n "${DB_USER:-}" ]] && [[ -n "${DB_NAME:-}" ]]; then
    export MYSQL_PWD="${DB_PASS:-}"
    mysql --default-character-set=utf8mb4 \
      -h"${DB_HOST}" -P"${DB_PORT:-3306}" -u"$DB_USER" "$DB_NAME" < "$SQL_FILE"
  elif [[ -n "${MYSQL_PWD:-}" ]] && [[ -n "${MYSQL_USER:-}" ]] && [[ -n "${MYSQL_DATABASE:-}" ]]; then
    mysql --default-character-set=utf8mb4 -u"$MYSQL_USER" -p"$MYSQL_PWD" "$MYSQL_DATABASE" < "$SQL_FILE"
  else
    echo "Fichier .env local introuvable ou DB_* manquant: $LOCAL_ENV" >&2
    exit 1
  fi
  echo "==> OK local — emojis care_categories appliqués."
}

apply_remote() {
  if [[ ! -f "$SSH_KEY" ]]; then
    echo "Cle SSH introuvable: $SSH_KEY" >&2
    exit 1
  fi
  REMOTE_TMP="/tmp/oneandlab-065-care-emoji.$$.$RANDOM.sql"
  echo "==> Copie SQL vers $SSH_HOST..."
  scp -q -o StrictHostKeyChecking=accept-new -o ConnectTimeout=25 -i "$SSH_KEY" "$SQL_FILE" "$SSH_HOST:$REMOTE_TMP"

  echo "==> Application emojis sur MySQL prod (via serveur)..."
  ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=25 -i "$SSH_KEY" "$SSH_HOST" bash -s <<REMOTE_EOF
set -euo pipefail
REMOTE_TMP='$REMOTE_TMP'
REMOTE_ENV='$REMOTE_ENV'
if [[ ! -f "\$REMOTE_ENV" ]]; then
  echo "REMOTE: .env introuvable: \$REMOTE_ENV" >&2
  exit 1
fi
set -a
# shellcheck source=/dev/null
source "\$REMOTE_ENV"
set +a
export MYSQL_PWD="\$DB_PASS"
H="\${DB_HOST:-127.0.0.1}"
P="\${DB_PORT:-3306}"
U="\$DB_USER"
D="\$DB_NAME"
mysql --default-character-set=utf8mb4 -h"\$H" -P"\$P" -u"\$U" "\$D" <"\$REMOTE_TMP"
rm -f "\$REMOTE_TMP"
REMOTE_EOF

  echo "==> OK distant — emojis care_categories appliqués."
}

if [[ "$DO_LOCAL" -eq 1 ]]; then
  echo "==> Migration 065 (local)..."
  apply_local
fi
if [[ "$DO_REMOTE" -eq 1 ]]; then
  apply_remote
fi
