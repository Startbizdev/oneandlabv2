# Workflow : partage RDV soins infirmiers vers WhatsApp

## Contexte

- Le client (admin) est dans des groupes WhatsApp d’infirmiers.
- Objectif : depuis le détail d’un RDV soins infirmiers, pouvoir **partager** un message (sans données patient) vers WhatsApp / groupe via le **partage natif** (Share API) sur mobile.
- Le lien partagé mène vers une **page marketing** avec infos RDV (sans patient), formulaire connexion/inscription infirmier, puis redirection vers le détail du RDV dans le dashboard nurse.
- Règle métier inchangée : **premier infirmier qui accepte le RDV est assigné** (déjà en place côté backend).

---

## 1. Flux existant (déjà en place)

| Étape | Qui | Action |
|-------|-----|--------|
| 1 | Patient | Prend un RDV soins infirmiers → RDV créé (pending, non assigné). |
| 2 | Backend | `dispatchGeographic()` notifie **tous** les infirmiers dont la zone de couverture contient le lieu du RDV (notification web + optionnel SMS). **Plus de limite à 10 professionnels.** |
| 3 | Infirmiers | Voient les RDV « pending » dans leur dashboard (liste = RDV non assignés dans leur zone). |
| 4 | Premier qui accepte | Met le statut en **confirmed** → backend assigne `assigned_nurse_id` à cet infirmier. |

Fichiers concernés :
- `backend/models/Appointment.php` : `create()` → `dispatchGeographic()`, `updateStatus()` (assignation quand status → confirmed).
- `backend/api/appointments/index.php` : filtre pending = RDV non assignés dans la zone du nurse.

---

## 2. Nouveau flux : partage vers WhatsApp

| Étape | Qui | Action |
|-------|-----|--------|
| 1 | Admin (ou back-office) | Dans le **détail du RDV** (soins infirmiers), clique sur **« Partager pour les soins infirmiers »**. |
| 2 | App | Construit un **titre**, un **texte** (emojis, **sans** nom/prénom/email/tél patient) et une **URL** (lien vers la page marketing du RDV). |
| 3 | App | Appelle **`navigator.share({ title, text, url })`** (Web Share API). |
| 4 | Mobile | La feuille de partage système s’ouvre → l’utilisateur choisit **WhatsApp** (ou l’icône du groupe) → le message est pré-rempli ; il envoie dans le groupe. |
| 5 | Fallback (desktop / pas de Share) | Copier le texte + URL dans le presse-papier (ou afficher pour copier-coller dans WhatsApp). |
| 6 | Infirmier (depuis le groupe) | Clique sur le lien → **page marketing** `/p/rdv/:token` (infos RDV sans données patient). |
| 7 | Infirmier | CTA « Je suis infirmier(ère) » → **Connexion (OTP)** ou **Inscription** (formulaire type register nurse). |
| 8 | Après auth | Redirection vers **détail du RDV** dans le dashboard nurse : `/nurse/appointments/:id`. |
| 9 | Déjà connecté | Si l’infirmier est déjà connecté en ouvrant le lien → redirection directe vers `/nurse/appointments/:id`. |
| 10 | Infirmier | Sur la page détail, clique **Accepter** → statut `confirmed` → backend assigne `assigned_nurse_id` (**premier qui accepte = à lui**). |

---

## 3. Contraintes

- **Message partagé** : aucun nom, prénom, email, tél du patient (RGPD).
- **Page marketing** : infos limitées (type de soins, date/heure, zone/ville, etc.), pas d’adresse précise ni données patient.
- **Lien** : URL avec **token** (ex. `/p/rdv/:token`), pas d’id patient ; token lié au RDV, optionnellement avec expiration (ex. 24 h).

---

## 4. À prévoir côté code (implémentation future)

- **Backend**
  - Génération d’un **token** par RDV (table ou champ dédié, ex. `appointment_share_tokens` ou champ sur `appointments`).
  - Endpoint **public** `GET /api/public/shared-appointment/:token` qui renvoie les infos non sensibles du RDV (pas de patient).
- **Front**
  - Bouton « Partager pour les soins infirmiers » dans la page détail du RDV (admin / back-office).
  - Utilisation de **`navigator.share({ title, text, url })`** avec fallback copie.
  - Page **`/p/rdv/:token`** : affichage des infos RDV, CTA connexion/inscription infirmier, redirection vers `/nurse/appointments/:id` après auth.

---

## 5. Modification effectuée

- **Limite de 10 professionnels supprimée** dans `backend/models/Appointment.php` : `dispatchGeographic()` notifie désormais **tous** les infirmiers (ou lab/subaccount) dont la zone contient le lieu du RDV, sans `array_slice(..., 0, 10)`.
