#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SSH_KEY="${SSH_KEY:-$HOME/Desktop/oneandlab-key.pem}"
if [[ ! -f "$SSH_KEY" && -f "$HOME/.ssh/oneandlab-key.pem" ]]; then
  SSH_KEY="$HOME/.ssh/oneandlab-key.pem"
fi
SSH_HOST="${SSH_HOST:-ubuntu@ec2-15-188-11-249.eu-west-3.compute.amazonaws.com}"
REMOTE_BASE="/var/www/oneandlab"
SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 -i "$SSH_KEY")

echo "==> Migration 072 (NIR) sur prod..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "cd $REMOTE_BASE/backend && php scripts/apply-migration-072.php"
if ssh "${SSH_OPTS[@]}" "$SSH_HOST" "test -f $REMOTE_BASE/backend/scripts/verify-migration-072.php"; then
  ssh "${SSH_OPTS[@]}" "$SSH_HOST" "cd $REMOTE_BASE/backend && php scripts/verify-migration-072.php"
fi
echo "✅ Migration 072 terminée."
