#!/usr/bin/env bash
# Applique migration 084 si table ai_conversation_attachments absente
set -euo pipefail

SSH_KEY="${SSH_KEY:-$HOME/.ssh/oneandlab-key.pem}"
if [[ ! -f "$SSH_KEY" && -f "$HOME/Desktop/oneandlab-key.pem" ]]; then
  SSH_KEY="$HOME/Desktop/oneandlab-key.pem"
fi
SSH_HOST="${SSH_HOST:-ubuntu@15.236.73.7}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SQL="$REPO_ROOT/database/migrations/084_ai_conversation_attachments.sql"

[[ -f "$SSH_KEY" ]] || { echo "Cle SSH introuvable: $SSH_KEY" >&2; exit 1; }
[[ -f "$SQL" ]] || { echo "Migration introuvable: $SQL" >&2; exit 1; }

scp -q -o StrictHostKeyChecking=accept-new -i "$SSH_KEY" "$SQL" "$SSH_HOST:/tmp/084_ai_conversation_attachments.sql"
ssh -o StrictHostKeyChecking=accept-new -i "$SSH_KEY" "$SSH_HOST" bash -s <<'REMOTE'
set -euo pipefail
source /var/www/oneandlab/.env
export MYSQL_PWD="$DB_PASS"
H="${DB_HOST:-127.0.0.1}"; P="${DB_PORT:-3306}"; U="$DB_USER"; D="$DB_NAME"
if mysql --default-character-set=utf8mb4 -h"$H" -P"$P" -u"$U" "$D" -e "SHOW TABLES LIKE 'ai_conversation_attachments';" 2>/dev/null | grep -q ai_conversation_attachments; then
  echo "Table ai_conversation_attachments déjà présente."
else
  mysql --default-character-set=utf8mb4 -h"$H" -P"$P" -u"$U" "$D" </tmp/084_ai_conversation_attachments.sql
  echo "Migration 084 appliquée."
fi
if mysql --default-character-set=utf8mb4 -h"$H" -P"$P" -u"$U" "$D" -e "SHOW TABLES LIKE 'ai_summaries';" 2>/dev/null | grep -q ai_summaries; then
  echo "Table ai_summaries OK."
else
  echo "ATTENTION: ai_summaries absente — lancer apply-migration-081-084-rag.sh"
fi
rm -f /tmp/084_ai_conversation_attachments.sql
REMOTE
echo "==> Vérification migration 084 terminée."
