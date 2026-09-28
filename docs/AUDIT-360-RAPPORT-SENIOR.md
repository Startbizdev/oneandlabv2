# AUDIT-360 — Rapport senior Cary

**Date :** 2026-09-28 (e2e complète verte + test live sur MySQL local ; migrations rejouables ; hygiène git/deploy)  
**Périmètre :** inventaire [AUDIT-360-INVENTAIRE-2026-09-25.md](./AUDIT-360-INVENTAIRE-2026-09-25.md), matrice [AUDIT-360-MATRICE-MODULES.md](./AUDIT-360-MATRICE-MODULES.md).

## Synthèse

- Refactor anti-régression + ménage H0 (MD morts, artefacts, scripts debug PHP racine `backend/`) ; `.sh` deploy conservés.
- Appointments API : `index.php` ~58 L (handlers).
- **IAP :** `SubscriptionDisplayTest` (format mobile) ; e2e billing/subscription dans `test:e2e:p1`.
- **IA Cary :** `AiChatRateLimitTest` ; skips `pdo_mysql` inutiles retirés ; e2e `cary-ai-booking` (mock stream) dans `test:e2e:p1`.
- **Carnet :** Jest `health-record-display` ; Health* PHP sous Docker MySQL.
- **Bug app corrigé :** `layouts/dashboard.vue` — `fetchModuleFlags()` sans `.catch` → exception non gérée sur tout l'espace nurse/pro quand la config pharmacie échoue.
- **Migrations :** les 124 fichiers se rejouent sur base vierge (0 échec) :
  - `048_*` : mélange de collations sous MySQL 8 (`utf8mb4_0900_ai_ci` par défaut vs colonnes `utf8mb4_unicode_ci`) → `SET NAMES … COLLATE utf8mb4_unicode_ci` ;
  - `088_*` : `ADD COLUMN IF NOT EXISTS` (syntaxe MariaDB, refusée par MySQL) → garde `information_schema` + `PREPARE`, idempotente.
- **Test live (sans mocks) :** `docker-compose.e2e-live.yml` (MySQL 8.4 jetable + API PHP réelle, `.env` du repo masqué, `DB_NAME` forcé `*_test`) ; `patient-documents.live.spec.ts` (login, upload, liste, suppression) via `npm run test:e2e:live`. Remplace l'ancien spec qui exigeait un compte réel.
- **Hygiène git / deploy :**
  - uploads médicaux chiffrés + rate-limit retirés du suivi git (1102 fichiers) et ajoutés au `.gitignore` ;
  - `deploy-prod.sh` / `deploy-backend-only.sh` : `--exclude='.env.*'` (`.env.backup` / `.env.old` n'étaient pas exclus).
- **Fiabilité Playwright :**
  - mocks API ancrés (`apiRoutePattern()`) : `**/api/**` interceptait le module dev `@vue/devtools-api/lib/esm/api/index.js` (app non hydratée) ;
  - fixture commune `e2e/fixtures/test.ts` : `page.goto` attend l'hydratation (marqueur `plugins/hydrated-marker.client.ts`) ;
  - specs SSR isolées dans `playwright.ssr.config.ts` (build prod `.nuxt-e2e` + `e2e/fixtures/public-api-server.cjs`, port 3217 sans réutilisation) ;
  - specs obsolètes réalignées (calendrier `limit=250`, compteurs documents nurse-passage).
- **H7 deploy :** attente GO explicite ([checklist](./AUDIT-360-SMOKE-H7.md)).

## Dette résiduelle

- Historique git : les uploads chiffrés restent dans les anciens commits (réécriture d'historique = décision humaine, force-push).
- Serveur prod : d'éventuels `backend/.env.backup` / `.env.old` déjà déployés restent à supprimer à la main (au GO).
- Jobs Playwright CI encore `continue-on-error` (à rendre bloquants après 2 runs CI Linux verts).
- Vérif receipts Apple/Google **prod** (sandbox) hors CI.
- Deploy + smoke prod + build EAS non exécutés (attente GO).
- Note dev : `npm run typecheck` / `nuxt prepare` réécrit `.nuxt` et casse un `nuxt dev` en cours (le relancer).

## Gates

| Gate | Résultat |
|------|----------|
| Docker PHPUnit (replay 124 migrations) | 282 OK, 0 skip |
| Frontend typecheck + Vitest | OK (9 tests) |
| Playwright P1 (`test:e2e:p1`) | 73 passed |
| Playwright dev complet (`test:e2e`) | 272 passed |
| Playwright SSR (`test:e2e:ssr`) | 46 passed |
| Playwright live (`test:e2e:live`, MySQL local) | 1 passed |
| Mobile Jest lib | focused-refetch + document-file-kind + health-record-display |
| Deploy / EAS | attente GO |
