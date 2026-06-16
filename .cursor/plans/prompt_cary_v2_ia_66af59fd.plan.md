---
name: Prompt Cary V2 IA
overview: "Audit OneAndLab/Cary + prompt V2 santé IA (Modules 1–2, 4–5) : hub IA, santé, voix, mémoire — sans refonte. QR code : voir prompt_cary_v2_qr.plan.md"
todos:
  - id: doc-prompt
    content: Créer docs/cary-v2-sante-ia-prompt.md avec prompt Modules 1–5 + annexes DDL
    status: pending
  - id: phase-b-ai-hub-ux
    content: "Phase B : onglet IA + hub + streaming SSE + prise RDV assistée (draft → récap → Valider)"
    status: pending
  - id: phase-b-ai-booking
    content: "Phase B : ai_appointment_drafts + confirm réutilisant POST /appointments + création patient pro + ai_booking_audits"
    status: pending
  - id: phase-a-migrations
    content: "Phase A : migrations health_*, ai_*, voice_*, connected_devices, ai_reports, ai_routing — schémas extensibles même si UI différée"
    status: pending
  - id: phase-a-api
    content: "Phase A : AIGateway + LLMProviderInterface (6 providers) + routing par tâche + /ai/chat + ai_audits"
    status: pending
  - id: phase-b-mobile-health
    content: "Phase B : health-sync Expo + onglet patient + ingest connected_devices → health_metrics"
    status: pending
  - id: phase-b-rag-ocr
    content: "Phase B : Qdrant RAG + OCR async + comptes rendus draft/validate (Module 2 + 04.3)"
    status: pending
  - id: phase-b-agent-suivi
    content: "Phase B : agent suivi patient (signals → brouillon RDV IA)"
    status: pending
  - id: phase-c-hardening
    content: "Phase C : tests sécurité, charge, cockpit admin IA étendu (Module 04.8)"
    status: pending
  - id: phase-d-voice-agents
    content: "Phase D : assistant vocal patient/pro (STT/TTS), voice_sessions, multilingue FR/EN/AR/ES"
    status: pending
  - id: phase-d-trends
    content: "Phase D : moteur tendances descriptif (ai_trends) + dashboard patient alertes visuelles"
    status: pending
isProject: false
---

# Audit Cary / OneAndLab et prompt ingénieur V2 santé IA

## 1. Synthèse audit (état au 04/06/2026)

**Marque produit :** Cary (`cary.fr`, UI mobile/web). **Codebase :** monorepo `onev2` / packages `@oneandlab/*`.

| Domaine | Existant (à réutiliser) | Absent (greenfield) |
|---------|-------------------------|-------------------|
| **IA / LLM / RAG / OCR** | — | Tout le Module 2 |
| **Apple Health / Health Connect** | — | Tout le Module 1 |
| **Auth / RBAC** | OTP + JWT, [`AuthMiddleware.php`](backend/middleware/AuthMiddleware.php), [`RoleMiddleware.php`](backend/middleware/RoleMiddleware.php), [`PatientDossierAccess.php`](backend/lib/PatientDossierAccess.php) | Rôles dédiés « IA admin » (optionnel) |
| **Chiffrement HDS** | [`Crypto.php`](backend/lib/Crypto.php) AES-256-GCM, `medical_documents` chiffrés | Chiffrement métriques santé (nouvelles tables) |
| **Audit conformité** | [`access_logs`](database/migrations/007_create_access_logs.sql), API `/api/logs`, export CSV admin | Audit prompts/réponses IA (`ai_audits`) |
| **Documents médicaux** | Upload/list/download/copy — [`medical-documents/`](backend/api/medical-documents/) | Pipeline OCR + analyse |
| **Résultats labo** | Listing `document_type=resultats` — [`lab-results/`](backend/api/lab-results/) | Interprétation IA (avec garde-fous) |
| **RDV / dispatch** | [`Appointment.php`](backend/models/Appointment.php), offres atomiques, redispatch, lots | Moteur suggestion RDV (IA assistée) |
| **Profils publics SEO** | Migrations 019/030/034, pages Nuxt `/infirmier/:slug`, `/Laboratoire/:slug`, API [`public/nurse|lab`](backend/api/public/) | — |
| **Notifications** | In-app, Expo push, email queue, SMS Twilio — [`NotificationService.php`](backend/lib/NotificationService.php) | Événements « sync santé », « suggestion IA » |
| **Async / workers** | `EmailQueue` / `SmsQueue` + `register_shutdown_function`, crons [`backend/cron/`](backend/cron/) | **Pas de Redis** ni workers dédiés en prod |
| **Mobile** | Expo 54, rôles `patient|nurse|pro|preleveur` — voir [`docs/react-native-ingenieur-prompt.md`](docs/react-native-ingenieur-prompt.md) | Onglet « Mes données santé », assistants IA |
| **Web** | Nuxt 3 dashboards + booking — [`frontend/`](frontend/) | Cockpit IA admin, graphiques santé patient |
| **Voix / agents / wearables** | — | Module 4 entier (voice_*, connected_devices, agent suivi, tendances) |
| **UX IA native / hub conversationnel** | Feature `ai-assistant` prévue Module 2 | Module 5 : onglet bottom nav, mémoire, recherche, streaming |
| **Bottom tabs mobile** | 4 rôles × onglets métier + `more` — [`(patient)/(tabs)/_layout.tsx`](apps/mobile/app/(patient)/(tabs)/_layout.tsx) | Onglet `ai` immédiatement avant `more` |
| **Comptes rendus IA** | PDF ordonnance manuel [`PrescriptionPdf`](backend/lib/PrescriptionPdf.php) | Workflow brouillon → validation → `medical_documents` |
| **Routing multi-LLM par tâche** | — | `ai_task_routing` + `LocalProvider` stub |

```mermaid
flowchart TB
  subgraph existant [Existant Cary]
    M[Expo Mobile]
    W[Nuxt Web cary.fr]
    API[PHP API /api]
    DB[(MySQL)]
    FS[uploads chiffrés]
    PUSH[Expo Push]
    SMTP[EmailQueue]
  end
  subgraph v2 [V2 à construire]
    HK[HealthKit / Health Connect]
    GW[AI Gateway PHP]
    RAG[RAG Qdrant]
    OCR[Workers OCR]
    VOICE[Voice STT TTS]
    AGENT[Agent suivi patient]
    DEV[connected_devices]
    HUB[Hub IA ChatGPT-like]
  end
  M --> API
  W --> API
  API --> DB
  API --> FS
  API --> PUSH
  API --> SMTP
  M --> HK
  HK --> API
  API --> GW
  GW --> RAG
  GW --> OCR
  M --> HUB
  HUB --> GW
  M --> VOICE
  VOICE --> GW
  GW --> AGENT
  DEV --> API
  AGENT --> PUSH
```

**Écart majeur vs prompt générique :** le prompt original suppose Redis, WebSocket, workers multiples et tables IA — **aucun de ces éléments n’existe**. L’adaptation doit **étendre** les patterns PHP actuels (migrations `database/migrations/`, libs `backend/lib/`, features `apps/mobile/src/features/`) et introduire Redis/workers comme **jalon infra explicite**, pas comme acquis.

---

## 1 bis. Audit système RDV Cary (existant — source de vérité IA booking)

Document de référence : [`docs/comparaison-flux-pro-vs-formulaire-rdv.md`](docs/comparaison-flux-pro-vs-formulaire-rdv.md).

### Flux de création RDV aujourd’hui

