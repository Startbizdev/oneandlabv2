#!/bin/bash
# Tier 2 + 3 only (Tier 1 déjà appliqué)
set -euo pipefail
LOG="/tmp/disk-cleanup-tier23-$(date +%Y%m%d-%H%M%S).log"
exec > >(tee -a "$LOG") 2>&1

echo "DISK BEFORE: $(df -h / | tail -1)"

echo "=== TIER 2 legacy ==="
LEGACY_DIR="/var/www/oneandlab/data/legacy-uploads"
MANIFEST="/tmp/legacy-uploads-manifest-$(date +%Y%m%d).txt"
if [[ -d "$LEGACY_DIR" ]]; then
  echo "Size: $(du -sh "$LEGACY_DIR" | cut -f1)"
  { find "$LEGACY_DIR" -type f | wc -l | xargs echo "file_count:"
    du -sh "$LEGACY_DIR"/* 2>/dev/null | sort -rh
    find "$LEGACY_DIR" -type f -printf '%s %p\n' | sort -rn | head -30
  } > "$MANIFEST"
  rm -rf "$LEGACY_DIR"
  rm -f /var/www/oneandlab/data/legacy-export.json /var/www/oneandlab/data/migration-report.json
  echo "Legacy removed. Manifest: $MANIFEST"
else
  echo "legacy-uploads absent"
fi

echo "DISK AFTER T2: $(df -h / | tail -1)"

echo "=== TIER 3 access_logs ==="
ENV_FILE="/var/www/oneandlab/.env"
DB_HOST=$(grep '^DB_HOST=' "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'")
DB_PORT=$(grep '^DB_PORT=' "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'")
DB_NAME=$(grep '^DB_NAME=' "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'")
DB_USER=$(grep '^DB_USER=' "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'")
DB_PASS=$(grep '^DB_PASS=' "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'")
DB_HOST=${DB_HOST:-127.0.0.1}
DB_PORT=${DB_PORT:-3306}
DB_NAME=${DB_NAME:-oneandlab}

CNF=$(mktemp)
chmod 600 "$CNF"
cat > "$CNF" <<EOF
[client]
host=$DB_HOST
port=$DB_PORT
user=$DB_USER
password=$DB_PASS
database=$DB_NAME
EOF

echo "access_logs before:"
mysql --defaults-extra-file="$CNF" -N -e "
SELECT CONCAT(ROUND((data_length+index_length)/1024/1024,1),' MB, rows=',table_rows)
FROM information_schema.tables WHERE table_schema='$DB_NAME' AND table_name='access_logs';"

OLD=$(mysql --defaults-extra-file="$CNF" -N -e "SELECT COUNT(*) FROM access_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 365 DAY);")
TOTAL=$(mysql --defaults-extra-file="$CNF" -N -e "SELECT COUNT(*) FROM access_logs;")
echo "Total rows: $TOTAL | purge >365d: $OLD"

if [[ "$OLD" -gt 0 ]]; then
  mysql --defaults-extra-file="$CNF" -e "DELETE FROM access_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 365 DAY);"
  mysql --defaults-extra-file="$CNF" -e "OPTIMIZE TABLE access_logs;"
fi

echo "access_logs after:"
mysql --defaults-extra-file="$CNF" -N -e "
SELECT CONCAT(ROUND((data_length+index_length)/1024/1024,1),' MB, rows=',table_rows)
FROM information_schema.tables WHERE table_schema='$DB_NAME' AND table_name='access_logs';"
mysql --defaults-extra-file="$CNF" -N -e "SELECT COUNT(*) FROM access_logs;" | xargs echo "rows remaining:"

rm -f "$CNF"

echo "DISK FINAL: $(df -h / | tail -1)"
curl -s -o /dev/null -w "health: HTTP %{http_code} %{time_total}s\n" https://cary.bio/api/app/version
pm2 list | head -5
echo "Log: $LOG"
