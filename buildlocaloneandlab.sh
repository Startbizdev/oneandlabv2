#!/bin/bash
# Build frontend en local, envoi frontend + backend sur le serveur, redémarrage PM2
# Usage: depuis la racine du repo → ./buildlocaloneandlab.sh
set -e

SSH_KEY="${SSH_KEY:-$HOME/Desktop/oneandlab-key.pem}"
SSH_HOST="${SSH_HOST:-ubuntu@ec2-15-188-11-249.eu-west-3.compute.amazonaws.com}"
REMOTE_BASE="/var/www/oneandlab"
REMOTE_DIR="$REMOTE_BASE/frontend"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
BACKEND_DIR="$SCRIPT_DIR/backend"

echo "==> Build local (production)..."
cd "$FRONTEND_DIR"
export NUXT_PUBLIC_API_BASE="https://app.oneandlab.fr/api"
export NUXT_PUBLIC_SITE_URL="https://app.oneandlab.fr"
npm run build

echo "==> Envoi du build vers le serveur..."
rsync -avz -e "ssh -o StrictHostKeyChecking=accept-new -i $SSH_KEY" \
  "$FRONTEND_DIR/.output/" \
  "$SSH_HOST:$REMOTE_DIR/.output/"

echo "==> Envoi des fichiers sources (frontend sauf build/node_modules)..."
rsync -avz -e "ssh -o StrictHostKeyChecking=accept-new -i $SSH_KEY" \
  --exclude 'node_modules' \
  --exclude '.output' \
  --exclude '.nuxt' \
  --exclude '.git' \
  "$FRONTEND_DIR/" \
  "$SSH_HOST:$REMOTE_DIR/"

echo "==> Envoi du backend (sauf vendor/.env)..."
rsync -avz -e "ssh -o StrictHostKeyChecking=accept-new -i $SSH_KEY" \
  --exclude 'vendor' \
  --exclude '.env' \
  "$BACKEND_DIR/" \
  "$SSH_HOST:$REMOTE_BASE/backend/"

echo "==> Redémarrage PM2 sur le serveur..."
ssh -i "$SSH_KEY" "$SSH_HOST" "cd $REMOTE_DIR && pm2 delete oneandlab-frontend 2>/dev/null || true; pm2 start .output/server/index.mjs --name oneandlab-frontend && pm2 save && pm2 status"

echo "==> Déploiement terminé."