| Flux | Entrée UI | Création patient | Endpoint final |
|------|-----------|------------------|----------------|
| **Patient connecté** | [`rendez-vous/nouveau.vue`](frontend/pages/rendez-vous/nouveau.vue) / mobile [`BookingWizardScreen`](apps/mobile/src/features/appointments/form/screens/BookingWizardScreen.tsx) | `patient_id` = utilisateur connecté ; proches via `relative_id` | `POST /appointments` |
| **Patient urgence lab** | Wizard + consentement | — | `POST /patient/booking-draft` → Stripe → webhook → [`PatientBookingDraftExecutor`](backend/lib/PatientBookingDraftExecutor.php) → `Appointment::create` |
| **Pro / infirmier / lab** | [`AppointmentForm`](frontend/components/dashboard/AppointmentForm.vue) / mobile [`useAppointmentForm`](apps/mobile/src/features/appointments/form/hooks/useAppointmentForm.ts) | Si `NEW_PATIENT` : **`POST /patients`** puis `patient_id` ; sinon lookup email [`GET /patients/lookup`](backend/api/patients/lookup.php) | `POST /appointments` |
| **Booking profil public** | Fiche `/infirmier/{slug}` | Patient connecté ou OTP invité | `POST /appointments` + `assigned_nurse_id` / `assigned_lab_id` |

**Backend unique :** [`backend/api/appointments/index.php`](backend/api/appointments/index.php) → [`Appointment::create`](backend/models/Appointment.php) → dispatch géographique (sauf assignation directe pro) → worker notifications [`process-appointment-notifications.php`](backend/scripts/process-appointment-notifications.php).

### Création patient par le pro (déjà en production)

- **API :** `POST /api/patients` — rôles `pro`, `nurse`, `lab`, `subaccount`, `super_admin` ([`patients/index.php`](backend/api/patients/index.php)).
- **Champs requis :** `first_name`, `last_name`, `phone` ; **email optionnel** pour pro/nurse/lab.
- **Anti-doublon :** hash email → 409 + `existing_patient_id` si déjà existant.
- **Mobile :** [`createPatient`](apps/mobile/src/features/patients/api/patients.service.ts) + [`CreatePatientModal`](apps/mobile/src/features/patients/components/CreatePatientModal.tsx) ; constante [`NEW_PATIENT_ID`](apps/mobile/src/features/appointments/form/types.ts).
- **Après RDV :** `linkPatientProfessional` (accès dossier) — [`patient_professional_access`](database/migrations/047_create_patient_professional_access.sql).

### Validation métier (à réutiliser pour l’IA)

- **Package partagé :** [`validateUnifiedRdvPayload`](packages/shared-utils/src/dashboard-unified-rdv.ts) — adresse géolocalisée, créneaux min 1 h, champs patient, services multiples.
- **Mobile :** [`buildSingleAppointmentPayload`](apps/mobile/src/features/appointments/form/hooks/useAppointmentForm.ts) / batch `creation_batch_id`.
- **Statuts :** patient → `pending` + dispatch ; nurse créateur soins → souvent `confirmed` + `assigned_nurse_id`.

### Ce que l’IA ne doit pas réinventer

L’IA **ne remplace pas** `POST /appointments` : elle produit un **brouillon validé** puis délègue la même chaîne métier (dispatch, notifications, documents) après clic **Valider** par l’humain.

---

## 2. Fichiers de référence obligatoires pour tout développeur

| Rôle | Document / chemin |
|------|-------------------|
| Vue métier | [`docs/plateforme-fonctionnalites-et-api.md`](docs/plateforme-fonctionnalites-et-api.md) |
| Mobile | [`docs/react-native-ingenieur-prompt.md`](docs/react-native-ingenieur-prompt.md), [`apps/mobile/AGENTS.md`](apps/mobile/AGENTS.md) (Expo v54) |
| Types partagés | [`packages/shared-types/`](packages/shared-types/), [`packages/shared-api/`](packages/shared-api/) |
| API | [`backend/api/index.php`](backend/api/index.php) (~86 endpoints) |
| Sécurité | [`backend/lib/Crypto.php`](backend/lib/Crypto.php), CSRF [`CSRFMiddleware.php`](backend/middleware/CSRFMiddleware.php) |

**Livrable documentaire proposé après validation :** `docs/cary-v2-sante-ia-prompt.md` (prompt ci-dessous + annexes schéma DB).

---

## 3. Prompt ingénieur adapté (à utiliser tel quel)

### PROMPT INGÉNIEUR LOGICIEL SENIOR — Cary / OneAndLab V2

Agis comme architecte logiciel senior pour **Cary** (plateforme de soins et prélèvements à domicile), en évoluant le monorepo **OneAndLab** (`/onev2`) **sans refonte** de l’existant.

**Stack actuelle (ne pas réinventer) :**
- **Backend :** PHP API-first, MySQL, routage [`backend/api/index.php`](backend/api/index.php), services [`backend/lib/`](backend/lib/), modèles [`backend/models/`](backend/models/).
- **Web :** Nuxt 3 [`frontend/`](frontend/) — SEO `cary.fr`, profils `/infirmier/{slug}`, `/Laboratoire/{slug}`.
- **Mobile :** Expo 54 / React Native [`apps/mobile/`](apps/mobile/) — rôles **uniquement** `patient`, `nurse`, `pro`, `preleveur` (`MOBILE_ROLES` dans [`packages/shared-constants`](packages/shared-constants/src/index.ts)). Rôles `lab`, `subaccount`, `super_admin` **restent web-only**.
- **Partagé :** `@oneandlab/shared-types`, `shared-utils`, `shared-api`, `shared-constants`.
- **Auth :** OTP email + JWT ; rôle relu en BDD via [`AuthMiddleware`](backend/middleware/AuthMiddleware.php). Mobile : reproduire CSRF + cookies ou accord backend Bearer-only pour mutations.
- **Données sensibles :** chiffrement AES-256-GCM HDS existant ([`Crypto`](backend/lib/Crypto.php)) pour profils et [`medical_documents`](database/migrations/011_create_medical_documents.sql).
- **Async actuel :** [`EmailQueue`](backend/lib/EmailQueue.php), [`SmsQueue`](backend/lib/SmsQueue.php), crons [`backend/cron/`](backend/cron/) — **pas de Redis aujourd’hui**.

**Objectif V2 :** augmenter Cary en plateforme santé intelligente **assistée** (pas autonome médicalement), en branchant IA et sync capteurs sur les modules déjà en production.

> **Module QR professionnel (analytics, poster, RDV)** : plan dédié [prompt_cary_v2_qr.plan.md](prompt_cary_v2_qr.plan.md)

---

### CONTRAINTES GLOBALES (inchangées + ancrage Cary)

- Aucune prescription automatique ; aucune décision médicale automatique ; aucune recommandation = avis médical.
- Toute suggestion IA : **validation humaine** avant action métier (RDV, message patient, document publié).
- **Prise de RDV par l’IA :** autorisée uniquement via **brouillon + récap + clic Valider** ; jamais de `POST /appointments` sans confirmation explicite (voir § 2.7).
- Disclaimer configurable sur **chaque** réponse IA (texte admin, clé `ai_disclaimer_fr`).
- Traçabilité : tables `ai_*` + extension de [`access_logs`](database/migrations/007_create_access_logs.sql) pour actions sensibles.
- Historique intégral conversations ; audit prompts/réponses ; journalisation alignée HDS.
- **Couche LLM abstraite** (PHP `backend/lib/ai/`) :

