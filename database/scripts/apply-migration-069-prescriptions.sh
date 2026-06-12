#!/usr/bin/env bash
# Applique database/migrations/069_prescriptions_metadata.sql (métadonnées ordonnances)
#
# Usage :
#   ./database/scripts/apply-migration-069-prescriptions.sh
#   ./database/scripts/apply-migration-069-prescriptions.sh --local-only
#   ./database/scripts/apply-migration-069-prescriptions.sh --remote-only
set -euo pipefail

SSH_KEY="${SSH_KEY:-$HOME/.ssh/oneandlab-key.pem}"
if [[ ! -f "$SSH_KEY" && -f "$HOME/Desktop/oneandlab-key.pem" ]]; then
  SSH_KEY="$HOME/Desktop/oneandlab-key.pem"
fi
SSH_HOST="${SSH_HOST:-ubuntu@ec2-15-188-11-249.eu-west-3.compute.amazonaws.com}"
REMOTE_ENV="${REMOTE_ENV:-/var/www/oneandlab/.env}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOCAL_ENV="${LOCAL_ENV:-$REPO_ROOT/.env}"
SQL_FILE="$REPO_ROOT/database/migrations/069_prescriptions_metadata.sql"

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

already_applied_check() {
  mysql --default-character-set=utf8mb4 -h"$1" -P"$2" -u"$3" "$4" \
    -e "SHOW COLUMNS FROM medical_documents LIKE 'prescription_kind';" 2>/dev/null | grep -q prescription_kind
}

apply_local() {
  if [[ -f "$LOCAL_ENV" ]]; then
    set -a
    # shellcheck source=/dev/null
    source "$LOCAL_ENV"
    set +a
  fi

  if [[ -n "${DB_HOST:-}" ]] && [[ -n "${DB_USER:-}" ]] && [[ -n "${DB_NAME:-}" ]]; then
    export MYSQL_PWD="${DB_PASS:-}"
    H="${DB_HOST}"
    P="${DB_PORT:-3306}"
    U="$DB_USER"
    D="$DB_NAME"
    if mysql --default-character-set=utf8mb4 -h"$H" -P"$P" -u"$U" "$D" < "$SQL_FILE"; then
      :
    elif already_applied_check "$H" "$P" "$U" "$D"; then
      echo "==> Migration 069 déjà appliquée (local)."
      return 0
    else
      return 1
    fi
  else
    echo "Fichier .env local introuvable ou DB_* manquant: $LOCAL_ENV" >&2
    exit 1
  fi
  echo "==> OK local — métadonnées ordonnances appliquées."
}

apply_remote() {
  if [[ ! -f "$SSH_KEY" ]]; then
    echo "Cle SSH introuvable: $SSH_KEY" >&2
    exit 1
  fi
  REMOTE_TMP="/tmp/oneandlab-069-prescriptions.$$.$RANDOM.sql"
  echo "==> Copie SQL vers $SSH_HOST..."
  scp -q -o StrictHostKeyChecking=accept-new -o ConnectTimeout=25 -i "$SSH_KEY" "$SQL_FILE" "$SSH_HOST:$REMOTE_TMP"

  echo "==> Application migration 069 sur MySQL prod..."
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
if mysql --default-character-set=utf8mb4 -h"\$H" -P"\$P" -u"\$U" "\$D" <"\$REMOTE_TMP"; then
  rm -f "\$REMOTE_TMP"
elif mysql --default-character-set=utf8mb4 -h"\$H" -P"\$P" -u"\$U" "\$D" \
  -e "SHOW COLUMNS FROM medical_documents LIKE 'prescription_kind';" 2>/dev/null | grep -q prescription_kind; then
  rm -f "\$REMOTE_TMP"
  echo "Migration 069 déjà appliquée (prod)."
  exit 0
else
  rm -f "\$REMOTE_TMP"
  exit 1
fi
REMOTE_EOF

  echo "==> OK distant — métadonnées ordonnances appliquées."
}

if [[ "$DO_LOCAL" -eq 1 ]]; then apply_local; fi
if [[ "$DO_REMOTE" -eq 1 ]]; then apply_remote; fi
