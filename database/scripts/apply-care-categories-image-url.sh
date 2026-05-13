#!/usr/bin/env bash
# Applique la migration 057 (colonne care_categories.image_url), de façon idempotente.
#
# Usage :
#   chmod +x database/scripts/apply-care-categories-image-url.sh
#   ./database/scripts/apply-care-categories-image-url.sh              # local + distant (EC2 + MySQL prod)
#   ./database/scripts/apply-care-categories-image-url.sh --local-only
#   ./database/scripts/apply-care-categories-image-url.sh --remote-only
#
# Optionnel : appliquer le fichier SQL brut (non idempotent — erreur si colonne déjà là) :
#   ./database/scripts/apply-care-categories-image-url.sh --raw-sql-file
#
# Variables optionnelles : SSH_KEY, SSH_HOST, REMOTE_ENV, LOCAL_ENV (voir apply-care-category-descriptions.sh)

set -euo pipefail

SSH_KEY="${SSH_KEY:-$HOME/Desktop/oneandlab-key.pem}"
SSH_HOST="${SSH_HOST:-ubuntu@ec2-15-188-11-249.eu-west-3.compute.amazonaws.com}"
REMOTE_ENV="${REMOTE_ENV:-/var/www/oneandlab/.env}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOCAL_ENV="${LOCAL_ENV:-$REPO_ROOT/.env}"
if [[ ! -f "$LOCAL_ENV" && -f "$REPO_ROOT/backend/.env" ]]; then
  LOCAL_ENV="$REPO_ROOT/backend/.env"
fi
RAW_SQL_FILE="$REPO_ROOT/database/migrations/057_care_categories_image_url.sql"

DO_LOCAL=1
DO_REMOTE=1
USE_RAW=0
for arg in "$@"; do
  case "$arg" in
    --local-only) DO_REMOTE=0 ;;
    --remote-only) DO_LOCAL=0 ;;
    --raw-sql-file) USE_RAW=1 ;;
    -h|--help)
      echo "Usage: $0 [--local-only] [--remote-only] [--raw-sql-file]"
      exit 0
      ;;
  esac
done

apply_mysql_stdin() {
  # Usage: apply_mysql_stdin host port user database <<SQL
  local H="$1" P="$2" U="$3" D="$4"
  mysql --default-character-set=utf8mb4 -h"$H" -P"$P" -u"$U" "$D"
}

run_idempotent_057() {
  apply_mysql_stdin "$@" <<'EOSQL'
SELECT COUNT(*) INTO @c FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'care_categories'
  AND COLUMN_NAME = 'image_url';

SET @sql = IF(@c = 0,
  'ALTER TABLE care_categories ADD COLUMN image_url VARCHAR(768) NULL DEFAULT NULL AFTER icon',
  'SELECT ''057 image_url : colonne déjà présente (skip).'' AS notice');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
EOSQL
}

apply_local() {
  if [[ ! -f "$LOCAL_ENV" ]]; then
    echo "Fichier .env local introuvable: $LOCAL_ENV (utiliser --remote-only ou créer .env)" >&2
    exit 1
  fi
  set -a
  # shellcheck source=/dev/null
  source "$LOCAL_ENV"
  set +a
  export MYSQL_PWD="${DB_PASS:-}"
  LHOST="${DB_HOST:-127.0.0.1}"
  LPORT="${DB_PORT:-3306}"
  echo "==> 057 image_url (local) $DB_NAME @ $LHOST:$LPORT ..."
  if [[ "$USE_RAW" -eq 1 ]]; then
    if [[ ! -f "$RAW_SQL_FILE" ]]; then
      echo "Fichier introuvable: $RAW_SQL_FILE" >&2
      exit 1
    fi
    mysql --default-character-set=utf8mb4 -h"$LHOST" -P"$LPORT" -u"$DB_USER" "$DB_NAME" <"$RAW_SQL_FILE"
  else
    run_idempotent_057 "$LHOST" "$LPORT" "$DB_USER" "$DB_NAME"
  fi
  echo "==> OK local."
}

apply_remote() {
  if [[ ! -f "$SSH_KEY" ]]; then
    echo "Clé SSH introuvable: $SSH_KEY (définir SSH_KEY=... ou --local-only)" >&2
    exit 1
  fi
  REMOTE_TMP="/tmp/oneandlab-057-image-url.$$.$RANDOM.sql"
  if [[ "$USE_RAW" -eq 1 ]]; then
    echo "==> Copie SQL brut vers $SSH_HOST ..."
    scp -q -o StrictHostKeyChecking=accept-new -o ConnectTimeout=25 -i "$SSH_KEY" "$RAW_SQL_FILE" "$SSH_HOST:$REMOTE_TMP"
  else
    echo "==> Copie script idempotent 057 vers $SSH_HOST ..."
    REMOTE_BODY=$(cat <<'EOSQL'
SELECT COUNT(*) INTO @c FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'care_categories'
  AND COLUMN_NAME = 'image_url';

SET @sql = IF(@c = 0,
  'ALTER TABLE care_categories ADD COLUMN image_url VARCHAR(768) NULL DEFAULT NULL AFTER icon',
  'SELECT ''057 image_url : colonne déjà présente (skip).'' AS notice');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
EOSQL
)
    ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=25 -i "$SSH_KEY" "$SSH_HOST" "cat >'$REMOTE_TMP'" <<<"$REMOTE_BODY"
  fi

  echo "==> Application 057 sur MySQL prod (via serveur)..."
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

  echo "==> OK distant."
}

if [[ "$DO_LOCAL" -eq 1 ]]; then
  apply_local
fi
if [[ "$DO_REMOTE" -eq 1 ]]; then
  apply_remote
fi
