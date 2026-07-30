#!/usr/bin/env bash
set -euo pipefail
html=$(curl -sS 'https://cary.bio/rendez-vous/nouveau')
echo "$html" | grep -oE '/_nuxt/[A-Za-z0-9_-]+\.(js|css)' | sort -u | while read -r f; do
  code=$(curl -sS -o /dev/null -w '%{http_code}' "https://cary.bio${f}")
  if [ "$code" != "200" ]; then
    echo "FAIL $code $f"
  fi
done
echo "Done checking chunks from rendez-vous/nouveau"
