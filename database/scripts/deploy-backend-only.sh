#!/usr/bin/env bash
# Sync backend + database vers prod (sans rebuild frontend).
set -euo pipefail

SSH_KEY="${SSH_KEY:-$HOME/.ssh/oneandlab-key.pem}"
if [[ ! -f "$SSH_KEY" && -f "/c/Users/aturc/.ssh/oneandlab-key.pem" ]]; then
  SSH_KEY="/c/Users/aturc/.ssh/oneandlab-key.pem"
fi
SSH_HOST="${SSH_HOST:-ubuntu@ec2-15-188-11-249.eu-west-3.compute.amazonaws.com}"
REMOTE_BASE="/var/www/oneandlab"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

export RSYNC_RSH="ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=12 -i $SSH_KEY"
# shellcheck source=../../scripts/deploy-sync.sh
source "$REPO_ROOT/scripts/deploy-sync.sh"
DEPLOY_SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=12 -i "$SSH_KEY")

echo "==> Sync backend..."
deploy_sync_dir \
  "$REPO_ROOT/backend/" \
  "$SSH_HOST:$REMOTE_BASE/backend/" \
  --exclude=vendor \
  --exclude=.env \
  --exclude=uploads \
  --exclude=scripts/migration \
  --exclude=scripts/test-*.php \
  --exclude=scripts/run-test-*.sh

echo "==> Sync database..."
deploy_sync_dir \
  "$REPO_ROOT/database/" \
  "$SSH_HOST:$REMOTE_BASE/database/"

echo "==> Reload PHP-FPM..."
ssh "${DEPLOY_SSH_OPTS[@]}" "$SSH_HOST" \
  "sudo systemctl reload php8.2-fpm 2>/dev/null || sudo systemctl reload php-fpm 2>/dev/null || true"

echo "✅ Backend deploy terminé."
