#!/usr/bin/env bash
# Nettoyage complet Metro / Expo / caches natifs (avant rebuild)
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
MONOREPO_ROOT="$(cd ../.. && pwd)"

echo "→ Arrêt des processus Metro / Expo…"
pkill -f "expo start" 2>/dev/null || true
pkill -f "metro" 2>/dev/null || true
pkill -f "@expo/cli" 2>/dev/null || true

echo "→ Caches Expo / Metro / React Native…"
rm -rf .expo
rm -rf node_modules/.cache
rm -rf "${TMPDIR:-/tmp}"/metro-* 2>/dev/null || true
rm -rf "${TMPDIR:-/tmp}"/haste-map-* 2>/dev/null || true
rm -rf "${TMPDIR:-/tmp}"/react-* 2>/dev/null || true

if command -v watchman >/dev/null 2>&1; then
  echo "→ watchman watch-del-all…"
  watchman watch-del-all 2>/dev/null || true
fi

if [[ -d ios/build ]]; then
  echo "→ ios/build…"
  rm -rf ios/build
fi

if [[ -d ios/Pods ]]; then
  echo "→ ios/Pods (sera régénéré par pod install / prebuild)…"
  rm -rf ios/Pods
  rm -f ios/Podfile.lock
fi

if [[ -d android ]]; then
  echo "→ android build caches…"
  rm -rf android/build android/app/build android/.gradle 2>/dev/null || true
fi

# Cache npm workspaces (optionnel, léger)
if [[ -d "$MONOREPO_ROOT/node_modules/.cache" ]]; then
  rm -rf "$MONOREPO_ROOT/node_modules/.cache"
fi

echo "✔ Nettoyage terminé."
echo "  Ensuite : npm run prebuild:ios:clean && npm run ios:dev-build"
echo "  Ou dev client : npm run start:clean"
