#!/usr/bin/env bash
# Applique database/migrations/056_care_categories_professional_descriptions.sql
# sur la base locale (.env racine dépôt) et/ou sur la prod (MySQL via EC2 comme sync-care-catalog-from-prod.sh).
#
# Usage :
#   chmod +x database/scripts/apply-care-category-descriptions.sh
#   ./database/scripts/apply-care-category-descriptions.sh              # local + remote
#   ./database/scripts/apply-care-category-descriptions.sh --local-only
#   ./database/scripts/apply-care-category-descriptions.sh --remote-only
#
# Variables optionnelles : SSH_KEY, SSH_HOST, REMOTE_ENV, LOCAL_ENV
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
SQL_FILE="$REPO_ROOT/database/migrations/056_care_categories_professional_descriptions.sql"

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
  if [[ ! -f "$LOCAL_ENV" ]]; then
    echo "Fichier .env local introuvable: $LOCAL_ENV (ignorer avec --remote-only)" >&2
    exit 1
  fi
  set -a
  # shellcheck source=/dev/null
  source "$LOCAL_ENV"
  set +a
  export MYSQL_PWD="${DB_PASS:-}"
  LHOST="${DB_HOST:-127.0.0.1}"
  LPORT="${DB_PORT:-3306}"
  echo "==> Application descriptions (local) $DB_NAME @ $LHOST..."
  mysql --default-character-set=utf8mb4 -h"$LHOST" -P"$LPORT" -u"$DB_USER" "$DB_NAME" <"$SQL_FILE"
  echo "==> OK local."
}

apply_remote() {
  if [[ ! -f "$SSH_KEY" ]]; then
    echo "Cle SSH introuvable: $SSH_KEY (definir SSH_KEY=... ou utiliser --local-only)" >&2
    exit 1
  fi
  REMOTE_TMP="/tmp/oneandlab-056-care-desc.$$.$RANDOM.sql"
  echo "==> Copie SQL vers $SSH_HOST..."
  scp -q -o StrictHostKeyChecking=accept-new -o ConnectTimeout=25 -i "$SSH_KEY" "$SQL_FILE" "$SSH_HOST:$REMOTE_TMP"

  echo "==> Application descriptions sur MySQL prod (via serveur)..."
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
