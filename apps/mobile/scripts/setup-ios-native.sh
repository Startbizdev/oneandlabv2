#!/usr/bin/env bash
# Prérequis build natif iOS (expo run:ios)
set -euo pipefail
cd "$(dirname "$0")/.."

XCODE_DEV="/Applications/Xcode.app/Contents/Developer"

if ! xcrun simctl help >/dev/null 2>&1; then
  echo "❌ Xcode / simulateur indisponible. Exécutez :"
  echo "   sudo xcode-select -s $XCODE_DEV"
  exit 1
fi

if ! command -v pod >/dev/null 2>&1; then
  echo "→ Installation de CocoaPods (Homebrew)…"
  brew install cocoapods
fi

if [[ ! -d ios ]]; then
  echo "→ Prebuild iOS…"
  npx expo prebuild --platform ios
fi

echo "→ pod install…"
cd ios && pod install && cd ..

echo "✔ Prêt. Lancez : npm run ios:dev-build"
