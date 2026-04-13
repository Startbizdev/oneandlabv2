# OneAndLab — Fonctionnalités de la plateforme (vue d’ensemble)

**Document destiné à un lecteur non technique.** Il décrit *ce que fait* la plateforme du point de vue métier, puis résume les **points d’accès API** (ce que les applications utilisent en coulisses).  
**Périmètre :** code audité sur le dépôt (API PHP sous `/api`, application Nuxt côté `frontend/`). La liste des routes reflète l’état du code ; certaines fonctions peuvent dépendre de la configuration serveur (Stripe, e-mail, SMS, etc.).

---

## 1. En deux phrases : c’est quoi OneAndLab ?

OneAndLab est une **plateforme web** pour organiser des **soins et examens à domicile** : prise de rendez-vous, suivi par les professionnels (infirmiers, laboratoires, médecins / professionnels de santé), documents médicaux, avis clients et abonnements.  
Le site public permet aussi de **découvrir des infirmiers et des laboratoires** (profils, villes) et de **prendre un rendez-vous** en ligne.

---

## 2. Les types d’utilisateurs (« rôles »)

Chaque compte a un rôle qui détermine **ce qu’il voit et ce qu’il peut faire**.

| Rôle (technique) | En langage simple |
|------------------|-------------------|
| **patient** | Personne qui reçoit le soin ou la prise de sang ; accès à ses rendez-vous, documents, proches, avis. |
| **pro** | Professionnel de santé (ex. médecin) qui peut gérer des patients délégués et des rendez-vous dans un espace « pro ». |
| **nurse** | Infirmier : rendez-vous de soins, calendrier, patients, **abonnement** (Stripe), **ordonnances**, **plans de soins** (suivi des séries), partage de lien patient, avis reçus. |
| **lab** | Laboratoire : rendez-vous de prélèvement, équipe (sous-comptes, préleveurs), statistiques, zones, abonnement. |
| **subaccount** | Compte rattaché à un laboratoire (gestion opérationnelle limitée au périmètre du lab). |
| **preleveur** | Préleveur rattaché à un lab : ses rendez-vous et son planning. |
| **super_admin** | Administration globale de la plateforme (utilisateurs, catégories, couverture, inscriptions, notifications, stats, etc.). |

> **Note :** l’authentification repose sur un **code reçu par e-mail (OTP)** et un **jeton sécurisé (JWT)** après validation. Les comptes peuvent être **suspendus ou bannis** (accès refusé).

---

## 3. Fonctionnalités par grand thème

### 3.1 Site public et marketing

- **Page d’accueil** et pages « pour les patients / infirmiers / laboratoires / professionnels » (présentation, tarifs).
- **Annuaires** : liste d’infirmiers et de laboratoires, **filtrage par ville**.
- **Fiches publiques** : profil infirmier ou laboratoire (slug), partage, avis publics.
- **Contact** : formulaire de message côté API.
- **Mentions légales, CGV, confidentialité**, page de connexion, inscription multi-profils.

### 3.2 Prise de rendez-vous

- Création et consultation de **rendez-vous** (soins infirmiers, prises de sang selon les règles métier).
- **Filtres et listes** (tableaux de bord par rôle) : aujourd’hui, à venir, statuts (en attente, confirmé, planifié, en cours, terminé, refusé, etc. — selon le schéma).
- **Modification / annulation** d’un rendez-vous (selon droits).
- **Réaffectation manuelle** d’un rendez-vous laboratoire à un autre intervenant (lab / sous-compte / super admin).
- **Historique** des changements de statut sur un rendez-vous (traçabilité).
- **Aperçu invité** : consultation limitée liée à un parcours sans compte complet (`guest-preview`).
- **Lien de partage public** : page `/p/rdv/...` et API `shared-appointment` — le patient (ou un proche) voit un résumé et peut se connecter pour la suite.
- **Partage infirmier → patient** : récupération ou création d’un lien / message pour le RDV soins (`share-for-nurse`, GET et POST selon l’action).
- **Création groupée (« lot »)** : plusieurs rendez-vous créés ensemble partagent un identifiant de lot ; les listes peuvent les **regrouper visuellement** (même créneau / même commande).
- **Assistants multi-rendez-vous** (« wizard ») côté infirmier ou admin pour enchaîner plusieurs prestations.

