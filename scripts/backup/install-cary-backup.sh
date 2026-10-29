#!/usr/bin/env bash
# Installe la sauvegarde quotidienne Cary sur le serveur (sudo). Idempotent.
#   sudo bash install-cary-backup.sh            → sauvegarde locale chiffrée chaque nuit à 03:30 (Paris)
#   BACKUP_S3_BUCKET=nom sudo bash install-…    → active aussi l'envoi vers S3 (CLI aws installée si absente)
set -euo pipefail

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEY_FILE=/root/.cary-backup.key
CONFIG_FILE=/etc/cary-backup.env
LOG_FILE=/var/log/cary-backup.log

install -m 750 -o root -g root "$SRC_DIR/cary-backup.sh" /usr/local/sbin/cary-backup
install -m 750 -o root -g root "$SRC_DIR/cary-restore-test.sh" /usr/local/sbin/cary-restore-test

if [[ ! -s "$KEY_FILE" ]]; then
  umask 077
  openssl rand -base64 48 > "$KEY_FILE"
  echo "Clé de sauvegarde créée : $KEY_FILE (à copier dans le coffre-fort de ZENFACT SAS)"
fi
chmod 600 "$KEY_FILE"

if [[ -n "${BACKUP_S3_BUCKET:-}" ]]; then
  if ! command -v aws >/dev/null 2>&1; then
    snap install aws-cli --classic
  fi
  printf 'BACKUP_S3_BUCKET=%s\nAWS_REGION=%s\n' "$BACKUP_S3_BUCKET" "${AWS_REGION:-eu-west-3}" > "$CONFIG_FILE"
  chmod 600 "$CONFIG_FILE"
fi
[[ -f "$CONFIG_FILE" ]] || { : > "$CONFIG_FILE"; chmod 600 "$CONFIG_FILE"; }

cat > /etc/cron.d/cary-backup <<EOF
# Sauvegarde quotidienne Cary (base chiffrée + fichiers vers S3 si configuré)
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin:/snap/bin
TZ=Europe/Paris
30 3 * * * root /usr/local/sbin/cary-backup >> $LOG_FILE 2>&1
EOF
chmod 644 /etc/cron.d/cary-backup
touch "$LOG_FILE"; chmod 640 "$LOG_FILE"

# Test de restauration : le 1er de chaque mois à 04:30, après la sauvegarde de 03:30
cat > /etc/cron.d/cary-restore-test <<EOF
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin:/snap/bin
TZ=Europe/Paris
30 4 1 * * root /usr/local/sbin/cary-restore-test >> /var/log/cary-restore-test.log 2>&1
EOF
chmod 644 /etc/cron.d/cary-restore-test
echo "Sauvegarde installée : tous les jours à 03:30 (Paris), journal $LOG_FILE"