```php
interface LLMProviderInterface {
    public function chat(array $messages, array $options = []): LLMResponse;
    public function complete(string $prompt, array $options = []): LLMResponse;
    public function transcribeAudio(string $audioPath, array $options = []): TranscriptionResponse; // Module 4
    public function synthesizeSpeech(string $text, array $options = []): SpeechResponse; // Module 4
}
// DeepSeekProvider, GrokProvider, OpenAIProvider, ClaudeProvider, GeminiProvider, LocalProvider (stub)
```

- Config runtime : `ACTIVE_AI_PROVIDER=deepseek` (fallback global) + table **`ai_task_routing`** (Module 04.7) — changement sans redéploiement mobile.
- **Règle absolue :** aucun code métier n’appelle un SDK fournisseur ; **100 % des appels IA passent par `AIGateway`** ([`backend/lib/ai/AIGateway.php`](backend/lib/ai/AIGateway.php)).
- L’app **ne dépend jamais** d’un seul fournisseur.

---

### MODULE 1 — Apple Health + Health Connect (greenfield)

**Mobile — nouvelle feature** `apps/mobile/src/features/health-sync/` :
- iOS : HealthKit (`expo-health` ou module natif documenté Expo 54) — métriques v1 : poids, taille, FC, pas, calories, distance, activité ; **sommeil** : types + API ingest seulement (UI graphique phase 2).
- Android : Health Connect — même jeu de métriques.
- UX : consentement explicite, sync manuelle / auto / background, historique des syncs, détection révocation permissions.
- Permissions : ajouter clés dans [`apps/mobile/app.json`](apps/mobile/app.json) / `app.config.js` (`NSHealthShareUsageDescription`, etc.).

**Backend — migrations nouvelles** (préfixe `067+`) :
- `health_sources` (patient_id, platform, external_source_id, revoked_at)
- `health_syncs` (source_id, status, started_at, finished_at, error, metrics_count)
- `health_metrics` (patient_id, metric_type ENUM, value, unit, recorded_at, source_id, external_id UNIQUE pour dédup)
- `health_permissions` (snapshot consentements)

**API** (sous `backend/api/health/` ) :
- `POST /health/metrics/batch` — ingest idempotent
- `GET /health/sources`, `GET /health/syncs`
- `DELETE /health/sources/{id}` — révocation RGPD

**Sécurité :** chiffrer valeurs sensibles comme profils (DEK par enregistrement ou agrégat journalier selon perf). Accès **patient only** ; staff **aucun accès** par défaut (sauf évolution produit tracée).

**Dashboard patient (mobile)** — nouvel onglet `(patient)` « Mes données santé » :
- Graphiques poids / activité / FC (ex. `victory-native` ou équivalent déjà dans le projet).
- Alertes **visuelles uniquement** (« valeur hors plage habituelle ») — jamais diagnostic.

**Réutiliser :** pattern device de [`push_device_tokens`](database/migrations/066_push_device_tokens.sql) pour lier appareil ↔ source santé.

---

### MODULE 2 — IA Cary augmentée (greenfield, branché sur l’existant)

#### 2.1 AI Gateway PHP

Nouveau namespace `backend/lib/ai/` :
- `AIGateway.php` : `analyzeDocument()`, `chat()`, `summarizePatient()`, `generateAppointmentSuggestion()`, `medicalExplanation()`, `ocrAnalysis()`
- Routing : DeepSeek par défaut ; feature flags par type de tâche.
- **OCR** : worker/cron (phase 1 : Tesseract ou API cloud **hors chemin synchrone HTTP**) — entrée = fichiers déjà dans [`medical_documents`](backend/api/medical-documents/index.php) après déchiffrement **en mémoire uniquement**, jamais stocker PDF clair.

#### 2.2 Contexte métier (RAG + prompts)

**Sources RAG (indexer progressivement) :**
- Profil patient chiffré (champs déchiffrés en worker)
- RDV : [`appointments`](database/migrations/002_create_appointments.sql) + statuts
- Documents : types `ordonnance`, `resultats`, etc.
- [`lab-results`](backend/api/lab-results/index.php) — métadonnées + texte extrait OCR
- Commentaires [`care_photo_comments`](database/migrations/050_care_photo_gallery.sql)
- Historique [`patient-history`](backend/api/patient-history/index.php)

**Vector store :** Qdrant (recommandé) ou Weaviate — service sidecar, **pas** dans MySQL. Collection par `patient_id` avec ACL stricte.

**Tables IA** (migrations dédiées) :
- `ai_conversations` — voir **Module 5** pour champs UX (`conversation_type`, `is_pinned`, `custom_title`, `archived_at`, `deleted_at`, `is_system`, `channel`)
- `ai_messages`, `ai_contexts`, `ai_audits`
- `ai_summaries` — résumés **documents** ; `ai_conversation_summaries` — résumés **conversations** (Module 5)
- `platform_settings` : disclaimer multilingue, température, quotas
- Voir Modules 4–5 : `ai_reports`, `ai_patient_signals`, `ai_task_routing`, `voice_*`, `ai_user_memory`, `ai_conversation_attachments`

#### 2.3 Assistants

| Assistant | Client | Contexte injecté |
|-----------|--------|------------------|
| **Patient** | Mobile `(patient)` + web patient | Profil, RDV à venir/passés, résultats (`lab-results`), docs patient, ordonnances archivées |
| **Professionnel** | Mobile `nurse`/`pro` + web pro | Dossier via [`PatientDossierAccess`](backend/lib/PatientDossierAccess.php), timeline RDV, derniers résultats, synthèse conversations |

**Capacités autorisées :** vulgarisation, résumé document, préparation RDV, **constitution d’un brouillon de prise de RDV** (§ 2.7), explication terme — **interdit** : diagnostic, traitement, prescription, **confirmation de RDV sans clic utilisateur**.

**Validation humaine :** pour `summarizePatient`, compte-rendu préconsultation, toute synthèse exportable → statut `draft` → bouton « Valider et enregistrer » → écriture dans `medical_documents` ou note RDV **uniquement après clic pro**.

#### 2.4 Analyse documents

Pipeline asynchrone :
1. Upload existant (inchangé)
2. Job `AiDocumentJob` (cron CLI ou queue Redis **phase infra**)
3. OCR → extraction structurée JSON → analyse LLM → résumé stocké `ai_summaries` lié à `medical_document_id`
4. Détection « valeur hors plage » = **flags informatifs**, pas diagnostic

#### 2.5 Moteur suggestion RDV

- Entrée : dernier `resultats`, date dernier bilan, métriques health (optionnel)
- Sortie : notification + carte mobile « Envisager un contrôle » — **jamais** `POST /appointments` automatique
- Workflow : suggestion → **pré-remplissage** wizard existant [`useAppointmentForm`](apps/mobile/src/features/appointments/form/hooks/useAppointmentForm.ts) / [`rendez-vous/nouveau.vue`](frontend/pages/rendez-vous/nouveau.vue) → validation utilisateur

#### 2.6 API REST (préfixe `/api/ai/`)

- `POST /ai/chat` — conversation patient ou pro (body: `conversation_id?`, `message`, `context_scope`)
- `GET /ai/conversations`, `GET /ai/conversations/{id}/messages`
- `DELETE /ai/conversations/{id}` — droit RGPD patient
- `POST /ai/documents/{medical_document_id}/analyze` — déclenche job
- `GET /ai/documents/{id}/summary`
- `POST /ai/patients/{id}/summarize` — pro only, sortie draft
- `GET /ai/suggestions` — suggestions RDV actives pour le patient connecté
- **Booking assisté (§ 2.7) :** `POST/GET/PATCH /ai/booking/drafts`, `POST /ai/booking/drafts/{id}/confirm`
- `GET /admin/ai/settings`, `PUT /admin/ai/settings` — super_admin web
- `GET /admin/ai/usage` — tokens, coûts, taux erreur

