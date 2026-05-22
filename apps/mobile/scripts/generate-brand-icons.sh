#!/usr/bin/env bash
# Génère uniquement les icônes app / favicons — ne modifie PAS logo-cary.png (logo horizontal).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${ROOT}/assets/cary-app-icon-source.png"
WEB="${ROOT}/../../frontend/public"

if [[ ! -f "$SRC" ]]; then
  echo "Source icône manquante : $SRC" >&2
  echo "Placez l’icône app (symbole) dans assets/cary-app-icon-source.png" >&2
  exit 1
fi

sips -z 1024 1024 "$SRC" --out "${ROOT}/assets/icon.png" >/dev/null
sips -z 1024 1024 "$SRC" --out "${ROOT}/assets/adaptive-icon.png" >/dev/null
sips -z 48 48 "$SRC" --out "${ROOT}/assets/favicon.png" >/dev/null

sips -z 32 32 "$SRC" --out "${WEB}/favicon-32x32.png" >/dev/null
sips -z 16 16 "$SRC" --out "${WEB}/favicon-16x16.png" >/dev/null
sips -z 180 180 "$SRC" --out "${WEB}/apple-touch-icon.png" >/dev/null
sips -z 192 192 "$SRC" --out "${WEB}/android-chrome-192x192.png" >/dev/null
sips -z 512 512 "$SRC" --out "${WEB}/android-chrome-512x512.png" >/dev/null
cp "${WEB}/favicon-32x32.png" "${WEB}/favicon.ico"

echo "Icônes app générées. logo-cary.png (splash / UI) n’a pas été modifié."
