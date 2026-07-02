#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SSH_KEY="${SSH_KEY:-$HOME/Desktop/oneandlab-key.pem}"
if [[ ! -f "$SSH_KEY" && -f "$HOME/.ssh/oneandlab-key.pem" ]]; then
  SSH_KEY="$HOME/.ssh/oneandlab-key.pem"
fi
SSH_HOST="${SSH_HOST:-ubuntu@15.236.73.7}"
REMOTE_BASE="/var/www/oneandlab"
SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 -i "$SSH_KEY")

echo "==> Migration 093 (passages infirmier) sur prod..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "cd $REMOTE_BASE/backend && php scripts/apply-migration-093.php"

echo "==> Migration 094 (notif en route) sur prod..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "cd $REMOTE_BASE/backend && php scripts/apply-migration-094.php"

echo "==> Migration 095 (constantes médicales) sur prod..."
scp -q "${SSH_OPTS[@]}" "$SCRIPT_DIR/../database/migrations/095_patient_clinical_vitals.sql" \
  "$SSH_HOST:$REMOTE_BASE/database/migrations/"
scp -q "${SSH_OPTS[@]}" "$SCRIPT_DIR/../backend/scripts/apply-migration-095.php" \
  "$SCRIPT_DIR/../backend/scripts/verify-migrations-prod-status.php" \
  "$SSH_HOST:$REMOTE_BASE/backend/scripts/"
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "cd $REMOTE_BASE/backend && php scripts/apply-migration-095.php"

echo "==> Vérification état migrations..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "cd $REMOTE_BASE/backend && php scripts/verify-migrations-prod-status.php"

echo "✅ Migrations 093 + 094 + 095 terminées."
