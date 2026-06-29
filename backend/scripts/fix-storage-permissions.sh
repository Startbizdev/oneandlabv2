#!/bin/bash
# Permissions storage backend (drafts patient, etc.) — PHP-FPM www-data
set -euo pipefail
REMOTE_BASE="${REMOTE_BASE:-/var/www/oneandlab}"
STORAGE="$REMOTE_BASE/backend/storage"
sudo mkdir -p "$STORAGE/patient-booking-drafts"
sudo chown -R www-data:www-data "$STORAGE"
sudo chmod -R 775 "$STORAGE"
echo "OK: $STORAGE (www-data)"
