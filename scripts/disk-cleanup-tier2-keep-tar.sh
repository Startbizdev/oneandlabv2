#!/bin/bash
set -euo pipefail
echo "=== TIER 2 — remove legacy (keep server tar until PC download verified) ==="
LEGACY="/var/www/oneandlab/data/legacy-uploads"
if [[ -d "$LEGACY" ]]; then
  echo "Removing $LEGACY ($(du -sh "$LEGACY" | cut -f1))..."
  rm -rf "$LEGACY"
fi
rm -f /var/www/oneandlab/data/legacy-export.json /var/www/oneandlab/data/migration-report.json
echo "Server archive kept: /home/ubuntu/legacy-backup-20260823.tar.gz ($(du -sh /home/ubuntu/legacy-backup-20260823.tar.gz 2>/dev/null | cut -f1 || echo missing))"
echo "DISK: $(df -h / | tail -1)"
