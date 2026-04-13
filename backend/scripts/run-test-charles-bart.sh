#!/bin/bash
# Lance le test flux Charle Barth (création compte + test)
# Usage: ./scripts/run-test-charles-bart.sh [email]
# Depuis: backend/ (cd backend && ./scripts/run-test-charles-bart.sh)

cd "$(dirname "$0")/.."
php scripts/create-charle-bart.php
php scripts/test-charles-bart-flow.php "$@"
