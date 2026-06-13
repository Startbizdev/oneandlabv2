#!/bin/bash
# Sync backend + test PDF ordonnance (sans rebuild frontend).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$ROOT/backend"

SSH_KEY="${SSH_KEY:-$HOME/Desktop/oneandlab-key.pem}"
if [[ ! -f "$SSH_KEY" && -f "$HOME/.ssh/oneandlab-key.pem" ]]; then
  SSH_KEY="$HOME/.ssh/oneandlab-key.pem"
fi
SSH_HOST="${SSH_HOST:-ubuntu@ec2-15-188-11-249.eu-west-3.compute.amazonaws.com}"
REMOTE_BASE="/var/www/oneandlab"

SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 -i "$SSH_KEY")
# shellcheck source=deploy-sync.sh
source "$SCRIPT_DIR/deploy-sync.sh"
export DEPLOY_SSH_OPTS=("${SSH_OPTS[@]}")

if [[ ! -f "$SSH_KEY" ]]; then
  echo "❌ Cle SSH introuvable: $SSH_KEY"
  exit 1
fi

echo "==> Test connexion SSH..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "echo connected"

echo "==> Sync backend -> $SSH_HOST:$REMOTE_BASE/backend/"
deploy_sync_dir \
  "$BACKEND_DIR/" \
  "$SSH_HOST:$REMOTE_BASE/backend/" \
  --exclude=vendor \
  --exclude=.env \
  --exclude=uploads \
  --exclude=scripts/migration \
  --exclude=scripts/test-*.php \
  --exclude=scripts/run-test-*.sh

echo "==> Verification generation PDF..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "cd $REMOTE_BASE/backend && php scripts/check-prescription-pdf.php"

echo "✅ Backend deploye et PDF OK."
