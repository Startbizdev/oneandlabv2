#!/bin/bash
# Sync du dossier public/images/menuswipe (icônes filtre soins segments) vers le serveur.
# Met à jour le dépôt source sur le remote et la copie servie (.output/public) sans rebuild complet.
# Usage : depuis la racine du repo -> ./buildscript.sh
set -euo pipefail

SSH_KEY="${SSH_KEY:-$HOME/Desktop/oneandlab-key.pem}"
if [[ ! -f "$SSH_KEY" && -f "$HOME/.ssh/oneandlab-key.pem" ]]; then
  SSH_KEY="$HOME/.ssh/oneandlab-key.pem"
fi
SSH_HOST="${SSH_HOST:-ubuntu@ec2-15-188-11-249.eu-west-3.compute.amazonaws.com}"
REMOTE_BASE="${REMOTE_BASE:-/var/www/oneandlab}"
REMOTE_DIR="$REMOTE_BASE/frontend"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
LOCAL_MENUSWIPE="$FRONTEND_DIR/public/images/menuswipe"

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

if [[ ! -d "$LOCAL_MENUSWIPE" ]]; then
  echo "❌ Dossier introuvable: $LOCAL_MENUSWIPE"
  exit 1
fi

ensure_ssh_target

echo "==> Sync menuswipe -> $SSH_TARGET:$REMOTE_DIR/public/images/menuswipe/"
retry_cmd 3 deploy_sync_menuswipe \
  "$LOCAL_MENUSWIPE" \
  "$SSH_TARGET:$REMOTE_DIR/public/images/menuswipe"

echo "==> Sync menuswipe -> .output/public (assets servis par Nuxt en prod)..."
retry_cmd 3 deploy_sync_menuswipe \
  "$LOCAL_MENUSWIPE" \
  "$SSH_TARGET:$REMOTE_DIR/.output/public/images/menuswipe"

echo "✅ Sync menuswipe termine."
