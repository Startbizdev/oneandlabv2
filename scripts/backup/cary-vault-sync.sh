#!/usr/bin/env bash
# Copie des secrets du serveur dans le coffre-fort AWS (SSM Parameter Store, SecureString, /cary/prod/*).
# Appelé chaque nuit par cary-backup ; n'écrit que si un secret a changé. Le serveur peut déposer, pas relire.
set -euo pipefail

APP_BASE="${APP_BASE:-/var/www/oneandlab}"
ENV_FILE="$APP_BASE/.env"
BACKUP_KEY_FILE="${BACKUP_KEY_FILE:-/root/.cary-backup.key}"
APPLE_KEY_FILE="${APPLE_KEY_FILE:-$APP_BASE/persistent/keys/apple-iap.p8}"
STATE_FILE="${STATE_FILE:-/root/.cary-vault.sha256}"
export AWS_DEFAULT_REGION="${AWS_REGION:-eu-west-3}"

log() { echo "[$(date -u +%FT%TZ)] $*"; }

current="$(cat "$ENV_FILE" "$BACKUP_KEY_FILE" "$APPLE_KEY_FILE" 2>/dev/null | sha256sum | cut -d' ' -f1)"
if [[ -f "$STATE_FILE" && "$(cat "$STATE_FILE")" == "$current" ]]; then
  log "Coffre-fort à jour"; exit 0
fi

umask 077
tmp="$(mktemp -d)"
trap 'shred -u "$tmp"/* 2>/dev/null; rm -rf "$tmp"' EXIT

put() {
  aws ssm put-parameter --name "/cary/prod/$1" --type SecureString --tier Standard --overwrite \
    --value "file://$2" --description "$3" >/dev/null
}
env_value() {
  grep -E "^$1=" "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '\n' > "$tmp/$1"
  [[ -s "$tmp/$1" ]]
}

put backup-key "$BACKUP_KEY_FILE" "Cle de chiffrement des sauvegardes"
env_value BACKEND_KEK_HEX && put backend-kek "$tmp/BACKEND_KEK_HEX" "Cle maitresse de chiffrement des donnees"
env_value LEGACY_ENCRYPTION_KEY && put legacy-encryption-key "$tmp/LEGACY_ENCRYPTION_KEY" "Ancienne cle de chiffrement (lecture des donnees anciennes)"
env_value JWT_SECRET && put jwt-secret "$tmp/JWT_SECRET" "Cle de signature des sessions"
[[ -f "$APPLE_KEY_FILE" ]] && put apple-iap-p8 "$APPLE_KEY_FILE" "Cle Apple achats integres"

# .env complet en deux morceaux (limite de 4 Ko du niveau gratuit).
lines="$(wc -l < "$ENV_FILE")"; half=$(( (lines + 1) / 2 ))
head -n "$half" "$ENV_FILE" > "$tmp/env1"
tail -n +"$((half + 1))" "$ENV_FILE" > "$tmp/env2"
put env-part1 "$tmp/env1" "Configuration serveur .env (partie 1/2)"
put env-part2 "$tmp/env2" "Configuration serveur .env (partie 2/2)"

echo "$current" > "$STATE_FILE"
log "Coffre-fort mis à jour"