**Mobile :** feature `apps/mobile/src/features/ai-assistant/` — hub conversationnel complet décrit en **Module 5** (onglet dédié, pas un écran secondaire caché).

---

### MODULE 3 — QR professionnel

Voir le plan dédié : [prompt_cary_v2_qr.plan.md](prompt_cary_v2_qr.plan.md)

---

### MODULE 4 — IA vocale, agents intelligents et architecture future

**Objectif :** préparer Cary à des interactions naturelles (texte, voix, automatisations) **sans remplacer** les professionnels — réduction administrative, meilleur accompagnement patient. **Conception dès la Phase A** : tables et interfaces même si l’UI vocale est en Phase D.

**Principe transversal :** le Module 4 **s’appuie** sur les Modules 1–2 (pas de refonte) :
- Voix et chat texte partagent `ai_conversations` / `ai_messages` (champ `channel`: `text` | `voice`).
- Objets connectés alimentent `health_metrics` (Module 1) via `connected_devices`.
- Agent de suivi étend le moteur suggestions RDV (Module 2.5) + [`NotificationService`](backend/lib/NotificationService.php).
- Comptes rendus étendent `ai_summaries` avec workflow publication (Module 2.3).

```mermaid
flowchart LR
  subgraph clients [Clients]
    MP[Mobile Patient]
    MN[Mobile Nurse Pro]
    AD[Admin Web]
  end
  subgraph gateway [AI Gateway obligatoire]
    GW[AIGateway]
    RT[ai_task_routing]
  end
  subgraph providers [Providers]
    DS[DeepSeek]
    GK[Grok]
    OAI[OpenAI]
    CL[Claude]
    GM[Gemini]
    LOC[Local stub]
  end
  MP --> GW
  MN --> GW
  AD --> GW
  GW --> RT
  RT --> DS
  RT --> GK
  RT --> OAI
  RT --> CL
  RT --> GM
  RT --> LOC
```

#### 04.1 — Assistant vocal patient

**Objectif :** communiquer avec l’IA par la voix (ex. « Explique mon résultat », « Mon prochain RDV ? », « Résume mon dossier »).

**Fonctionnalités (Phase D UI, schéma Phase A) :**
- STT (reconnaissance) + TTS (synthèse) via `AIGateway::transcribe()` / `::synthesize()` — fournisseur routé (ex. Grok pour vocal, configurable admin).
- Conversation naturelle : même thread que chat texte ; bascule texte ↔ voix à tout moment.
- Historique vocal conservé (transcriptions + métadonnées audio chiffrées ou URLs signées courte durée).
- **Multilingue v1 :** FR (défaut), EN, AR, ES — champ `locale` sur `voice_sessions` ; prompts système i18n dans `platform_settings`.

**Mobile :** `apps/mobile/src/features/ai-voice/` — `expo-av` enregistrement, upload chunk vers API ; lecture TTS stream ou fichier.

**Tables (migration Phase A) :**
- `voice_sessions` (id, user_id, patient_id, ai_conversation_id nullable, locale, channel, started_at, ended_at)
- `voice_messages` (session_id, role user|assistant, audio_storage_key nullable, duration_ms, created_at)
- `voice_transcriptions` (voice_message_id, text, provider, confidence, language_detected)

**API** (`backend/api/ai/voice/`) :
- `POST /ai/voice/sessions` — démarre session (lie `conversation_id` optionnel)
- `POST /ai/voice/sessions/{id}/audio` — upload audio → transcription → `AIGateway::chat()` → TTS réponse
- `GET /ai/voice/sessions/{id}/messages`
- Même disclaimer et `ai_audits` que le chat texte.

**Garde-fous :** mêmes interdictions que Module 2 ; chaque réponse vocale = disclaimer lu en TTS (configurable « lire disclaimer » on/off).

#### 04.2 — Assistant vocal professionnel (dictée)

**Objectif :** dicter observations post-consultation ; l’IA produit un **brouillon** structuré — **aucune écriture directe** dans le dossier.

**Cas d’usage :** après RDV [`appointments`](database/migrations/002_create_appointments.sql), le pro dicte → brouillon : résumé structuré, note médicale, compte-rendu pré-consultation, entrée d’historique exploitable.

**Workflow :**
1. `POST /ai/voice/pro/dictate` (nurse/pro, `appointment_id`, audio ou texte transcrit)
2. `AIGateway` + contexte RAG patient (via [`PatientDossierAccess`](backend/lib/PatientDossierAccess.php))
3. Création `ai_reports` statut `draft` (voir 04.3)
4. UI validation dans fiche RDV mobile [`RdvDetail`](apps/mobile/src/features/appointments/detail/) ou web dashboard
5. Après validation manuelle uniquement : `POST /ai/reports/{id}/publish` → écriture [`medical_documents`](backend/api/medical-documents/index.php) ou note liée RDV

**Mobile :** bouton dictée sur écran détail RDV pro/infirmier ; réutiliser patterns [`generate-prescription`](backend/api/appointments/[id]/generate-prescription.php) (saisie → document, mais **IA = draft obligatoire**).

#### 04.3 — Compte rendu intelligent

**Objectif :** transformer notes, échanges et données en synthèses exploitables avec traçabilité complète.

**Types de génération** (enum `report_type`) :
- `consultation_summary`, `dossier_summary`, `lab_results_summary`, `appointments_history_summary`, `ai_conversation_summary`

**Table `ai_reports`** (Phase A) :
- `id`, `patient_id`, `appointment_id` nullable, `created_by`, `report_type`, `status` (`draft`|`validated`|`published`|`archived`), `content_json`, `content_text`, `source_ai_audit_id`, `published_medical_document_id` nullable, timestamps

**Workflow obligatoire :**
1. Création brouillon (IA ou dictée 04.2)
2. Validation humaine (pro) — écran diff avant/après
3. Publication → document chiffré ou entrée historique
4. Archivage + lien `access_logs`

**Réutiliser :** ne pas dupliquer [`PrescriptionPdf`](backend/lib/PrescriptionPdf.php) pour les synthèses IA ; PDF export optionnel **après** validation depuis `ai_reports` publié.

**API :**
- `POST /ai/reports/generate` — body `{ patient_id, report_type, appointment_id? }`
- `GET /ai/reports/{id}`, `PUT /ai/reports/{id}` — édition manuelle pré-validation
- `POST /ai/reports/{id}/validate`, `POST /ai/reports/{id}/publish`, `POST /ai/reports/{id}/archive`

#### 04.4 — Agent IA de suivi patient

**Objectif :** moteur de suivi **informatif** identifiant des situations où une action **peut** être pertinente pour le patient — sans automatisation médicale.

**Règles absolues — l’agent ne doit jamais :**
- prendre rendez-vous (`POST /appointments` interdit côté agent)
- prescrire ou diagnostiquer
- contacter un professionnel sans validation humaine explicite

**Cas d’usage (règles déterministes + enrichissement LLM optionnel) :**
| Signal | Source Cary existante | Action autorisée |
|--------|----------------------|------------------|
| Bilan non réalisé depuis X mois | `lab-results` + `medical_documents.resultats` | Suggestion + brouillon IA booking (§ 2.7) ou notif |
| Résultat reçu | Nouveau doc `resultats` + job analyse Module 2 | Notif + carte explicative |
| RDV non honoré | `appointments.status` annulé/no-show | Rappel informatif |
| Ordonnance bientôt expirée | docs `ordonnance` + date metadata | Suggestion contrôle |
| Document manquant | booking draft / RDV pending docs | Rappel upload |
| Profil incomplet | `profiles` champs requis | Rappel complétion |

