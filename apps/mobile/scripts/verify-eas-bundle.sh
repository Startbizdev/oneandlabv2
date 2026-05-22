#!/usr/bin/env bash
# Simule l’install EAS (sans frontend/) puis bundle iOS — à lancer avant eas build.
set -euo pipefail
REPO="$(cd "$(dirname "$0")/../../.." && pwd)"
TMP="${TMPDIR:-/tmp}/cary-eas-verify-$$"
trap 'rm -rf "$TMP"' EXIT

echo "→ Copie minimale (comme .easignore)…"
mkdir -p "$TMP"
cp "$REPO/package.json" "$REPO/package-lock.json" "$TMP/"
cp -R "$REPO/apps" "$REPO/packages" "$TMP/"

echo "→ npm ci --workspace=@oneandlab/mobile (comme EAS)…"
(cd "$TMP" && npm ci --workspace=@oneandlab/mobile --include-workspace-root --silent)

echo "→ Bundle iOS…"
(cd "$TMP/apps/mobile" && npx expo export --platform ios)

echo "✓ Bundle OK — tu peux lancer eas build."
