# OneAndLab V2 — Spécification mobile React Native & prompt ingénieur

**Objectif :** permettre à une équipe de reproduire **la même logique métier** que l’application web (Nuxt) en React Native pour les **rôles prévus dans l’app mobile**, avec les **écrans** et **endpoints** utiles — plus une grille **UI/UX** simple (type Linear / Notion).  
**Source de vérité code :** `backend/api/` (PHP), `frontend/` (Nuxt 3), types `frontend/types/appointments.ts`, client HTTP `frontend/utils/api.ts`.

---

## 0. Périmètre de l’app mobile (décision produit)

### 0.1 Rôles **inclus** dans l’app

| Rôle API | Cible |
|----------|--------|
| `patient` | Prendre / suivre des RDV, documents, proches, avis. |
| `nurse` | Soins infirmiers : RDV, calendrier, patients, abonnement, partage lien, avis, plans de soins, ordonnances (selon API). |
| `pro` | Professionnel de santé : patients délégués, RDV, outil ordonnances (`/pro/prescriptions`). |
| `preleveur` | Planning et RDV de prélèvement rattachés à son lab (parcours type `/preleveur/*` sur le web). |

### 0.2 Rôles **hors** app mobile (restent sur le web back-office)

- **`super_admin`** (admin plateforme) — **pas** d’écran mobile.
- **`lab`** (laboratoire) — **pas** d’app dédiée dans ce périmètre.
- **`subaccount`** (sous-compte lab) — **pas** d’app dédiée.

> L’API backend continue d’exposer des routes `lab/*`, `admin/*`, etc. ; elles servent de **référence** ou pour des cas rares (ex. données dont le préleveur a besoin via d’autres endpoints), mais **ne font pas partie des navigations à livrer** dans cette app.

---

## 1. Contexte produit (à garder en tête)

- Plateforme de **soins et prélèvements à domicile** : prise de RDV, dispatch géographique, confirmation par les pros, documents médicaux, avis, abonnements Stripe, notifications.
- Auth : **OTP e-mail** puis **JWT** (`Authorization: Bearer …`). Le **rôle effectif** est celui en **base** (pas seulement le JWT) — voir `backend/middleware/AuthMiddleware.php`.
- Les mutations sensibles exigent souvent un **jeton CSRF** + cookies de session (détails section 3).

---

## 2. Rôles côté API (plateforme vs app mobile)

Tous les comptes ont un `role` en base (`profiles.role`). **Dans l’app mobile décrite ici**, seuls **`patient`**, **`nurse`**, **`pro`**, **`preleveur`** ont une navigation livrée.

Les rôles **`lab`**, **`subaccount`**, **`super_admin`** existent côté serveur pour le **site web** ; si un utilisateur se connecte avec l’un de ces rôles depuis l’app, **comportement à trancher** (message « utilisez le web » / blocage au login) — **pas** d’écrans à implémenter pour eux.

**Référence web** pour le chemin « nouveau RDV » : `frontend/composables/useAppointmentNewUrl.ts` — ne retenir pour le mobile que **patient** (parcours public) + **nurse**, **pro**, **preleveur**.

---

## 3. Contrat HTTP & contraintes pour React Native

### 3.1 Base URL

- Préfixe API : **`/api`** (ex. `https://domaine.com/api/...`).
- Web dev : proxy Nitro vers le backend PHP (voir `frontend/nuxt.config.ts`).

### 3.2 Authentification

- Stocker le **JWT** après `POST /auth/verify-otp` (champ `token` dans la réponse).
- Envoyer **`Authorization: Bearer <token>`** sur (quasi) toutes les routes protégées.

### 3.3 CSRF + cookies (point critique)

Le client web (`frontend/utils/api.ts`) :

- envoie **`credentials: 'include'`** ;
- pour les requêtes **non GET** (hors liste d’exceptions), récupère **`GET /auth/csrf-token`** puis envoie **`X-CSRF-Token`** ;
- le token CSRF peut être mis en cache après login.

**Pour React Native :** reproduire une **jar de cookies** compatible avec le backend (session PHP), ou prévoir **avec l’équipe backend** un mode mobile (ex. exemption CSRF pour clients authentifiés uniquement par Bearer). Sans cela, les **POST/PUT/DELETE** échoueront avec erreurs type `CSRF_TOKEN_*`.

### 3.4 Exceptions CSRF côté web (référence)

