#!/usr/bin/env bash
# Release module commandes pharmacie — backend + migration + frontend + rappel mobile EAS
# Usage (Git Bash / WSL, depuis la racine du repo) :
#   ./scripts/release-pharmacy-module.sh
#   ./scripts/release-pharmacy-module.sh --skip-frontend
#   ./scripts/release-pharmacy-module.sh --skip-mobile-hint
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKIP_FRONTEND=0
SKIP_MOBILE_HINT=0
for arg in "$@"; do
  case "$arg" in
    --skip-frontend) SKIP_FRONTEND=1 ;;
    --skip-mobile-hint) SKIP_MOBILE_HINT=1 ;;
  esac
done

SSH_KEY="${SSH_KEY:-$HOME/Desktop/oneandlab-key.pem}"
if [[ ! -f "$SSH_KEY" && -f "$HOME/.ssh/oneandlab-key.pem" ]]; then
  SSH_KEY="$HOME/.ssh/oneandlab-key.pem"
fi
SSH_HOST="${SSH_HOST:-ubuntu@15.236.73.7}"

echo "==> Tests locaux PHPUnit Pharmacy"
(cd "$ROOT/backend" && composer test:pharmacy)

echo "==> Sync backend EC2"
"$ROOT/scripts/deploy-backend-only.sh"

echo "==> Migration 110 + 111 (SSH)"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$SSH_HOST" bash -s <<'REMOTE'
set -euo pipefail
cd /var/www/oneandlab/backend
php scripts/apply-migration-110-pharmacy-orders.php
php scripts/apply-migration-111-pharmacy-favorites.php
php scripts/verify-pharmacy-module.php
REMOTE

if [[ "$SKIP_FRONTEND" != "1" ]]; then
  echo "==> Deploy frontend Nuxt"
  "$ROOT/scripts/deploy-prod.sh"
fi

echo ""
echo "==> Post-deploy manuel (webapp admin cary.bio)"
echo "  1. Activer module Commandes pharmacie"
echo "  2. Configurer matrice métiers (commander / recevoir)"
echo ""

if [[ "$SKIP_MOBILE_HINT" != "1" ]]; then
  echo "==> Mobile iOS (local, depuis apps/mobile/)"
  echo "  npm run bump:ios:store"
  echo "  npm run build:ios:store   # build + auto-submit App Store Connect"
  echo ""
fi

echo "✅ Release backend + migration terminée. Vérifier menus commandes sur comptes nurse/pro/pharmacien."
