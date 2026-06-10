#!/usr/bin/env bash
# Applique database/migrations/053_preleveur_patient_notifs_and_review_lab.sql (idempotent sur reviewee_type)
#
# Usage :
#   ./database/scripts/apply-review-lab-type.sh
#   ./database/scripts/apply-review-lab-type.sh --local-only
#   ./database/scripts/apply-review-lab-type.sh --remote-only
set -euo pipefail

SSH_KEY="${SSH_KEY:-$HOME/.ssh/oneandlab-key.pem}"
SSH_HOST="${SSH_HOST:-ubuntu@ec2-15-188-11-249.eu-west-3.compute.amazonaws.com}"
REMOTE_ENV="${REMOTE_ENV:-/var/www/oneandlab/.env}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOCAL_ENV="${LOCAL_ENV:-$REPO_ROOT/.env}"
SQL_FILE="$REPO_ROOT/database/migrations/053_preleveur_patient_notifs_and_review_lab.sql"

DO_LOCAL=1
DO_REMOTE=1
for arg in "$@"; do
  case "$arg" in
    --local-only) DO_REMOTE=0 ;;
    --remote-only) DO_LOCAL=0 ;;
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

  if [[ -n "${DB_HOST:-}" ]] && [[ -n "${DB_USER:-}" ]] && [[ -n "${DB_NAME:-}" ]]; then
    export MYSQL_PWD="${DB_PASS:-}"
    mysql --default-character-set=utf8mb4 \
      -h"${DB_HOST}" -P"${DB_PORT:-3306}" -u"$DB_USER" "$DB_NAME" < "$SQL_FILE"
  else
    echo "Fichier .env local introuvable ou DB_* manquant: $LOCAL_ENV" >&2
    exit 1
  fi
  echo "==> OK local — reviewee_type lab + colonnes préleveur appliqués."
}

apply_remote() {
  if [[ ! -f "$SSH_KEY" ]]; then
    echo "Cle SSH introuvable: $SSH_KEY" >&2
    exit 1
  fi
  REMOTE_TMP="/tmp/oneandlab-053-review-lab.$$.$RANDOM.sql"
  echo "==> Copie SQL vers $SSH_HOST..."
  scp -q -o StrictHostKeyChecking=accept-new -o ConnectTimeout=25 -i "$SSH_KEY" "$SQL_FILE" "$SSH_HOST:$REMOTE_TMP"

  echo "==> Application migration 053 sur MySQL prod..."
  ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=25 -i "$SSH_KEY" "$SSH_HOST" bash -s <<REMOTE_EOF
set -euo pipefail
REMOTE_TMP='$REMOTE_TMP'
REMOTE_ENV='$REMOTE_ENV'
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

  echo "==> OK distant — reviewee_type lab + colonnes préleveur appliqués."
}

if [[ "$DO_LOCAL" -eq 1 ]]; then apply_local; fi
if [[ "$DO_REMOTE" -eq 1 ]]; then apply_remote; fi
