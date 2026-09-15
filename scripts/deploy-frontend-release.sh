#!/usr/bin/env bash
# Frontend-only release. API, runtime storage and database remain in place.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
git diff --quiet HEAD -- frontend || { echo 'Commit frontend changes first'; exit 1; }
KEY="${SSH_KEY:-$HOME/.ssh/oneandlab-key.pem}"
HOST="${SSH_HOST:-ubuntu@15.236.73.7}"
SSH=(-i "$KEY" -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=15)
SHA="$(git rev-parse HEAD)"
RELEASE="frontend-$(date -u +%Y%m%dT%H%M%SZ)-${SHA:0:12}"
STAGE="/var/lib/oneandlab-releases/$RELEASE"
if [[ "${DEPLOY_USE_VERIFIED_BUILD:-0}" != 1 ]]; then
  NUXT_PUBLIC_API_BASE=/api NUXT_API_INTERNAL_BASE=https://cary.bio/api npm run build --workspace=oneandlab-frontend
fi
[[ -f frontend/.output/server/index.mjs ]] || exit 1
ssh "${SSH[@]}" "$HOST" "test ! -e '$STAGE' && sudo mkdir -p '$STAGE' && sudo chown ubuntu:ubuntu '$STAGE'"
git archive HEAD frontend | ssh "${SSH[@]}" "$HOST" "tar -xf - -C '$STAGE'"
tar -C frontend -h -czf - .output | ssh "${SSH[@]}" "$HOST" "tar -xzf - -C '$STAGE/frontend'"
ssh "${SSH[@]}" "$HOST" bash -s -- "$STAGE" "$SHA" <<'REMOTE'
set -euo pipefail
stage="$1"; sha="$2"
[[ "$stage" =~ ^/var/lib/oneandlab-releases/frontend-[0-9]{8}T[0-9]{6}Z-[a-f0-9]{12}$ ]] || exit 1
[[ "$(readlink -f "$stage")" == "$stage" ]] || exit 1
target=/var/www/oneandlab/frontend
[[ -f "$target/.output/server/index.mjs" ]] || exit 1
node --check "$stage/frontend/.output/server/index.mjs"
cp -an "$target/.output/public/_nuxt/." "$stage/frontend/.output/public/_nuxt/"
moved=0
rollback() {
  trap - ERR
  if [[ "$moved" == 1 ]]; then
    if [[ -e "$target" ]]; then sudo mv "$target" "$stage/failed-frontend"; fi
    sudo mv "$stage/previous-frontend" "$target"
    pm2 restart oneandlab-frontend --update-env || true
  fi
  echo 'Frontend activation failed; previous frontend restored.' >&2
  exit 1
}
trap rollback ERR
sudo mv "$target" "$stage/previous-frontend"
moved=1
sudo mv "$stage/frontend" "$target"
NODE_ENV=production NUXT_PUBLIC_API_BASE=/api NUXT_API_INTERNAL_BASE=https://cary.bio/api pm2 restart oneandlab-frontend --update-env
curl --fail --silent --show-error --retry 8 --retry-connrefused --retry-delay 2 http://127.0.0.1:3000/ -o "$stage/home-check.html"
curl --fail --silent --show-error https://cary.bio/rendez-vous/nouveau -o "$stage/booking-check.html"
pm2 save
printf '%s\n' "$sha" > "$stage/deployed-commit.txt"
trap - ERR
echo "Frontend deployed: $sha; rollback files: $stage"
REMOTE