Routes considérées « publiques » pour le CSRF dans `PUBLIC_ROUTES` :  
`/auth/check-email`, `/auth/request-otp`, `/auth/verify-otp`, `/auth/guest-to-user`, `/auth/csrf-token`, `/auth/logout`, `/ban/search`, `/registration-requests`, `/contact`.

### 3.5 Timeouts

- Le web utilise **60 s** par défaut, **90 s** pour `POST /appointments`, **60 s+** possible pour stats lab.

### 3.6 CORS

- Les origines autorisées viennent de `backend/config/cors.php` ; l’app mobile en React Native n’est pas un navigateur — vérifier avec l’infra si l’API est appelée **directement** ou via **même domaine / reverse proxy**.

---

## 4. Prise de rendez-vous patient — **parcours à répliquer à l’identique**

**Référence écran web :** `frontend/pages/rendez-vous/nouveau.vue`  
**Garde :** middleware `rdv-patient-only` — si l’utilisateur connecté **n’est pas** `patient`, redirection vers le formulaire **métier** du rôle. Sur mobile : envoyer **`nurse` / `pro` / `preleveur`** vers **leur** écran de création de RDV (pas le parcours patient).

### 4.1 Étapes UX (équivalent React Native)

| Étape | Contenu | APIs / logique |
|-------|---------|----------------|
| **0 — Choix des prestations** | Multi-sélection « prise de sang » / « soins infirmiers », puis catégories. | `GET /categories` ou `GET /categories?provider_id=<uuid>` si `provider_id` + `provider_type` en query (RDV depuis fiche publique). |
| | Nom + contraintes lab (créneaux) | `GET /public/provider-name?id=<uuid>` → `name`, `min_booking_lead_time_hours`, week-end. |
| **1 — Formulaire** | Coordonnées patient, adresse (BAN), date, disponibilité (créneau JSON), champs spécifiques sang vs soins, `care_options`, pièces jointes, **proches**. | `GET /ban/search?q=…` pour l’adresse ; proches via `GET/POST/PUT/DELETE /patient-relatives` (patient connecté). |
| **2 — Récap + consentement RGPD** | Case à cocher obligatoire avant validation. | — |
| **3a — Invité** | Envoi OTP via création session invité. | `POST /auth/guest-to-user` `{ email, first_name, last_name, phone }` → `user_id`, `session_id` ; puis écran OTP. |
| **3b — Déjà connecté (patient)** | Pas d’OTP : création directe après consentement. | Utiliser `patient_id` = `user.id` depuis `GET /auth/me`. |
| **OTP** | 6 chiffres. | `POST /auth/verify-otp` `{ user_id, otp, session_id? }` → JWT ; puis enchaîner création RDV. |

### 4.2 Création des RDV

- **Un seul soin :** `POST /appointments` avec payload aligné sur `AppointmentCreatePayload` (`frontend/types/appointments.ts`).
- **Plusieurs soins (lot) :** enchaîner plusieurs `POST /appointments` avec la **même** `creation_batch_id` (UUID) et `creation_batch_size` quand ce sont plusieurs RDV du **même type** (`nursing` ou `blood_test`) — logique dans `useAppointments.createMultipleAppointments`.
- Champs notables du payload (voir `buildAppointmentPayloads` dans `nouveau.vue`) :
  - `type`, `form_type`, `category_id`, `patient_id`, `relative_id?`, `address`, `scheduled_at`, `form_data` (dont `availability` stringifié, `preferred_nurse_gender`, `blood_test_type`, `duration_days`, `frequency`, `care_options`, …),
  - `files` (fichiers nouveaux),
  - **Booking depuis profil public :** `assigned_nurse_id` ou `assigned_lab_id` si un seul service sélectionné et types cohérents.

### 4.3 Après création

- Lier des **documents du profil** déjà existants : boucle `POST /medical-documents/copy` (`source_medical_document_id`, `appointment_id`, `document_type`).
- Uploader les **nouveaux** fichiers : `POST /medical-documents` en **multipart** (`file`, `appointment_id`, `document_type`, …) — voir `useAppointments.uploadMedicalDocuments`.

### 4.4 Constantes métier (ne pas réinventer)

- `frontend/constants/availability-slot.ts` — largeur minimale du créneau (`AVAILABILITY_MIN_SPAN_HOURS`).
- `frontend/constants/nursing-duration.ts`, `frontend/constants/birth-date.ts`, `frontend/constants/upload-limits.ts`, `frontend/constants/nurse-appointments-filters.ts`.

