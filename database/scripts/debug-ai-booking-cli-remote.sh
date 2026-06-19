#!/usr/bin/env bash
set -euo pipefail
SSH_KEY="${SSH_KEY:-$HOME/.ssh/oneandlab-key.pem}"
SSH_HOST="${SSH_HOST:-ubuntu@ec2-15-188-11-249.eu-west-3.compute.amazonaws.com}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

scp -q -i "$SSH_KEY" "$ROOT/backend/scripts/debug-ai-booking-cli.php" "$SSH_HOST:/var/www/oneandlab/backend/scripts/"
ssh -i "$SSH_KEY" "$SSH_HOST" "cd /var/www/oneandlab/backend && php scripts/debug-ai-booking-cli.php"
