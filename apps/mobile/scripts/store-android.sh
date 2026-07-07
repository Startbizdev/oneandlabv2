#!/usr/bin/env bash
# Build Android production + soumission Play Store (--auto-submit, monorepo onev2).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
MOBILE_DIR="$REPO_ROOT/apps/mobile"

echo "→ Compte Expo :"
(cd "$MOBILE_DIR" && npx eas-cli whoami)

if ! git -C "$REPO_ROOT" ls-files --error-unmatch apps/mobile/package.json packages/shared-utils/package.json package.json >/dev/null 2>&1; then
  echo ""
  echo "❌ apps/mobile, packages/ et package.json doivent être commités dans git."
  exit 1
fi

cd "$MOBILE_DIR"
echo "→ Build Android production + soumission Play (auto-submit)…"
node scripts/run-eas-android.cjs build --platform android --profile production --clear-cache --auto-submit

echo ""
echo "→ Suivi : https://expo.dev/accounts/startbiz/projects/cary-mobile/builds"
