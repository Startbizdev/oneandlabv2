#!/bin/bash
set -euo pipefail
SCRIPT_DIR="/d/Clients/onev2"
BUILD_DIR="$SCRIPT_DIR/.build_deploy/frontend"
export SSH_HOST="${SSH_HOST:-ubuntu@15.236.73.7}"
export SSH_KEY="${SSH_KEY:-$HOME/.ssh/oneandlab-key.pem}"
SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=12 -i "$SSH_KEY")
SSH_TARGET="$SSH_HOST"
REMOTE_BASE="/var/www/oneandlab"
REMOTE_DIR="$REMOTE_BASE/frontend"
FRONTEND_DIR="$BUILD_DIR"
BACKEND_DIR="$SCRIPT_DIR/backend"
source "$SCRIPT_DIR/scripts/deploy-sync.sh"
export RSYNC_RSH="ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=12 -i $SSH_KEY"
DEPLOY_SSH_OPTS=("${SSH_OPTS[@]}")

retry_cmd() {
  local max_attempts="$1"
  shift
  local attempt=1
  until "$@"; do
    if [[ "$attempt" -ge "$max_attempts" ]]; then
      echo "❌ Echec apres $max_attempts tentatives: $*"
      return 1
    fi
    echo "⚠️ Tentative $attempt/$max_attempts echouee..."
    attempt=$((attempt + 1))
    sleep 2
  done
}

if [[ ! -d "$FRONTEND_DIR/.output" ]]; then
  echo "❌ Build staging introuvable: $FRONTEND_DIR/.output"
  exit 1
fi

echo "==> Nettoyage .output distant avant sync..."
ssh "${SSH_OPTS[@]}" "$SSH_TARGET" "rm -rf '$REMOTE_DIR/.output' && mkdir -p '$REMOTE_DIR/.output'"

echo "==> Envoi du build vers le serveur..."
retry_cmd 3 deploy_sync_dir "$FRONTEND_DIR/.output/" "$SSH_TARGET:$REMOTE_DIR/.output/"
echo "==> Envoi des fichiers sources frontend..."
retry_cmd 3 deploy_sync_dir "$FRONTEND_DIR/" "$SSH_TARGET:$REMOTE_DIR/" \
  --exclude=node_modules --exclude=.output --exclude=.nuxt --exclude=.git
echo "==> Envoi du backend..."
retry_cmd 3 deploy_sync_dir "$BACKEND_DIR/" "$SSH_TARGET:$REMOTE_BASE/backend/" \
  --exclude=vendor --exclude=.env --exclude=uploads --exclude=scripts/migration \
  --exclude=scripts/test-*.php --exclude=scripts/run-test-*.sh
echo "==> Envoi database..."
retry_cmd 3 deploy_sync_dir "$SCRIPT_DIR/database/" "$SSH_TARGET:$REMOTE_BASE/database/"
echo "==> Permissions uploads..."
retry_cmd 2 ssh "${SSH_OPTS[@]}" "$SSH_TARGET" \
  "sudo mkdir -p $REMOTE_BASE/backend/uploads/medical && sudo chown -R www-data:www-data $REMOTE_BASE/backend/uploads && sudo chmod -R 775 $REMOTE_BASE/backend/uploads"
echo "==> Redemarrage PM2..."
retry_cmd 2 ssh "${SSH_OPTS[@]}" "$SSH_TARGET" \
  "cd $REMOTE_DIR && pm2 delete oneandlab-frontend 2>/dev/null || true; pm2 start .output/server/index.mjs --name oneandlab-frontend && pm2 save && pm2 status"

echo "✅ Deploiement termine."
