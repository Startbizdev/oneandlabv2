#!/usr/bin/env bash
# Purge PROD : supprime tous les RDV et toutes les notifications.
# Conserve tous les comptes (profiles) et données catalogue / profil.
#
# Usage :
#   CONFIRM_PROD_PURGE=yes ./database/scripts/purge-prod-appointments-and-notifications.sh
#   CONFIRM_PROD_PURGE=yes ./database/scripts/purge-prod-appointments-and-notifications.sh --with-uploads
set -euo pipefail

if [[ "${CONFIRM_PROD_PURGE:-}" != "yes" ]]; then
  echo "⚠️  Action DESTRUCTIVE sur la base PROD." >&2
  echo "    Supprime : appointments (+ tables liées), notifications, avis RDV, docs médicaux liés RDV." >&2
  echo "    Conserve : profiles, proches, catégories, documents profil, tokens push, etc." >&2
  echo "" >&2
  echo "    Relance avec : CONFIRM_PROD_PURGE=yes $0" >&2
  exit 1
fi

SSH_KEY="${SSH_KEY:-$HOME/Desktop/oneandlab-key.pem}"
SSH_HOST="${SSH_HOST:-ubuntu@ec2-15-188-11-249.eu-west-3.compute.amazonaws.com}"
REMOTE_ENV="${REMOTE_ENV:-/var/www/oneandlab/.env}"
REMOTE_UPLOADS="${REMOTE_UPLOADS:-/var/www/oneandlab/backend/uploads}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SQL_FILE="$SCRIPT_DIR/purge-prod-appointments-and-notifications.sql"

WITH_UPLOADS=0
for arg in "$@"; do
  case "$arg" in
    --with-uploads) WITH_UPLOADS=1 ;;
  esac
done

if [[ ! -f "$SQL_FILE" ]]; then
  echo "Fichier SQL introuvable: $SQL_FILE" >&2
  exit 1
fi
if [[ ! -f "$SSH_KEY" ]]; then
  echo "Cle SSH introuvable: $SSH_KEY" >&2
  exit 1
fi

REMOTE_TMP="/tmp/oneandlab-purge-rdv.$$.$RANDOM.sql"
echo "==> Copie SQL vers $SSH_HOST..."
scp -q -o StrictHostKeyChecking=accept-new -o ConnectTimeout=25 -i "$SSH_KEY" "$SQL_FILE" "$SSH_HOST:$REMOTE_TMP"

echo "==> Comptages AVANT purge..."
ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=25 -i "$SSH_KEY" "$SSH_HOST" bash -s <<'REMOTE_BEFORE'
set -euo pipefail
source /var/www/oneandlab/.env
export MYSQL_PWD="$DB_PASS"
mysql --default-character-set=utf8mb4 -h"${DB_HOST:-127.0.0.1}" -P"${DB_PORT:-3306}" -u"$DB_USER" "$DB_NAME" -N -e "
SELECT CONCAT('appointments=', (SELECT COUNT(*) FROM appointments));
SELECT CONCAT('notifications=', (SELECT COUNT(*) FROM notifications));
SELECT CONCAT('profiles=', (SELECT COUNT(*) FROM profiles));
"
REMOTE_BEFORE

echo "==> Purge MySQL PROD..."
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

echo "==> Comptages APRÈS purge (dernières lignes du script SQL) :"

if [[ "$WITH_UPLOADS" -eq 1 ]]; then
  echo "==> Nettoyage fichiers uploads RDV (medical/, medical2026/)..."
  ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=25 -i "$SSH_KEY" "$SSH_HOST" bash -s <<REMOTE_UP
set -euo pipefail
BASE='$REMOTE_UPLOADS'
for dir in medical medical2026; do
  if [[ -d "\$BASE/\$dir" ]]; then
    find "\$BASE/\$dir" -mindepth 1 -maxdepth 1 -exec rm -rf {} + 2>/dev/null || true
    echo "Vidé: \$BASE/\$dir"
  fi
done
REMOTE_UP
fi

echo "✅ Purge PROD terminée."
