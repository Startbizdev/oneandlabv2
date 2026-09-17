#!/usr/bin/env bash
# Migration 088_ai_audits_enrich.sql — colonnes observabilité ai_audits (prod)
set -euo pipefail

SSH_KEY="${SSH_KEY:-$HOME/.ssh/oneandlab-key.pem}"
if [[ ! -f "$SSH_KEY" && -f "$HOME/Desktop/oneandlab-key.pem" ]]; then
  SSH_KEY="$HOME/Desktop/oneandlab-key.pem"
fi
SSH_HOST="${SSH_HOST:-ubuntu@15.236.73.7}"
REMOTE_BASE="${REMOTE_BASE:-/var/www/oneandlab}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ ! -f "$SSH_KEY" ]]; then
  echo "❌ Cle SSH introuvable: $SSH_KEY"
  exit 1
fi
echo "==> Copie script migration AI audits enrich vers $SSH_HOST..."
scp -q -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new \
  "$ROOT/backend/scripts/apply-migration-088-ai-audits.php" \
  "$SSH_HOST:$REMOTE_BASE/backend/scripts/apply-migration-088-ai-audits.php"

echo "==> Application sur MySQL prod..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$SSH_HOST" \
  "cd $REMOTE_BASE/backend && php scripts/apply-migration-088-ai-audits.php"
echo "✅ Migration 088_ai_audits_enrich appliquée."
