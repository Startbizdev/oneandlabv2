#!/bin/bash
set -euo pipefail
ARCHIVE="/home/ubuntu/legacy-backup-20260823.tar.gz"
echo "Creating archive on server..."
cd /var/www/oneandlab/data
tar czf "$ARCHIVE" legacy-uploads legacy-export.json migration-report.json 2>/dev/null || tar czf "$ARCHIVE" legacy-uploads
ls -lh "$ARCHIVE"
sha256sum "$ARCHIVE"
