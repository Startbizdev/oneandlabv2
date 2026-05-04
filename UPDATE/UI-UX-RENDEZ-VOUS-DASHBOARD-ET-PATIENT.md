# UPDATE — UI/UX Rendez-vous & espaces par rôle

**Objectif** : aligner l’expérience sur un **SaaS B2B pro** — esthétique **Linear / Notion / n8n** (dense, neutre, actions nettes), **sans retirer de fonctionnalité** (réorganiser, fusionner, réduire le bruit).

**Principes directeurs**

1. **Une intention par écran** : liste = parcourir / filtrer ; détail = décider ; création = compléter une unique séquence claire.
2. **Hiérarchie typographique** : titre de page (1×), sous-titres de section (rare), corps ; éviter les titres + paragraphes + puces qui disent la même chose.
3. **Progressive disclosure** : options secondaires (filtres avancés, actions rares) derrière un seul point d’entrée (« Filtres », « Plus ») — **pas** comme substitut à un récap (pas de « déplier pour tout revoir » avant validation).
4. **Mobile first** : hauteur utile préservée, en-têtes compacts, scroll réservé au contenu utile (pas de « double header » fixe + titre répété).
5. **Zéro récap, zéro accordéon de synthèse** : pas d’écran « récapitulatif », pas de bloc repliable « votre demande en un coup d’œil », pas d’accordéon pour refaire passer la validation par une couche de lecture. La **dernière étape utile** = formulaire complet (y compris créneaux / documents) + **case de consentement RGPD directement sur cette page** + **un seul CTA final** (ex. envoi du code ou confirmation).
6. **Couleur : primaire rationnelle** : garder la **couleur primaire du produit** et les **icônes / pastilles sémantiques** déjà en couleur (ex. sang, soins) ; utiliser le **primaire avec parcimonie** — surtout **CTA principal**, lien d’action critique, indicateur d’étape ou d’onglet **actif**. Ne pas : gros aplats primaires, titres en primaire, bordures décoratives primaires sur tout le layout.

---

## 1. Langage visuel (réf. Linear · Notion · n8n)

**Ambiance** : interfaces **neutres** (fond clair ou sombre selon thème), **contraste par le texte et les lignes**, peu de décor — la couleur **signale** (statut, type de soin, action), elle ne « habille » pas l’écran.

| Thème | Règle courte |
|--------|----------------|
| Fond & surfaces | Blanc / gris 50–100 (ou équivalent dark) ; cartes = **bordure 1px** ou ombre **légère** ; éviter empilement d’ombres |
| Icônes couleur | **Conserver** les icônes / badges métier déjà colorés (cohérence actuelle) |
| Primaire | **Un seul CTA solid** par zone décisive ; secondaire = `outline` / `ghost` / neutre ; destructif = rouge réservé aux vraies actions destructives |
| Typo | Titres page `text-xl`–`text-2xl` ; sections `text-sm font-semibold` ; corps `text-sm` ; hiérarchie par **poids** et **gris** (`600` / `900`), pas par couleur |
| Listes & tableaux | Lignes **respirantes** mais **denses** ; séparateurs discrets ; hover léger |

**Spacing & layout (résumé)**  
- Conteneur page : `max-w-5xl` ou `max-w-7xl` (dashboard), **padding horizontal** `px-4 sm:px-6`.  
- Entre blocs majeurs : `gap-4` à `gap-6` ou `mb-6` — **pas** de `py-12` partout.  
- Éviter **double marge** (wrapper + carte qui repetent le même `p-6`).

**Responsive (court)**  
- **Mobile** : une colonne, `px-4`, CTA sticky **uniquement** si formulaire long ; une zone scroll principale.  
- **≥ sm** : `px-6`, grilles 2 colonnes si ça évite le scroll inutile ; pas d’excès de marge latérale vide.

---

## 2. Arbitrage global : fin de parcours minimaliste (patient & autres rôles)

| Situation actuelle (problème) | Recommandation |
|---------------|----------------|
| Écran récap séparé augmente les abandons, duplique date / actes / adresse déjà visibles en amont | **Supprimer entièrement l’étape récap** ; **consentement + CTA final** sur la **même** page que le formulaire / la dernière étape métier (patient : après validation du formulaire → OTP ou création directe selon auth). |
| Besoin légal / RGPD | **Checkbox explicite** + liens courts (CGU / confidentialité) **toujours visibles** sur cette dernière page de saisie — **sans** accordéon « détail juridique », **sans** bloc récap texte avant le CTA. |
| Wizard pro / lab / nurse / admin | Même esprit : **pas** d’écran récap dédié ; **pas** de synthèse repliable pour valider ; validation sur le **dernier écran de saisie** + consentement si applicable. |

