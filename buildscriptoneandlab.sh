#!/bin/bash
# Sync menuswipe (buildscript) puis build + déploiement complet (buildlocaloneandlab).
# Usage : depuis la racine du repo -> ./buildscriptoneandlab.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> buildscriptoneandlab : étape 1/2 menuswipe..."
"$SCRIPT_DIR/buildscript.sh"

echo "==> buildscriptoneandlab : étape 2/2 build local + rsync + PM2..."
"$SCRIPT_DIR/buildlocaloneandlab.sh"

echo "✅ buildscriptoneandlab terminé."
