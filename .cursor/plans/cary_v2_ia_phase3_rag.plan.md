---
name: Cary IA Phase 3 — RAG & intelligence profonde
overview: "Plan 3/4 — Qdrant RAG, OCR documents, mémoire 3 niveaux, agent suivi, pièces jointes chat, admin IA, ai_reports. Prérequis : Phase 2 en prod."
todos:
  - id: p3-qdrant
    content: Installer Qdrant EC2 127.0.0.1:6333 + collections par patient_id
    status: completed
  - id: p3-migrations
    content: "Migrations 081-084 : ai_memory, signals, reports, attachments"
    status: completed
  - id: p3-rag-ocr
    content: RAG Qdrant + indexation dossier + OCR async medical_documents
    status: completed
  - id: p3-memory
    content: MemoryComposer 3 niveaux remplace/complète ContextComposer vectoriel
    status: completed
  - id: p3-agent-suivi
    content: Cron ai-patient-followup + ai_patient_signals + notifs → draft RDV
    status: completed
  - id: p3-attachments
    content: Pièces jointes PDF/image dans fil chat + citations
    status: completed
  - id: p3-admin-ai
    content: frontend/pages/admin/ai/ — routing, usage, audits CSV
    status: completed
  - id: p3-tests-dod
    content: "DoD : RAG ACL, OCR→summary, agent signal, analyse doc dans chat"
    status: completed
isProject: false
---

# Cary V2 IA — Phase 3 : RAG & intelligence profonde

**Plan maître :** [`prompt_cary_v2_ia_66af59fd.plan.md`](prompt_cary_v2_ia_66af59fd.plan.md)

**Prérequis :** [`cary_v2_ia_phase2_sante.plan.md`](cary_v2_ia_phase2_sante.plan.md) en prod.

**Plan suivant :** [`cary_v2_ia_phase4_avance.plan.md`](cary_v2_ia_phase4_avance.plan.md)

---

## Objectif livrable

L'IA **comprend le contenu** des documents (OCR + RAG vectoriel), **mémorise** sur 3 niveaux, **proactive** via agent de suivi, et l'**admin** pilote Grok/routing/coûts.

Phase 1 = contexte SQL ; **Phase 3 = sémantique** (similarité, contenu docs, résumés longs).

---

## Infra Qdrant

EC2 Cary — installer Docker + `qdrant/qdrant`, bind `127.0.0.1:6333`, volume `/var/lib/qdrant`.

Variables : `QDRANT_URL`, `QDRANT_API_KEY` (optionnel).

---

## Migrations (081–084)

| # | Fichier | Contenu |
|---|---------|---------|
| 081 | `081_ai_memory.sql` | `ai_user_memory`, `ai_medical_memory` |
| 082 | `082_ai_patient_signals.sql` | `ai_patient_signals`, `ai_agent_runs` |
| 083 | `083_ai_reports_summaries.sql` | `ai_reports`, `ai_summaries` |
| 084 | `084_ai_conversation_attachments.sql` | `ai_conversation_attachments` |

---

## RAG + OCR

- Indexer : profil, RDV, docs (texte OCR), lab-results, care photos comments, patient-history, health summary
- Collection Qdrant / filtre `patient_id` — ACL [`PatientDossierAccess`](backend/lib/PatientDossierAccess.php)
- OCR cron post-upload [`medical_documents`](backend/api/medical-documents/) → `ai_summaries`
- **`MemoryComposer`** : conversation + user + medical memory + RAG chunks
- Citations `citation_refs[]` dans messages

---

## Agent suivi (04.4)

- Cron `backend/cron/ai-patient-followup.php`
- Signaux : bilan manquant, nouveau résultat, no-show, ordonnance expirée…
- Notif → hub → brouillon § 2.7 (Phase 1) ou wizard
- Jamais RDV auto

---

## Chat enrichi

- Joindre PDF/image à une conversation
- « Analyser ce document » → job OCR + réponse avec citations
- Comptes rendus `ai_reports` workflow draft → validate → publish

---

## Admin web [`frontend/pages/admin/ai/`](frontend/pages/admin/)

- Routing `ai_task_routing` (changer provider par task_type)
- Usage tokens, erreurs, export `ai_audits` CSV
- Disclaimer multilingue

---

## Definition of done

- [ ] « Explique mes derniers résultats » → réponse **contenu** doc (pas seulement date)
- [ ] Upload ordonnance → OCR → résumé consultable dans chat
- [ ] Agent : signal bilan 12 mois → notif → draft RDV
- [ ] RAG : isolation stricte inter-patients
- [ ] Admin : modifier routing + voir coûts
