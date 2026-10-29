#!/usr/bin/env bash
# Installe la supervision Cary (sudo). Idempotent.
set -euo pipefail

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
install -m 750 -o root -g root "$SRC_DIR/cary-monitor.sh" /usr/local/sbin/cary-monitor
install -m 640 -o root -g root "$SRC_DIR/cary-alert.php" /usr/local/sbin/cary-alert.php

cat > /etc/cron.d/cary-monitor <<'EOF'
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin:/snap/bin
TZ=Europe/Paris
*/5 * * * * root /usr/local/sbin/cary-monitor >> /var/log/cary-monitor.log 2>&1
EOF
chmod 644 /etc/cron.d/cary-monitor
touch /var/log/cary-monitor.log; chmod 640 /var/log/cary-monitor.log

cat > /etc/logrotate.d/cary-monitor <<'EOF'
/var/log/cary-monitor.log /var/log/cary-backup.log /var/log/cary-restore-test.log /var/log/cary-housekeeping.log /var/log/cary-archive-access-logs.log {
    monthly
    rotate 12
    compress
    missingok
    notifempty
}
EOF
echo "Supervision installée : toutes les 5 minutes, journal /var/log/cary-monitor.log"
