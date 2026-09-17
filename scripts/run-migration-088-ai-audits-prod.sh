#!/usr/bin/env bash
# Migration 088_ai_audits_enrich.sql — colonnes observabilité ai_audits (prod)
set -euo pipefail

SSH_KEY="${SSH_KEY:-$HOME/.ssh/oneandlab-key.pem}"
if [[ ! -f "$SSH_KEY" && -f "$HOME/Desktop/oneandlab-key.pem" ]]; then
  SSH_KEY="$HOME/Desktop/oneandlab-key.pem"
fi
SSH_HOST="${SSH_HOST:-ubuntu@15.236.73.7}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SQL_FILE="$ROOT/database/migrations/088_ai_audits_enrich.sql"

if [[ ! -f "$SSH_KEY" ]]; then
  echo "❌ Cle SSH introuvable: $SSH_KEY"
  exit 1
fi
if [[ ! -f "$SQL_FILE" ]]; then
  echo "❌ Fichier migration introuvable: $SQL_FILE"
  exit 1
fi

echo "==> Copie migration AI audits enrich vers $SSH_HOST..."
scp -q -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$SQL_FILE" "$SSH_HOST:/tmp/088_ai_audits_enrich.sql"

echo "==> Application sur MySQL prod..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$SSH_HOST" bash -s <<'REMOTE'
set -euo pipefail
source /var/www/oneandlab/.env
export MYSQL_PWD="$DB_PASS"
mysql -h"${DB_HOST:-127.0.0.1}" -P"${DB_PORT:-3306}" -u"$DB_USER" "$DB_NAME" </tmp/088_ai_audits_enrich.sql
rm -f /tmp/088_ai_audits_enrich.sql
echo "✅ Migration 088_ai_audits_enrich appliquée."
REMOTE
