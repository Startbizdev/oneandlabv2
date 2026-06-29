#!/bin/bash
# À exécuter sur le serveur (root ou sudo) : installe la tâche cron + lignes .env pour la clôture auto RDV.
# Usage : sudo bash /var/www/oneandlab/backend/cron/setup-server-cron.sh
# Ou depuis ta machine : INSTALL_AUTO_COMPLETE_CRON=1 ./buildlocaloneandlab.sh
set -euo pipefail

REMOTE_BASE="${REMOTE_BASE:-/var/www/oneandlab}"
CRON_NAME="oneandlab-auto-complete"
LOG_FILE="/var/log/oneandlab-auto-complete.log"
WWW_USER="${WWW_USER:-www-data}"

SUDO=()
if [[ "$(id -u)" -ne 0 ]]; then
  SUDO=(sudo)
fi

PHP_BIN="$(command -v php || true)"
if [[ -z "$PHP_BIN" ]]; then
  echo "Erreur : binaire php introuvable (PATH)." >&2
  exit 1
fi

SCRIPT_PATH="$REMOTE_BASE/backend/cron/auto-complete-appointments.php"
if [[ ! -f "$SCRIPT_PATH" ]]; then
  echo "Erreur : $SCRIPT_PATH introuvable. Déploie le backend avant." >&2
  exit 1
fi

CRON_FILE="/etc/cron.d/${CRON_NAME}"
"${SUDO[@]}" tee "$CRON_FILE" > /dev/null <<EOF
# Clôture auto RDV J+1 (fuseau Europe/Paris) — OneAndLab
SHELL=/bin/sh
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
TZ=Europe/Paris
5 0 * * * $WWW_USER $PHP_BIN $SCRIPT_PATH >> $LOG_FILE 2>&1
EOF
"${SUDO[@]}" chmod 644 "$CRON_FILE"

"${SUDO[@]}" touch "$LOG_FILE"
"${SUDO[@]}" chown "$WWW_USER:$WWW_USER" "$LOG_FILE"

ENV_FILE="$REMOTE_BASE/.env"
if [[ -f "$ENV_FILE" ]] && ! grep -q '^CRON_AUTO_COMPLETE_ACTOR_ID=' "$ENV_FILE"; then
  {
    echo ""
    echo "CRON_AUTO_COMPLETE_ACTOR_ID="
  } >> "$ENV_FILE"
  echo "CRON_AUTO_COMPLETE_ACTOR_ID= ajouté dans $ENV_FILE (vide = premier super_admin en base)."
fi

echo "OK : $CRON_FILE (00:05 Europe/Paris chaque jour, utilisateur $WWW_USER)."
echo "Test manuel : sudo -u $WWW_USER $PHP_BIN $SCRIPT_PATH"

REDISPATCH_SCRIPT="$REMOTE_BASE/backend/cron/redispatch-nurse-share-pending.php"
REDISPATCH_LOG="/var/log/oneandlab-nurse-share-redispatch.log"
REDISPATCH_CRON_NAME="oneandlab-nurse-share-redispatch"
if [[ -f "$REDISPATCH_SCRIPT" ]]; then
  CRON_FILE2="/etc/cron.d/${REDISPATCH_CRON_NAME}"
  "${SUDO[@]}" tee "$CRON_FILE2" > /dev/null <<EOF2
# Rediffusion zone après partage lien infirmier (pending + nurse_share_released_at) — OneAndLab
SHELL=/bin/sh
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
TZ=Europe/Paris
*/5 * * * * $WWW_USER $PHP_BIN $REDISPATCH_SCRIPT >> $REDISPATCH_LOG 2>&1
EOF2
  "${SUDO[@]}" chmod 644 "$CRON_FILE2"
  "${SUDO[@]}" touch "$REDISPATCH_LOG"
  "${SUDO[@]}" chown "$WWW_USER:$WWW_USER" "$REDISPATCH_LOG"
  echo "OK : $CRON_FILE2 (toutes les 5 min, utilisateur $WWW_USER)."
  echo "Test manuel : sudo -u $WWW_USER $PHP_BIN $REDISPATCH_SCRIPT"
else
  echo "Ignoré : $REDISPATCH_SCRIPT absent."
fi