### 4.5 Statuts de rendez-vous (affichage / filtres)

Types TS : `frontend/types/appointments.ts` —  
`pending | confirmed | planned | inProgress | completed | canceled | expired | refused`.

---

## 5. Prise de RDV « côté pro » (hors parcours public patient) — **uniquement rôles app mobile**

Si l’utilisateur n’est **pas** `patient`, le CTA « nouveau RDV » pointe vers :

| Rôle | Référence web | Équivalent RN |
|------|----------------|---------------|
| `nurse` | `/nurse/appointments/new` | Stack création RDV infirmier |
| `pro` | `/pro/appointments/new` | Stack création RDV pro santé |
| `preleveur` | `/preleveur/appointments` (pas de `/new` dans le helper web) | Liste puis création / détail selon flux métier |

**Composant principal métier (référence web) :** `frontend/components/forms/UnifiedAppointmentForm.vue` + `frontend/components/dashboard/AppointmentForm.vue` (création / édition, lookup patient, documents, prescription PDF, etc.) — à **simplifier visuellement** sur mobile (**section 7 bis**), pas à cloner pixel-perfect le dashboard web.

---

## 6. Inventaire des endpoints API (fichiers `backend/api`)

> Méthodes indiquées par les en-têtes CORS / logique des fichiers ; l’**autorisation réelle** est dans chaque script (rôle + règles métier).  
> **App mobile :** ne pas implémenter les flux **admin** ni **lab / sous-compte** ; les tables ci-dessous restent une **référence complète** du backend.

### 6.0 Ce que l’app mobile doit **prioriser** (par famille)

| Famille | Rôles concernés |
|---------|------------------|
| Auth, CSRF, `/auth/me` | Tous |
| `/appointments` (+ sous-ressources utiles : history, share-for-nurse, care-photos, generate-prescription si métier) | patient, nurse, pro, preleveur |
| `/patients`, `/patient-relatives`, `/patient-documents` | patient (+ nurse/pro selon droits API) |
| `/medical-documents` (+ copy, download) | tous les rôles qui gèrent des dossiers |
| `/categories`, `/ban/search`, `/public/*` | patient (prise RDV + découverte) |
| `/notifications` | tous |
| `/reviews` (+ stats / réponse prestataire) | patient, nurse (réponse), pro si applicable |
| `/plan-limits`, `/stripe/*` | surtout **nurse** (abonnement) — les autres rôles selon besoin métier |
| `/pro/prescriptions` | **pro** |
| `/nurse-category-preferences` | **nurse** (profil / préférences) |
| `/lab/preleveurs` (GET), `/appointments/{id}/reassign` | **uniquement si** l’API autorise le **préleveur** (ou flux documenté) — sinon ignorer |

**Hors périmètre UI mobile (pas d’écrans) :** `/admin/*`, `/logs`, `/admin/subscriptions`, gestion `/categories` admin, accept/reject `/registration-requests` (réservé web admin), CRUD `/coverage-zones` « équipe lab », `/lab/stats`, `/lab/subaccounts`.

### 6.1 Authentification & session

| Méthode | Chemin |
|---------|--------|
| POST | `/auth/request-otp` |
| POST | `/auth/verify-otp` |
| POST | `/auth/logout` |
| GET | `/auth/me` |
| POST | `/auth/check-email` |
| GET | `/auth/csrf-token` |
| POST | `/auth/guest-to-user` |

### 6.2 Rendez-vous

| Méthode | Chemin |
|---------|--------|
| GET, POST | `/appointments` |
| GET, PUT, DELETE | `/appointments/{id}` |
| POST | `/appointments/guest-preview` |
| POST | `/appointments/{id}/reassign` |
| GET | `/appointments/{id}/history` |
| GET, POST | `/appointments/{id}/share-for-nurse` |
| GET, POST | `/appointments/{id}/care-photos` |
| POST | `/appointments/{id}/care-photo-comments` |
| POST | `/appointments/{id}/generate-prescription` |

### 6.3 Utilisateurs & profils

| Méthode | Chemin |
|---------|--------|
| GET, POST | `/users` |
| GET, PUT, DELETE | `/users/{id}` |
| GET, PUT | `/users/{id}/nurse-category-preferences` |
| GET, PUT | `/users/{id}/lab-category-preferences` |
| PUT | `/users/{id}/sanctions` |
| GET | `/users/{id}/incidents` |

