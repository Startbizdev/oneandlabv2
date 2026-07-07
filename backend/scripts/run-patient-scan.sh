#!/usr/bin/env bash
set -euo pipefail
KEY="${SSH_KEY:-$HOME/.ssh/oneandlab-key.pem}"
HOST="${SSH_HOST:-ubuntu@15.236.73.7}"
ssh -o ConnectTimeout=15 -i "$KEY" "$HOST" "cd /var/www/oneandlab && php backend/scripts/report-patient-appointments-scan.php $*"
