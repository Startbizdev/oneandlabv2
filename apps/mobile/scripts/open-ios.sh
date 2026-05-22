#!/usr/bin/env bash
# Lance Metro + ouvre l'app dans le simulateur iOS (Expo Go).
set -euo pipefail
cd "$(dirname "$0")/.."

XCODE_DEV="/Applications/Xcode.app/Contents/Developer"

check_xcode() {
  if ! command -v xcrun >/dev/null 2>&1; then
    echo "❌ xcrun introuvable. Installez Xcode depuis l’App Store."
    exit 1
  fi

  if ! xcrun simctl help >/dev/null 2>&1; then
    local current
    current="$(xcode-select -p 2>/dev/null || echo 'inconnu')"
    echo ""
    echo "❌ Le simulateur iOS n’est pas disponible (simctl — code 72)."
    echo ""
    echo "   Chemin actuel : $current"
    echo "   Attendu       : $XCODE_DEV"
    echo ""
    if [[ -d "$XCODE_DEV" ]]; then
      echo "   Xcode est installé. Exécutez dans le Terminal :"
      echo ""
      echo "     sudo xcode-select -s $XCODE_DEV"
      echo "     sudo xcodebuild -license accept"
      echo ""
      echo "   Puis ouvrez Xcode une fois, et relancez : npm run ios"
    else
      echo "   Installez Xcode depuis l’App Store, puis :"
      echo "     sudo xcode-select -s $XCODE_DEV"
    fi
    echo ""
    exit 1
  fi
}

check_xcode

# Démarre l'app Simulator si aucun appareil n'est booté
if ! xcrun simctl list devices booted 2>/dev/null | grep -q "(Booted)"; then
  echo "→ Ouverture du simulateur iOS…"
  open -a Simulator
  for _ in $(seq 1 30); do
    if xcrun simctl list devices booted 2>/dev/null | grep -q "(Booted)"; then
      break
    fi
    sleep 1
  done
fi

echo "→ Metro (cache vidé) + Expo Go…"
exec npx expo start --ios --go -c "$@"
