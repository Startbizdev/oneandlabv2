#!/usr/bin/env bash
set -euo pipefail
SSH_KEY="${SSH_KEY:-$HOME/.ssh/oneandlab-key.pem}"
SSH_HOST="${SSH_HOST:-ubuntu@ec2-15-188-11-249.eu-west-3.compute.amazonaws.com}"

ssh -o StrictHostKeyChecking=accept-new -i "$SSH_KEY" "$SSH_HOST" bash -s <<'REMOTE'
set -euo pipefail
echo "=== nginx/php errors (last 20) ==="
sudo tail -20 /var/log/nginx/error.log 2>/dev/null || true
sudo tail -20 /var/log/php8.2-fpm.log 2>/dev/null || sudo tail -20 /var/log/php-fpm.log 2>/dev/null || true

echo ""
echo "=== CLI booking draft test ==="
cd /var/www/oneandlab/backend
php scripts/debug-ai-booking-draft.php 2>&1 || true

echo ""
echo "=== PHP error log app ==="
sudo tail -30 /var/www/oneandlab/backend/logs/*.log 2>/dev/null || true
REMOTE
