#!/usr/bin/env bash
set -euo pipefail

SSH_KEY="${SSH_KEY:-/c/Users/aturc/.ssh/oneandlab-key.pem}"
SSH_HOST="${SSH_HOST:-ubuntu@15.236.73.7}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
REMOTE="/var/www/oneandlab/backend"

SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 -i "$SSH_KEY")

echo "==> Deploy Cary attachments hotfix -> $SSH_HOST"
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "echo connected"

scp "${SSH_OPTS[@]}" \
  "$ROOT/backend/lib/ai/AiAttachmentService.php" \
  "$ROOT/backend/lib/ai/AiChatService.php" \
  "$SSH_HOST:$REMOTE/lib/ai/"

scp "${SSH_OPTS[@]}" \
  "$ROOT/backend/lib/rag/DocumentVisionService.php" \
  "$ROOT/backend/lib/rag/AiDocumentJobService.php" \
  "$SSH_HOST:$REMOTE/lib/rag/"

scp "${SSH_OPTS[@]}" \
  "$ROOT/backend/api/ai/conversations/[id].php" \
  "$SSH_HOST:$REMOTE/api/ai/conversations/"

scp "${SSH_OPTS[@]}" \
  "$ROOT/backend/api/ai/documents/[id]/analyze.php" \
  "$SSH_HOST:$REMOTE/api/ai/documents/[id]/"

echo "==> Reload PHP-FPM..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" \
  "sudo systemctl reload php8.2-fpm 2>/dev/null || sudo systemctl reload php-fpm 2>/dev/null || true"

echo "==> Syntax check..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" \
  "php -l $REMOTE/lib/ai/AiChatService.php && php -l $REMOTE/lib/rag/DocumentVisionService.php"

echo "✅ Hotfix Cary attachments déployé."
