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
| [ ] | GET `/` — 200 | | |
| [ ] | GET `/laboratoires` — liste | | |
| [ ] | GET `/api/public/labs` — JSON success | | |
| [ ] | GET `/api/app/version` — 200 | | |

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
| [ ] | API `scope=list` + date — payload bytes | | |
| [ ] | Dashboard web envoie `scope=list` (POST-deploy) | | |
| [ ] | `/lab/appointments` limit=24 | | |
| [ ] | `/lab/calendar` | | |

## Subaccount

| OK | Item | Date | Preuve |
|----|------|------|--------|
| [ ] | Dashboard + `scope=list` (même critères lab) | | |

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
| [ ] | `simulate-picker-payload.php` — picker << full | | |
| [ ] | `ensure-backend-runtime-links.sh` — www-data OK | | |
| [ ] | nginx — pas de 500 récurrent `/api/appointments` | | |
| [ ] | Release SHA + rollback path documentés | | |

## Nettoyage audit360

| OK | Item | Date | Preuve |
|----|------|------|--------|
| [ ] | Comptes test éphémères supprimés/désactivés | | |
| [ ] | Données test (RDV/commandes) nettoyées | | |