**Tables (Phase A) :**
- `ai_patient_signals` (patient_id, signal_type, severity informational, payload_json, detected_at, dismissed_at, acted_at)
- `ai_agent_runs` (cron job id, patients_scanned, signals_created, run_at) — audit batch

**Workflow :**
1. Cron `backend/cron/ai-patient-followup.php` (quotidien) ou trigger post-upload résultat
2. Création signal + notification via [`NotificationService`](backend/lib/NotificationService.php)
3. Patient ouvre carte → hub IA crée `ai_appointment_draft` pré-rempli OU deep link wizard classique (`?suggestion_id=`)
4. **Clic Valider** sur récap (§ 2.7) = seule création RDV

**API :** `GET /ai/signals`, `POST /ai/signals/{id}/dismiss`, `POST /ai/signals/{id}/act` → retourne `{ draft_id }` ou `{ booking_wizard_params }` — **jamais** `appointment_id` créé côté `act`.

#### 04.5 — Objets connectés (extension Module 1)

**Objectif :** préparer l’ingestion multi-marques sans refonte de `health_metrics`.

**Appareils futurs (enum `device_vendor`) :** `apple_watch`, `garmin`, `fitbit`, `oura`, `withings`, `samsung_watch`, `connected_scale`, `bp_monitor`, `glucometer`, + `apple_health` / `health_connect` (agrégateurs Module 1).

**Tables (Phase A) :**
- `connected_devices` (patient_id, vendor, model, external_device_id, health_source_id FK nullable, paired_at, revoked_at)
- `device_syncs` (device_id, status, metrics_count, error, started_at, finished_at) — miroir `health_syncs`
- `device_measurements` — **vue logique** : en pratique **normaliser vers `health_metrics`** avec `source_type=device` et `connected_device_id` pour éviter deux pipelines d’ingest.

**Types métriques étendus** (ENUM `metric_type`) : poids, taille, activité, sommeil, FC, VO2max, tension, glycémie, température, SpO2 — champs réservés NULL en v1.

**API :** `POST /health/devices/pair`, `POST /health/devices/{id}/sync`, `DELETE /health/devices/{id}` — réutilise `POST /health/metrics/batch`.

#### 04.6 — Moteur de prédiction et tendances (descriptif uniquement)

**Objectif :** analyser l’évolution temporelle ; produire **observations et tendances**, jamais diagnostic ni conclusion médicale.

**Exemples de sorties autorisées :** « Poids en légère baisse sur 30 jours », « Activité inférieure à votre moyenne », « Pas de bilan uploadé depuis 12 mois ».

**Table `ai_trends`** (Phase A, calcul Phase D) :
- `patient_id`, `metric_type` nullable, `trend_key`, `observation_fr`, `observation_en` nullable, `window_days`, `computed_at`, `data_points_count`

**Service :** `backend/lib/ai/TrendEngine.php` — règles statistiques simples (régression linéaire, seuils configurables admin) ; LLM optionnel **uniquement** pour reformulation descriptive via `AIGateway` avec prompt interdisant diagnostic.

**UI patient :** section dans onglet « Mes données santé » — badges informatifs, pas d’alerte médicale.

#### 04.7 — IA multi-fournisseurs et routing intelligent

**Objectif :** zéro dépendance code métier à DeepSeek ; migration Grok/GPT/Claude/Gemini/local sans toucher aux features.

**Implémentations** (`backend/lib/ai/providers/`) :
- `DeepSeekProvider` (défaut global)
- `GrokProvider`, `OpenAIProvider`, `ClaudeProvider`, `GeminiProvider`
- `LocalProvider` — stub retournant erreur contrôlée ou modèle on-prem futur

**Table `ai_task_routing`** :
- `task_type` ENUM : `chat_simple`, `chat_complex`, `medical_summary`, `document_analysis`, `ocr`, `voice_agent`, `voice_transcription`, `trend_wording`, `appointment_suggestion`
- `provider` ENUM, `model` varchar nullable, `priority` int, `enabled`

**Exemple routing par défaut (modifiable admin) :**

| task_type | provider suggéré |
|-----------|------------------|
| chat_simple | deepseek |
| chat_complex | openai |
| medical_summary | claude |
| document_analysis | deepseek |
| voice_agent | grok |
| voice_transcription | openai |
| appointment_suggestion | deepseek |

**`AIGateway::resolveProvider(string $taskType)`** — lit `ai_task_routing` + cache ; log chaque choix dans `ai_audits`.

#### 04.8 — Agent administrateur IA (cockpit étendu)

**Extension** de la section « Cockpit IA » (web `super_admin` uniquement) — [`frontend/pages/admin/`](frontend/pages/admin/) :

**Dashboard métriques :**
- Conversations texte vs voix (`ai_conversations.channel`)
- Analyses documents / rapports générés
- Coût estimé **par fournisseur** (agrégation `ai_audits.tokens * tarif config`)
- Temps de réponse p50/p95, taux d’erreur
- Satisfaction (table future `ai_feedback` : thumbs + commentaire optionnel)
- Usage patient vs pro (filtre `user.role`)

**Audit complet (déjà `ai_audits`, UI enrichie) :**
- Prompt (hash + extrait), réponse (extrait), modèle, latence, tokens, `user_id`, `patient_id` si applicable
- Export CSV aligné [`access_logs`](database/migrations/007_create_access_logs.sql) / logs HDS admin
- Actions RGPD : suppression conversation, export patient, anonymisation

**API admin :** `GET /admin/ai/dashboard`, `GET /admin/ai/audits`, `PUT /admin/ai/routing`, `GET /admin/ai/routing`

#### Architecture obligatoire Module 4 (checklist développeur)

1. Toute feature IA/vocale/agent → **un seul point d’entrée** : `AIGateway`.
2. Schémas DB Module 4 créés en **Phase A** même si UI Phase D.
3. `connected_devices` → normalisation **`health_metrics`** (un pipeline graphiques).
4. `voice_*` lié à `ai_conversations` (pas de silo parallèle).
5. `ai_reports` / agent suivi : statuts `draft` avant toute écriture [`medical_documents`](database/migrations/011_create_medical_documents.sql).
6. Types partagés dans `@oneandlab/shared-types` : `VoiceSession`, `AiReport`, `AiPatientSignal`, `AiTrend`, `AiTaskType`.

---

### MODULE 5 — Expérience IA, mémoire et UX conversationnelle

**Objectif :** faire de Cary une **plateforme IA native** (pas un chatbot ajouté). UX inspirée des meilleures pratiques ChatGPT, adaptée au contexte santé : disclaimer, validation humaine pour actes métier, pas de diagnostic. L’IA est un **copilote santé** accessible depuis tous les parcours.

**Positionnement produit :** l’utilisateur doit percevoir Cary comme son assistant santé personnel, son historique médical intelligent et son copilote quotidien.

#### 05.1 — Navigation principale mobile (obligatoire)

**Ajout d’un onglet « IA » dans la Bottom Navigation** pour **tous les rôles mobile** (`patient`, `nurse`, `pro`, `preleveur`) :

| Fichier à modifier | Ordre des onglets |
|--------------------|-------------------|
| [`apps/mobile/app/(patient)/(tabs)/_layout.tsx`](apps/mobile/app/(patient)/(tabs)/_layout.tsx) | … → **`ai`** → **`more`** |
| [`apps/mobile/app/(nurse)/(tabs)/_layout.tsx`](apps/mobile/app/(nurse)/(tabs)/_layout.tsx) | … → **`ai`** → **`more`** |
| [`apps/mobile/app/(pro)/(tabs)/_layout.tsx`](apps/mobile/app/(pro)/(tabs)/_layout.tsx) | … → **`ai`** → **`more`** |
| [`apps/mobile/app/(preleveur)/(tabs)/_layout.tsx`](apps/mobile/app/(preleveur)/(tabs)/_layout.tsx) | … → **`ai`** → **`more`** |

