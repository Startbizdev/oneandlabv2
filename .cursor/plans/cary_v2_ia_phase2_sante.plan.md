---
name: Cary IA Phase 2 — Santé connectée
overview: "Plan 2/4 — Apple Health + Health Connect, onglet Mes données santé, connected_devices, métriques injectées dans ContextComposer. Prérequis : Phase 1 en prod."
todos:
  - id: p2-migrations
    content: "Migrations 079-080 : health_*, connected_devices"
    status: completed
  - id: p2-health-api
    content: API /health/* batch metrics, sources, révocation RGPD
    status: completed
  - id: p2-health-sync-mobile
    content: Feature health-sync Expo + onglet patient graphiques poids/FC/activité
    status: completed
  - id: p2-context-health
    content: "Étendre ContextComposer : health_metrics résumé 7j/30j dans prompts IA"
    status: completed
  - id: p2-tests-dod
    content: "DoD : sync HealthKit, graphiques, métriques dans réponses IA, dédup batch"
    status: completed
isProject: false
---

# Cary V2 IA — Phase 2 : Santé connectée

**Plan maître :** [`prompt_cary_v2_ia_66af59fd.plan.md`](prompt_cary_v2_ia_66af59fd.plan.md)

**Prérequis :** [`cary_v2_ia_phase1_copilot.plan.md`](cary_v2_ia_phase1_copilot.plan.md) en prod.

**Plan suivant :** [`cary_v2_ia_phase3_rag.plan.md`](cary_v2_ia_phase3_rag.plan.md)

---

## Objectif livrable

Le patient synchronise **Apple Health / Health Connect**, voit ses **graphiques santé**, et l'IA Phase 1 enrichit ses réponses avec les **métriques récentes** (poids, FC, activité…).

**Hors scope :** Qdrant, OCR, agent suivi, voix, tendances `TrendEngine` (Phase 4).

---

## Migrations (079–080)

| # | Fichier | Contenu |
|---|---------|---------|
| 079 | `079_health_metrics.sql` | `health_sources`, `health_syncs`, `health_metrics`, `health_permissions` |
| 080 | `080_connected_devices.sql` | `connected_devices`, `device_syncs` |

---

## Mobile — [`features/health-sync/`](apps/mobile/src/features/health-sync/)

- iOS HealthKit / Android Health Connect
- Métriques v1 : poids, taille, FC, pas, calories, distance, activité
- Consentement explicite, sync manuelle/auto
- Permissions [`app.json`](apps/mobile/app.json)
- Onglet **« Mes données santé »** — graphiques (poids / activité / FC)
- Alertes **visuelles** uniquement (pas diagnostic)

---

## API [`backend/api/health/`](backend/api/health/)

- `POST /health/metrics/batch` (idempotent, `external_id` dédup)
- `GET /health/sources`, `GET /health/syncs`
- `DELETE /health/sources/{id}` (RGPD)
- `POST /health/devices/pair`, sync, delete
- Chiffrement HDS ; accès **patient only**

---

## Lien avec IA Phase 1

Étendre **`ContextComposer`** :

- Résumé `health_metrics` 7j / 30j (moyennes, dernier poids, pas…)
- Nouvelle chip suggestion : « Montre mes tendances santé » (données brutes — pas TrendEngine)
- `conversation_type=health_tracking` pour deep link

Notification : `health_sync_completed`

---

## Definition of done

- [ ] Sync HealthKit → BDD → graphiques onglet santé
- [ ] Chat : « Comment va mon activité cette semaine ? » → réponse avec métriques sync
- [ ] Révocation source → plus de métriques ingérées
- [ ] Non-régression Phase 1 (chat, booking)
