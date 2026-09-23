#!/usr/bin/env bash
# Migration 110 — module commandes pharmacie (prod / staging)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT/backend"
php scripts/apply-migration-110-pharmacy-orders.php
php scripts/verify-pharmacy-module.php