**À ne pas faire** : recréer un récap sous une autre forme (drawer, accordéon, page « Vérifier avant envoi »). Les champs restent **visibles en scroll** sur l’étape finale.

---

## 3. Par rôle — écrans à auditer (aucun onglet oublié)

Pour chaque rôle, vérifier au minimum : **accueil / calendrier** (si présent), **liste RDV**, **détail RDV**, **création RDV**, **profil**, **paramètres**, **notifications**, **demandes / tournée / sous-vues** selon le rôle.

### 3.1 Patient

- **Parcours** : accueil patient → prise de RDV (wizard) → liste « Mes RDV » → **détail RDV** → documents / suivis.
- **Améliorations** :
  - Wizard : **3 blocs max visibles** à la fois (Services → Infos + adresse → Créneaux + docs). Réduire les textes d’aide redondants avec les labels de champs.
  - **Pas de récap** (cf. §2). Sur l’étape formulaire : consentement RGPD + action finale (invité → envoi OTP ; connecté → confirmation directe). Libellé CTA clair, une seule fois.
  - Liste : une ligne = **patient, type soin résumé, date, statut** ; éviter sous-titre + badge + ligne de texte répétitifs.
  - Détail : onglets ou ancrages clairs (Infos | Documents | Historique si présent) — pas trois zones « Documents » avec les mêmes intitulés.

### 3.2 Laboratoire (Lab)

- **Zones** : dashboard lab, **liste RDV lab**, **détail RDV**, **création RDV**, stats / équipe (si présent), profil public.
- **Améliorations** :
  - Liste : distinguer visuellement **à traiter** vs **confirmés** sans répéter « Prise de sang » partout ; filtres **un seul chemin** (sheet ou barre, pas les deux avec le même texte).
  - Cartes : réduire **titre + sous-titre + badge + 3 lignes** → **titre + métadonnées sur 2 lignes max** ; actions secondaires en menu ou icônes.
  - Mobile : éviter **TitleDashboard + sous-titre long + breadcrumb** si la liste est déjà identifiable par le tab / la nav.

### 3.3 Sous-compte (Sub lab)

- Même périmètre que lab + **assignation préleveur** — souvent **charge cognitive élevée**.
- **Améliorations** :
  - Page liste : message « assigner un préleveur » **une seule fois** (vide state ou bandeau contextuel sur 1 carte), pas en en-tête + sur chaque carte + dans la modale.
  - **CTA principal** par ligne : une action dominante (Ouvrir / Assigner selon contexte).
  - **Détail** : regrouper statut, lab parent, sous-compte, préleveur dans un **bloc « Attribution »** unique.

### 3.4 Professionnel (PRO)

- Listes / détails liés aux **patients et RDV** qu’il initie (selon produit).
- **Améliorations** :
  - Création multi-soins : enchaînement **linéaire** (scroll) ou étapes nommées, **sans** accordéon « par soin » pour masquer le contenu ; regrouper les champs redondants (ex. une seule ordonnance si le produit le permet) sans replier les sections critiques.
  - Éviter **même consigne** dans le footer sticky et au-dessus du formulaire.

### 3.5 Infirmier (Nurse)

- **Navigation typique** : **Mes rendez-vous**, **Mes demandes** (en attente), segments **tous / acceptés / historique / tournée** (selon implémentation actuelle), **détail**, **création**, **profil / préférences catégories**.
- **Améliorations** :
  - **Mes demandes vs Mes RDV** : titres et descriptions **non redondants** ; si la sidebar dit « Mes demandes », éviter un second H1 + paragraphe identique en mobile.
  - **Onglet / segment « Tournée »** (ou équivalent) : vue **dense géographique ou liste** — pas les deux avec la même liste dessous ; filtre date regroupé avec les **autres filtres** (ex. sheet unique), pas un panneau repliable dédié qui ajoute de la friction.
  - Cartes compactes : aligner **nom patient | statut | créneau** sur une grille stable (pas de hauteur variable inutile).
  - **Lot multi-soins nursing** : une carte lot avec **sous-lignes** plutôt que N cartes qui répètent l’adresse.

### 3.6 Préleveur (Preleveur)

- Liste / agenda / **détail RDV sang** ; actions **accepter / refuser / statut terrain** selon produit.
- **Améliorations** :
  - Priorité **terrain** : gros CTA, peu de texte ; informations lab / patient **regroupées** (pas trois blocs « lab »).
  - Mobile **scroll** : une seule zone scrollable (contenu principal) — éviter header + sous-nav + filtres qui occupent 50 % du viewport.

