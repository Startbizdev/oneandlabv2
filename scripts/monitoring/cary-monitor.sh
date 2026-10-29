#!/usr/bin/env bash
# Supervision Cary (root, toutes les 5 minutes via /etc/cron.d/cary-monitor).
# Vérifie site, API, disque, mémoire, services, sauvegarde de la nuit et test de restauration.
# Alerte par e-mail à la première détection (puis au plus une fois par heure), et message de retour à la normale.
set -uo pipefail

APP_BASE="${APP_BASE:-/var/www/oneandlab}"
STATE_DIR="${STATE_DIR:-/var/lib/cary-monitor}"
SITE_URL="${SITE_URL:-https://cary.bio}"
DISK_MAX="${DISK_MAX:-85}"
MEM_MIN_MB="${MEM_MIN_MB:-150}"
BACKUP_MAX_HOURS="${BACKUP_MAX_HOURS:-26}"
REPEAT_MINUTES="${REPEAT_MINUTES:-60}"
ALERT="${ALERT:-/usr/local/sbin/cary-alert.php}"

mkdir -p "$STATE_DIR"
log() { echo "[$(date -u +%FT%TZ)] $*"; }

alert() {
  local key="$1" subject="$2" detail="$3" state="$STATE_DIR/$key"
  if [[ -f "$state" && $(( $(date +%s) - $(stat -c %Y "$state") )) -lt $(( REPEAT_MINUTES * 60 )) ]]; then
    return
  fi
  touch "$state"
  log "ALERTE $key : $detail"
  php "$ALERT" "$subject" "$detail" "Serveur : $(hostname) — $(date '+%d/%m/%Y %H:%M')" >/dev/null 2>&1 || log "Envoi de l'alerte impossible"
}

resolved() {
  local key="$1" subject="$2" state="$STATE_DIR/$key"
  [[ -f "$state" ]] || return 0
  rm -f "$state"
  log "RÉTABLI $key"
  php "$ALERT" "Rétabli : $subject" "Le problème n'est plus détecté." >/dev/null 2>&1 || true
}

check() {
  local key="$1" subject="$2" detail="$3"; shift 3
  if "$@"; then resolved "$key" "$subject"; else alert "$key" "$subject" "$detail"; fi
}

http_ok() { [[ "$(curl -s -o /dev/null -m 15 -w '%{http_code}' "$1")" == "200" ]]; }
disk_ok() { (( $(df --output=pcent / | tail -1 | tr -dc 0-9) < DISK_MAX )); }
mem_ok() { (( $(awk '/MemAvailable/ {print int($2/1024)}' /proc/meminfo) > MEM_MIN_MB )); }
service_ok() { systemctl is-active --quiet "$1"; }
pm2_ok() { local pid; pid="$(sudo -u ubuntu pm2 pid oneandlab-frontend 2>/dev/null | tail -1)"; [[ "$pid" =~ ^[0-9]+$ && "$pid" != 0 ]]; }
backup_ok() {
  local latest
  latest="$(ls -1t /var/backups/oneandlab/daily/*.sql.zst.enc 2>/dev/null | head -1)"
  [[ -n "$latest" ]] && (( $(date +%s) - $(stat -c %Y "$latest") < BACKUP_MAX_HOURS * 3600 ))
}
restore_test_ok() {
  local logf=/var/log/cary-restore-test.log
  [[ ! -s "$logf" ]] || ! tail -n 3 "$logf" | grep -q 'ÉCHOUÉ'
}

check site "Site cary.bio inaccessible" "La page d'accueil ne répond pas (HTTP différent de 200)." http_ok "$SITE_URL/"
check api "API inaccessible" "L'API ne répond pas (HTTP différent de 200)." http_ok "$SITE_URL/api/app/version"
check disk "Disque presque plein" "Disque utilisé au-delà de ${DISK_MAX} % ($(df -h / | awk 'NR==2 {print $5}'))." disk_ok
check memory "Mémoire insuffisante" "Moins de ${MEM_MIN_MB} Mo de mémoire disponible." mem_ok
check mysql "Base de données arrêtée" "Le service MySQL n'est pas actif." service_ok mysql
check php "PHP arrêté" "Le service PHP-FPM n'est pas actif." service_ok php8.2-fpm
check nginx "Nginx arrêté" "Le service Nginx n'est pas actif." service_ok nginx
check frontend "Site web (Node) arrêté" "Le processus PM2 oneandlab-frontend n'est pas en ligne." pm2_ok
check backup "Sauvegarde manquante" "Aucune sauvegarde de la base depuis plus de ${BACKUP_MAX_HOURS} h." backup_ok
check restore "Test de restauration en échec" "Le dernier test de restauration de la sauvegarde a échoué (voir /var/log/cary-restore-test.log)." restore_test_ok
exit 0