#### Dispatch géographique et « offres » de rendez-vous (logique métier importante)

- Lorsqu’un RDV est créé (sauf cas particuliers, ex. soins créés directement par l’infirmier), le système calcule quels **infirmiers** ou **laboratoires** sont **éligibles** selon les **zones de couverture**, la distance, les préférences (ex. genre pour certains soins), et pour les labs des règles de **délai minimum** avant le RDV.
- Des **offres** peuvent être enregistrées pour que plusieurs professionnels voient le RDV en attente ; le **premier qui confirme** l’emporte (mécanisme **atomique** en base pour éviter deux confirmations en même temps).
- Un professionnel peut **« redispatcher »** : remettre un RDV déjà confirmé en **en attente** et relancer la recherche d’intervenant (avec exclusion de celui qui redispatche), avec notification associée.

### 3.2 bis Espace infirmier — écrans complémentaires

- **Plans de soins actifs** (`/nurse/soins`) : vue dédiée aux **soins sur plusieurs jours** / séries, dérivée des rendez-vous (filtres par période).
- **Ordonnances** (`/nurse/prescriptions`) : accès outillé aux prescriptions liées à l’activité infirmière.

### 3.3 Documents et dossier patient

- **Documents médicaux** : liste, ajout, consultation, suppression contrôlée, **téléchargement** (fichier), **copie** entre contextes.
- **Documents côté patient** : liste et **téléversement** (upload) avec limites configurables.
- **Ordonnances / prescriptions** : génération PDF côté serveur pour un rendez-vous ; espace pro pour lister des prescriptions.
- **Galerie photos de soins** : photos associées au rendez-vous + **commentaires** (traçabilité visuelle du soin).

### 3.4 Patients, proches et accès pro

- **Fiche patient** : création, liste, mise à jour (profils chiffrés côté serveur pour données sensibles).
- **Recherche / lookup** de patient (usage contrôlé par les rôles autorisés).
- **Proches** : personnes rattachées au patient (liste, détail, modification, suppression).
- **Accès professionnel** : mécanisme de liaison patient ↔ pro / lab / infirmier pour éviter les doublons et sécuriser l’accès aux dossiers créés par un tiers.

### 3.5 Disponibilité, zones et « catalogue » de soins

- **Catégories de soins / prestations** : référentiel administrable (types de rendez-vous), avec possibilité de **filtrer par prestataire** sur le parcours public (`provider_id` en paramètre d’API).
- **Options de soins** liées aux catégories (données de référence pour les formulaires).
- **Zones de couverture** : géographie desservie par un profil (lab, etc.) — CRUD zones.
- **Paramètres de disponibilité** : créneaux / règles côté professionnel.
- **Préférences de catégories** : infirmier ou laboratoire indique les types de soins qu’il couvre.

### 3.6 Avis et réputation

- **Avis** : dépôt, consultation, **réponse du prestataire**, **modération** (admin).
- **Statistiques d’avis** agrégées (affichage / tableaux de bord).

### 3.7 Notifications

- **Notifications in-app** : liste, compteur non lues, marquage comme lu.
- **Files d’e-mails** et **services de notification** (envoi différé, rappels de rendez-vous — scripts et services backend).
- **Admin : envoi de notifications** (campagnes / messages), historique des envois.

### 3.8 Abonnements et paiements (Stripe)

- **Souscription / abonnement** : création de session de paiement, portail client Stripe, webhook pour synchroniser l’état avec la base.
- **Consultation de l’abonnement** côté utilisateur payant.
- **Limites par plan** : lecture des plafonds (nombre de RDV, fonctionnalités) pour adapter l’interface (ex. bannières ou garde-fous côté front).
- Abonnements **laboratoire** et **infirmier** (pages dédiées + Stripe).
- Page **tarifs** du site public peut déclencher une session de paiement (selon intégration).

