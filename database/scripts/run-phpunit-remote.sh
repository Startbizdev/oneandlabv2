#!/usr/bin/env bash
# PHPUnit complet sur le serveur (PHP + DB prod en lecture seule pour tests ACL).
set -euo pipefail

SSH_KEY="${SSH_KEY:-$HOME/.ssh/oneandlab-key.pem}"
if [[ ! -f "$SSH_KEY" && -f "$HOME/Desktop/oneandlab-key.pem" ]]; then
  SSH_KEY="$HOME/Desktop/oneandlab-key.pem"
fi
SSH_HOST="${SSH_HOST:-ubuntu@15.236.73.7}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SUITE="${1:-All}"

echo "==> Sync tests + phpunit.xml vers le serveur..."
scp -q -o StrictHostKeyChecking=accept-new -i "$SSH_KEY" \
  "$REPO_ROOT/backend/phpunit.xml" \
  "$REPO_ROOT/backend/composer.json" \
  "$SSH_HOST:/var/www/oneandlab/backend/"
scp -q -o StrictHostKeyChecking=accept-new -i "$SSH_KEY" -r \
  "$REPO_ROOT/backend/tests" \
  "$SSH_HOST:/var/www/oneandlab/backend/"

echo "==> PHPUnit testsuite: $SUITE"
ssh -o StrictHostKeyChecking=accept-new -i "$SSH_KEY" "$SSH_HOST" bash -s <<REMOTE
set -euo pipefail
cd /var/www/oneandlab/backend
set -a
source /var/www/oneandlab/.env
set +a
export TEST_DATABASE_DSN="mysql:host=\${DB_HOST:-127.0.0.1};port=\${DB_PORT:-3306};dbname=\${DB_NAME};charset=utf8mb4"
export TEST_DATABASE_USER="\${DB_USER:-}"
export TEST_DATABASE_PASS="\${DB_PASS:-}"
if [[ -z "\${TEST_PATIENT_ID:-}" || -z "\${TEST_PATIENT_B_ID:-}" ]]; then
  mapfile -t _PATIENTS < <(mysql -h"\${DB_HOST:-127.0.0.1}" -P"\${DB_PORT:-3306}" -u"\$DB_USER" -p"\$DB_PASS" "\$DB_NAME" -N -e "SELECT id FROM profiles WHERE role='patient' LIMIT 2" 2>/dev/null || true)
  export TEST_PATIENT_ID="\${TEST_PATIENT_ID:-\${_PATIENTS[0]:-}}"
  export TEST_PATIENT_B_ID="\${TEST_PATIENT_B_ID:-\${_PATIENTS[1]:-}}"
fi
composer install --no-interaction --quiet 2>/dev/null || true
php vendor/bin/phpunit --testsuite $SUITE --colors=always --testdox
REMOTE
