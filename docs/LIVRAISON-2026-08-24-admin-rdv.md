# Livraison Cary — 24 août 2026

**Commit précédent :** `6adc070` — *feat(pro): option « Autre » pour la profession avec saisie libre* (build iOS 25 / Android 26)  
**Commit actuel :** admin RDV, ordonnances, redispatch, renvoi emails, copy Cary, build mobile iOS 29 / Android 27  
**Déployé en prod :** backend + frontend sur cary.bio (24/08/2026)

---

## 1. Certificat de décès — RDV le jour même (web + mobile)

### Règle métier partagée
- **`packages/shared-utils/src/care-category-booking-rules.ts`**
  - `isDeathCertificateCareCategory()` — alias sémantique certificat de décès
  - `getCareCategoryBookingConstraints()` — `minLeadTimeHours: 0`, `defaultAvailabilityType: 'all_day'`, `allowSameDay: true`
  - `defaultBookingSliceForCareCategory()` — passage unique, créneau « toute la journée »

### Web
- **`AppointmentForm.vue`** — slider horaire Paris (plus de minimum fixe à 6h) ; certificat → `all_day`
- **`UnifiedAppointmentForm.vue`** — contraintes lead-time dynamiques selon catégorie
- **`DashboardMultiAppointmentWizard.vue`** — hérite des contraintes certificat
- **`RendezVousCareSelection.vue`** — application des contraintes à la sélection de soins
- **`booking-service-form-slice.ts`** — slice par défaut certificat

### Mobile
- **`CareSelectionStep.tsx`** — ajout certificat avec `availability_type: 'all_day'`
- **`useAppointmentForm.ts`** + **`booking-service-form-slice.ts`** — même logique que le web

### Backend
- Aucun changement de validation bloquant : `Appointment.php` accepte déjà le same-day nursing à `00:00:00`

---

## 2. Toggle ordonnances pro **et** infirmier (admin)

### Backend
- **`PrescriptionService.php`** — `isPrescriptionGenerationEnabled()` pour rôles `pro` **et** `nurse` (défaut activé)
- **`prescriptions/generate.php`** — 403 si désactivé
- **`nurse/prescriptions/index.php`** — 403 si désactivé
- **`users/[id].php`** — `super_admin` peut modifier `prescription_generation_enabled` pour pro et infirmier
- **Migration** `080_prescription_generation_pro_nurse_comment.sql` — commentaire SQL doc (pro/nurse)

### Types
- **`packages/shared-types/src/profile.ts`** — champ `prescription_generation_enabled` documenté pro/nurse

### Web
- **`prescription-access.ts`** — helper `prescriptionGenerationEnabled(user)` (remplace l’ancien helper pro-only)
- **`profile/index.vue`** — switch admin visible pour pro **et** infirmier
- **`PrescriptionsToolPage.vue`**, **`pro/appointments/[id].vue`**, **`nurse/passage/*.vue`** — accès masqué si flag off

### Mobile
- **`prescription-access.ts`** (nouveau util mobile)
- **`(pro)/(tabs)/_layout.tsx`** et **`more.tsx`** — onglet ordonnances conditionnel
- **`(nurse)/(tabs)/more.tsx`** — entrée ordonnances conditionnelle
- **`PrescriptionWorkspaceScreen.tsx`** — écran bloqué si désactivé
- **`AppointmentDetailScreen.tsx`** — section ordonnances gated

---

## 3. Admin — créateur du RDV (select searchable)

### API
- **`appointments/index.php` POST** — paramètre `on_behalf_of_user_id` (admin only)
  - Valide UUID, rôle `pro` ou `nurse`, profil actif
  - Le pro/infirmier devient `created_by` / `created_by_role` réel
  - Notifications post-création alignées sur le rôle créateur

### Backend model
- **`Appointment.php`** — branche `creator_origin` pour `super_admin` (badge administration + nom admin)