### 3.9 Modération, sécurité et conformité

- **Signalements / incidents** : enregistrement d’incidents, suivi par profil.
- **Sanctions** : suspension, bannissement, levée de sanction (réservé aux rôles autorisés).
- **Recherche BAN** : aide à la vérification d’adresses (intégration référentiel français).
- **CSRF** sur les actions sensibles (mutation de données).
- **Journalisation technique** d’événements sensibles (ex. déconnexion) dans le modèle de logs applicatif.
- **Journal d’audit HDS (super admin)** : page **Logs** avec filtres (utilisateur, action, type de ressource, dates) et **export CSV** pour la conformité — alimentée par l’API `/api/logs`.
- **Rate limiting** (lib dédiée) sur certaines entrées pour limiter les abus.

### 3.10 Inscription et validation des comptes « prestataires »

- **Demandes d’inscription** : dépôt public, liste admin, **acceptation** ou **refus** avec mise à jour du compte.
- **Inscription par rôle** : pages dédiées (ex. `/nurse/register`, `/lab/register`, `/pro/register`, `/patient/register`) et page de **remerciement** après envoi (`/register/merci`).

### 3.11 Administration plateforme

- **Tableau de bord** et **statistiques globales**.
- **Gestion des utilisateurs** (création, édition, sanctions, préférences).
- **Rendez-vous** : vue et actions admin (création, édition, détail).
- **Catégories**, **couverture**, **abonnements** (vue admin), **avis** (modération), **notifications**, **calendrier** opérationnel, **logs HDS** (audit).

### 3.12 Fonctions transverses « compte »

- **Profil utilisateur** : lecture / mise à jour (coordonnées, images, texte public, FAQ, réseaux sociaires pour les profils publics, etc.).
- **Vérification d’e-mail** avant OTP, transformation **invité → utilisateur** enregistré.
- **Jeton CSRF** pour les formulaires web.

---

## 4. Comment l’interface est organisée (grands espaces)

Sans entrer dans chaque bouton, les **zones URL** principales du frontend sont :

| Préfixe d’URL | Public cible |
|---------------|----------------|
| `/`, `/infirmiers`, `/laboratoires`, `/pour-les-*`, `/contact`, `/login` | Grand public et acquisition |
| `/patient/*` | Patients |
| `/nurse/*` | Infirmiers |
| `/lab/*` | Laboratoires |
| `/subaccount/*` | Sous-comptes lab |
| `/preleveur/*` | Préleveurs |
| `/pro/*` | Professionnels de santé |
| `/admin/*` | Super-administration |
| `/p/rdv/*` | Lien court : aperçu d’un RDV soins + incitation à se connecter |
| `/rendez-vous/nouveau` | Prise de RDV (formulaire unifié, invité, proches, choix prestataire) |
| `/infirmier/[slug]`, `/Laboratoire/[slug]` | Pages vitrine alternatives (slug) en plus des listes par ville |
| `/nurse/soins`, `/nurse/prescriptions`, `/nurse/abonnement` | Plans de soins, ordonnances, abonnement infirmier |
| `/register/*`, `/register/merci` | Inscription prestataires / patient et confirmation |
| `/admin/logs` | Consultation et export des logs d’audit (HDS) |

---

## 5. Annexe — Inventaire des API (référence technique courte)

Convention : base **`/api`**. Les méthodes ci-dessous sont celles **autorisées dans le fichier** ; l’accès réel dépend encore des **rôles** et des **règles métier** dans chaque script.

### 5.1 Authentification et session

| Méthode | Chemin | Rôle |
|--------|--------|------|
| POST | `/api/auth/request-otp` | Demander un code à l’e-mail |
| POST | `/api/auth/verify-otp` | Valider le code et obtenir une session (JWT) |
| POST | `/api/auth/logout` | Déconnexion (journalisation si token valide) |
| GET | `/api/auth/me` | Profil de l’utilisateur connecté |
| POST | `/api/auth/check-email` | Vérifications liées à l’e-mail |
| GET | `/api/auth/csrf-token` | Jeton anti-falsification |
| POST | `/api/auth/guest-to-user` | Conversion d’un parcours invité vers un compte |

