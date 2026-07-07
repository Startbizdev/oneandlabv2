#!/bin/bash
# Migrations prod idempotentes après déploiement (093–098).
# Usage: ./scripts/run-migration-pending-prod.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SSH_KEY="${SSH_KEY:-$HOME/Desktop/oneandlab-key.pem}"
if [[ ! -f "$SSH_KEY" && -f "$HOME/.ssh/oneandlab-key.pem" ]]; then
  SSH_KEY="$HOME/.ssh/oneandlab-key.pem"
fi
SSH_HOST="${SSH_HOST:-ubuntu@15.236.73.7}"
REMOTE_BASE="/var/www/oneandlab"
SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 -i "$SSH_KEY")

if [[ ! -f "$SSH_KEY" ]]; then
  echo "❌ Clé SSH introuvable: $SSH_KEY"
  exit 1
fi

echo "==> Migrations prod (093–098) sur $SSH_HOST..."

echo "==> Vérification état actuel..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "cd $REMOTE_BASE/backend && php scripts/verify-migrations-prod-status.php" || true

echo "==> Migration 093 (passages infirmier)..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "cd $REMOTE_BASE/backend && php scripts/apply-migration-093.php"

echo "==> Migration 094 (notif en route)..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "cd $REMOTE_BASE/backend && php scripts/apply-migration-094.php"

echo "==> Migration 095 (constantes médicales)..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "cd $REMOTE_BASE/backend && php scripts/apply-migration-095.php"

echo "==> Migration 096 (absences patient)..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "cd $REMOTE_BASE/backend && php scripts/apply-migration-096.php"

echo "==> Migration 097 (snooze modal offres RDV)..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "cd $REMOTE_BASE/backend && php scripts/apply-migration-097.php"

echo "==> Migration 098 (tournée préleveur GPS)..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "cd $REMOTE_BASE/backend && php scripts/apply-migration-098.php"

echo "==> Vérification finale..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "cd $REMOTE_BASE/backend && php scripts/verify-migrations-prod-status.php"

echo "✅ Migrations prod à jour."
