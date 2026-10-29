#!/usr/bin/env bash
# Test de restauration (root, via /etc/cron.d/cary-restore-test) : restaure la dernière sauvegarde chiffrée dans une
# base temporaire, compare le nombre de lignes des tables clés avec la production, puis supprime la base temporaire.
set -euo pipefail

APP_BASE="${APP_BASE:-/var/www/oneandlab}"
DB_NAME="${DB_NAME:-$(grep -E '^DB_NAME=' "$APP_BASE/.env" | cut -d= -f2-)}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/oneandlab/daily}"
BACKUP_KEY_FILE="${BACKUP_KEY_FILE:-/root/.cary-backup.key}"
TEST_DB="cary_restore_test"
MIN_FREE_GB="${MIN_FREE_GB:-10}"
TABLES=(profiles appointments medical_documents patient_documents pharmacy_orders patient_relatives)

log() { echo "[$(date -u +%FT%TZ)] $*"; }

dump="$(ls -1t "$BACKUP_DIR"/*.sql.zst.enc 2>/dev/null | head -n 1 || true)"
[[ -n "$dump" ]] || { log "ERREUR : aucune sauvegarde dans $BACKUP_DIR"; exit 1; }

free_gb=$(( $(df --output=avail -k /var/lib/mysql | tail -1) / 1024 / 1024 ))
if (( free_gb < MIN_FREE_GB )); then
  log "ERREUR : ${free_gb} Go libres (< ${MIN_FREE_GB} Go), test reporté"; exit 1
fi

trap 'mysql -e "DROP DATABASE IF EXISTS \`$TEST_DB\`"' EXIT
mysql -e "DROP DATABASE IF EXISTS \`$TEST_DB\`; CREATE DATABASE \`$TEST_DB\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"

log "Restauration de $(basename "$dump") dans $TEST_DB"
start=$(date +%s)
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass "file:$BACKUP_KEY_FILE" -in "$dump" \
  | zstd -dq \
  | nice -n 15 ionice -c3 mysql "$TEST_DB"
log "Restauration terminée en $(( $(date +%s) - start )) s"

# La sauvegarde date de la nuit : la production peut avoir quelques lignes de plus, jamais moins.
status=0
for t in "${TABLES[@]}"; do
  restored=$(mysql -N -e "SELECT COUNT(*) FROM \`$TEST_DB\`.\`$t\`")
  live=$(mysql -N -e "SELECT COUNT(*) FROM \`$DB_NAME\`.\`$t\`")
  if (( restored == 0 && live > 0 )) || (( restored > live )); then
    log "ÉCHEC $t : restauré=$restored production=$live"; status=1
  else
    log "OK $t : restauré=$restored production=$live"
  fi
done

(( status == 0 )) && log "Test de restauration RÉUSSI" || log "Test de restauration ÉCHOUÉ"
exit "$status"
