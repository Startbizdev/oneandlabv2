#!/bin/bash
# Migrations prod idempotentes après déploiement (093–109).
# Usage: ./scripts/run-migration-pending-prod.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SSH_KEY="${SSH_KEY:-$HOME/Desktop/oneandlab-key.pem}"
if [[ ! -f "$SSH_KEY" && -f "$HOME/.ssh/oneandlab-key.pem" ]]; then
  SSH_KEY="$HOME/.ssh/oneandlab-key.pem"
fi
SSH_HOST="${SSH_HOST:-ubuntu@15.236.73.7}"
REMOTE_BASE="/var/www/oneandlab"
SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 -i "$SSH_KEY")

if [[ ! -f "$SSH_KEY" ]]; then
  echo "❌ Clé SSH introuvable: $SSH_KEY"
  exit 1
fi

echo "==> Migrations prod (093–109) sur $SSH_HOST..."

echo "==> Copie des fichiers SQL (aucune donnée effacée)..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "mkdir -p $REMOTE_BASE/database/migrations"
tar -C "$REPO_ROOT/database/migrations" -czf - . \
  | ssh "${SSH_OPTS[@]}" "$SSH_HOST" "tar -xzf - -C $REMOTE_BASE/database/migrations"

echo "==> Vérification état actuel..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "cd $REMOTE_BASE/backend && php scripts/verify-migrations-prod-status.php" || true

echo "==> Migration 093 (passages infirmier)..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "cd $REMOTE_BASE/backend && php scripts/apply-migration-093.php"

echo "==> Migration 094 (notif en route)..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "cd $REMOTE_BASE/backend && php scripts/apply-migration-094.php"

echo "==> Migration 095 (constantes médicales)..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "cd $REMOTE_BASE/backend && php scripts/apply-migration-095.php"

echo "==> Migration 096 (absences patient)..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "cd $REMOTE_BASE/backend && php scripts/apply-migration-096.php"

echo "==> Migration 097 (snooze modal offres RDV)..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "cd $REMOTE_BASE/backend && php scripts/apply-migration-097.php"

echo "==> Migration 098 (tournée préleveur GPS)..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "cd $REMOTE_BASE/backend && php scripts/apply-migration-098.php"

echo "==> Migration 099 (index perf liste RDV admin)..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "cd $REMOTE_BASE/backend && php scripts/apply-migration-099.php"

echo "==> Migration 100 (journal dispatch admin)..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "cd $REMOTE_BASE/backend && php scripts/apply-migration-100.php"

echo "==> Migration 101 (marques labo + préférence patient)..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "cd $REMOTE_BASE/backend && php scripts/apply-migration-101.php"

echo "==> Migration 102 (Labio + Labo Sud)..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "cd $REMOTE_BASE/backend && php scripts/apply-migration-102.php"

echo "==> Migration 103 (zones carrées coverage)..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "cd $REMOTE_BASE/backend && php scripts/apply-migration-103.php"

echo "==> Migration 104 (zones polygone 6 sommets)..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "cd $REMOTE_BASE/backend && php scripts/apply-migration-104.php"

echo "==> Migration 105 (expiration offres pending soir)..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "cd $REMOTE_BASE/backend && php scripts/apply-migration-105.php"

echo "==> Migration 106 (conversation patient-staff)..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "cd $REMOTE_BASE/backend && php scripts/apply-migration-106.php"

echo "==> Migration 109 (type de plaie Lourd)..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "cd $REMOTE_BASE/backend && php scripts/apply-migration-109.php"

echo "==> Migration 116 (comptes labo par marque)..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "cd $REMOTE_BASE/backend && php scripts/apply-migration-116.php"

echo "==> Migration 117 (origine lab_assignment patients)..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "cd $REMOTE_BASE/backend && php scripts/apply-migration-117.php"

echo "==> Migration 118 (créneau journée entière)..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "cd $REMOTE_BASE/backend && php scripts/apply-migration-118.php"

echo "==> Migration 119 (absence patient sans date de fin)..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "cd $REMOTE_BASE/backend && php scripts/apply-migration-119.php"

echo "==> Migration 120 (soin coché)..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "cd $REMOTE_BASE/backend && php scripts/apply-migration-120.php"

echo "==> Migration 121 (téléphones supplémentaires patient)..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "cd $REMOTE_BASE/backend && php scripts/apply-migration-121.php"

echo "==> Migration 122 (transmissions de l'équipe soignante)..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "cd $REMOTE_BASE/backend && php scripts/apply-migration-122.php"

echo "==> Migration 124 (messages Cary)..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "cd $REMOTE_BASE/backend && php scripts/apply-migration-124.php"

echo "==> Migration 125 (contexte des conversations Cary)..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "cd $REMOTE_BASE/backend && php scripts/apply-migration-125.php"

echo "==> Migration 126 (dossier patient des proches + backfill)..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "cd $REMOTE_BASE/backend && php scripts/apply-migration-126.php"

echo "==> Migration 127 (binôme infirmier)..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "cd $REMOTE_BASE/backend && php scripts/apply-migration-127.php"

echo "==> Migration 128 (archive d'ordonnance remplacée)..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "cd $REMOTE_BASE/backend && php scripts/apply-migration-128.php"

echo "==> Vérification finale..."
ssh "${SSH_OPTS[@]}" "$SSH_HOST" "cd $REMOTE_BASE/backend && php scripts/verify-migrations-prod-status.php"

echo "✅ Migrations prod à jour."
