#!/usr/bin/env bash
# Build iOS + TestFlight (monorepo onev2).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
MOBILE_DIR="$REPO_ROOT/apps/mobile"

echo "→ Compte Expo :"
(cd "$MOBILE_DIR" && npx eas-cli whoami)

# EAS archive = racine git. Sans ces fichiers commités, le build cloud n’a pas le code mobile.
if ! git -C "$REPO_ROOT" ls-files --error-unmatch apps/mobile/package.json packages/shared-utils/package.json package.json >/dev/null 2>&1; then
  echo ""
  echo "❌ apps/mobile, packages/ et package.json doivent être commités dans git."
  echo "   (Sinon EAS n’envoie pas l’app → échec « Bundle JavaScript ».)"
  echo ""
  echo "   cd \"$REPO_ROOT\""
  echo "   git add package.json package-lock.json apps/mobile packages"
  echo "   git commit -m \"Add Cary mobile app for EAS builds\""
  echo "   cd apps/mobile && bash scripts/testflight-ios.sh"
  exit 1
fi

cd "$MOBILE_DIR"
echo "→ Build iOS production (cache vidé)…"
npx eas-cli build --platform ios --profile production --clear-cache

echo ""
echo "→ Soumission TestFlight…"
npx eas-cli submit --platform ios --profile production --latest

echo ""
echo "→ Suivi : https://expo.dev/accounts/startbiz/projects/cary-mobile/builds"
