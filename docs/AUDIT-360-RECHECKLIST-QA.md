# AUDIT-360 — Rechecklist QA (prod `https://cary.bio`)

**Règle :** cocher `[x]` **uniquement** avec **Date** + **Preuve** (commande, HTTP, bytes, capture).

| Statut | Signification |
|--------|----------------|
| `[ ]` | Non exécuté |
| `[x]` | OK avec preuve |
| `[~]` | Partiel / écart documenté (ex. front pas encore déployé) |
| `[—]` | N/A (module off) avec preuve API |

## Public

| OK | Item | Date | Preuve |
|----|------|------|--------|
| [x] | GET `/` — 200 | 2026-09-25 | `php backend/scripts/audit360-prod-public-smoke.php` → http 200, 422146 bytes |
| [x] | GET `/laboratoires` — liste | 2026-09-25 | idem → http 200, 659726 bytes |
| [x] | GET `/api/public/labs` — JSON success | 2026-09-25 | curl.exe → http 200, 119367 bytes |
| [x] | GET `/api/app/version` — 200 | 2026-09-25 | curl.exe → success, latest 1.8.7 |

## Patient

| OK | Item | Date | Preuve |
|----|------|------|--------|
| [ ] | Login OTP → hub patient | | |
| [ ] | GET `/api/appointments?patient_period=upcoming` | | |
| [ ] | POST `/api/patient/booking-draft` — pas 500 storage | | |

## Pro

| OK | Item | Date | Preuve |
|----|------|------|--------|
| [ ] | `/pro/appointments` charge | | |
| [ ] | Wizard `/pro/appointments/new` — picker `scope=picker&search=` | | |
| [ ] | Commandes pharmacie + ordonnances | | |

## Nurse

| OK | Item | Date | Preuve |
|----|------|------|--------|
| [ ] | `/nurse/appointments` pending + soins | | |
| [ ] | `/nurse/tournee` — GET `/api/nurse/tour/summary` | | |
| [ ] | `/nurse/passage/new` — picker patient | | |

## Lab

| OK | Item | Date | Preuve |
|----|------|------|--------|
| [ ] | `/lab` — GET `/api/lab/stats?stats_only=1` | | |
| [~] | API `scope=list` + date — payload bytes | 2026-09-25 | Hotfix API prod actif ; mesure authentifiée lab à refaire post-login |
| [~] | Dashboard web envoie `scope=list` (POST-deploy) | 2026-09-25 | **PRE-deploy :** front prod sans LabDashboard déployé — attendu Étape 4 |
| [ ] | `/lab/appointments` limit=24 | | |
| [ ] | `/lab/calendar` | | |

## Subaccount

| OK | Item | Date | Preuve |
|----|------|------|--------|
| [—] | Dashboard + `scope=list` (même critères lab) | 2026-09-25 | 0 profil `subaccount` en prod (inventory SSH) |

## Preleveur

| OK | Item | Date | Preuve |
|----|------|------|--------|
| [ ] | `/preleveur/tournee` — tour API | | |
| [ ] | `/preleveur/calendar` | | |

## Super admin

| OK | Item | Date | Preuve |
|----|------|------|--------|
| [ ] | `/admin/users` — picker search, pas timeout | | |
| [ ] | `/admin/dispatch` | | |
| [ ] | `/admin/appointments/new` — recherche patient | | |
| [ ] | `/admin/commandes-pharmacie` + ordonnances | | |

## Pharmacie

| OK | Item | Date | Preuve |
|----|------|------|--------|
| [ ] | Module actif (config API) | | |
| [ ] | Création commande web/mobile | | |
| [ ] | Page `[id]/ordonnances` — medical-documents | | |

## Post-deploy technique

| OK | Item | Date | Preuve |
|----|------|------|--------|
| [x] | `simulate-picker-payload.php` — picker << full | 2026-09-25 | SSH prod : full 1486679 B, picker 19525 B (−98,7 %) |
| [~] | `ensure-backend-runtime-links.sh` — www-data OK | 2026-09-25 | Script absent `/var/www/oneandlab/scripts/` — **post deploy-safe-release** |
| [ ] | nginx — pas de 500 récurrent `/api/appointments` | | |
| [ ] | Release SHA + rollback path documentés | | |

## Nettoyage audit360

| OK | Item | Date | Preuve |
|----|------|------|--------|
| [x] | Comptes test éphémères supprimés/désactivés | 2026-09-25 | Aucun compte audit360+ créé (cf. AUDIT-360-TEST-ACCOUNTS.local.md) |
| [x] | Données test (RDV/commandes) nettoyées | 2026-09-25 | N/A — pas de données test créées |
