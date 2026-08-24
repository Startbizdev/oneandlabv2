#!/bin/bash
set -euo pipefail
cd /var/www/oneandlab/data
tar czf - legacy-uploads legacy-export.json migration-report.json 2>/dev/null || tar czf - legacy-uploads
