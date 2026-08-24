#!/bin/bash
# Nettoyage disque prod Cary — Tier 1, 2, 3
# Usage: bash /tmp/disk-cleanup-prod.sh
set -euo pipefail

LOG="/tmp/disk-cleanup-$(date +%Y%m%d-%H%M%S).log"
exec > >(tee -a "$LOG") 2>&1

echo "========== DISK BEFORE =========="
df -h / | tail -1

echo ""
echo "========== TIER 1 — nettoyage sans risque =========="

if [[ -d /var/www/oneandlab/node_modules ]]; then
  SZ=$(du -sh /var/www/oneandlab/node_modules | cut -f1)
  echo "Removing node_modules ($SZ)..."
  rm -rf /var/www/oneandlab/node_modules
fi

if [[ -d /home/ubuntu/.cursor-server ]]; then
  SZ=$(du -sh /home/ubuntu/.cursor-server | cut -f1)
  echo "Removing .cursor-server ($SZ)..."
  rm -rf /home/ubuntu/.cursor-server
fi

OCR_COUNT=$(find /tmp -maxdepth 1 -name 'cary_ocr_*' 2>/dev/null | wc -l)
OCR_SIZE=$(du -ch /tmp/cary_ocr_* 2>/dev/null | tail -1 | cut -f1 || echo "0")
echo "Removing $OCR_COUNT OCR temp files ($OCR_SIZE)..."
find /tmp -maxdepth 1 -name 'cary_ocr_*' -delete 2>/dev/null || true

if command -v npm >/dev/null 2>&1; then
  npm cache clean --force 2>/dev/null || true
fi
rm -rf /home/ubuntu/.npm/_cacache 2>/dev/null || true
rm -rf /home/ubuntu/.cache/* 2>/dev/null || true

echo "apt autoremove..."
sudo DEBIAN_FRONTEND=noninteractive apt-get autoremove -y -qq 2>/dev/null || true
sudo apt-get clean -qq 2>/dev/null || true

# Cron OCR cleanup (évite réaccumulation)
CRON_LINE='17 4 * * * find /tmp -maxdepth 1 -name "cary_ocr_*" -mtime +1 -delete 2>/dev/null'
(crontab -l 2>/dev/null | grep -v 'cary_ocr_' || true; echo "$CRON_LINE") | crontab -

echo ""
echo "========== DISK AFTER TIER 1 =========="
df -h / | tail -1

echo ""
echo "========== TIER 2 — legacy migration (backup listing + suppression) =========="

LEGACY_DIR="/var/www/oneandlab/data/legacy-uploads"
LEGACY_MANIFEST="/tmp/legacy-uploads-manifest-$(date +%Y%m%d).txt"

if [[ -d "$LEGACY_DIR" ]]; then
  LEGACY_SZ=$(du -sh "$LEGACY_DIR" | cut -f1)
  echo "Legacy size: $LEGACY_SZ — generating manifest..."
  find "$LEGACY_DIR" -type f | wc -l | xargs echo "  files:"
  find "$LEGACY_DIR" -type f -printf '%s %p\n' | sort -rn | head -50 > "$LEGACY_MANIFEST"
  du -sh "$LEGACY_DIR"/* 2>/dev/null | sort -rh >> "$LEGACY_MANIFEST"

  echo "Removing legacy-uploads ($LEGACY_SZ)..."
  rm -rf "$LEGACY_DIR"

  for f in /var/www/oneandlab/data/legacy-export.json /var/www/oneandlab/data/migration-report.json; do
    if [[ -f "$f" ]]; then
      echo "Removing $(basename "$f")..."
      rm -f "$f"
    fi
  done
else
  echo "legacy-uploads already absent — skip"
fi

echo ""
echo "========== DISK AFTER TIER 2 =========="
df -h / | tail -1

echo ""
echo "========== TIER 3 — purge access_logs (>365 jours) =========="

ENV_FILE="/var/www/oneandlab/backend/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: .env not found"
  exit 1
fi

# shellcheck disable=SC1090
source <(grep -E '^(DB_HOST|DB_PORT|DB_NAME|DB_USER|DB_PASS)=' "$ENV_FILE" | sed 's/^/export /')

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-oneandlab}"
DB_USER="${DB_USER:?missing DB_USER}"
DB_PASS="${DB_PASS:?missing DB_PASS}"

MYSQL=(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -N)

echo "Table size before:"
"${MYSQL[@]}" -e "
SELECT ROUND((data_length+index_length)/1024/1024,1) AS mb, table_rows
FROM information_schema.tables
WHERE table_schema='$DB_NAME' AND table_name='access_logs';" 2>/dev/null || true

ROWS_BEFORE=$("${MYSQL[@]}" -e "SELECT COUNT(*) FROM access_logs;" 2>/dev/null || echo "?")
OLD_ROWS=$("${MYSQL[@]}" -e "SELECT COUNT(*) FROM access_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 365 DAY);" 2>/dev/null || echo "0")
echo "Rows total: $ROWS_BEFORE | rows >365d: $OLD_ROWS"

if [[ "$OLD_ROWS" != "0" && "$OLD_ROWS" != "?" ]]; then
  echo "Deleting access_logs older than 365 days..."
  "${MYSQL[@]}" -e "DELETE FROM access_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 365 DAY);"
  echo "Optimizing access_logs..."
  mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "OPTIMIZE TABLE access_logs;"
else
  echo "No rows to purge (>365d) or unable to count — skip delete"
fi

ROWS_AFTER=$("${MYSQL[@]}" -e "SELECT COUNT(*) FROM access_logs;" 2>/dev/null || echo "?")
echo "Rows after: $ROWS_AFTER"

echo "Table size after:"
"${MYSQL[@]}" -e "
SELECT ROUND((data_length+index_length)/1024/1024,1) AS mb, table_rows
FROM information_schema.tables
WHERE table_schema='$DB_NAME' AND table_name='access_logs';" 2>/dev/null || true

echo ""
echo "========== SERVICES CHECK =========="
systemctl is-active nginx mysql php8.2-fpm 2>/dev/null || true
pm2 list 2>/dev/null || true
curl -s -o /dev/null -w "cary.bio: HTTP %{http_code} in %{time_total}s\n" https://cary.bio/ || true

echo ""
echo "========== DISK FINAL =========="
df -h / | tail -1
du -sh /var/www/oneandlab/backend/uploads/medical /var/lib/mysql /var/www/oneandlab/data 2>/dev/null || true

echo ""
echo "Log saved: $LOG"