### 3.7 Admin (si applicable au produit)

- Formulaires longs (ex. création RDV admin) : **étapes ou sticky stepper minimal** (icônes + labels courts), pas un mur de titres.

---

## 4. Patterns transverses (tous rôles)

### 4.1 En-têtes de page

| À éviter | À préférer |
|----------|------------|
| `TitleDashboard` + sous-titre + fil d’Ariane + bandeau info | **Titre court** OU breadcrumb ; sous-titre **seulement** si information non évidente |
| Répéter le rôle dans le titre et dans la nav | Titre orienté **action** (« Demandes à traiter ») plutôt que « Mes demandes — infirmier » |

### 4.2 Listes de rendez-vous

- **Une métrique ou un état** par carte (pas statut + badge + chip + couleur identiques).
- **Filtres** : **un** composant (sheet recommandé sur mobile) ; badges de filtres actifs **inline** sous la barre de recherche.
- **Pagination** : visible seulement si > 1 page ; libellé « Page 2 sur … » compact.

### 4.3 Détail RDV

- **Above the fold** : Patient, type de soin (résumé), date, statut, **actions principales** (Accepter / Refuser / Contacter selon rôle).
- **Below** : sections **empilées dans l’ordre de lecture** (Planning → Actes / soins → Documents → Historique / technique) avec titres de section discrets ; **pas** d’accordéon pour ces blocs (navigation par ancres / sommaire léger autorisé si la page est longue).
- **Doublons** : si `category_name` + liste d’items blood_test + encart identique → **fusionner en un seul bloc « Prestation(s) »**.

### 4.4 Prise de RDV (tous les wizards)

- **Indicateur de progression** : 3 étapes max côté patient idéalement (ex. Choisir → Détails & créneaux → Code / confirmation) ; **sans** étape « Récap ».
- **Erreurs** : checklist / alertes **inline** sur la page de saisie ; pas de passage obligatoire par un résumé avant envoi.
- Mobile : **bouton principal** fixe en bas **uniquement** sur les étapes longues ; sinon intégré dans le flux pour éviter double footer.

### 4.5 Onglets « Demandes » / « Tournée » / vues nurse

- **Langage** : « Demandes » = entrées **à décider** ; « Mes RDV » ou « Planning » = **déjà dans votre périmètre** ; éviter deux libellés proches sans différence claire.
- **Badges sidebar** : même logique que les listes (compter des **lots** ou des **actions**, pas les deux mélangés sans légende).

### 4.6 Une information = un endroit (équipe, lots, statuts)

- **Qui s’occupe de vous** : **un seul bloc principal** par écran (ex. patient détail → section « Équipe » consolidée). Éviter de réafficher la même fiche lab / préleveur / infirmier dans la **frise**, le **carte de statut trajet** et **à nouveau** sous le même libellé — garder le trajet temps réel **sans** dupliquer nom + téléphone + adresse pro si déjà dans « Équipe ».
- **Lots multi-soins** : vocabulaire unique (**Lot**, **N soins**, **même prise en charge**) entre liste, détail, modale pro et notifications ; ne pas introduire une 4ᵉ formulation.
- **En attente d’assignation** : une phrase type « vous serez notifié… » **une fois** (bloc pending ou empty state), pas répétée en liste + détail + carte timeline + toast + email avec des formulations différentes.

---

## 5. Ce qu’on enlève (sans supprimer de features)

- **Écran / étape récap dédié** et toute variante **accordéon / repliable** servant de « mini-récap » avant validation.
- **Textes d’aide dupliqués** (garder un seul lieu : tooltip, lien « En savoir plus », ou ligne sous le champ).
- **En-têtes redondants** (titre page = titre carte de liste répété).
- **Phrases d’attente / « qui s’occupe de vous »** dupliquées entre liste, détail, timeline et notifications (même info, formulations multiples).
- **Lots** : re-listing de tous les soins + dates dans la notification **et** dans l’email **et** dans la carte patient (même exhaustive).

---

## 6. Ce qu’on améliore (priorités)

