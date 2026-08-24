#!/bin/bash
set -euo pipefail
find /tmp -maxdepth 1 -name 'cary_ocr_*' -delete 2>/dev/null || true
sudo find /tmp -maxdepth 1 -name 'cary_ocr_*' -delete 2>/dev/null || true
(crontab -l 2>/dev/null | grep -v cary_ocr_ || true
 echo '17 4 * * * find /tmp -maxdepth 1 -name "cary_ocr_*" -mtime +1 -delete 2>/dev/null') | crontab -
echo "OCR remaining: $(find /tmp -maxdepth 1 -name 'cary_ocr_*' 2>/dev/null | wc -l)"
crontab -l | grep cary || true
