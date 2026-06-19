---
name: Cary IA Phase 1 — Copilote intelligent
overview: Plan 1/4 — Chat Grok + contexte métier SQL + prise RDV chat (§2.7) + suggestions dynamiques + hub mobile tous rôles. Copilote utile dès la v1, sans Qdrant ni Health.
todos:
  - id: p1-migrations
    content: "Migrations 075-078 : ai_task_routing, conversations/messages, audits, ai_appointment_drafts"
    status: completed
  - id: p1-grok-gateway
    content: GrokProvider + AIGateway + ContextComposer SQL (RDV, résultats, profil) — pas Qdrant
    status: completed
  - id: p1-api-chat
    content: API /ai/chat/stream, conversations CRUD, ensure-system, quick-suggestions, ai_audits
    status: completed
  - id: p1-booking-27
    content: §2.7 booking drafts + confirm → Appointment::create + carte récap inline ai-hub
    status: completed
  - id: p1-mobile-hub
    content: CaryAiHubScreen branché API, SSE, Markdown, disclaimer, onglets pro/nurse/preleveur
    status: completed
  - id: p1-deeplinks
    content: Deep links lab-results / détail RDV → onglet ai avec contexte
    status: completed
  - id: p1-tests-dod
    content: "DoD : chat contextuel, booking patient/pro, ensure-system, ACL pro"
    status: completed
isProject: false
---

# Cary V2 IA — Phase 1 : Copilote intelligent (chat + RDV + contexte)

**Plan maître :** [`prompt_cary_v2_ia_66af59fd.plan.md`](prompt_cary_v2_ia_66af59fd.plan.md)

**Prérequis :** aucun.

**Plan suivant :** [`cary_v2_ia_phase2_sante.plan.md`](cary_v2_ia_phase2_sante.plan.md)

---

## Objectif livrable

Cary n'est **pas** un chatbot générique : dès la Phase 1, l'assistant **connaît le contexte Cary** (RDV, résultats, profil) via injection SQL structurée, peut **prendre un RDV dans le chat** (brouillon → récap → Valider), et propose des **suggestions dynamiques** basées sur les vraies données.

**Inclus Phase 1 :**
- Chat Grok streaming + hub mobile tous rôles
- **Contexte métier SQL** (sans Qdrant)
- **§ 2.7 booking IA** complet
- `GET /ai/quick-suggestions` dynamique
- Deep links depuis lab-results / RDV

**Hors scope Phase 1 :** Qdrant/RAG vectoriel, Apple Health, OCR async, agent suivi cron, voix, admin cockpit, recherche globale.

---

## Intelligence Phase 1 — ContextComposer SQL

Service : `backend/lib/ai/ContextComposer.php` — assemble un **bloc contexte JSON/texte** injecté dans chaque appel `AIGateway::chat()` :

| Source SQL | Patient | Pro/nurse |
|------------|---------|-----------|
| Profil (champs déchiffrés HDS) | Self + proches | — |
| RDV à venir / passés (30j) | Oui | Patients accessibles [`PatientDossierAccess`](backend/lib/PatientDossierAccess.php) |
| Derniers `lab-results` (métadonnées + dates) | Oui | Idem périmètre |
| Documents récents (types, dates — pas contenu OCR) | Oui | Idem |
| RDV en attente docs / statut | Oui | Idem |

**Pas de contenu PDF/OCR** en Phase 1 — titres et dates seulement. Le LLM répond de façon **personnalisée** (« votre prochain RDV est le… », « vous avez reçu un résultat le… »).

**Garde-fous :** ACL strict ; pro ne voit que ses patients ; disclaimer sur chaque réponse ; jamais diagnostic.

---

## Migrations (075–078)

| # | Fichier | Tables |
|---|---------|--------|
| 075 | `075_ai_task_routing.sql` | `ai_task_routing` seed Grok ; `platform_settings` disclaimer |
| 076 | `076_ai_conversations.sql` | `ai_conversations`, `ai_messages` |
| 077 | `077_ai_audits.sql` | `ai_audits`, `ai_conversation_summaries` (minimal) |
| 078 | `078_ai_appointment_drafts.sql` | `ai_appointment_drafts`, `ai_booking_audits` |

---

## Backend

- [`backend/lib/ai/`](backend/lib/ai/) : `GrokProvider`, `AIGateway`, `ContextComposer`, stubs autres providers
- API [`backend/api/ai/`](backend/api/ai/) :

| Endpoint | Phase 1 |
|----------|---------|
| `POST /ai/chat`, `POST /ai/chat/stream` | Oui + contexte injecté |
| CRUD `/ai/conversations`, `ensure-system` | Oui |
| `GET /ai/quick-suggestions` | **Oui — dynamique** (règles + données réelles) |
| `POST/GET/PATCH /ai/booking/drafts`, `confirm` | **Oui — § 2.7** |
| `GET /ai/hub` | Oui |

Référence booking : plan maître § 2.7 — `validateUnifiedRdvPayload` → `Appointment::create` ; pro + new patient au `confirm` uniquement.

---

## Mobile [`features/ai-hub/`](apps/mobile/src/features/ai-hub/)

- `CaryAiHubScreen` + `role` — **pas de refonte UI**
- SSE + Markdown + disclaimer ; retirer demo banner
- Onglets `ai` pro / nurse / preleveur (identique patient)
- **Carte récap RDV** inline dans le fil + CTA Valider / Modifier
- Chips suggestions depuis `GET /ai/quick-suggestions`
- Deep links : `/(role)/(tabs)/ai?conversation_type=lab_results` etc.

---

## Definition of done

- [ ] « Quand est mon prochain RDV ? » → réponse basée sur **vrais** appointments
- [ ] « Prendre un RDV » → draft → récap → Valider → `appointment_id`
- [ ] Pro : RDV + nouveau patient au confirm
- [ ] Suggestions chips changent si lab-results récents / RDV à venir
- [ ] Pro A ne reçoit pas le contexte patient B
- [ ] Tous rôles mobile : onglet Assistant Cary fonctionnel

---

## Règles

- 100 % LLM via `AIGateway`
- Jamais `POST /appointments` sans clic Valider
- Un seul module UI `ai-hub`