| Priorité | Sujet | Impact |
|----------|--------|--------|
| P0 | Suppression étape récap + CTA final sur la page de saisie (consent inclus), **sans** accordéon de synthèse | Conversion, clarté |
| P0 | **Skin Linear/Notion/n8n** : neutre + primaire sur CTA uniquement ; icônes couleur conservées | Cohérence marque & densité pro |
| P0 | Headers mobiles allégés + une zone scroll | Lisibilité terrain |
| P1 | Cartes liste : 2 lignes métier + actions | Scannabilité |
| P1 | Détail RDV : une seule zone « Prestations » + sections empilées (scroll), sans accordéons | Moins de doublons |
| P1 | **Dédoublonner** équipe / pending / lots (UI patient + notifications) — une source par info (cf. §9) | Moins de fatigue |
| P2 | Filtres unifiés (sheet) sur tous les `AppointmentListPage` | Cohérence SaaS |
| P2 | Wizard pro/dashboard : regroupement visuel / étapes claires sans masquer les champs derrière des repliables | Moins de fatigue |

---

## 7. Méthode de validation (recommandée)

1. **Audit écran par écran** (checklist rôle × route) — cocher titre redondant, double scroll, **écran ou bloc récap**, **accordéon / repliable** servant de mini-récap, **même info répétée** (équipe, « notifié quand… », listing lot).
2. **Tests utilisateurs courts** (5 min) : créer un RDV patient, accepter une demande nurse, accepter un RDV lab.
3. **Breakpoints** : 320, 390, 768, 1024 — vérifier **hauteur utile** et **thumb zone** des CTA.

---

## 8. Synthèse « vision SaaS pro »

Une application métier claire ressemble à : **peu de texte, des libellés d’action, une hiérarchie forte, des états visuels stables, un seul endroit pour chaque information**, et un **habillage neutre** où la **couleur primaire sert surtout à agir** (et les **icônes métier** gardent leur code couleur). Les fonctionnalités restent ; le gain vient de la **rarefaction** et de **chemins uniques** (filtres, validation, en-têtes).

---

## 9. Audit redondances (backend & frontend — relevé dans le repo)

Constat : la donnée **assignation / équipe / lot** est souvent **correcte**, mais le **texte** ou le **récap** la présente **plusieurs fois** avec des formulations différentes.

### 9.1 Backend

| Zone | Observation |
|------|-------------|
| `NotificationService::notifyBatchAppointmentCreationCompleted` | Message patient multi-RDV : concaténation **« catégorie le jj/mm/aaaa · … »** pour chaque ligne du lot → recoupe la **liste / détail** patient. L’**email** `appointment_created` reprend en plus `batch_summaries` → même info possible sur **3 canaux** (in-app + email + écran). |
| Piste | Titre **court**, **une phrase** (« N soins enregistrés »), **deep link** ; ne pas re-lister les N libellés + dates dans la notif **et** le corps d’email si l’app est la source de vérité. |

### 9.2 Frontend patient

| Fichier / zone | Observation |
|----------------|-------------|
| `pages/patient/appointments/[id].vue` | **« Équipe / Qui s’occupe de vous »** : regroupement par intervenant (bon). La **timeline** peut afficher une **bannière préleveur** (avatar, statut trajet) **par soin**, puis les mêmes pros sont détaillés dans **Équipe** → **double lecture**. |
| Idem | Carte groupe **pending** : *« Vous serez notifié dès qu’un professionnel… »* — à ne pas recopier sur la **liste** / autre bloc sans nuance. |
| Idem | Ancien bloc **« Qui s’occupe — par soin »** rendu via `v-for="appt in []"` (jamais affiché) mais texte **« Recherche en cours »** / notif encore en dur → **nettoyer** pour éviter une future réactivation involontaire et des doubles textes. |
| `pages/patient/index.vue` | Carte **lot** : adresse + lignes par soin + **puces équipe** ; vérifier l’absence de **même phrase d’attente** que sur le détail. |

### 9.3 Frontend pro / modal

| Fichier | Observation |
|---------|-------------|
| `components/ui/AppointmentModal.vue` | **« N soins — même prise en charge »** + liste + adresse : **compact** ; garder les **mêmes mots** que côté patient (`Lot`, etc.). |

### 9.4 Pistes (tickets)

1. **Timeline vs Équipe** : bannière trajet = **info temps réel** uniquement ; fiche complète (tél., profil) **uniquement** dans « Équipe », ou lien « Voir dans Équipe ».  
2. **Notifications lot** : s’appuyer sur `appointment_ids` / `creation_batch_id` pour ouvrir le détail **sans** paraphrase exhaustive dans le corps du message.  
3. **Chaînes « pending / recherche »** : une **formulation canonique** (fichier partagé ou i18n).  
4. Supprimer le **template mort** (`appt in []`) ou le remplacer par un vrai mode si besoin — documenter dans le ticket.

---

*Document généré pour le dossier `UPDATE` — base de travail design/dev ; à décliner en tickets par fichier Vue/layout affecté.*