**Règle de position :** l’onglet `ai` est déclaré **immédiatement avant** `more` dans chaque `_layout.tsx` (Expo Router = ordre d’affichage dans [`TabBar`](apps/mobile/src/components/navigation/TabBar.tsx)).

**Route :** `apps/mobile/app/(role)/(tabs)/ai.tsx` → stack interne `ai/index` (liste) + `ai/[conversationId]` (chat).

**Icône :** `Sparkles` ou `Bot` (lucide-react-native), label court « IA », cohérent avec tokens Cary [`colors.ts`](apps/mobile/src/theme/colors.ts).

**Point d’entrée :** ouvre directement le **hub conversationnel** (pas un menu intermédiaire).

#### 05.2 — Page d’accueil IA (hub ChatGPT-like)

**Feature :** `apps/mobile/src/features/ai-hub/` (peut fusionner avec `ai-assistant/` — un seul module `features/ai/` recommandé).

**Écran liste** (`AiHubScreen`) — contenu :
- **Mon Assistant Santé** (carte fixe en tête, toujours visible)
- Conversations **épinglées** (`is_pinned`, tri prioritaire)
- **Conversations récentes** (tri `updated_at` desc, hors archivées)
- Barre **recherche globale** (voir 05.8)
- Bouton **Nouvelle conversation**
- **Suggestions rapides** (chips) : « Explique mes derniers résultats », « Résume mon dossier », etc.
- Section **Archives** (lien vers liste `archived_at IS NOT NULL`)

**Web patient (phase ultérieure) :** miroir optionnel `frontend/pages/patient/ia/` — mobile prioritaire Phase B.

#### 05.3 — Assistant Santé permanent (conversation système)

**Création automatique** à la première connexion patient (`POST /auth/verify-otp` ou hook `GET /auth/me` si absente).

| Champ | Valeur |
|-------|--------|
| `is_system` | `true` |
| `system_key` | `assistant_health` |
| `custom_title` | `Mon Assistant Santé` |
| `conversation_type` | `assistant_health` |
| `is_pinned` | `true` (forcé) |
| `archived_at` | NULL (interdit) |
| `deleted_at` | NULL (interdit suppression) |

**Règles API :** `DELETE /ai/conversations/{id}` retourne **403** si `is_system=true`. `PATCH` ne peut pas désépingler ni archiver cette conversation.

**Contexte RAG injecté automatiquement** (mémoire médicale — 05.5) :
- Dossier patient ([`patients`](backend/api/patients/), profil chiffré)
- RDV ([`appointments`](backend/api/appointments/index.php))
- Résultats ([`lab-results`](backend/api/lab-results/index.php))
- Documents ([`medical-documents`](backend/api/medical-documents/), [`patient-documents`](backend/api/patient-documents/))
- Métriques Module 1 (`health_metrics`, HealthKit / Health Connect)
- Résumés IA (`ai_summaries`, `ai_reports` publiés)
- Historique Cary ([`patient-history`](backend/api/patient-history/index.php))

**Variantes rôle pro (nurse/pro) :** conversation système `assistant_professional` — titre « Mon Assistant Cary Pro », contexte limité aux patients accessibles via [`PatientDossierAccess`](backend/lib/PatientDossierAccess.php) ; pas d’accès dossier hors périmètre.

#### 05.4 — Conversations multiples et types

Comportement **type ChatGPT** : conversations illimitées, persistance totale, reprise exacte après mois d’inactivité.

**Enum `conversation_type` :**
- `general`
- `assistant_health` (système patient)
- `lab_results`
- `medical_document`
- `appointment`
- `health_tracking`
- `professional` (nurse/pro)
- `voice` (lien `voice_sessions` Module 4)

**Champs `ai_conversations` (migration Phase A, compléter Module 2) :**
- `id`, `user_id`, `patient_id` (patient concerné — self ou proche selon contexte)
- `conversation_type`, `channel` (`text`|`voice`)
- `custom_title` nullable (renommage utilisateur)
- `is_pinned` boolean default false
- `is_system`, `system_key` nullable
- `archived_at`, `deleted_at` nullable (soft delete RGPD)
- `last_message_at`, `message_count`, `created_at`, `updated_at`
- `metadata_json` (liens : `appointment_id`, `medical_document_id`, etc.)

**API conversations :**
- `GET /ai/conversations` — liste (filtres: pinned, archived, type, q search)
- `POST /ai/conversations` — nouvelle (`conversation_type`, `custom_title?`, `context_refs?`)
- `PATCH /ai/conversations/{id}` — rename, pin, archive, unarchive
- `DELETE /ai/conversations/{id}` — soft delete (`deleted_at`) sauf système

#### 05.5 — Mémoire IA multi-niveaux

```mermaid
flowchart TB
  subgraph memory [Mémoire Cary]
    MC[Mémoire conversation]
    MU[Mémoire utilisateur]
    MM[Mémoire médicale]
  end
  subgraph inject [Injection LLM]
    RAG[RAG Qdrant]
    CTX[Prompt context window]
  end
  MC --> CTX
  MU --> CTX
  MM --> RAG
  RAG --> CTX
  CTX --> GW[AIGateway]
```

**A. Mémoire de conversation** (`ai_conversation_summaries` + messages)
- Historique complet `ai_messages` — **aucune suppression auto**
- Résumé rolling stocké dans `ai_conversation_summaries` (voir 05.6)
- Injecté : derniers N messages + dernier résumé

**B. Mémoire utilisateur** — table `ai_user_memory`
- `user_id`, `key`, `value_encrypted`, `dek`, `category` (`preference`|`locale`|`habit`|`other_non_medical`)
- Ex. langue préférée, ton réponses, rappels UX — **pas de données médicales**

**C. Mémoire médicale** — table `ai_medical_memory` (cache structuré + RAG)
- `patient_id`, `snapshot_type`, `content_json`, `content_hash`, `refreshed_at`
- Types : `dossier`, `appointments_recent`, `lab_results_index`, `documents_index`, `health_metrics_summary`
- Régénération : cron ou invalidation sur upload doc / nouveau RDV / sync health
- **Injectée automatiquement** dans RAG pour `assistant_health` et conversations liées dossier

**Service :** `backend/lib/ai/MemoryComposer.php` — assemble les 3 niveaux avant chaque appel `AIGateway::chat()`.

#### 05.6 — Résumés automatiques de conversation

**Table `ai_conversation_summaries` :**
- `conversation_id`, `summary_text`, `covers_message_id_until`, `token_count_estimate`, `created_at`

**Règle :** tous les **X messages** (config admin, défaut 20) → job async `AiConversationSummarizeJob` :
1. Résumer l’historique non encore résumé
2. Stocker dans `ai_conversation_summaries`
3. Envoyer au LLM : résumé(s) + messages récents seulement → **réduction coût tokens**
4. Conserver historique intégral en BDD (jamais supprimé pour affichage UI)

#### 05.7 — Épinglage, renommage, archivage, RGPD

| Fonction | Champ / API |
|----------|-------------|
| Épingler / désépingler | `is_pinned` — `PATCH` (sauf système : pin forcé) |
| Renommer | `custom_title` — ex. « Résultats Mars 2026 », « Suivi Vitamine D » |
| Archiver / restaurer | `archived_at` — masqué du hub principal, visible section Archives |
| Suppression RGPD | `deleted_at` — masque conversation + option purge messages (`purge_messages` flag) |
| Export IA | `GET /ai/export` — JSON/ZIP conversations + messages + audits pour le patient connecté |

