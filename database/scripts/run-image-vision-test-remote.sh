#!/usr/bin/env bash
set -euo pipefail

SSH_KEY="${SSH_KEY:-/c/Users/aturc/.ssh/oneandlab-key.pem}"
SSH_HOST="${SSH_HOST:-ubuntu@15.236.73.7}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
EMAIL="${1:-charle.barth@test.oneandlab.fr}"
DOC_ID="${2:-}"

SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 -i "$SSH_KEY")

echo "==> Sync test-image-vision.php..."
scp "${SSH_OPTS[@]}" \
  "$REPO_ROOT/backend/scripts/test-image-vision.php" \
  "$SSH_HOST:/var/www/oneandlab/backend/scripts/"

echo "==> Exécution test image sur prod..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "cd /var/www/oneandlab/backend && set -a && source /var/www/oneandlab/.env && set +a && php scripts/test-image-vision.php '${DOC_ID}' '${EMAIL}'"
