---
name: Cary IA Phase 4 — Voix & prod
overview: "Plan 4/4 — Voix STT/TTS, dictée pro, TrendEngine, recherche/épinglage/archives, admin étendu, hardening sécurité/charge. Prérequis : Phase 3 stable."
todos:
  - id: p4-migrations
    content: "Migrations 085-087 : voice_*, ai_trends, ai_feedback"
    status: completed
  - id: p4-voice
    content: API /ai/voice/* + brancher VoiceMockOverlay + dictée pro post-RDV
    status: completed
  - id: p4-trends
    content: TrendEngine + badges descriptifs onglet santé
    status: completed
  - id: p4-hub-ux
    content: Épinglage, archives, GET /ai/search, export RGPD — ConversationsSheet
    status: completed
  - id: p4-admin-extended
    content: "Cockpit 04.8 : latence p95, coûts/provider, satisfaction"
    status: completed
  - id: p4-hardening
    content: Tests PHPUnit, audit prompt injection, charge OCR/health, non-régression 86 endpoints
    status: completed
isProject: false
---

# Cary V2 IA — Phase 4 : Voix + tendances + production

**Plan maître :** [`prompt_cary_v2_ia_66af59fd.plan.md`](prompt_cary_v2_ia_66af59fd.plan.md)

**Prérequis :** [`cary_v2_ia_phase3_rag.plan.md`](cary_v2_ia_phase3_rag.plan.md) stable en prod.

---

## Objectif livrable

Assistant **vocal**, **tendances santé** descriptives, UX hub **mature** (recherche, archives), plateforme **prod-ready**.

---

## Migrations (085–087)

| # | Fichier | Contenu |
|---|---------|---------|
| 085 | `085_voice_sessions.sql` | `voice_sessions`, `voice_messages`, `voice_transcriptions` |
| 086 | `086_ai_trends.sql` | `ai_trends` |
| 087 | `087_ai_feedback.sql` | `ai_feedback` (optionnel) |

---

## Voix (04.1 / 04.2)

- [`backend/api/ai/voice/`](backend/api/ai/voice/) — STT → Grok → TTS
- Brancher [`PatientAiVoiceMockOverlay`](apps/mobile/src/features/ai-hub/components/PatientAiVoiceMockOverlay.tsx)
- Dictée pro post-RDV → `ai_reports` draft → validation → [`medical_documents`](backend/api/medical-documents/)
- Multilingue FR/EN/AR/ES

---

## Tendances (04.6)

- `TrendEngine.php` — stats simples, **jamais diagnostic**
- UI onglet santé : badges « poids en baisse sur 30j »
- Chip IA « Montre mes tendances » alimentée par `ai_trends`

---

## Hub UX avancée

- Épinglage / archives dans [`PatientAiConversationsSheet`](apps/mobile/src/features/ai-hub/components/PatientAiConversationsSheet.tsx)
- `GET /ai/search?q=`
- `GET /ai/export` RGPD

---

## Admin étendu + hardening

- Latence p50/p95, coûts par provider, `ai_feedback`
- [`backend/tests/ai/`](backend/tests/ai/) — injection, fuite inter-patients, E2E booking + hub 30j
- Charge : batch health 10k, file OCR
- Redis workers si besoin (jalon infra)

---

## Definition of done

- [ ] Mode voix patient FR fonctionnel
- [ ] Dictée pro → document publié après validation
- [ ] Tendances visibles sans alerte médicale
- [ ] Recherche conversations OK
- [ ] Rapport audit sécurité + non-régression endpoints
