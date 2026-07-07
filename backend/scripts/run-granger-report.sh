#!/usr/bin/env bash
set -euo pipefail
KEY="${SSH_KEY:-$HOME/.ssh/oneandlab-key.pem}"
HOST="${SSH_HOST:-ubuntu@15.236.73.7}"
scp -o ConnectTimeout=15 -i "$KEY" "$(dirname "$0")/report-patient-appointments-scan.php" "$HOST:/var/www/oneandlab/backend/scripts/report-patient-appointments-scan.php"
ssh -o ConnectTimeout=15 -i "$KEY" "$HOST" 'cd /var/www/oneandlab && php backend/scripts/report-patient-appointments-scan.php Granger Jean Remi' > /tmp/granger-report-local.json
cat /tmp/granger-report-local.json
