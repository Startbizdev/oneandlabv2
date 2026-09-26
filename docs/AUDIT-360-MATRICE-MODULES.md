# AUDIT-360 — Matrice modules (22 domaines)

**Légende état :** OK | dette | P0 | P1  
**Tests :** PHPUnit / e2e / mobile — recheck 2026-09-25 (Windows dev : 7 tests PDO MySQL skipped/err, 1 fail prompt RAG non lié aux changements P0).

| # | Module | Fichiers clés | Tests auto | Perf prod | ACL | État | Notes recheck |
|---|--------|---------------|------------|-----------|-----|------|---------------|
| 1 | Auth OTP / sessions | `backend/api/auth/*`, `backend/lib/Auth.php`, middleware | `auth-experience.spec.ts`, tests auth PHP | CSRF, `/api/auth/me` | AuthMiddleware | OK | OTP migration 112 présente en repo |
| 2 | Users / staff | `api/users`, `api/search`, `models/User.php`, `scope=picker` | `admin-assistants`, fetch-all-users | Ancien GET users full lourd | rôles + picker | P1 | Picker déployé local ; prod à valider post-release |
| 3 | Patients | `api/patients`, relatives, documents | `patient-relatives`, `staff-booking-patients` | picker + search | StaffPatientConsent | OK | Recherche ≥2 car. wizard staff |
| 4 | RDV / appointments | `api/appointments`, `Appointment.php`, wizards | ~15 e2e booking/calendar | **P0** list lab ~Mo | par rôle SQL | P0→fix | **`scope=list`** ajouté + LabDashboard |
| 5 | Calendrier FR | `Calendar.vue`, tour services, shared-utils dates | `calendar-france`, `booking-paris-timezone` | calendar view=250 | — | dette | Fuseau OK en tests ; pas axe unique |
| 6 | Dispatch admin | `admin/dispatch`, offers | `admin-territory-dispatch` | modéré | super_admin | OK | |
| 7 | Docs / ordonnances | `medical-documents`, PrescriptionService | `patient-documents`, nurse e2e | N+1 détail RDV | ACL docs | P1 | Méthodes Appointment public prod hotfix |
| 8 | Nurse tournée / passages | `nurse/tour*`, `nurse-passage/*` | `nurse-tournee`, `nurse-passage` | tour summary | nurse | OK | |
| 9 | Lab / préleveur | `lab/*`, `preleveur/tour*` | `lab-wizard`, `lab-statistics` | stats + list RDV | lab/subaccount | OK | `scope=list` prod ; `/lab/patients` pagination serveur (2026-09-26) |
| 10 | Pro | `pro/prescriptions`, pages pro | workspace e2e | faible | pro | OK | |
| 11 | Pharmacie | `pharmacy-orders`, mobile ordonnances | `pharmacy-orders.spec.ts` | — | PharmacyOrderAccess | OK | Routes ordonnances web+mobile |
| 12 | Stripe / IAP | `iap`, subscriptions, plan-limits | `billing-management`, `subscription-context` | — | — | dette | Vérif prod IAP hors scope exécution |
| 13 | IA Cary | `api/ai/*`, lib/ai | `cary-ai-booking` | voice realtime | rate limits | dette | |
| 14 | RAG / OCR | `lib/rag`, cron ocr | `LabResultAnalysisPromptTest` (1 fail local) | cron | — | P1 | Prompt sans `**` — test à aligner |
| 15 | Carnet santé | `health-record/*`, `health/*` | mobile health-record | — | patient/staff | dette | CompletionEngine needs MySQL |
| 16 | Avis / SEO public | `reviews`, `public/*`, pages slug | `public-profile`, directory | cache CDN | public read | OK | |
| 17 | QR / partage RDV | `qr/me`, share tokens | `admin-qr` | — | token | OK | Qr tests need PDO local |
| 18 | Notifications | `notifications`, Twilio, crons | `admin-notifications` | polling limit=10 | — | OK | |
| 19 | Couverture geo | `coverage-zones`, admin coverage | admin territory | — | admin | OK | |
| 20 | Admin global | admin users, categories, inscriptions | admin-* specs | — | super_admin | OK | |
| 21 | Contact / incidents | `contact`, `incidents` | public-navigation | rate limit | — | OK | |
| 22 | DevOps | deploy scripts, nginx, PM2, persistent | simulate-picker script | **RAM 2Go**, gros JSON | storage symlinks | P0→fix | `ensure-backend-runtime-links` durci |
