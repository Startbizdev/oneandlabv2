#!/usr/bin/env bash
# Build locally, back up the database, apply only additive migrations, activate with rollback.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec bash "$SCRIPT_DIR/scripts/deploy-safe-release.sh"
