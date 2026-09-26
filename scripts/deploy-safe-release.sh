#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
KEY="${SSH_KEY:-$HOME/.ssh/oneandlab-key.pem}"
HOST="${SSH_HOST:-ubuntu@15.236.73.7}"
SSH=(-i "$KEY" -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=15)
[[ -f "$KEY" ]] || { echo 'SSH key missing'; exit 1; }
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || { echo 'Commit tracked changes before deployment'; exit 1; }
SHA="$(git rev-parse HEAD)"
RELEASE="$(date -u +%Y%m%dT%H%M%SZ)-${SHA:0:12}"
STAGE="/var/lib/oneandlab-releases/$RELEASE"
BACKUP="${DEPLOY_VERIFIED_BACKUP:-/home/ubuntu/deploy-backups/$RELEASE}"
[[ "$BACKUP" =~ ^/home/ubuntu/deploy-backups/[a-zA-Z0-9_-]+$ ]] || exit 1
if [[ "${DEPLOY_USE_VERIFIED_BUILD:-0}" != 1 ]]; then
  NUXT_PUBLIC_API_BASE=/api NUXT_API_INTERNAL_BASE=https://cary.bio/api npm run build --workspace=oneandlab-frontend
fi
[[ -f frontend/.output/server/index.mjs ]] || exit 1
echo "Preparing release $RELEASE"
ssh "${SSH[@]}" "$HOST" "test ! -e '$STAGE' && sudo mkdir -p '$STAGE' && sudo chown ubuntu:ubuntu '$STAGE'"
git archive HEAD backend/api backend/config backend/lib backend/middleware backend/models backend/cron backend/assets backend/scripts backend/index.php backend/.htaccess backend/composer.json frontend database scripts/deploy-database-safety.php scripts/activate-safe-release.sh scripts/ensure-backend-runtime-links.sh |
  ssh "${SSH[@]}" "$HOST" "tar -xf - -C '$STAGE'"
tar -C frontend -h -czf - .output |
  ssh "${SSH[@]}" "$HOST" "tar -xzf - -C '$STAGE/frontend'"
if [[ -z "${DEPLOY_VERIFIED_BACKUP:-}" ]]; then
  ssh "${SSH[@]}" "$HOST" "php '$STAGE/scripts/deploy-database-safety.php' backup '$BACKUP'"
fi
ssh "${SSH[@]}" "$HOST" "bash '$STAGE/scripts/activate-safe-release.sh' '$RELEASE' '$BACKUP' '$SHA'"
echo "Deployment complete: $SHA; rollback files: $STAGE"