if [[ -f "$ENV_FILE" ]] && ! grep -q '^NURSE_SHARE_REDISPATCH_MINUTES=' "$ENV_FILE"; then
  {
    echo ""
    echo "NURSE_SHARE_REDISPATCH_MINUTES=30"
  } >> "$ENV_FILE"
  echo "NURSE_SHARE_REDISPATCH_MINUTES=30 ajouté dans $ENV_FILE."
fi

EXPIRE_PENDING_SCRIPT="$REMOTE_BASE/backend/cron/expire-pending-offers.php"
EXPIRE_PENDING_LOG="/var/log/oneandlab-expire-pending-offers.log"
EXPIRE_PENDING_CRON_NAME="oneandlab-expire-pending-offers"
if [[ -f "$EXPIRE_PENDING_SCRIPT" ]]; then
  CRON_FILE4="/etc/cron.d/${EXPIRE_PENDING_CRON_NAME}"
  "${SUDO[@]}" tee "$CRON_FILE4" > /dev/null <<EOF4
# Expiration RDV pending non acceptés (TTL depuis created_at) — OneAndLab
SHELL=/bin/sh
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
TZ=Europe/Paris
*/10 * * * * $WWW_USER $PHP_BIN $EXPIRE_PENDING_SCRIPT >> $EXPIRE_PENDING_LOG 2>&1
EOF4
  "${SUDO[@]}" chmod 644 "$CRON_FILE4"
  "${SUDO[@]}" touch "$EXPIRE_PENDING_LOG"
  "${SUDO[@]}" chown "$WWW_USER:$WWW_USER" "$EXPIRE_PENDING_LOG"
  echo "OK : $CRON_FILE4 (toutes les 10 min, utilisateur $WWW_USER)."
  echo "Test manuel : sudo -u $WWW_USER $PHP_BIN $EXPIRE_PENDING_SCRIPT"
else
  echo "Ignoré : $EXPIRE_PENDING_SCRIPT absent."
fi

if [[ -f "$ENV_FILE" ]] && ! grep -q '^PENDING_OFFER_EXPIRY_HOURS=' "$ENV_FILE"; then
  {
    echo ""
    echo "PENDING_OFFER_EXPIRY_HOURS=2"
  } >> "$ENV_FILE"
  echo "PENDING_OFFER_EXPIRY_HOURS=2 ajouté dans $ENV_FILE."
fi

PRELEVEUR_PATIENT_NOTIFS_SCRIPT="$REMOTE_BASE/backend/scripts/send-preleveur-patient-notifications.php"
PRELEVEUR_PATIENT_NOTIFS_LOG="/var/log/oneandlab-preleveur-patient-notifications.log"
PRELEVEUR_PATIENT_NOTIFS_CRON_NAME="oneandlab-preleveur-patient-notifications"
if [[ -f "$PRELEVEUR_PATIENT_NOTIFS_SCRIPT" ]]; then
  CRON_FILE3="/etc/cron.d/${PRELEVEUR_PATIENT_NOTIFS_CRON_NAME}"
  "${SUDO[@]}" tee "$CRON_FILE3" > /dev/null <<EOF3
# Notifications patient trajet préleveur (en route / arrivé, Europe/Paris) — OneAndLab
SHELL=/bin/sh
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
TZ=Europe/Paris
*/2 * * * * $WWW_USER $PHP_BIN $PRELEVEUR_PATIENT_NOTIFS_SCRIPT >> $PRELEVEUR_PATIENT_NOTIFS_LOG 2>&1
EOF3
  "${SUDO[@]}" chmod 644 "$CRON_FILE3"
  "${SUDO[@]}" touch "$PRELEVEUR_PATIENT_NOTIFS_LOG"
  "${SUDO[@]}" chown "$WWW_USER:$WWW_USER" "$PRELEVEUR_PATIENT_NOTIFS_LOG"
  echo "OK : $CRON_FILE3 (toutes les 2 min, utilisateur $WWW_USER)."
  echo "Test manuel : sudo -u $WWW_USER $PHP_BIN $PRELEVEUR_PATIENT_NOTIFS_SCRIPT"
else
  echo "Ignoré : $PRELEVEUR_PATIENT_NOTIFS_SCRIPT absent."
fi
