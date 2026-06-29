#!/bin/bash
# Déploiement prod : build Nuxt EN LOCAL puis sync .output + sources + backend.
# Ne PAS builder sur le serveur (EC2 ~2 Go RAM → OOM sur le build SSR Nuxt).
#
# Usage : depuis la racine du repo → ./scripts/deploy-prod.sh
# Équivalent historique : ./buildlocaloneandlab.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_DIR="$ROOT/frontend"
BACKEND_DIR="$ROOT/backend"

SSH_KEY="${SSH_KEY:-$HOME/Desktop/oneandlab-key.pem}"
if [[ ! -f "$SSH_KEY" && -f "$HOME/.ssh/oneandlab-key.pem" ]]; then
  SSH_KEY="$HOME/.ssh/oneandlab-key.pem"
fi
SSH_HOST="${SSH_HOST:-ubuntu@ec2-15-188-11-249.eu-west-3.compute.amazonaws.com}"
REMOTE_BASE="/var/www/oneandlab"
REMOTE_DIR="$REMOTE_BASE/frontend"

SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 -i "$SSH_KEY")
# shellcheck source=deploy-sync.sh
source "$SCRIPT_DIR/deploy-sync.sh"
export DEPLOY_SSH_OPTS=("${SSH_OPTS[@]}")
export RSYNC_RSH="ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 -i $SSH_KEY"

if [[ ! -f "$SSH_KEY" ]]; then
  echo "❌ Cle SSH introuvable: $SSH_KEY"
  exit 1
fi

echo "==> Test connexion SSH..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "echo connected"

echo "==> Build local Nuxt (production) — pas sur le serveur (RAM insuffisante)..."
cd "$FRONTEND_DIR"
export NUXT_PUBLIC_API_BASE="${NUXT_PUBLIC_API_BASE:-https://cary.bio/api}"
export NUXT_PUBLIC_SITE_URL="${NUXT_PUBLIC_SITE_URL:-https://cary.bio}"
npm run build

echo "==> Sync .output/ (artefact build)..."
deploy_sync_dir \
  "$FRONTEND_DIR/.output/" \
  "$SSH_HOST:$REMOTE_DIR/.output/"

echo "==> Sync frontend sources (sans node_modules/.output)..."
deploy_sync_dir \
  "$FRONTEND_DIR/" \
  "$SSH_HOST:$REMOTE_DIR/" \
  --exclude=node_modules \
  --exclude=.output \
  --exclude=.nuxt \
  --exclude=.git

echo "==> Sync backend..."
deploy_sync_dir \
  "$BACKEND_DIR/" \
  "$SSH_HOST:$REMOTE_BASE/backend/" \
  --exclude=vendor \
  --exclude=.env \
  --exclude=uploads \
  --exclude=scripts/migration \
  --exclude=scripts/test-*.php \
  --exclude=scripts/run-test-*.sh

echo "==> Redémarrage PM2 (sans rebuild serveur)..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" bash -s <<REMOTE
set -euo pipefail
cd "$REMOTE_DIR"
pm2 delete oneandlab-frontend 2>/dev/null || true
pm2 start .output/server/index.mjs --name oneandlab-frontend
pm2 save
pm2 status
REMOTE

echo "✅ Déploiement prod terminé (https://cary.bio)"
