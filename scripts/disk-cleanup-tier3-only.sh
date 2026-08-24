#!/bin/bash
set -euo pipefail
LOG="/tmp/disk-cleanup-tier3-$(date +%Y%m%d-%H%M%S).log"
exec > >(tee -a "$LOG") 2>&1

echo "DISK BEFORE: $(df -h / | tail -1)"

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

echo "=== TIER 3 access_logs (>365j) ==="
echo "Before:"
mysql --defaults-extra-file="$CNF" -N -e "
SELECT CONCAT(ROUND((data_length+index_length)/1024/1024,1),' MB, rows=',table_rows)
FROM information_schema.tables WHERE table_schema='$DB_NAME' AND table_name='access_logs';"

OLD=$(mysql --defaults-extra-file="$CNF" -N -e "SELECT COUNT(*) FROM access_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 365 DAY);")
TOTAL=$(mysql --defaults-extra-file="$CNF" -N -e "SELECT COUNT(*) FROM access_logs;")
echo "Total: $TOTAL | purge >365d: $OLD"

if [[ "$OLD" -gt 0 ]]; then
  mysql --defaults-extra-file="$CNF" -e "DELETE FROM access_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 365 DAY);"
  mysql --defaults-extra-file="$CNF" -e "OPTIMIZE TABLE access_logs;"
fi

echo "After:"
mysql --defaults-extra-file="$CNF" -N -e "
SELECT CONCAT(ROUND((data_length+index_length)/1024/1024,1),' MB, rows=',table_rows)
FROM information_schema.tables WHERE table_schema='$DB_NAME' AND table_name='access_logs';"

rm -f "$CNF"
echo "DISK AFTER T3: $(df -h / | tail -1)"
