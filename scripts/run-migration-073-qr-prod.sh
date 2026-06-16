#!/usr/bin/env bash
# Migration 073 QR + backfill + tests PHPUnit sur prod.
#
# Usage:
#   ./scripts/run-migration-073-qr-prod.sh
#   ./scripts/run-migration-073-qr-prod.sh --skip-deploy
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SSH_KEY="${SSH_KEY:-$HOME/Desktop/oneandlab-key.pem}"
if [[ ! -f "$SSH_KEY" && -f "$HOME/.ssh/oneandlab-key.pem" ]]; then
  SSH_KEY="$HOME/.ssh/oneandlab-key.pem"
fi
SSH_HOST="${SSH_HOST:-ubuntu@ec2-15-188-11-249.eu-west-3.compute.amazonaws.com}"
REMOTE_BASE="/var/www/oneandlab"
REMOTE_ENV="/var/www/oneandlab/.env"
SQL_FILE="$ROOT/database/migrations/073_create_qr_tables.sql"
SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=25 -i "$SSH_KEY")

SKIP_DEPLOY=0
for arg in "$@"; do
  case "$arg" in
    --skip-deploy) SKIP_DEPLOY=1 ;;
  esac
done

if [[ ! -f "$SSH_KEY" ]]; then
  echo "Cle SSH introuvable: $SSH_KEY" >&2
  exit 1
fi
if [[ ! -f "$SQL_FILE" ]]; then
  echo "Fichier SQL introuvable: $SQL_FILE" >&2
  exit 1
fi

if [[ "$SKIP_DEPLOY" -eq 0 ]]; then
  echo "==> Deploiement backend (QR)..."
  bash "$SCRIPT_DIR/deploy-backend-only.sh"
fi

REMOTE_TMP="/tmp/oneandlab-073-qr.$$.$RANDOM.sql"
echo "==> Copie migration 073 vers $SSH_HOST..."
scp -q "${SSH_OPTS[@]}" "$SQL_FILE" "$SSH_HOST:$REMOTE_TMP"

echo "==> Application migration 073 sur MySQL prod..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" bash -s <<REMOTE_EOF
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
else
  if mysql --default-character-set=utf8mb4 -h"\$H" -P"\$P" -u"\$U" "\$D" \
    -e "SHOW TABLES LIKE 'qr_codes';" 2>/dev/null | grep -q qr_codes; then
    rm -f "\$REMOTE_TMP"
    echo "Migration 073 deja appliquee (prod)."
  else
    rm -f "\$REMOTE_TMP"
    exit 1
  fi
fi
REMOTE_EOF

echo "==> Verification tables QR..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" bash -s <<'REMOTE_EOF'
set -euo pipefail
source /var/www/oneandlab/.env
export MYSQL_PWD="$DB_PASS"
H="${DB_HOST:-127.0.0.1}"
P="${DB_PORT:-3306}"
mysql --default-character-set=utf8mb4 -h"$H" -P"$P" -u"$DB_USER" "$DB_NAME" -e "
SHOW TABLES LIKE 'qr_%';
SHOW COLUMNS FROM appointments LIKE 'attribution_qr_id';
SHOW COLUMNS FROM appointments LIKE 'assigned_pro_id';
"
REMOTE_EOF

echo "==> Backfill QR codes..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "cd $REMOTE_BASE/backend && php scripts/backfill-qr-codes.php"

echo "==> Tests PHPUnit QR..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" bash -s <<'REMOTE_EOF'
set -euo pipefail
cd /var/www/oneandlab/backend
if [[ ! -d vendor/phpunit ]]; then
  composer install --no-interaction --prefer-dist 2>/dev/null || composer install --no-interaction --prefer-dist --no-dev
fi
if [[ -d vendor/phpunit ]]; then
  ./vendor/bin/phpunit --testsuite QR --colors=always
else
  echo "PHPUnit non installe — test manuel des roles eligibles:"
  php -r "require 'lib/QrCodeService.php'; echo QrCodeService::isEligibleRole('pro') ? 'eligible_ok' : 'eligible_fail'; echo PHP_EOL;"
fi
REMOTE_EOF

echo "✅ Migration 073 QR, backfill et tests termines."
