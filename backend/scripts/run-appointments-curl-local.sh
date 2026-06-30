#!/bin/bash
set -eo pipefail
cd /var/www/oneandlab
TOKEN=$(php backend/scripts/_gen-patient-jwt.php)
echo "token_len=${#TOKEN}"
curl -sS -w "\nHTTP:%{http_code}\n" -H "Authorization: Bearer $TOKEN" "https://cary.bio/api/appointments?limit=20&patient_period=upcoming" | tail -8