### 5.2 Rendez-vous

| Méthode | Chemin | Rôle |
|--------|--------|------|
| GET, POST | `/api/appointments` | Liste / création |
| GET, PUT, DELETE | `/api/appointments/{id}` | Détail / mise à jour / suppression |
| POST | `/api/appointments/guest-preview` | Aperçu pour invité |
| POST | `/api/appointments/{id}/reassign` | Réaffectation (lab / sous-compte / super_admin) |
| GET | `/api/appointments/{id}/history` | Historique |
| GET, POST | `/api/appointments/{id}/share-for-nurse` | Lecture ou génération du partage (POST protégé CSRF) |
| GET, POST | `/api/appointments/{id}/care-photos` | Galerie photos de soin |
| POST | `/api/appointments/{id}/care-photo-comments` | Commentaire sur une photo |
| POST | `/api/appointments/{id}/generate-prescription` | Génération prescription PDF |

### 5.3 Utilisateurs et profils

| Méthode | Chemin | Rôle |
|--------|--------|------|
| GET, POST | `/api/users` | Liste (dont cas « assignables » pro/infirmier) / création |
| GET, PUT, DELETE | `/api/users/{id}` | Détail / mise à jour / suppression |
| GET, PUT | `/api/users/{id}/nurse-category-preferences` | Préférences infirmier |
| GET, PUT | `/api/users/{id}/lab-category-preferences` | Préférences lab |
| PUT | `/api/users/{id}/sanctions` | Suspension / bannissement / levée |
| GET | `/api/users/{id}/incidents` | Incidents liés au profil |

### 5.4 Patients, proches, documents patient

| Méthode | Chemin | Rôle |
|--------|--------|------|
| GET, POST | `/api/patients` | Liste / création |
| GET | `/api/patients/lookup` | Recherche contrôlée |
| DELETE | `/api/patients/{id}` | Suppression (selon règles) |
| GET, POST | `/api/patient-relatives` | Proches |
| GET, PUT, DELETE | `/api/patient-relatives/{id}` | Détail proche |
| GET | `/api/patient-documents` | Liste documents patient |
| POST | `/api/patient-documents/upload` | Envoi de fichier |
| POST | `/api/patient-documents/upload-debug` | Endpoint de diagnostic (logs) |

### 5.5 Documents médicaux

| Méthode | Chemin | Rôle |
|--------|--------|------|
| GET, POST | `/api/medical-documents` | Liste / ajout |
| GET, DELETE | `/api/medical-documents/{id}` | Détail / suppression |
| GET | `/api/medical-documents/{id}/download` | Téléchargement fichier |
| POST | `/api/medical-documents/copy` | Duplication |

### 5.6 Référentiels et géographie

| Méthode | Chemin | Rôle |
|--------|--------|------|
| GET, POST | `/api/categories` | Liste / création (souvent `?type=` ; parcours public : `?provider_id=`) |
| GET, PUT, DELETE | `/api/categories/{id}` | Détail / MAJ / suppression |
| GET, POST, PUT | `/api/coverage-zones` | Zones |
| GET, PUT, DELETE | `/api/coverage-zones/{id}` | Détail zone |
| GET, PUT, POST | `/api/availability-settings` | Disponibilités |
| GET, POST, PUT | `/api/nurse-category-preferences` | Préférences infirmier (self) |
| GET, PUT | `/api/lab-category-preferences` | Préférences lab (self) |

### 5.7 Avis

| Méthode | Chemin | Rôle |
|--------|--------|------|
| GET, POST | `/api/reviews` | Liste / création |
| PUT, POST | `/api/reviews/{id}/response` | Réponse prestataire |
| PUT | `/api/reviews/{id}/moderate` | Modération |
| GET | `/api/reviews/stats` | Statistiques |

### 5.8 Notifications

