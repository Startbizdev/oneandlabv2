#!/usr/bin/env bash
# Sauvegarde quotidienne Cary (à lancer en root sur le serveur, via /etc/cron.d/cary-backup).
#   1. Dump MySQL cohérent (--single-transaction), compressé zstd puis chiffré AES-256 (clé BACKUP_KEY_FILE).
#   2. Copie locale gardée BACKUP_LOCAL_DAYS jours (défaut 3).
#   3. Si BACKUP_S3_BUCKET est défini et la CLI aws présente : envoi du dump + synchro des fichiers
#      (uploads médicaux, déjà chiffrés par l'application) vers S3 (région Paris).
# Configuration : /etc/cary-backup.env (non versionné).
set -euo pipefail

CONFIG_FILE="${CONFIG_FILE:-/etc/cary-backup.env}"
# shellcheck disable=SC1090
[[ -f "$CONFIG_FILE" ]] && source "$CONFIG_FILE"

APP_BASE="${APP_BASE:-/var/www/oneandlab}"
DB_NAME="${DB_NAME:-$(grep -E '^DB_NAME=' "$APP_BASE/.env" | cut -d= -f2-)}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/oneandlab/daily}"
BACKUP_KEY_FILE="${BACKUP_KEY_FILE:-/root/.cary-backup.key}"
BACKUP_LOCAL_DAYS="${BACKUP_LOCAL_DAYS:-3}"
UPLOADS_DIR="${UPLOADS_DIR:-$APP_BASE/persistent/uploads}"
BACKUP_S3_BUCKET="${BACKUP_S3_BUCKET:-}"
AWS_REGION="${AWS_REGION:-eu-west-3}"

log() { echo "[$(date -u +%FT%TZ)] $*"; }

if [[ -z "$DB_NAME" ]]; then
  log "ERREUR : DB_NAME introuvable"; exit 1
fi
if [[ ! -s "$BACKUP_KEY_FILE" ]]; then
  log "ERREUR : clé de sauvegarde absente ($BACKUP_KEY_FILE)"; exit 1
fi

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
stamp="$(date -u +%Y%m%d-%H%M)"
dump="$BACKUP_DIR/${DB_NAME}-${stamp}.sql.zst.enc"
partial="$dump.partial"
trap 'rm -f "$partial"' EXIT

log "Dump de $DB_NAME → $dump"
nice -n 10 ionice -c3 mysqldump --single-transaction --quick --routines --triggers --events \
    --default-character-set=utf8mb4 "$DB_NAME" \
  | zstd -q -T2 -6 \
  | openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt -pass "file:$BACKUP_KEY_FILE" -out "$partial"

# Contrôle d'intégrité : déchiffrement + décompression complets, et fin de dump présente.
if ! openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass "file:$BACKUP_KEY_FILE" -in "$partial" \
    | zstd -dq | tail -n 1 | grep -q 'Dump completed'; then
  log "ERREUR : dump illisible ou incomplet"; exit 1
fi
mv "$partial" "$dump"
chmod 600 "$dump"
log "Dump OK ($(du -h "$dump" | cut -f1))"

find "$BACKUP_DIR" -name '*.sql.zst.enc' -mtime +"$BACKUP_LOCAL_DAYS" -delete

if [[ -z "$BACKUP_S3_BUCKET" ]]; then
  log "S3 non configuré : sauvegarde locale uniquement"; exit 0
fi
if ! command -v aws >/dev/null 2>&1; then
  log "ERREUR : BACKUP_S3_BUCKET défini mais CLI aws absente"; exit 1
fi

log "Envoi du dump → s3://$BACKUP_S3_BUCKET/db/"
aws s3 cp "$dump" "s3://$BACKUP_S3_BUCKET/db/$(basename "$dump")" --region "$AWS_REGION" --only-show-errors

log "Synchro des fichiers → s3://$BACKUP_S3_BUCKET/uploads/"
nice -n 10 aws s3 sync "$UPLOADS_DIR/" "s3://$BACKUP_S3_BUCKET/uploads/" --region "$AWS_REGION" --only-show-errors

if [[ -x /usr/local/sbin/cary-vault-sync ]]; then
  /usr/local/sbin/cary-vault-sync || log "ATTENTION : copie des secrets dans le coffre-fort en échec"
fi

log "Sauvegarde terminée"
