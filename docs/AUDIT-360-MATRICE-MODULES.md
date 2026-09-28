# AUDIT-360 — Matrice modules (22 domaines)

**Légende :** OK | dette | P0 | P1 — recheck 2026-09-26 (IAP / IA / carnet + ménage).

| # | Module | État | Notes |
|---|--------|------|-------|
| 1 | Auth OTP | OK | |
| 2 | Users / staff | OK | lib/users + PPA fixtures |
| 3 | Patients | OK | picker + e2e P0 |
| 4 | RDV | OK | index ~58 L handlers |
| 5 | Calendrier FR | OK | parisWallClockPartValues |
| 6 | Dispatch admin | OK | |
| 7 | Docs médicaux | OK | |
| 8 | Nurse tournée | OK | |
| 9 | Lab / préleveur | OK | scope=list |
| 10 | Pro | OK | |
| 11 | Pharmacie | OK | focused poll list/inbox |
| 12 | Stripe / IAP | OK | SubscriptionDisplayTest + e2e billing/subscription in P1 |
| 13 | IA Cary | OK | AiChatRateLimitTest + cary-ai-booking e2e un-skipped |
| 14 | RAG / OCR | OK | LabResultAnalysisPromptTest |
| 15 | Carnet santé | OK | Health* Docker + Jest health-record-display |
| 16 | Avis / SEO | OK | |
| 17 | QR | OK | |
| 18 | Notifications | OK | focus poll |
| 19 | Couverture geo | OK | |
| 20 | Admin | OK | |
| 21 | Contact | OK | |
| 22 | DevOps | OK | H7 deploy = GO ; ménage debug/MD |

Docs vivants : `AUDIT-360-*`, IAP setup, QA/smoke checklists, nginx, WORKFLOW WhatsApp. MD one-shot / `refonte-2026` / debug PHP retirés.
