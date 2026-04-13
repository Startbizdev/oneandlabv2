#!/bin/bash
# Comptages MongoDB sur le serveur legacy
# Usage: ssh user@51.68.103.85 "cd /var/www/onl && mongosh oneandlab < scripts/migration/verify-legacy-counts.mongo"
# Ou en local sur le VPS: mongosh oneandlab < verify-legacy-counts.mongo

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_NAME="${MONGO_DB:-oneandlab}"

if command -v mongosh >/dev/null 2>&1; then
  mongosh "$DB_NAME" --quiet < "$SCRIPT_DIR/verify-legacy-counts.mongo"
elif command -v mongo >/dev/null 2>&1; then
  mongo "$DB_NAME" --quiet < "$SCRIPT_DIR/verify-legacy-counts.mongo"
else
  echo "mongosh ou mongo non trouvé. Exécutez manuellement:"
  echo "  mongosh $DB_NAME < $SCRIPT_DIR/verify-legacy-counts.mongo"
fi
