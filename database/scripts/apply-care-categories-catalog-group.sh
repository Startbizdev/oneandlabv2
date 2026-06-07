#!/usr/bin/env bash
# Applique les migrations 058 + 059 `catalog_group` (idempotentes) en local et/ou sur la prod.
#
# Usage :
#   chmod +x database/scripts/apply-care-categories-catalog-group.sh
#   ./database/scripts/apply-care-categories-catalog-group.sh
#   ./database/scripts/apply-care-categories-catalog-group.sh --local-only
#   ./database/scripts/apply-care-categories-catalog-group.sh --remote-only
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
SQL_058="$REPO_ROOT/database/migrations/058_care_categories_catalog_group.sql"
SQL_059="$REPO_ROOT/database/migrations/059_care_categories_catalog_group_residual.sql"

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

if [[ ! -f "$SQL_058" ]]; then
  echo "Fichier SQL introuvable: $SQL_058" >&2
  exit 1
fi
if [[ ! -f "$SQL_059" ]]; then
  echo "Fichier SQL introuvable: $SQL_059" >&2
  exit 1
fi

apply_local() {
  if [[ ! -f "$LOCAL_ENV" ]]; then
    echo "Fichier .env local introuvable: $LOCAL_ENV (--remote-only pour ignorer)" >&2
    exit 1
  fi
  set -a
  # shellcheck source=/dev/null
  source "$LOCAL_ENV"
  set +a
  export MYSQL_PWD="${DB_PASS:-}"
  LHOST="${DB_HOST:-127.0.0.1}"
  LPORT="${DB_PORT:-3306}"
  echo "==> 058 catalog_group (local) $DB_NAME @ $LHOST:$LPORT ..."
  mysql --default-character-set=utf8mb4 -h"$LHOST" -P"$LPORT" -u"$DB_USER" "$DB_NAME" <"$SQL_058"
  echo "==> 059 résiduel catalog_group (local) ..."
  mysql --default-character-set=utf8mb4 -h"$LHOST" -P"$LPORT" -u"$DB_USER" "$DB_NAME" <"$SQL_059"
  echo "==> OK local."
}

apply_remote() {
  if [[ ! -f "$SSH_KEY" ]]; then
    echo "Clé SSH introuvable: $SSH_KEY (--local-only pour ignorer)" >&2
    exit 1
  fi
  REMOTE_058="/tmp/oneandlab-058-catalog-group.$$.$RANDOM.sql"
  REMOTE_059="/tmp/oneandlab-059-catalog-group.$$.$RANDOM.sql"
  echo "==> Copie SQL vers $SSH_HOST..."
  scp -q -o StrictHostKeyChecking=accept-new -o ConnectTimeout=25 -i "$SSH_KEY" "$SQL_058" "$SSH_HOST:$REMOTE_058"
  scp -q -o StrictHostKeyChecking=accept-new -o ConnectTimeout=25 -i "$SSH_KEY" "$SQL_059" "$SSH_HOST:$REMOTE_059"

  echo "==> 058 + 059 catalog_group (MySQL prod via serveur)..."
  ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=25 -i "$SSH_KEY" "$SSH_HOST" bash -s <<REMOTE_EOF
set -euo pipefail
REMOTE_058='$REMOTE_058'
REMOTE_059='$REMOTE_059'
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
mysql --default-character-set=utf8mb4 -h"\$H" -P"\$P" -u"\$U" "\$D" <"\$REMOTE_058"
mysql --default-character-set=utf8mb4 -h"\$H" -P"\$P" -u"\$U" "\$D" <"\$REMOTE_059"
rm -f "\$REMOTE_058" "\$REMOTE_059"
REMOTE_EOF

  echo "==> OK distant."
}

[[ "$DO_LOCAL" -eq 1 ]] && apply_local
[[ "$DO_REMOTE" -eq 1 ]] && apply_remote
echo "==> 058 + 059 terminés."
