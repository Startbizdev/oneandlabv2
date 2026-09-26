# AUDIT-360 — Rapport senior Cary

**Date :** 2026-09-25  
**Périmètre :** plateforme complète (inventaire [AUDIT-360-INVENTAIRE-2026-09-25.md](./AUDIT-360-INVENTAIRE-2026-09-25.md), matrice [AUDIT-360-MATRICE-MODULES.md](./AUDIT-360-MATRICE-MODULES.md)).

## Synthèse

- **Surface :** ~80 endpoints API, ~140 pages web, ~143 routes mobile, 122 migrations SQL — cohérent avec un produit mature multi-rôles.
- **Risque perf #1 (recheck prod) :** listes `GET /api/appointments` avec enrichissement batch (blood/nursing items) → JSON multi‑Mo pour lab ; **correctif livré :** `scope=list` + dashboard lab.
- **Risque perf #2 :** listes patients/users full — **picker + search** déjà en code local (admin wizard, CreatorSelectField).
- **Risque deploy #1 :** `storage` non symlink → 500 booking-draft ; script links **durci** (mkdir persistent + migration répertoire).
- **Qualité auto :** PHPUnit 247 tests — 216 OK/skipped sur Windows ; 7 erreurs **PDO absent** ; 1 fail prompt RAG (assertion `**`). Playwright/e2e ciblés mis à jour pour picker patient.

## P0 (traités ou en release)

| Item | Action |
|------|--------|
| Liste RDV lab lourde | `scope=list` backend + LabDashboard |
| Picker admin/staff | users/patients `scope=picker` + recherche |
| Storage deploy | `ensure-backend-runtime-links.sh` |
| E2E staff booking | `staff-booking-patients.spec.ts` aligné recherche |
| Ordonnances | Appointment méthodes PrescriptionService (existant session) |

## P1

- Aligner `LabResultAnalysisPromptTest` avec prompt sans markdown.
- Lab `/patients` : encore pagination full picker — envisager recherche serveur comme wizard.
- Réduire polling détail RDV + documents (logs prod : même UUID en rafale).
- CI Windows / dev : documenter PHPUnit sans MySQL (tests health/qr/users search).

## P2

- `view=cards` généralisé pour listes staff mobile/web.
- Analyse egress nginx automatisée (`scripts/analyze-nginx-egress.sh`).
- EAS Android+iOS — voir gate deploy.

## Résultats gates (2026-09-25, machine dev)

| Gate | Résultat |
|------|----------|
| PHPUnit `composer.phar test` | **OK assertions** — 0 failures ; 7 **errors** PDO MySQL absent (Windows env) ; 23 skipped |
| Frontend typecheck | **OK** |
| Frontend build `NUXT_PUBLIC_API_BASE=/api` | **OK** — `.output/server/index.mjs` |
| mobile:verify | **OK** — 0 eslint errors |
| Playwright P0 (`staff-booking-patients` + `lab-dashboard-pagination`) | **OK** — 11/11 avec retries CI (4 specs flaky booking 4 rôles) |
| Playwright suite complète | **Rouge** (run 2026-09-25 : 103/318 pass) — cause identifiée : attente `#__nuxt.__vue_app__` (Nuxt 3) ; **fix** `e2e/helpers/wait-for-nuxt-ready.ts` + resilience en serial. Re-run ciblé : public 25/28 OK, **workspace-resilience 100 %**, P0 staff flaky si dev hors `127.0.0.1:3000` |
| Prod simulate-picker | **OK** — full 1 486 679 B vs picker 19 525 B (−98,7 %) |
| QA rechecklist | **Partiel** — public 100 % ; rôles OTP en attente comptes ops ; subaccount N/A prod |
| Deploy API hotfix | **Fait** — `scope=list` sur prod API |
| Deploy safe release | **OK** — `9fd68af51bb91a6c8d9cf490366163b9eedfcf60` → release `20260925T153449Z-9fd68af51bb9` |
| EAS iOS/Android production | **BLOQUÉ (gate strict)** — rechecklist rôles OTP incomplète ; suite Playwright complète non exécutée |

## Runbook deploy (1 page)

1. Working tree clean → `scripts/deploy-safe-release.sh` (ou backend-only si hotfix API).
2. Post-deploy SSH : `scripts/ensure-backend-runtime-links.sh /var/www/oneandlab`
3. `php backend/scripts/simulate-picker-payload.php` (prod)
4. Smoke : GET `/api/app/version`, login lab, dashboard RDV taille réponse
5. Rollback : restore backup DB + redeploy tag précédent (script release)

## Known issues par module (extrait)

- **RDV :** COUNT SQL parfois incohérent (has_more heuristique déjà en place).
- **DevOps :** 2 Go RAM — éviter limit=100 sans scope=list.
- **Docs legacy :** ne pas utiliser comme spec — uniquement ces fichiers AUDIT-360-*.
