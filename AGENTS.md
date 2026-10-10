# Cary (oneandlab) — guide agents

Plateforme de rendez-vous de prélèvement à domicile. Rôles : patient, infirmier, préleveur, laboratoire, pro, admin. Abonnements via Stripe (web) et achats intégrés (mobile).

## Monorepo

| Dossier | Contenu |
|---------|---------|
| `apps/mobile` | App Expo / React Native (voir `apps/mobile/AGENTS.md`) |
| `frontend` | Web app Nuxt 3 + Nuxt UI + Tailwind |
| `backend` | API PHP (`api/`, `lib/`, `models/`, `middleware/`, `tests/`) |
| `database` | Migrations SQL numérotées |
| `packages` | `shared-api`, `shared-types`, `shared-utils`, `shared-constants`, `onboarding` |

## Gates

- Mobile : `npm run mobile:verify`
- Web : `npm run typecheck -w oneandlab-frontend`, `npm run test:unit -w oneandlab-frontend`, `npm run test:e2e:p1 -w oneandlab-frontend`
- Backend : `npm run test:backend`

## Règles (`.cursor/rules/`)

- Toujours : `senior-error-fixing`, `architecture-code-quality`, `cary-premium-completion` (ne pas s'arrêter avant d'avoir vérifié toutes les vues, toujours vérifier le backend, solution simple de dev senior)
- Code : `typescript-react-vue`, `backend-php`
- Design : `cary-design-rules`, `ui-preferences` (web), `mobile-full-width-segments`
- Fonctionnel : `cary-functional-guardian`
- Visual QA : `mobile-visual-qa-ios` (iOS ou émulateur Android `emulator-5600`), `web-visual-qa`

## Sous-agents (`.cursor/agents/`)

| Agent | Quand |
|-------|-------|
| `functional-guardian` | Avant et après toute refonte d'une vue : fiche fonctionnelle, trace UI → backend, CTA |
| `senior-implementer` | Implémente une correction ou une fonctionnalité sans contourner lint, types ou tests |
| `backend-guardian` | Dès qu'un endpoint, une policy ou une migration est touché ou utilisé par une vue modifiée |
| `design-reviewer` | Sur les captures avant / après d'une vue |
| `web-visual-qa` | Pour produire les captures web avant / après |
| `verifier` | Avant de déclarer une tâche terminée |

## Workflow refonte d'une vue

`functional-guardian` (avant) → captures avant → refonte → `backend-guardian` si backend concerné → captures après → `design-reviewer` → `functional-guardian` (après) → `verifier` → mise à jour de `VISUAL-QA.md` et `FUNCTIONAL-MATRIX.md`.
