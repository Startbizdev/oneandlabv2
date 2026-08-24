#!/bin/bash
set -euo pipefail
echo "=== TIER 2 — remove legacy ==="
LEGACY="/var/www/oneandlab/data/legacy-uploads"
if [[ -d "$LEGACY" ]]; then
  du -sh "$LEGACY"
  rm -rf "$LEGACY"
fi
rm -f /var/www/oneandlab/data/legacy-export.json /var/www/oneandlab/data/migration-report.json
rm -f /home/ubuntu/legacy-backup-20260823.tar.gz
echo "DISK FINAL: $(df -h / | tail -1)"
curl -s -o /dev/null -w "api: HTTP %{http_code}\n" https://cary.bio/api/app/version