**Tri hub :** 1) système, 2) épinglées par `updated_at`, 3) récentes.

#### 05.8 — Recherche IA globale

**API :** `GET /ai/search?q=ferritine|vitamine D|prise de sang`

**Sources indexées :**
- `ai_conversations.custom_title`
- `ai_messages.content` (FULLTEXT MySQL ou index Qdrant parallèle)
- `ai_conversation_summaries.summary_text`
- Métadonnées documents liés (`ai_conversation_attachments` → `medical_documents`)

**Réponse :** groupes `{ conversations[], messages[], summaries[], documents[] }` avec extraits surlignés.

#### 05.9 — Chat multimodal et pièces jointes

**Table `ai_conversation_attachments` :**
- `id`, `conversation_id`, `message_id` nullable, `medical_document_id` nullable, `attachment_type` (`pdf`|`image`|`ordonnance`|`resultats`|`other`)
- `storage_key`, `mime_type`, `file_name`, `created_at`

**Workflow :**
1. Utilisateur joint PDF/image/doc existant ou upload nouveau → réutilise pipeline [`medical-documents`](backend/api/medical-documents/index.php) puis lien attachment
2. Message utilisateur référence `attachment_ids[]`
3. `AIGateway` + OCR Module 2 si besoin → réponse avec **citations** (`citation_refs[]` dans `ai_messages.metadata_json`)

**Architecture multimodale (même conversation) :**
- `text` — v1 Phase B
- `voice` — Phase D (Module 4)
- `image` / `pdf` / doc médical — Phase B attachments, analyse async

#### 05.10 — Expérience chat (ChatGPT-like)

**Écran chat** `AiChatScreen` :
- **Streaming SSE** : `POST /ai/chat/stream` — chunks token par token (Phase B ; fallback polling si infra limite)
- Rendu **Markdown** (`react-native-markdown-display` ou équivalent)
- **Scroll intelligent** (auto-scroll si user en bas, pause si scroll up)
- Bulles user/assistant, indicateur « Cary réfléchit… »
- **Citations** : liens vers doc/RDV source (ouvre sheet document existant)
- Toggle **texte ↔ voix** (Module 4) dans barre de saisie
- Disclaimer en footer + première réponse de session

**Composants réutilisables :** s’inspirer de patterns messagerie [`CarePhotoDiscussionScreen`](apps/mobile/src/features/appointments/screens/CarePhotoDiscussionScreen.tsx) pour fil scroll, pas pour UI médicale.

#### 05.11 — Entrées contextuelles depuis les autres parcours

L’IA doit être joignable **hors de l’onglet IA** via deep links :

| Parcours existant | Action | Paramètres |
|-------------------|--------|------------|
| [`lab-results`](apps/mobile/src/features/lab-results/) | « Demander à Cary » | `conversation_type=lab_results`, prefill context |
| Détail RDV patient | « Préparer ce RDV » | `appointment_id` contexte |
| Chat IA | « Je veux un RDV pour… » | `POST /ai/booking/drafts` → récap → Valider |
| Pro — fiche patient / chat | RDV pour patient inconnu | brouillon + `create_new` au confirm → `POST /patients` puis RDV |
| Documents patient | « Analyser ce document » | `medical_document_id` |
| Onglet santé Module 1 | « Mes tendances » | `health_tracking` |
| Notification agent 04.4 | Ouvre hub + signal | `suggestion_id` |

**Implémentation :** `router.push('/(patient)/(tabs)/ai?...')` ou stack `ai/[conversationId]` avec `initialMessage` query.

#### 05.12 — Suggestions intelligentes (hub)

Chips dynamiques basées sur données réelles (pas statiques) :
- « Explique mes derniers résultats » — si `lab-results` récents
- « Résume mon dossier » — toujours (assistant_health)
- « Prépare mon prochain rendez-vous » / « Prendre un rendez-vous » — lance brouillon § 2.7
- « Analyse mes documents » — si docs non analysés
- « Montre mes tendances santé » — si `health_metrics` ou Module 04.6

Génération : `GET /ai/quick-suggestions` — règles métier + optionnel LLM pour libellés.

#### 05.13 — API complémentaires Module 5

- `GET /ai/hub` — payload agrégé hub (système + pinned + recent + suggestions)
- `POST /ai/conversations/{id}/messages` — message (non-stream)
- `POST /ai/chat/stream` — SSE streaming
- `GET /ai/conversations/{id}/messages?cursor=`
- `POST /ai/conversations/{id}/attachments`
- `GET /ai/search?q=`
- `GET /ai/export`
- `POST /ai/conversations/ensure-system` — idempotent création assistant santé

#### 05.14 — Architecture obligatoire Module 5 (checklist)

1. Onglet **`ai` avant `more`** sur les 4 layouts tabs mobile.
2. Conversation système créée **automatiquement** — jamais supprimable/archivable.
3. **Aucune perte de contexte** : messages persistés ; résumés = compression LLM seulement.
4. Tous les appels LLM → `AIGateway` + `MemoryComposer` + disclaimer.
5. Types `@oneandlab/shared-types` : `AiConversation`, `ConversationType`, `AiHubPayload`, `AiMessage`, `AiAttachment`.
6. WebSocket optionnel Phase C ; **SSE suffit** pour streaming Phase B.
7. Prise de RDV : toujours **brouillon → récap → Valider** (§ 2.7) ; cartes récap dans le fil de chat.

---

### NOTIFICATIONS (extension)

Réutiliser [`NotificationService`](backend/lib/NotificationService.php) + types dans [`Notification.php`](backend/models/Notification.php) :
- Nouveaux types : `health_sync_completed`, `ai_suggestion_available`, `lab_results_ai_summary_ready`, `ai_signal_detected`, `ai_report_ready_for_validation`, `voice_session_summary` (informatif)
- Push via [`ExpoPushService`](backend/lib/ExpoPushService.php)
- Email/SMS : files existantes
- **WhatsApp Business :** interface `NotificationChannelInterface` + stub `WhatsAppChannel` (non activé)

---

### ADMINISTRATION — Cockpit IA (Modules 2 + 04.8)

**Web-only** `frontend/pages/admin/ai/` (rôle `super_admin`) :
- Provider actif, **routing par `task_type`** (table `ai_task_routing`), température, quotas
- Dashboard : conversations, analyses, coûts par fournisseur, latence, erreurs, satisfaction, usage patient/pro
- Logs `ai_audits` + `voice_transcriptions` + `ai_agent_runs` — export CSV (comme logs HDS)
- Édition disclaimer multilingue (FR/EN/AR/ES)

Ne pas dupliquer sur mobile.

---

### SÉCURITÉ & PERFORMANCE (adapté infra réelle)

| Exigence prompt générique | Adaptation Cary |
|-------------------------|-----------------|
| Redis queues | **Phase 0 :** scripts CLI + cron + shutdown queue ; **Phase 1 :** Redis + workers si charge OCR/IA |
| WebSocket temps réel | Chat IA : **SSE** `POST /ai/chat/stream` (Module 5, Phase B) ; WebSocket optionnel Phase C ; notifications = polling 60s existant |
| Cache | Cache fichier/APCu côté PHP pour settings IA ; CDN images profils publics |
| RBAC | Étendre `RoleMiddleware` + vérifier `PatientDossierAccess` sur chaque endpoint `/ai/patients/{id}/*` |
| TLS / AES | Déjà en place ; nouvelles tables health/ai même norme |

