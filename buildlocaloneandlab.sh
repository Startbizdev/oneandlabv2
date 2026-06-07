#!/bin/bash
# Build frontend en local, envoi frontend + backend sur le serveur, redémarrage PM2
# Usage: depuis la racine du repo -> ./buildlocaloneandlab.sh
set -euo pipefail

SSH_KEY="${SSH_KEY:-$HOME/Desktop/oneandlab-key.pem}"
if [[ ! -f "$SSH_KEY" && -f "$HOME/.ssh/oneandlab-key.pem" ]]; then
  SSH_KEY="$HOME/.ssh/oneandlab-key.pem"
fi
SSH_HOST="${SSH_HOST:-ubuntu@ec2-15-188-11-249.eu-west-3.compute.amazonaws.com}"
REMOTE_BASE="/var/www/oneandlab"
REMOTE_DIR="$REMOTE_BASE/frontend"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
BACKEND_DIR="$SCRIPT_DIR/backend"

SSH_USER="${SSH_HOST%@*}"
SSH_HOSTNAME="${SSH_HOST#*@}"
if [[ "$SSH_USER" == "$SSH_HOSTNAME" ]]; then
  SSH_USER="ubuntu"
fi

SSH_TARGET="$SSH_USER@$SSH_HOSTNAME"
SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=12 -i "$SSH_KEY")
DEPLOY_SSH_OPTS=("${SSH_OPTS[@]}")
# shellcheck source=scripts/deploy-sync.sh
source "$SCRIPT_DIR/scripts/deploy-sync.sh"
export RSYNC_RSH="ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=12 -i $SSH_KEY"

retry_cmd() {
  local max_attempts="$1"
  shift
  local attempt=1
  until "$@"; do
    if [[ "$attempt" -ge "$max_attempts" ]]; then
      echo "❌ Echec apres $max_attempts tentatives: $*"
      return 1
    fi
    echo "⚠️ Tentative $attempt/$max_attempts echouee, nouvelle tentative..."
    attempt=$((attempt + 1))
    sleep 2
  done
}

resolve_ipv4() {
  local host="$1"
  dig +short "$host" | awk 'NF { print; exit }'
}

ensure_ssh_target() {
  local candidate="$SSH_TARGET"
  echo "==> Test connexion SSH vers $candidate..."
  if ssh "${SSH_OPTS[@]}" "$candidate" "echo connected" >/dev/null 2>&1; then
    SSH_TARGET="$candidate"
    return 0
  fi

  local ip=""
  ip="$(resolve_ipv4 "$SSH_HOSTNAME" || true)"
  if [[ -z "$ip" ]]; then
    echo "❌ DNS KO: impossible de resoudre $SSH_HOSTNAME"
    return 1
  fi

  candidate="$SSH_USER@$ip"
  echo "==> Fallback DNS: tentative via IP $candidate..."
  if ssh "${SSH_OPTS[@]}" "$candidate" "echo connected" >/dev/null 2>&1; then
    SSH_TARGET="$candidate"
    echo "✅ Connexion SSH OK via IP de secours."
    return 0
  fi

  echo "❌ Connexion SSH impossible avec hostname et IP."
  return 1
}

if [[ ! -f "$SSH_KEY" ]]; then
  echo "❌ Cle SSH introuvable: $SSH_KEY"
  exit 1
fi

echo "==> Verification de la connectivite serveur..."
ensure_ssh_target

echo "==> Nettoyage du cache (Nuxt + Vite)..."
cd "$FRONTEND_DIR"
rm -rf .nuxt node_modules/.vite 2>/dev/null || true

echo "==> Build local (production)..."
export NUXT_PUBLIC_API_BASE="https://cary.bio/api"
export NUXT_PUBLIC_SITE_URL="https://cary.bio"
npm run build

echo "==> Envoi du build vers le serveur..."
retry_cmd 3 deploy_sync_dir \
  "$FRONTEND_DIR/.output/" \
  "$SSH_TARGET:$REMOTE_DIR/.output/"

echo "==> Envoi des fichiers sources (frontend sauf build/node_modules)..."
retry_cmd 3 deploy_sync_dir \
  "$FRONTEND_DIR/" \
  "$SSH_TARGET:$REMOTE_DIR/" \
  --exclude=node_modules \
  --exclude=.output \
  --exclude=.nuxt \
  --exclude=.git

echo "==> Envoi du backend (sauf vendor/.env/uploads + scripts migration legacy)..."
retry_cmd 3 deploy_sync_dir \
  "$BACKEND_DIR/" \
  "$SSH_TARGET:$REMOTE_BASE/backend/" \
  --exclude=vendor \
  --exclude=.env \
  --exclude=uploads \
  --exclude=scripts/migration \
  --exclude=scripts/test-*.php \
  --exclude=scripts/run-test-*.sh

echo "==> Envoi du dossier database (schemas SQL)..."
retry_cmd 3 deploy_sync_dir \
  "$SCRIPT_DIR/database/" \
  "$SSH_TARGET:$REMOTE_BASE/database/"

echo "==> Permissions uploads (www-data)..."
retry_cmd 2 ssh "${SSH_OPTS[@]}" "$SSH_TARGET" \
  "sudo mkdir -p $REMOTE_BASE/backend/uploads/medical && sudo chown -R www-data:www-data $REMOTE_BASE/backend/uploads && sudo chmod -R 775 $REMOTE_BASE/backend/uploads"

echo "==> Redemarrage PM2 sur le serveur..."
retry_cmd 2 ssh "${SSH_OPTS[@]}" "$SSH_TARGET" \
  "cd $REMOTE_DIR && pm2 delete oneandlab-frontend 2>/dev/null || true; pm2 start .output/server/index.mjs --name oneandlab-frontend && pm2 save && pm2 status"

echo "==> Deploiement termine."