### 6.4 Patients, proches, documents patient

| Méthode | Chemin |
|---------|--------|
| GET, POST | `/patients` |
| GET | `/patients/lookup` |
| DELETE | `/patients/{id}` |
| GET, POST | `/patient-relatives` |
| GET, PUT, DELETE | `/patient-relatives/{id}` |
| GET | `/patient-documents` |
| POST | `/patient-documents/upload` |
| POST | `/patient-documents/upload-debug` |

### 6.5 Documents médicaux

| Méthode | Chemin |
|---------|--------|
| GET, POST | `/medical-documents` |
| GET, DELETE | `/medical-documents/{id}` |
| GET | `/medical-documents/{id}/download` |
| POST | `/medical-documents/copy` |

### 6.6 Référentiels & géographie

| Méthode | Chemin |
|---------|--------|
| GET, POST | `/categories` |
| GET, PUT, DELETE | `/categories/{id}` |
| GET, POST, PUT | `/coverage-zones` |
| GET, PUT, DELETE | `/coverage-zones/{id}` |
| GET, PUT, POST | `/availability-settings` |
| GET, PUT, POST | `/nurse-category-preferences` |
| GET, PUT | `/lab-category-preferences` |

### 6.7 Avis

| Méthode | Chemin |
|---------|--------|
| GET, POST | `/reviews` |
| PUT, POST | `/reviews/{id}/response` |
| PUT | `/reviews/{id}/moderate` |
| GET | `/reviews/stats` |

### 6.8 Notifications

| Méthode | Chemin |
|---------|--------|
| GET | `/notifications` |
| GET | `/notifications/unread` |
| PUT | `/notifications/{id}/read` |

### 6.9 Laboratoire (équipe & stats) — **référence backend, pas d’app lab**

| Méthode | Chemin |
|---------|--------|
| GET, POST | `/lab/subaccounts` |
| GET, POST | `/lab/preleveurs` |
| GET | `/lab/stats` |

> Le **préleveur** peut encore consommer **certaines** routes si le backend les lui ouvre (ex. liste préleveurs pour réaffectation) ; il n’y a **pas** d’app « compte lab » dans ce périmètre.

### 6.10 Prescriptions (ordonnances outillées)

| Méthode | Chemin |
|---------|--------|
| GET | `/pro/prescriptions` |

**Important (audit code) :** `backend/api/pro/prescriptions/index.php` n’autorise que le rôle **`pro`**. Or `frontend/components/dashboard/PrescriptionsToolPage.vue` appelle `` `${roleBase}/prescriptions` `` : pour l’infirmier, `roleBase="/nurse"` → URL **`/nurse/prescriptions`**, alors qu’**aucun fichier** `backend/api/nurse/prescriptions/*` n’existe dans le dépôt. Avant la prod mobile, **valider le comportement réel** (proxy, autre branche) ou **corriger** le front / ajouter une route API `nurse` miroir du `pro`.

### 6.11 Stripe & limites

| Méthode | Chemin |
|---------|--------|
| POST | `/stripe/create-checkout-session` |
| POST | `/stripe/create-portal-session` |
| GET | `/stripe/subscription` |
| POST | `/stripe/webhook` |
| GET | `/plan-limits` |
| GET | `/admin/subscriptions` |

### 6.12 Administration — **hors app mobile**

| Méthode | Chemin |
|---------|--------|
| GET | `/admin/stats` |
| POST | `/admin/notifications/send` |
| GET | `/admin/notifications/sent` |
| DELETE | `/admin/notifications/{id}` |
| GET | `/logs` |

### 6.13 Inscriptions prestataires

| Méthode | Chemin |
|---------|--------|
| POST, GET | `/registration-requests` |
| PUT | `/registration-requests/{id}/accept` |
| PUT | `/registration-requests/{id}/reject` |

> Côté app : **`POST /registration-requests`** (formulaire d’inscription **nurse / pro** éventuellement) ; **accept / reject** = web admin uniquement.

### 6.14 Public (sans JWT)

| Méthode | Chemin |
|---------|--------|
| GET | `/public/nurses` |
| GET | `/public/labs` |
| GET | `/public/nurse/{slug}` |
| GET | `/public/lab/{slug}` |
| GET | `/public/shared-appointment/{slug}` |
| GET | `/public/provider-name` |

