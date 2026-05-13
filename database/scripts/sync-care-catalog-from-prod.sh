#!/usr/bin/env bash
# Synchronise le catalogue de soins (care_categories + care_category_options) depuis la prod
# (MySQL sur l’EC2 du script buildlocaloneandlab.sh, .env /var/www/oneandlab/.env) vers la base locale
# (DB_* dans le .env à la racine du dépôt).
#
# Nettoie les FK : préférences catégories, options, catégories, puis remet category_id à NULL sur les RDV.
#
# Usage :
#   chmod +x database/scripts/sync-care-catalog-from-prod.sh
#   ./database/scripts/sync-care-catalog-from-prod.sh
#
# Optionnel : SSH_KEY, SSH_HOST, REMOTE_ENV, LOCAL_ENV
#
set -euo pipefail

SSH_KEY="${SSH_KEY:-$HOME/Desktop/oneandlab-key.pem}"
SSH_HOST="${SSH_HOST:-ubuntu@ec2-15-188-11-249.eu-west-3.compute.amazonaws.com}"
REMOTE_ENV="${REMOTE_ENV:-/var/www/oneandlab/.env}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOCAL_ENV="${LOCAL_ENV:-$REPO_ROOT/.env}"

if [[ ! -f "$SSH_KEY" ]]; then
  echo "Cle SSH introuvable: $SSH_KEY (definir SSH_KEY=...)" >&2
  exit 1
fi
if [[ ! -f "$LOCAL_ENV" ]]; then
  echo "Fichier .env local introuvable: $LOCAL_ENV" >&2
  exit 1
fi

set -a
# shellcheck source=/dev/null
source "$LOCAL_ENV"
set +a

LDB="$DB_NAME"
LHOST="${DB_HOST:-127.0.0.1}"
LPORT="${DB_PORT:-3306}"
LUSER="$DB_USER"
LPASS="${DB_PASS:-}"

dump_file="$(mktemp /tmp/oneandlab-care-catalog.XXXXXX.sql)"
cleanup() { rm -f "$dump_file"; }
trap cleanup EXIT

echo "==> Export catalogue depuis $SSH_HOST (prod)..."
# Heredoc entre guillemets : tout s’execute sur la machine distante ; REMOTE_ENV injecte depuis le shell local.
ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=20 -i "$SSH_KEY" "$SSH_HOST" \
  "REMOTE_ENV='$REMOTE_ENV' bash -s" <<'REMOTE_SCRIPT' >"$dump_file"
set -euo pipefail
if [[ ! -f "$REMOTE_ENV" ]]; then
  echo "REMOTE: .env introuvable: $REMOTE_ENV" >&2
  exit 1
fi
set -a
# shellcheck source=/dev/null
source "$REMOTE_ENV"
set +a
H="${DB_HOST:-127.0.0.1}"
P="${DB_PORT:-3306}"
U="$DB_USER"
D="$DB_NAME"
export MYSQL_PWD="$DB_PASS"
has_opts=0
if mysql --default-character-set=utf8mb4 -h"$H" -P"$P" -u"$U" "$D" -N -e "SHOW TABLES LIKE 'care_category_options'" | grep -q .; then
  has_opts=1
fi
dump_opts=( --single-transaction --skip-comments --no-tablespaces --routines=false --triggers=false --default-character-set=utf8mb4 )
if mysqldump --help 2>&1 | grep -q 'set-gtid-purged'; then
  dump_opts+=( --set-gtid-purged=OFF )
fi
if [[ "$has_opts" -eq 1 ]]; then
  mysqldump -h"$H" -P"$P" -u"$U" "$D" "${dump_opts[@]}" care_categories care_category_options
else
  mysqldump -h"$H" -P"$P" -u"$U" "$D" "${dump_opts[@]}" care_categories
fi
REMOTE_SCRIPT

if [[ ! -s "$dump_file" ]]; then
  echo "Export vide ou echoue." >&2
  exit 1
fi

echo "==> Nettoyage + import dans $LDB @ $LHOST (local)..."
export MYSQL_PWD="$LPASS"
mysql --default-character-set=utf8mb4 -h"$LHOST" -P"$LPORT" -u"$LUSER" "$LDB" <<'SQL'
SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM nurse_category_preferences;
DELETE FROM lab_category_preferences;
SET @db = DATABASE();
SET @sql = (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.tables
     WHERE table_schema = @db AND table_name = 'appointment_blood_test_items') > 0,
    'DELETE FROM appointment_blood_test_items',
    'SELECT 1'
  )
);
PREPARE _abti FROM @sql;
EXECUTE _abti;
DEALLOCATE PREPARE _abti;
SET @sql2 = (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.tables
     WHERE table_schema = @db AND table_name = 'care_category_options') > 0,
    'DELETE FROM care_category_options',
    'SELECT 1'
  )
);
PREPARE _cco FROM @sql2;
EXECUTE _cco;
DEALLOCATE PREPARE _cco;
DELETE FROM care_categories;
UPDATE appointments SET category_id = NULL WHERE category_id IS NOT NULL;
SET FOREIGN_KEY_CHECKS = 1;
SQL

mysql --default-character-set=utf8mb4 -h"$LHOST" -P"$LPORT" -u"$LUSER" "$LDB" <"$dump_file"

echo "==> OK. Résumé :"
mysql --default-character-set=utf8mb4 -h"$LHOST" -P"$LPORT" -u"$LUSER" "$LDB" -e \
  "SELECT 'care_categories' AS t, COUNT(*) AS n, SUM(is_active) AS actifs FROM care_categories
   UNION ALL
   SELECT 'care_category_options', COUNT(*), NULL FROM care_category_options;" 2>/dev/null \
  || mysql --default-character-set=utf8mb4 -h"$LHOST" -P"$LPORT" -u"$LUSER" "$LDB" -e \
  "SELECT COUNT(*) AS care_categories FROM care_categories;"

echo ""
echo "Note : préférences lab/infirmier sur les catégories ont été supprimées en local ; à reconfigurer si besoin."
echo "Les RDV existants n’ont plus de category_id (évite les UUID obsolètes)."