| Méthode | Chemin | Rôle |
|--------|--------|------|
| GET | `/api/notifications` | Liste |
| GET | `/api/notifications/unread` | Non lues |
| PUT | `/api/notifications/{id}/read` | Marquer lu |

### 5.9 Laboratoire (équipe et stats)

| Méthode | Chemin | Rôle |
|--------|--------|------|
| GET, POST | `/api/lab/subaccounts` | Sous-comptes |
| GET, POST | `/api/lab/preleveurs` | Préleveurs |
| GET | `/api/lab/stats` | Statistiques lab (prises de sang) |

### 5.10 Professionnel — prescriptions

| Méthode | Chemin | Rôle |
|--------|--------|------|
| GET | `/api/pro/prescriptions` | Liste côté pro |

### 5.11 Stripe et limites d’offre

| Méthode | Chemin | Rôle |
|--------|--------|------|
| POST | `/api/stripe/create-checkout-session` | Paiement / souscription |
| POST | `/api/stripe/create-portal-session` | Portail client |
| GET | `/api/stripe/subscription` | État d’abonnement |
| POST | `/api/stripe/webhook` | Événements Stripe (serveur) |
| GET | `/api/plan-limits` | Plafonds du plan |
| GET | `/api/admin/subscriptions` | Vue admin des abonnements |

### 5.12 Administration

| Méthode | Chemin | Rôle |
|--------|--------|------|
| GET | `/api/admin/stats` | Statistiques globales |
| POST | `/api/admin/notifications/send` | Envoi ciblé |
| GET | `/api/admin/notifications/sent` | Historique envois |
| DELETE | `/api/admin/notifications/{id}` | Suppression entrée d’historique |
| GET | `/api/logs` | Journal d’audit (pagination, filtres) — **super_admin uniquement** |

### 5.13 Inscriptions prestataires

| Méthode | Chemin | Rôle |
|--------|--------|------|
| POST, GET | `/api/registration-requests` | Création (public) / liste (admin) |
| PUT | `/api/registration-requests/{id}/accept` | Accepter |
| PUT | `/api/registration-requests/{id}/reject` | Refuser |

### 5.14 API publiques (sans compte ou usage site vitrine)

| Méthode | Chemin | Rôle |
|--------|--------|------|
| GET | `/api/public/nurses` | Liste infirmiers (public) |
| GET | `/api/public/labs` | Liste laboratoires (public) |
| GET | `/api/public/nurse/{slug}` | Fiche infirmier |
| GET | `/api/public/lab/{slug}` | Fiche laboratoire |
| GET | `/api/public/shared-appointment/{slug}` | Détail RDV partagé |
| GET | `/api/public/provider-name` | Résolution de nom affiché |

### 5.15 Divers

| Méthode | Chemin | Rôle |
|--------|--------|------|
| POST | `/api/incidents` | Déclarer un incident |
| GET | `/api/ban/search` | Recherche adresse (BAN) |
| POST | `/api/contact` | Formulaire contact |

### 5.16 Racine API

- **GET `/api`** : message d’accueil JSON + liste courte de familles d’endpoints.

---

## 6. Limites de ce document

- Il **ne remplace pas** une analyse juridique (RGPD, HDS), un **schéma de données**, ni un **runbook** exploitation.
- Les **règles fines** (qui peut voir quel document, quel statut de RDV autorise quelle action) sont dans le **code PHP** de chaque route et dans les **modèles** (`backend/models/`).
- Les **intégrations tierces** (e-mail, SMS type Twilio, recherche d’adresses, Stripe, etc.) sont surtout dans les **bibliothèques** (`backend/lib/`) et les **scripts** ; elles ne correspondent pas toutes à une URL `/api/...` dédiée.
- Hors périmètre volontaire : **scripts de migration / CLI**, fichiers de **test** (ex. certaines pages admin de démo), et détails **pixel-perfect** de chaque composant Vue — la liste ci-dessus vise les **fonctions produit** et les **routes API** nommées dans `backend/api/`.

---

*Document généré à partir de l’audit statique du dépôt OneAndLab V2.*