### 6.15 Divers

| Méthode | Chemin |
|---------|--------|
| POST | `/incidents` |
| GET | `/ban/search` |
| POST | `/contact` |
| GET | `/` (racine `/api` — message + liste partielle d’endpoints) |

---

## 7. Cartographie écrans web → modules React Native (**périmètre app uniquement**)

Chaque bloc = **zones à livrer** pour **patient**, **nurse**, **pro**, **preleveur** — pas de parité avec les espaces **lab / subaccount / admin** du web.

### 7.1 Public & acquisition (surtout **patient**)

- Pages marketing équivalentes : accueil, « pour les patients », tarifs, contact, login, mentions / CGV / confidentialité (version **allégée** si besoin).
- Annuaires + vitrines : infirmiers / laboratoires par ville + fiche `public/nurse|lab` (le patient peut réserver avec `provider_id` — prise de sang côté lab vitrine).
- Lien RDV partagé : équivalent `/p/rdv/[token]` → `GET /public/shared-appointment/{token}`.

### 7.2 Patient

- Liste / recherche RDV, détail, **nouveau RDV** (section 4).
- Profil, documents, proches, avis, inscription patient.

### 7.3 Infirmier (`nurse`)

- Dashboard, RDV (liste, détail, création), calendrier, patients, demandes / dispatch, plans de soins, avis, **abonnement** (Stripe), inscription infirmier.
- Ordonnances : **vérifier l’API** (voir section 6.10) — ne pas supposer `/nurse/prescriptions` sans route backend.

### 7.4 Préleveur (`preleveur`)

- Accueil, calendrier, liste RDV, détail RDV (référence web `/preleveur/*`).
- Pas d’écrans « gestion lab » (équipe, stats globales, sous-comptes).

### 7.5 Professionnel de santé (`pro`)

- Dashboard, RDV (liste, détail, création), calendrier, patients, **ordonnances** via `/pro/prescriptions`, inscription pro.

### 7.6 Profil & réglages (sans partie admin)

- Équivalent **allégé** de `/profile` : infos de compte, préférences **utiles au rôle** (ex. `nurse-category-preferences` pour l’infirmier), documents / avatar si exposés par l’API.
- **Exclure** : sanctions, incidents, création sous-comptes / préleveurs / utilisateurs admin.

---

## 7 bis. UI / UX & composants — style **Linear** + **Notion** (simple, efficace)

### Principes

- **Clarté > fioritures** : beaucoup d’**air**, listes lisibles, une action principale évidente par écran.
- **Palette** : fond **blanc cassé / gris très clair** ; texte **gris foncé** (pas noir pur) ; **une** couleur d’accent sobre pour les CTA et liens ; mode sombre optionnel mais **même discipline** (contrastes doux).
- **Typographie** : une famille **sans-serif** neutre (ex. Inter, SF Pro) ; **titres légers** (font-weight medium plutôt que black) ; tailles modérées — style Notion / Linear, pas « gros titres marketing ».
- **Conteneurs** : cartes **bordure 1px** légère, **coins légèrement arrondis** ; ombres **discrètes** ou absentes (Notion).
- **Navigation** : barre d’onglets ou stack **épurée** ; icônes simples (lucide-like) ; **feuilles modales** (bottom sheet) pour filtres et actions secondaires.

### Bibliothèque de composants à prévoir (atomes + patterns)

| Composant | Rôle |
|-----------|------|
| `Screen` | Fond, padding horizontal constant (ex. 16–20), scroll safe-area. |
| `ListRow` | Titre + sous-titre + méta à droite (date, statut) ; press feedback léger. |
| `SectionLabel` | Petit label uppercase ou semi-bold au-dessus d’un groupe (type Notion). |
| `PrimaryButton` / `GhostButton` | Hauteur confortable, pas « bouton plein écran flashy ». |
| `StatusPill` | Pastille discrète pour statut RDV (couleurs sémantiques atténuées). |
| `EmptyState` | Illustration minimale ou icône seule + une phrase + un CTA. |
| `SearchField` | Champ simple avec icône loupe, style Linear. |
| `FormField` | Label au-dessus, erreur en petit texte ; pas de bordures lourdes. |
| `OTPInput` | 6 cases ou champ unique masqué ; clavier numérique. |
| `AttachmentRow` | Fichier + taille + suppression. |

### Code UI : **pas de sur-ingénierie « DRY extrême »**

