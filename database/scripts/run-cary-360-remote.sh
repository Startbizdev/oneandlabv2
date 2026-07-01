#!/usr/bin/env bash
# Test 360° Cary IA sur le serveur (local + API + chat Grok).
set -euo pipefail

SSH_KEY="${SSH_KEY:-$HOME/.ssh/oneandlab-key.pem}"
if [[ ! -f "$SSH_KEY" && -f "$HOME/Desktop/oneandlab-key.pem" ]]; then
  SSH_KEY="$HOME/Desktop/oneandlab-key.pem"
fi
SSH_HOST="${SSH_HOST:-ubuntu@15.236.73.7}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
EMAIL="${1:-charle.barth@test.oneandlab.fr}"
EXTRA_ARGS="${*:2}"

echo "==> Sync script Cary 360 vers le serveur..."
scp -q -o StrictHostKeyChecking=accept-new -i "$SSH_KEY" \
  "$REPO_ROOT/backend/lib/ai/Cary360Assertions.php" \
  "$REPO_ROOT/backend/lib/ai/Cary360ScenarioCatalog.php" \
  "$REPO_ROOT/backend/lib/ai/AiChatHelper.php" \
  "$REPO_ROOT/backend/lib/ai/AIGateway.php" \
  "$SSH_HOST:/var/www/oneandlab/backend/lib/ai/"

scp -q -o StrictHostKeyChecking=accept-new -i "$SSH_KEY" \
  "$REPO_ROOT/backend/scripts/test-cary-360.php" \
  "$SSH_HOST:/var/www/oneandlab/backend/scripts/"

scp -q -o StrictHostKeyChecking=accept-new -i "$SSH_KEY" \
  "$REPO_ROOT/backend/tests/ai/Cary360ScenariosTest.php" \
  "$REPO_ROOT/backend/tests/ai/AiChatHelperTest.php" \
  "$REPO_ROOT/backend/tests/ai/PromptInjectionGuardTest.php" \
  "$SSH_HOST:/var/www/oneandlab/backend/tests/ai/"

echo "==> PHPUnit Cary360 + AiChatHelper (local)..."
ssh -o StrictHostKeyChecking=accept-new -i "$SSH_KEY" "$SSH_HOST" bash -s <<REMOTE
set -euo pipefail
cd /var/www/oneandlab/backend
set -a
source /var/www/oneandlab/.env
set +a
php vendor/bin/phpunit --filter 'Cary360ScenariosTest|AiChatHelperTest|PromptInjectionGuardTest' --colors=always --testdox
REMOTE

echo "==> Test 360° E2E (API + chat)..."
ssh -o StrictHostKeyChecking=accept-new -i "$SSH_KEY" "$SSH_HOST" bash -s <<REMOTE
set -euo pipefail
cd /var/www/oneandlab/backend
set -a
source /var/www/oneandlab/.env
set +a
export BASE_URL="\${BASE_URL:-https://cary.bio/api}"
php scripts/test-cary-360.php "$EMAIL" $EXTRA_ARGS
REMOTE
