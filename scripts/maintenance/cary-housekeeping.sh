#!/usr/bin/env bash
# Nettoyage hebdomadaire du serveur Cary (root, via /etc/cron.d/cary-maintenance).
# Ne touche jamais aux données : documents (S3), base, uploads, sauvegardes quotidiennes.
set -euo pipefail

RELEASES_DIR="${RELEASES_DIR:-/var/lib/oneandlab-releases}"
DEPLOY_BACKUPS_DIR="${DEPLOY_BACKUPS_DIR:-/home/ubuntu/deploy-backups}"
APP_BASE="${APP_BASE:-/var/www/oneandlab}"
KEEP_RELEASES="${KEEP_RELEASES:-3}"
KEEP_FRONTEND_RELEASES="${KEEP_FRONTEND_RELEASES:-2}"
KEEP_DEPLOY_BACKUPS="${KEEP_DEPLOY_BACKUPS:-3}"
APP_LOG_DAYS="${APP_LOG_DAYS:-365}"

log() { echo "[$(date -u +%FT%TZ)] $*"; }

# Dossiers encore pointés par un lien depuis l'application : jamais supprimés.
in_use() {
  find "$APP_BASE" -maxdepth 4 -type l -printf '%l\n' 2>/dev/null | grep -q -- "$1"
}

# Garde les $2 plus récents dossiers de $1 correspondant au motif $3 (noms horodatés, tri lexical = chronologique).
prune_dirs() {
  local dir="$1" keep="$2" pattern="$3" name
  [[ -d "$dir" ]] || return 0
  mapfile -t old < <(find "$dir" -mindepth 1 -maxdepth 1 -type d -regextype posix-extended -regex "$pattern" -printf '%f\n' | sort -r | tail -n +$((keep + 1)))
  for name in "${old[@]}"; do
    if in_use "$dir/$name"; then log "Conservé (utilisé) : $dir/$name"; continue; fi
    rm -rf --one-file-system -- "${dir:?}/$name"
    log "Supprimé : $dir/$name"
  done
}

before="$(df --output=used -B1M / | tail -1)"
prune_dirs "$RELEASES_DIR" "$KEEP_RELEASES" '.*/[0-9]{8}T[0-9]{6}Z-[a-f0-9]{12}'
prune_dirs "$RELEASES_DIR" "$KEEP_FRONTEND_RELEASES" '.*/frontend-[0-9]{8}T[0-9]{6}Z-[a-f0-9]{12}'
prune_dirs "$DEPLOY_BACKUPS_DIR" "$KEEP_DEPLOY_BACKUPS" '.*/[0-9]{8}T[0-9]{6}Z-[a-zA-Z0-9]{12}'

# Journaux techniques : 6 mois à 1 an (recommandation CNIL).
for logs in "$APP_BASE/persistent/logs" "$APP_BASE/backend/logs"; do
  [[ -d "$logs" ]] || continue
  find "$logs" -type f -name '*.log.[0-9]*' ! -name '*.gz' -mtime +1 -exec gzip -9 {} \;
  find "$logs" -type f -name '*.gz' -mtime +"$APP_LOG_DAYS" -delete
done
journalctl --vacuum-size=200M >/dev/null 2>&1 || true

# Paquets : cache apt et anciennes révisions snap désactivées.
apt-get clean
snap list --all 2>/dev/null | awk '/disabled/ {print $1, $3}' | while read -r snapname revision; do
  snap remove "$snapname" --revision="$revision" >/dev/null 2>&1 && log "Snap retiré : $snapname rév. $revision"
done

after="$(df --output=used -B1M / | tail -1)"
log "Nettoyage terminé : $(( before - after )) Mo libérés, disque $(df -h / | awk 'NR==2 {print $5}') utilisé"
