#!/usr/bin/env bash
set -euo pipefail
SSH_KEY="${SSH_KEY:-$HOME/.ssh/oneandlab-key.pem}"
SSH_HOST="${SSH_HOST:-ubuntu@ec2-15-188-11-249.eu-west-3.compute.amazonaws.com}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

scp -q -o StrictHostKeyChecking=accept-new -i "$SSH_KEY" \
  "$ROOT/backend/scripts/test-ai-phase1.php" \
  "$ROOT/backend/scripts/test-ai-phase1-api.php" \
  "$ROOT/backend/scripts/test-ai-booking-recap-e2e.php" \
  "$SSH_HOST:/var/www/oneandlab/backend/scripts/"

ssh -o StrictHostKeyChecking=accept-new -i "$SSH_KEY" "$SSH_HOST" bash -s <<'REMOTE'
set -euo pipefail
cd /var/www/oneandlab/backend
echo "=== Tests unitaires Phase 1 IA ==="
php scripts/test-ai-phase1.php
echo ""
echo "=== Tests API Phase 1 IA (prod) ==="
BASE_URL=https://cary.bio/api php scripts/test-ai-phase1-api.php
echo ""
echo "=== E2E récap RDV (prod) ==="
BASE_URL=https://cary.bio/api php scripts/test-ai-booking-recap-e2e.php
REMOTE