### Web UI
- **`CreatorSelectField.vue`** (nouveau) — USelectMenu searchable, debounce, liste pros/infirmiers
- **`DashboardMultiAppointmentWizard.vue`** — champ en tête du wizard quand base-path `/admin`

---

## 4. Admin — redispatch complet (remettre en pending)

### Backend
- **`appointments/[id].php`** — autorise `redispatch: true` pour `super_admin`
- **`Appointment.php` `updateStatus`** :
  - Chemin admin redispatch → pending
  - Clear assignations (infirmier, labo, préleveur)
  - Restauration depuis `canceled` si besoin
  - Relance `dispatchGeographic` + emails `new_appointment_pro` + cloches zone
  - Support lot multisoins (même infirmier)
  - Log `access_logs` + `appointment_dispatch_events`

### Web UI
- **`AppointmentStatusSelect.vue`** — modal confirmation « Remettre en dispatch ? » avec `redispatch: true`
- **`admin/appointments/[id]/index.vue`** — bouton **Redispatcher** + action « Restaurer et redispatcher » depuis annulé
- **`dashboard.vue`** — navigation notification `appointment_redispatched`

---

## 5. Admin — renvoi bulk emails RDV (Brevo)

### API
- **`POST /api/admin/appointments/notifications/resend`** (super_admin + CSRF)
- **`AppointmentNotificationResendService.php`** (nouveau) :
  - 7 types : `appointment_created`, `appointment_confirmation`, `appointment_canceled_patient`, `new_appointment_pro`, `assigned_to_preleveur`, `review_invitation`, `results_ready`
  - Résolution automatique des destinataires (patient, pros zone, assignés, préleveur)
  - Rate limit 5 min par RDV/type (via `access_logs`)
  - Envoi via **`EmailQueue` → Brevo SMTP** (stack existant, pas de nouveau provider)

### Web UI
- **`admin/appointments/notifications.vue`** (nouvelle page) :
  - Filtres type/statut/recherche UUID
  - Multi-select RDV + choix type d’email
  - Destinataires pros optionnels pour `new_appointment_pro`
  - Pagination
- **`dashboard.vue`** — entrée menu admin « Renvoi emails RDV »
- Lien depuis fiche RDV admin

### Scripts ops (non prod obligatoire)
- `test-notification-resend-cli.php`, `prod-smoke-test.php`, `check-resend-logs.php`

---

## 6. Copy & UX Cary (web + mobile)

### Site vitrine / landing
- Simplification des textes FAQ, hero, CTA, footer, pages « Pour les patients / infirmiers / laboratoires / professionnels »
- Ton plus direct, moins jargon, marque **Cary** partout
- Pages : `index.vue`, `contact.vue`, `login.vue`, `register/*`, maquettes landing (`LandingMaquette*.vue`)

### Mobile — textes utilisateur
- **FAQ aide** (`help-faq-content.ts`) — questions/réponses reformulées simplement
- **Onboarding** (`packages/onboarding/src/slides/*.ts`) — slides patient, pro, infirmier, préleveur
- **Listes vides RDV** — « Aucune visite pour le moment » (pro/infirmier/préleveur)
- **Auth** — écrans bienvenue, merci inscription, register meta
- **Divers écrans** — libellés cohérents Cary (calendrier, notifications, lab results, tournée, etc.)

### Profils publics
- **`PublicProfile*.vue`**, **`ProviderPublicProfilePanel.vue`** — micro-ajustements copy

---

## 7. Passages infirmier (web)

- **`nurse/passage/new.vue`** — améliorations UX + gate ordonnances
- **`nurse/passage/[seriesId].vue`** — gate ordonnances selon toggle admin

---

## 8. Build mobile & EAS

