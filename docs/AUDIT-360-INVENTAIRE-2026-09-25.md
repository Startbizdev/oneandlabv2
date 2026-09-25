# AUDIT-360 — Inventaire Cary (sources primaires)

**Date mesure :** 2026-09-25  
**Méthode :** glob filesystem + `node scripts/audit-ui-surface.mjs` + lecture `backend/api/**` + SSH prod (nginx). Les anciens MD sous `docs/` ne servent **pas** de spec.

## Comptages monorepo

| Zone | Mesure |
|------|--------|
| `backend/api/**/index.php` | **80** (dont `backend/api/index.php` + 79 routes métier) |
| `backend/lib/**/*.php` | **188** |
| `backend/models/*.php` | **7** |
| `backend/cron/*.php` | **9** |
| `backend/tests/**/*.php` | **97** (fichiers PHP) |
| `frontend/pages/**/*.vue` | **139** (`audit-ui-surface` : **140** pages — inclut index racine) |
| `frontend/components/**/*.vue` | **163** |
| `frontend/e2e/*.spec.ts` | **46** |
| `apps/mobile/app/**/*.tsx` | **143** routes |
| `apps/mobile/src/**/*.tsx` | **449** composants TSX (`audit-ui-surface`) |
| `apps/mobile/src/features/*` | **32** dossiers feature |
| `database/migrations/*` | **122** fichiers SQL |
| `scripts/` (fichiers) | **69** |

## Mobile — features (`apps/mobile/src/features/`)

address, ai-hub, appointments, app-update, auth, calendar, categories, documents, health-record, health-sync, help, lab-results, legal, navigation, notifications, nurse, nurse-passage, onboarding, patient, patient-absence, patient-relatives, patients, pharmacy-orders, prescriptions, pro, profile, qr, reviews, settings, tournee, tournee-nurse, tournee-preleveur

## Catalogue API (80 entrées `index.php`)

Liste générée par scan dépôt le 2026-09-25 :

- admin : ai/routing, ai/settings, ai/usage, dispatch, dispatch/[id], lab-brands, pharmacy-module/config, pharmacy-orders/stats, qr, stats, subscriptions
- ai : booking/drafts, conversations, export, feedback, search, signals, trends, voice/realtime, voice/sessions
- app/version, appointments, availability-settings, categories, contact, coverage-zones
- health : devices, metrics, sources, syncs
- health-record : answers, completion, export, recap, schema
- iap/subscription, incidents, lab/preleveurs, lab/stats, lab/subaccounts, lab-category-preferences, lab-results, logs
- medical-documents, notifications
- nurse : passages/series, passages/series/[id], patients/[id]/absences, prescriptions, tour (+ optimize, order, reset-order, summary), nurse-category-preferences
- patient/booking-draft, patient-documents, patient-history, patient-relatives (+ [id]), patients
- pharmacies, pharmacy-favorites, pharmacy-module/config, pharmacy-orders, plan-limits
- preleveur/tour (+ optimize, order, summary)
- pro/prescriptions, public/lab-brands, public/labs, public/nurses, qr/me, registration-requests, reviews, search, users

## UI par rôle (web `frontend/pages/`)

| Rôle / zone | Préfixe pages | Exemples parcours |
|-------------|---------------|-------------------|
| public | `/`, `/pour-*`, `/laboratoires`, `/infirmiers`, `/qr`, `/p/rdv` | SEO, annuaires, QR |
| patient | `/patient/*` | RDV, proches, résultats, profil |
| pro | `/pro/*` | RDV, patients, ordonnances, commandes pharmacie |
| nurse | `/nurse/*` | tournée, passages, demandes, pharmacie, prescriptions |
| lab | `/lab/*` | dashboard, stats, sous-comptes, calendrier |
| subaccount | `/subaccount/*` | RDV, patients, calendrier |
| preleveur | `/preleveur/*` | tournée, calendrier |
| super_admin | `/admin/*` | users, dispatch, IA, pharmacie, inscriptions |

## Prod — nginx (`ubuntu@15.236.73.7`, échantillon log)

- Fichier access : ~53k lignes au moment du scan.
- Top motifs API (fenêtre récente, **sans** normalisation UUID) :
  - Fort trafic répété sur **détail RDV** + `include=batch`, **GET user**, **medical-documents** (session debug / polling).
  - `GET /api/appointments?status=pending&limit=100`
  - `GET /api/appointments?page=1&limit=24&sort=created_at` (liste lab typique — payload lourd avant `scope=list`).

## Scripts deploy / diag (index)

| Catégorie | Fichiers clés |
|-----------|----------------|
| Deploy | `scripts/deploy-safe-release.sh`, `scripts/deploy-backend-only.sh`, `scripts/ensure-backend-runtime-links.sh` |
| Inventaire UI | `scripts/audit-ui-surface.mjs`, `scripts/audit-unused-web-components.mjs` |
| Backend diag | `backend/scripts/simulate-picker-payload.php`, `backend/scripts/debug-medical-doc-download.php`, … |

## Gates automatisés (voir matrice + rapport senior)

Tableau rempli après exécution Phase 3 — section « Résultats gates » dans [AUDIT-360-RAPPORT-SENIOR.md](./AUDIT-360-RAPPORT-SENIOR.md).