---

### ÉVOLUTIONS HORS SCOPE V2 (hooks prévus Module 4)

Téléconsultation, analyse d’imagerie assistée, agent vocal temps réel full-duplex, ECG watch — réservés ; schémas `metric_type` et `ai_task_routing` extensibles sans migration breaking.

---

### LIVRABLES ATTENDUS (par phase)

**Phase A — Fondations (4–6 sem.)**
- Migrations : `health_*`, `ai_*` **étendu Module 5**, **`ai_appointment_drafts`, `ai_booking_audits`**, `voice_*`, `connected_devices`, `ai_reports`, `ai_patient_signals`, `ai_trends`, `ai_task_routing`, `ai_conversation_summaries`, `ai_user_memory`, `ai_medical_memory`, `ai_conversation_attachments`
- `LLMProviderInterface` (6 providers) + `AIGateway` + `MemoryComposer` + routing par tâche
- API `/health/*`, `/ai/conversations` CRUD, `ensure-system`, `/ai/chat` (non-stream), tables audit
- Doc : schéma DB complet Modules 1–5, `docs/cary-v2-sante-ia-prompt.md`

**Phase B — Produit (6–8 sem.) — priorité UX IA native (Module 5)**
- **Onglet IA** (avant Plus) + hub ChatGPT-like + **Mon Assistant Santé** + chat Markdown + **SSE streaming**
- Recherche globale, épinglage, rename, archive, suggestions rapides, deep links depuis lab-results/RDV/docs
- Health sync + `connected_devices` → `health_metrics`
- RAG Qdrant + OCR async + pièces jointes conversation + citations
- `ai_reports` workflow + agent suivi (Module 04.4)
- Cockpit admin IA v1

**Phase C — Hardening**
- Tests PHPUnit (`backend/tests/ai/`), tests mobile ciblés, charge OCR + batch health
- Audit sécurité (prompt injection, fuite contexte inter-patients, audio RGPD)
- Feature flags ; non-régression 86 endpoints existants

**Phase D — Voix et tendances (6–8 sem., après B stable)**
- Assistant vocal patient (STT/TTS, multilingue FR/EN/AR/ES)
- Dictée pro post-RDV (04.2)
- `TrendEngine` + UI tendances descriptives onglet santé
- Routing vocal optimisé admin ; satisfaction `ai_feedback`

**Tests obligatoires :**
- Unitaire : providers LLM mockés, dédup health metrics, ACL RAG
- Intégration : upload doc → job → summary ; chat avec disclaimer
- Charge : batch health 10k points ; file OCR
- Non-régression : [`medical-documents`](backend/api/medical-documents/), booking patient, profils publics, **navigation tabs existants** (ordre onglets hors `ai` inchangé)
- Module 5 : test E2E onglet IA → assistant système → nouvelle conversation → stream → reprise après 30j simulé
- § 2.7 : test brouillon IA → récap → Valider → `appointment_id` ; test pro nouveau patient au `confirm` ; test 409 email doublon ; audit `ai_booking_audits`

---

### RÈGLES D’IMPLÉMENTATION (spécifiques repo)

1. **Migrations** : un fichier numéroté dans [`database/migrations/`](database/migrations/) + entrée dans `all-migrations.sql`.
2. **API** : nouveau dossier sous `backend/api/` ; enregistrement routage dans [`backend/api/index.php`](backend/api/index.php).
3. **Mobile** : feature folder + routes Expo Router sous `app/(patient)/` ; pas de logique métier dans les écrans.
4. **Types** : ajouter dans `@oneandlab/shared-types` avant usage mobile/web.
5. **Ne pas casser** : OTP, CSRF web, Stripe [`subscriptions`](database/migrations/026_create_subscriptions.sql), dispatch RDV.
6. **Nom produit UI** : « Cary » ; packages npm restent `@oneandlab/*`.

---

## 4. Matrice prompt générique → statut Cary

| Bloc prompt original | Statut | Action |
|---------------------|--------|--------|
| HealthKit / Health Connect | 0 % | Module 1 greenfield |
| AI Gateway / multi-LLM | 0 % | Module 2 `backend/lib/ai/` |
| RAG Qdrant | 0 % | Sidecar + workers |
| Assistants patient/pro | 0 % | S’appuie sur lab-results, medical-docs, appointments |
| OCR / analyse docs | 0 % | Hook post-upload `medical_documents` |
| Suggestion / prise RDV IA | 0 % | § 2.7 brouillon + Valider ; réutilise `POST /appointments` + `POST /patients` |
| Création patient pro via IA | ~100 % API | Enrobage § 2.7 au `confirm` uniquement |
| Profil public SEO | ~90 % | [`frontend/pages/infirmier/`](frontend/pages/infirmier/) |
| Notifications push/email/SMS | ~80 % | Étendre types |
| Cockpit IA admin | 0 % | Page Nuxt admin |
| Redis / WebSocket | 0 % | Jalon infra explicite |
| Chiffrement / audit HDS | ~70 % | Étendre à `ai_audits` + health + voice |
| Assistant vocal patient | 0 % | Module 04.1 — Phase D |
| Dictée pro / comptes rendus IA | 0 % | Module 04.2–04.3 — Phase B draft, Phase D voix |
| Agent suivi patient | 0 % | Module 04.4 — Phase B (cron + signals) |
| Objets connectés multi-marques | 0 % | Module 04.5 — schéma Phase A, sync Phase B |
| Moteur tendances descriptif | 0 % | Module 04.6 — Phase D |
| Routing multi-LLM par tâche | 0 % | Module 04.7 — Phase A |
| Cockpit admin IA étendu | 0 % | Module 04.8 — Phase B/C |
| Hub IA / onglet bottom nav | 0 % | Module 05 — Phase B (prioritaire) |
| Mon Assistant Santé système | 0 % | Module 05.3 — `ensure-system` à la connexion |
| Mémoire 3 niveaux + résumés conv. | 0 % | Module 05.5–05.6 — Phase A schema, Phase B jobs |
| Streaming SSE chat | 0 % | Module 05.10 — Phase B |
| Recherche conversations IA | 0 % | Module 05.8 — Phase B |
| Prise RDV brouillon → Valider | 0 % | § 2.7 + `ai_booking_audits` — Phase B |

---

## 6. Récap décision produit — RDV et IA

| Question | Décision plan |
|----------|----------------|
| L’IA peut-elle prendre un RDV ? | **Oui**, après récap et clic **Valider** par l’utilisateur |
| Qui crée le patient si inconnu (pro) ? | **`POST /patients` au moment du `confirm`**, pas avant — même règles anti-doublon qu’aujourd’hui |
| Quel endpoint crée le RDV ? | Toujours la logique **`Appointment::create`** (via `confirm`), jamais un raccourci IA parallèle |
| Traçabilité ? | `ai_booking_audits` + `access_logs` + lien `conversation_id` / `ai_audits` prompt |
| Urgence lab + Stripe ? | Conserver le flux **`patient/booking-draft`** existant ; l’IA peut pré-remplir le brouillon Stripe mais pas le contourner |

---

## 5. Prochaine étape après validation du plan

Créer le fichier [`docs/cary-v2-sante-ia-prompt.md`](docs/cary-v2-sante-ia-prompt.md) contenant le prompt **Modules 1 à 5** (section 3) + schémas SQL détaillés (DDL : `ai_conversations` étendu, `ai_conversation_summaries`, `ai_user_memory`, `ai_medical_memory`, `ai_conversation_attachments`, etc.) et checklist de non-régression sur les 86 endpoints existants.
