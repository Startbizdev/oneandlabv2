#!/bin/bash
# Sync menuswipe (buildscript) puis build + déploiement complet + migrations prod.
# Usage : depuis la racine du repo -> ./buildscriptoneandlab.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> buildscriptoneandlab : étape 1/3 menuswipe..."
"$SCRIPT_DIR/buildscript.sh"

echo "==> buildscriptoneandlab : étape 2/3 build local + rsync + PM2..."
"$SCRIPT_DIR/buildlocaloneandlab.sh"

echo "==> buildscriptoneandlab : étape 3/3 migrations prod (093–095)..."
"$SCRIPT_DIR/scripts/run-migration-pending-prod.sh"

echo "✅ buildscriptoneandlab terminé (déploiement + migrations)."