- **`.easignore`** — exclusion `.git` (~2 Go), `backend/uploads`, `.cursor`, archives ; fix upload Windows
- **`.gitignore`** — entrées complémentaires
- **`run-eas.cjs`** — `EAS_NO_VCS=1`, `EAS_PROJECT_ROOT` monorepo, vérif taille archive avant build
- **Build numbers** : iOS **29**, Android **27** (version app **1.7.6**)

---

## 9. Ops serveur

- **`backend/cron/purge-access-logs.php`** — purge logs HDS > 12 mois (configurable)
- **`setup-server-cron.sh`** — cron mensuel purge access_logs
- **Scripts maintenance** (racine `scripts/`) :
  - `backup-legacy-on-server.sh`, `backup-legacy-stream.sh`
  - `disk-cleanup-prod.sh`, `disk-cleanup-tier2-only.sh`, `disk-cleanup-tier23.sh`, etc.
  - `fix-ocr-cron.sh`

---

## 10. Fichiers principaux (résumé)

| Zone | Nouveaux | Modifiés clés |
|------|----------|---------------|
| Shared | — | `care-category-booking-rules.ts`, `profile.ts` |
| Backend | `AppointmentNotificationResendService.php`, `resend.php`, `purge-access-logs.php`, migration 080 | `Appointment.php`, `appointments/index.php`, `[id].php`, `PrescriptionService.php` |
| Web | `CreatorSelectField.vue`, `notifications.vue` | wizard admin, fiche RDV admin, statut RDV, profil, ordonnances |
| Mobile | `prescription-access.ts` | certificat booking, ordonnances pro/nurse, copy 30+ écrans |
| Ops | scripts backup/cleanup | cron setup |

---

## 11. Tests effectués (prod cary.bio)

| Test | Résultat |
|------|----------|
| API resend sans auth | 401 ✅ |
| Page admin notifications | HTTP 200 ✅ |
| Brevo SMTP configuré | `smtp-relay.brevo.com` ✅ |
| Envoi email resend réel | `sent=1` ✅ |
| Rate limit 5 min | `sent=0, skipped=1` ✅ (après fix JSON) |
| Build web Nuxt | OK ✅ |

---

## Message WhatsApp — Joseph

> Salut Joseph 👋
>
> Grosse livraison Cary — voici ce qui vient d’être mis en prod + dans l’app (build iOS 29 / Android 27) :
>
> **1. Certificat de décès** — tu peux enfin créer un RDV certificat **le jour même**, créneau « toute la journée », sur le web (admin, pro, infirmier, labo) et dans l’app mobile.
>
> **2. Ordonnances pro + infirmier** — dans l’admin tu peux **activer/désactiver** la génération d’ordonnances pour un pro **ou** un infirmier. Si c’est off, l’accès disparaît partout (web + app).
>
> **3. Créateur du RDV (admin)** — quand tu crées un RDV depuis l’admin, tu peux choisir **quel pro ou infirmier** apparaît comme créateur (select searchable). Pratique pour l’audit.
>
> **4. Redispatch admin** — sur une fiche RDV admin, bouton **Redispatcher** : le soin repasse en attente, les assignations sont effacées, et les pros/infirmiers de la zone sont **re-notifiés** (emails + cloche).
>
> **5. Renvoi emails RDV** — nouvelle page admin **« Renvoi emails RDV »** : tu sélectionnes un ou plusieurs RDV, tu choisis le type d’email (confirmation patient, nouvelle demande pro, etc.) et tu renvoies en bulk via **Brevo** (avec limite anti-spam 5 min).
>
> **Bonus** — textes du site et de l’app simplifiés (FAQ, onboarding, listes vides), passages infirmier web améliorés, purge auto des logs HDS côté serveur.
>
> Tout est live sur **cary.bio**. L’app part en review Apple/Google avec ce build.
>
> Dis-moi si tu veux qu’on fasse un tour ensemble sur l’admin renvoi emails ou le redispatch 👍

---

*Généré le 24/08/2026 — commit `6adc070` → HEAD*
