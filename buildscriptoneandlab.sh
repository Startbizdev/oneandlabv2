#!/bin/bash
# Sync menuswipe (buildscript) puis build + déploiement complet + migrations prod.
# Usage : depuis la racine du repo -> ./buildscriptoneandlab.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> buildscriptoneandlab : étape 1/3 menuswipe..."
"$SCRIPT_DIR/buildscript.sh"

echo "==> buildscriptoneandlab : étape 2/3 build local + rsync + PM2..."
# Supprime sur le serveur les anciens assets Nuxt absents du nouveau build (évite les chunks _nuxt mixtes).
export DEPLOY_SYNC_OUTPUT_DELETE=1
"$SCRIPT_DIR/buildlocaloneandlab.sh"

echo "==> buildscriptoneandlab : étape 3/4 migrations prod (093–102)..."
"$SCRIPT_DIR/scripts/run-migration-pending-prod.sh"

echo "==> buildscriptoneandlab : étape 4/4 config prod (mobile 1.7.6 + voix Grok)..."
SSH_KEY="${SSH_KEY:-$HOME/Desktop/oneandlab-key.pem}"
if [[ ! -f "$SSH_KEY" && -f "$HOME/.ssh/oneandlab-key.pem" ]]; then
  SSH_KEY="$HOME/.ssh/oneandlab-key.pem"
fi
SSH_HOST="${SSH_HOST:-ubuntu@15.236.73.7}"
REMOTE_BASE="/var/www/oneandlab"
SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 -i "$SSH_KEY")
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "bash $REMOTE_BASE/database/scripts/apply-mobile-app-env-prod.sh"
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "bash $REMOTE_BASE/database/scripts/apply-voice-grok-env-prod.sh"

echo "✅ buildscriptoneandlab terminé (déploiement + migrations + config prod)."