- **Éviter** les méga-composants avec **15+ props** et les hooks « tout-en-un » qui cachent le flux.
- **Accepter** un peu de **répétition** entre deux écrans très proches si cela garde chaque fichier **court et lisible** (onboarding équipe, revue PR).
- Factoriser seulement ce qui est **stable** : thème (couleurs, espacements), client API, boutons de base, `ListRow`.

---

## 8. Fonctionnalités transverses (app mobile)

- **Notifications** : liste + marquer lu (`GET /notifications`, `PUT …/read`) ; badge simple si besoin (`/notifications/unread`).
- **RDV** : détail, changement de statut (`PUT /appointments/{id}`), reschedule (annulation + recréation) — reprendre la logique des modales web **sans** recopier la complexité UI.
- **Réaffectation** : `POST /appointments/{id}/reassign` **uniquement** si le rôle (souvent préleveur / flux lab côté API) y a droit ; peut nécessiter `GET /lab/preleveurs` — **pas** d’écran « admin lab ».
- **Partage infirmier → patient** : `GET` (et si besoin `POST`) `/appointments/{id}/share-for-nurse` — **nurse**.
- **Galerie photos de soin + commentaires** : routes `care-photos` / `care-photo-comments` — **nurse** (et autres si API).
- **Prescription PDF** : `POST …/generate-prescription` — selon rôle autorisé par l’API.
- **Stripe + plan-limits** : surtout **nurse** (abonnement) ; **plan-limits** pour afficher plafonds / messages.
- **BAN** : `GET /ban/search` — prise de RDV patient.
- **Contact** : `POST /contact` — optionnel (écran simple).
- **Inscription** : `POST /registration-requests` pour **nurse / pro** (pas de parcours « inscription lab » dans cette app).

---

## 9. Prompt ingénieur (copier-coller)

```text
Tu es lead mobile React Native. Application OneAndLab V2 : API HTTP existante (backend PHP, /api).
PÉRIMÈTRE RÔLES : UNIQUEMENT patient, nurse (infirmier), pro (pro santé), preleveur.
EXCLURE toute navigation ou écran admin, lab, sous-compte lab (super_admin, lab, subaccount) — ces comptes
utilisent le web ; si l’un se connecte sur l’app, afficher un message clair ou bloquer.

CONTRAINTES MÉTIER
1) Auth : OTP e-mail (request-otp ou guest-to-user + verify-otp) puis JWT Bearer.
2) Flux patient « nouveau RDV » aligné sur frontend/pages/rendez-vous/nouveau.vue (étapes, payloads, lots
   creation_batch_id, assigned_nurse_id / assigned_lab_id depuis vitrine).
3) Après POST /appointments : medical-documents/copy puis uploads multipart comme useAppointments.
4) nurse / pro / preleveur : CTA nouveau RDV vers LEUR flux (pas le parcours patient) — référence
   useAppointmentNewUrl.ts (branches nurse, pro, preleveur seulement).
5) CSRF + cookies comme le web, ou accord backend pour mobile.
6) Constantes métier : frontend/constants/* et types frontend/types/appointments.ts.

UI / UX (OBLIGATOIRE)
- Style Linear + Notion : épuré, beaucoup d’air, typo sobre, bordures légères, peu d’ombres, CTA discrets.
- Composants de base listés dans docs/react-native-ingenieur-prompt.md section « 7 bis ».
- Pas de sur-abstraction : éviter méga-hooks et props excessives ; répétition acceptable entre écrans proches
  si le code reste trivial à lire.

API : prioriser la table « 6.0 » du doc ; ne pas implémenter admin/lab comme produit.

Références code : frontend/utils/api.ts, useAuth.ts, useAppointments.ts, UnifiedAppointmentForm.vue,
AppointmentForm.vue, AuthMiddleware.php.
```

---

## 10. Écarts & notes de maintenance

- **Prescriptions infirmier vs API :** le web appelle parfois `/nurse/prescriptions` mais le backend n’expose que **`GET /pro/prescriptions` (rôle pro)** — voir section 6.10 ; à trancher avant l’écran « ordonnances » nurse.
- `POST /appointments/guest-preview` : présent côté API, peu utilisé côté web.
- `GET /notifications/unread` : utile pour un badge léger sur mobile.

---

*Document mis à jour pour le périmètre mobile (patient, nurse, pro, preleveur) + repères UI Linear/Notion.*
