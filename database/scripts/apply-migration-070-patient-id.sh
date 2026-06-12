#!/usr/bin/env bash
# Applique database/migrations/070_medical_documents_patient_id.sql
set -euo pipefail

SSH_KEY="${SSH_KEY:-$HOME/.ssh/oneandlab-key.pem}"
if [[ ! -f "$SSH_KEY" && -f "$HOME/Desktop/oneandlab-key.pem" ]]; then
  SSH_KEY="$HOME/Desktop/oneandlab-key.pem"
fi
SSH_HOST="${SSH_HOST:-ubuntu@ec2-15-188-11-249.eu-west-3.compute.amazonaws.com}"
REMOTE_ENV="${REMOTE_ENV:-/var/www/oneandlab/.env}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SQL_FILE="$REPO_ROOT/database/migrations/070_medical_documents_patient_id.sql"

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
  LOCAL_ENV="${LOCAL_ENV:-$REPO_ROOT/.env}"
  if [[ -f "$LOCAL_ENV" ]]; then set -a; source "$LOCAL_ENV"; set +a; fi
  export MYSQL_PWD="${DB_PASS:-}"
  mysql --default-character-set=utf8mb4 -h"${DB_HOST}" -P"${DB_PORT:-3306}" -u"$DB_USER" "$DB_NAME" < "$SQL_FILE" || {
    mysql --default-character-set=utf8mb4 -h"${DB_HOST}" -P"${DB_PORT:-3306}" -u"$DB_USER" "$DB_NAME" \
      -e "SHOW COLUMNS FROM medical_documents LIKE 'patient_id';" 2>/dev/null | grep -q patient_id && echo "Migration 070 déjà appliquée (local)." && return 0
    return 1
  }
  echo "==> OK local — patient_id sur medical_documents."
}

apply_remote() {
  [[ -f "$SSH_KEY" ]] || { echo "Cle SSH introuvable: $SSH_KEY" >&2; exit 1; }
  REMOTE_TMP="/tmp/oneandlab-070-patient.$$.$RANDOM.sql"
  scp -q -o StrictHostKeyChecking=accept-new -o ConnectTimeout=25 -i "$SSH_KEY" "$SQL_FILE" "$SSH_HOST:$REMOTE_TMP"
  ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=25 -i "$SSH_KEY" "$SSH_HOST" bash -s <<REMOTE_EOF
set -euo pipefail
REMOTE_TMP='$REMOTE_TMP'
REMOTE_ENV='$REMOTE_ENV'
set -a; source "\$REMOTE_ENV"; set +a
export MYSQL_PWD="\$DB_PASS"
H="\${DB_HOST:-127.0.0.1}"; P="\${DB_PORT:-3306}"; U="\$DB_USER"; D="\$DB_NAME"
if mysql --default-character-set=utf8mb4 -h"\$H" -P"\$P" -u"\$U" "\$D" <"\$REMOTE_TMP"; then rm -f "\$REMOTE_TMP"
elif mysql --default-character-set=utf8mb4 -h"\$H" -P"\$P" -u"\$U" "\$D" -e "SHOW COLUMNS FROM medical_documents LIKE 'patient_id';" 2>/dev/null | grep -q patient_id; then
  rm -f "\$REMOTE_TMP"; echo "Migration 070 déjà appliquée (prod)."
else rm -f "\$REMOTE_TMP"; exit 1; fi
REMOTE_EOF
  echo "==> OK distant — patient_id sur medical_documents."
}

[[ "$DO_LOCAL" -eq 1 ]] && apply_local
[[ "$DO_REMOTE" -eq 1 ]] && apply_remote
