#!/usr/bin/env bash
# Archive mensuelle du journal d'accès HDS (root, via /etc/cron.d/cary-maintenance).
# Les mois entièrement plus vieux que KEEP_MONTHS sont exportés (une ligne SQL par accès), compressés, chiffrés
# avec la clé des sauvegardes, envoyés sur S3 (archives/access-logs/, sans expiration), puis retirés de la base
# une fois le nombre de lignes de l'export vérifié. Rien n'est supprimé de la base sans archive vérifiée sur S3.
set -euo pipefail

CONFIG_FILE="${CONFIG_FILE:-/etc/cary-backup.env}"
# shellcheck disable=SC1090
[[ -f "$CONFIG_FILE" ]] && source "$CONFIG_FILE"

APP_BASE="${APP_BASE:-/var/www/oneandlab}"
DB_NAME="${DB_NAME:-$(grep -E '^DB_NAME=' "$APP_BASE/.env" | cut -d= -f2-)}"
BACKUP_KEY_FILE="${BACKUP_KEY_FILE:-/root/.cary-backup.key}"
BACKUP_S3_BUCKET="${BACKUP_S3_BUCKET:?BACKUP_S3_BUCKET requis}"
AWS_REGION="${AWS_REGION:-eu-west-3}"
KEEP_MONTHS="${KEEP_MONTHS:-3}"
WORK_DIR="${WORK_DIR:-/var/backups/oneandlab/access-logs}"
DELETE_BATCH="${DELETE_BATCH:-20000}"

log() { echo "[$(date -u +%FT%TZ)] $*"; }
sql() { mysql -N -B "$DB_NAME" -e "$1"; }

mkdir -p "$WORK_DIR"; chmod 700 "$WORK_DIR"
cutoff="$(date -d "$(date +%Y-%m-01) -${KEEP_MONTHS} month" +%Y-%m-01)"
oldest="$(sql "SELECT DATE_FORMAT(MIN(created_at), '%Y-%m-01') FROM access_logs WHERE created_at < '$cutoff'")"
if [[ -z "$oldest" || "$oldest" == "NULL" ]]; then
  log "Rien à archiver avant $cutoff"; exit 0
fi

month="$oldest"
while [[ "$month" < "$cutoff" ]]; do
  next="$(date -d "$month +1 month" +%Y-%m-01)"
  label="${month:0:7}"
  where="created_at >= '$month' AND created_at < '$next'"
  rows="$(sql "SELECT COUNT(*) FROM access_logs WHERE $where")"
  if (( rows == 0 )); then month="$next"; continue; fi

  file="$WORK_DIR/access-logs-$label.sql.zst.enc"
  key="archives/access-logs/access-logs-$label.sql.zst.enc"
  if aws s3 ls "s3://$BACKUP_S3_BUCKET/$key" --region "$AWS_REGION" >/dev/null 2>&1; then
    # Mois déjà archivé (lignes arrivées en retard ?) : nouvelle archive horodatée, l'ancienne est conservée.
    key="archives/access-logs/access-logs-$label-$(date -u +%Y%m%dT%H%M%SZ).sql.zst.enc"
  fi

  log "Export $label ($rows lignes)"
  nice -n 10 mysqldump --single-transaction --quick --no-create-info --skip-extended-insert --skip-triggers \
      --default-character-set=utf8mb4 --where="$where" "$DB_NAME" access_logs \
    | zstd -q -T2 -10 \
    | openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt -pass "file:$BACKUP_KEY_FILE" -out "$file"

  exported="$(openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass "file:$BACKUP_KEY_FILE" -in "$file" \
    | zstd -dq | grep -c '^INSERT INTO `access_logs`' || true)"
  if [[ "$exported" != "$rows" ]]; then
    log "ERREUR $label : export $exported lignes, base $rows lignes. Rien supprimé."; rm -f "$file"; exit 1
  fi

  aws s3 cp "$file" "s3://$BACKUP_S3_BUCKET/$key" --region "$AWS_REGION" --only-show-errors
  remote_size="$(aws s3 ls "s3://$BACKUP_S3_BUCKET/$key" --region "$AWS_REGION" | awk '{print $3}')"
  if [[ "$remote_size" != "$(stat -c %s "$file")" ]]; then
    log "ERREUR $label : taille S3 ($remote_size) différente de l'archive. Rien supprimé."; exit 1
  fi
  log "Archive vérifiée : s3://$BACKUP_S3_BUCKET/$key ($(du -h "$file" | cut -f1))"

  deleted=0
  while :; do
    n="$(sql "DELETE FROM access_logs WHERE $where LIMIT $DELETE_BATCH; SELECT ROW_COUNT();")"
    deleted=$((deleted + n))
    (( n < DELETE_BATCH )) && break
    sleep 1
  done
  log "$label : $deleted lignes retirées de la base"
  rm -f "$file"
  month="$next"
done
log "Archivage terminé (base : accès depuis le $cutoff)"
