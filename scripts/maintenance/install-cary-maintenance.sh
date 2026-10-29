#!/usr/bin/env bash
# Installe la maintenance automatique du serveur Cary (sudo). Idempotent.
#   - nettoyage chaque dimanche 04:00 (anciennes versions, copies de déploiement, journaux techniques, paquets)
#   - archivage du journal d'accès HDS sur S3 le 2 de chaque mois 04:00 (3 derniers mois gardés en base)
#   - binlogs MySQL : 7 jours (les sauvegardes quotidiennes sur S3 prennent le relais)
#   - journal d'accès : jamais supprimé, seulement archivé (ACCESS_LOG_RETENTION_MONTHS=240)
set -euo pipefail

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_BASE="${APP_BASE:-/var/www/oneandlab}"

install -m 750 -o root -g root "$SRC_DIR/cary-housekeeping.sh" /usr/local/sbin/cary-housekeeping
install -m 750 -o root -g root "$SRC_DIR/cary-archive-access-logs.sh" /usr/local/sbin/cary-archive-access-logs

cat > /etc/cron.d/cary-maintenance <<'EOF'
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin:/snap/bin
TZ=Europe/Paris
0 4 * * 0 root /usr/local/sbin/cary-housekeeping >> /var/log/cary-housekeeping.log 2>&1
0 4 2 * * root /usr/local/sbin/cary-archive-access-logs >> /var/log/cary-archive-access-logs.log 2>&1
EOF
chmod 644 /etc/cron.d/cary-maintenance
touch /var/log/cary-housekeeping.log /var/log/cary-archive-access-logs.log
chmod 640 /var/log/cary-housekeeping.log /var/log/cary-archive-access-logs.log

# Binlogs MySQL : 7 jours (persistant au redémarrage).
mysql -e "SET PERSIST binlog_expire_logs_seconds = 604800"

# Journal d'accès HDS : la purge mensuelle ne supprime plus avant 20 ans (l'archivage S3 allège la base).
if grep -q '^ACCESS_LOG_RETENTION_MONTHS=' "$APP_BASE/.env"; then
  sed -i 's/^ACCESS_LOG_RETENTION_MONTHS=.*/ACCESS_LOG_RETENTION_MONTHS=240/' "$APP_BASE/.env"
else
  printf '\nACCESS_LOG_RETENTION_MONTHS=240\n' >> "$APP_BASE/.env"
fi

# Rotation des journaux du dossier persistant (appointments.log, etc.).
cat > /etc/logrotate.d/oneandlab-persistent <<EOF
$APP_BASE/persistent/logs/*.log {
    weekly
    rotate 52
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
    size 50M
}
EOF
echo "Maintenance installée : nettoyage le dimanche 04:00, archivage du journal d'accès le 2 du mois 04:00"
