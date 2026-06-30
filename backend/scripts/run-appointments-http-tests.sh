#!/bin/bash
set -euo pipefail
cd /var/www/oneandlab
php backend/scripts/test-appointments-http.php patient 'limit=20&patient_period=upcoming'
php backend/scripts/test-appointments-http.php nurse 'status=pending,confirmed,inProgress,planned,completed,canceled,refused&limit=20'
php backend/scripts/test-appointments-http.php nurse 'status=pending&limit=100&nurse_tab=soins&nurse_segment=en_attente'
