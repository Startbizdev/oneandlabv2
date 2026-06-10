#!/usr/bin/env bash
# Applique database/migrations/067_profile_password_auth.sql (auth dual login / mot de passe)
#
# Usage :
#   ./database/scripts/apply-profile-password-auth.sh
#   ./database/scripts/apply-profile-password-auth.sh --local-only
#   ./database/scripts/apply-profile-password-auth.sh --remote-only
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
SQL_FILE="$REPO_ROOT/database/migrations/067_profile_password_auth.sql"

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

mysql_apply() {
  local host="$1" port="$2" user="$3" db="$4" pass="$5" file="$6"
  export MYSQL_PWD="$pass"
  mysql --default-character-set=utf8mb4 -h"$host" -P"$port" -u"$user" "$db" < "$file"
}

check_applied() {
  local host="$1" port="$2" user="$3" db="$4" pass="$5"
  export MYSQL_PWD="$pass"
  local col
  col="$(mysql --default-character-set=utf8mb4 -h"$host" -P"$port" -u"$user" "$db" -N -e \
    "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='profiles' AND COLUMN_NAME='password_hash';")"
  [[ "$col" == "1" ]]
}

apply_local() {
  if [[ -f "$LOCAL_ENV" ]]; then
    set -a
    # shellcheck source=/dev/null
    source "$LOCAL_ENV"
    set +a
  fi

  if [[ -z "${DB_HOST:-}" || -z "${DB_USER:-}" || -z "${DB_NAME:-}" ]]; then
    echo "Fichier .env local introuvable ou DB_* manquant: $LOCAL_ENV" >&2
    exit 1
  fi

  H="${DB_HOST}" P="${DB_PORT:-3306}" U="$DB_USER" D="$DB_NAME" PW="${DB_PASS:-}"
  if check_applied "$H" "$P" "$U" "$D" "$PW"; then
    echo "==> Déjà appliqué en local (profiles.password_hash présent)."
    return 0
  fi
  mysql_apply "$H" "$P" "$U" "$D" "$PW" "$SQL_FILE"
  echo "==> OK local — migration 067 (password auth) appliquée."
}

apply_remote() {
  if [[ ! -f "$SSH_KEY" ]]; then
    echo "Cle SSH introuvable: $SSH_KEY" >&2
    exit 1
  fi
  REMOTE_TMP="/tmp/oneandlab-067-password-auth.$$.$RANDOM.sql"
  echo "==> Copie SQL vers $SSH_HOST..."
  scp -q -o StrictHostKeyChecking=accept-new -o ConnectTimeout=25 -i "$SSH_KEY" "$SQL_FILE" "$SSH_HOST:$REMOTE_TMP"

  echo "==> Application migration 067 sur MySQL prod..."
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
COL=\$(mysql --default-character-set=utf8mb4 -h"\$H" -P"\$P" -u"\$U" "\$D" -N -e "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='profiles' AND COLUMN_NAME='password_hash';")
if [[ "\$COL" == "1" ]]; then
  echo "==> Déjà appliqué en prod (profiles.password_hash présent)."
  rm -f "\$REMOTE_TMP"
  exit 0
fi
mysql --default-character-set=utf8mb4 -h"\$H" -P"\$P" -u"\$U" "\$D" <"\$REMOTE_TMP"
rm -f "\$REMOTE_TMP"
REMOTE_EOF

  echo "==> OK distant — migration 067 (password auth) appliquée."
}

if [[ "$DO_LOCAL" -eq 1 ]]; then apply_local; fi
if [[ "$DO_REMOTE" -eq 1 ]]; then apply_remote; fi
