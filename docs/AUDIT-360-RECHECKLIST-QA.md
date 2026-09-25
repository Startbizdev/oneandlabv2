# AUDIT-360 — Rechecklist QA (générée routes/API)

Smoke **prod** `https://cary.bio` — une session par rôle test. Cocher manuellement après exécution.

## Public

- [ ] GET `/` — 200, pas d’erreur console bloquante
- [ ] GET `/laboratoires` — liste labs
- [x] GET `/api/public/labs` — JSON success (curl prod 2026-09-25)
- [x] GET `/api/app/version` — 200 (curl prod 2026-09-25)

## Patient (web ou app)

- [ ] Login OTP → `/patient` ou onglets mobile
- [ ] Liste RDV : GET `/api/appointments?patient_period=upcoming`
- [ ] Création brouillon : POST `/api/patient/booking-draft` (fichier ≤ limite) — **pas 500 storage**

## Pro

- [ ] `/pro/appointments` — liste charge
- [ ] Wizard `/pro/appointments/new` — recherche patient ≥2 car. → `/api/patients?scope=picker&search=…`
- [ ] Commandes pharmacie + ordonnances si module actif

## Nurse

- [ ] `/nurse/appointments` — pending + soins
- [ ] Tournée `/nurse/tournee` — GET `/api/nurse/tour/summary`
- [ ] Passage `/nurse/passage/new` — picker patient

## Lab

- [ ] Dashboard `/lab` — stats `/api/lab/stats?stats_only=1`
- [ ] Dashboard RDV : `/api/appointments?scope=list&date_from=…` (payload < 500 Ko pour journée typique)
- [ ] Liste `/lab/appointments` — pagination limit=24
- [ ] Calendrier lab

## Subaccount

- [ ] Même smoke dashboard que lab avec `scope=list`

## Preleveur

- [ ] `/preleveur/tournee` — tour API
- [ ] Calendrier preleveur

## Super admin

- [ ] `/admin/users` — recherche staff picker, pas timeout
- [ ] `/admin/dispatch` — liste
- [ ] Wizard `/admin/appointments/new` — recherche patient
- [ ] `/admin/commandes-pharmacie` + ordonnances

## Pharmacie (tous rôles éligibles)

- [ ] Création commande — web + mobile route `commandes-pharmacie`
- [ ] Page ordonnances `[id]/ordonnances` — GET medical-documents

## Post-deploy technique

- [ ] SSH : `php backend/scripts/simulate-picker-payload.php` — picker << full
- [ ] `ensure-backend-runtime-links.sh` — OK www-data drafts + medical uploads
- [ ] nginx error log : pas de 500 récurrent sur `/api/appointments`
