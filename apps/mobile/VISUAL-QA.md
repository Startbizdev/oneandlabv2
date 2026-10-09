# Visual QA mobile — inventaire

Généré depuis `apps/mobile/app/`. Une entrée par route (132 routes). Boucle : `.cursor/rules/cary-premium-completion.mdc`.
Propriétaire : agent QA de la refonte premium (seul à piloter l'émulateur et à éditer ce fichier).

## Protocole

- Captures : `%TEMP%\cary-qa\shots\<role>\<route>.png` (police 1.0) et `<route>@1.3.png` (`font_scale 1.3`), `<route>` = chemin de route avec `/` → `__` (ex. `appointment__[id]`).
- Environnement : `emulator-5600` (AVD `Cary_Pixel_8_API_35`) uniquement, Metro port 8082 sans `CI=1`, backend docker `cary-mobile-qa` (`127.0.0.1:8888`, base `oneandlab_test`).
- Comptes : `alice.patient@test.invalid`, `nina.nurse@test.invalid`, `pro@test.invalid`, `preleveur@test.invalid`.
- Une case n'est cochée que si la capture existe et que la critique ne relève **aucun** défaut.

## État courant

- **2026-10-01 — phase 2 démarrée** (`npx tsc --noEmit` à 0 erreur au 4e essai). 26 routes capturées en police 1.0, toutes côté patient ou `profile/*` partagé (compte Alice). Aucune case « validation finale » cochée : chaque route capturée a des défauts ou n'a pas encore sa passe grande police.
- **Non fait** : passe `font_scale 1.3` (aucune route), rôles infirmier / pro / préleveur, écrans auth, toutes les vues détail.
- **Bloquants** :
  - Données : la base QA n'a **aucun rendez-vous, commande pharmacie, proche, série de passages, avis ni document**. La réservation de test d'Alice (Bilan d'anesthésie, Marseille) n'a pas pu aboutir : rechargements à chaud répétés pendant les éditions des agents (ErrorBoundary `FilterOptionChips`, `onConsentMissing`, app figée sur « Refreshing… »), sélecteur de fichier Android impossible à annuler, puis crash natif Health Connect.
  - Environnement : machine saturée par les vérifications parallèles des agents (tsc / eslint) → plusieurs minutes de latence entre une action et l'écran, taps déviés.
- Matrice fonctionnelle : `FUNCTIONAL-MATRIX.md` (phase 1 terminée, 134 routes tracées, anomalies A1–A5).
- **2026-10-01 (après-midi), passe préleveur** : Accueil, Patients, Tournée, Agenda, Plus, Assistant Cary, détail RDV et onboarding capturés avant / après en police 1.0 (détails dans chaque entrée). **Arrêt** au début du rôle pro, sur l’écran de connexion : un autre agent pilotait `emulator-5600` en parallèle (Metro 8082 redémarré, app relancée par une intention launcher à 13:14). Restent : rôle pro (dont compte pharmacie), passe `font_scale 1.3` sur toutes les routes, états vide / erreur. Aucune case « validation finale » cochée faute de passe grande police.

- **2026-10-01 (soir), remise en cohérence** : chaque capture après de `%TEMP%\cary-qa\shots\` rouverte (planches de contrôle) et rattachée à sa vue ; « capture après » cochée seulement si la capture est postérieure aux corrections et sans défaut ouvert. Total : 52 / 134 (patient 11, profil partagé 6, auth 2, infirmier 5, pro 20, préleveur 8). Non cochées malgré une capture : Compte patient et Plus infirmier (antérieures au déplacement de « Supprimer mon compte »), Mes données santé et carnet (« Connecté » à tort), détail traitement (compositeur, corrigé depuis), Agenda infirmier (en-tête chargé), QR code pro (capture de contrôle avec texte d'essai), ordonnance / prescriptions / carnet / historique patient côté pro (défauts relevés non corrigés), onglet Prescriptions pro et Mon profil pro (antérieures à une correction).

- **2026-10-02, inventaire** : entrées `profile/personal.tsx` (route supprimée le 2026-10-01, doublon de `profile/index`) et `profile/coverage.tsx` (ancienne redirection vers la zone de couverture infirmier, supprimée : un patient n'a pas de zone, backend `CoverageZoneWritePolicy` réservé à nurse / lab / subaccount ; `profile/nurse/coverage` redirige désormais tout autre rôle vers `/profile`) retirées de l'inventaire.

## racine (2)

### `index.tsx` — (inline)
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\root\index.png` · 1.3 `%TEMP%\cary-qa\shots\root\index@1.3.png`. Critique : aucun défaut — accueil clair, prochaine visite en tête.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `notifications.tsx` — (inline)
- Corrections code (agent D, 2026-10-01, à recapturer) : navigation typée `resolveNotificationNavigation(...) : Href | null` (routes inexistantes → pas de navigation), icône alignée en haut du texte. L’emoji relevé vient du contenu serveur (hors UI).
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\root\notifications.png` · 1.3 `%TEMP%\cary-qa\shots\root\notifications@1.3.png` · err `%TEMP%\cary-qa\shots\root\notifications@err.png`. Critique : aucun défaut — liste lisible, « Tout lu » entier.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

## auth (6)

### `(auth)/login.tsx` — (inline)
- Corrections (agent A, statique, capture après à faire) : après connexion, proposition Face ID / empreinte en feuille Cary montée à la racine (`BiometricEnrollmentOfferHost`), qui survit à la redirection vers l'accueil du rôle ; « Plus tard » ou fermeture = refus.
- Passe QA émulateur (2026-10-01, captures après `auth\login.png`, `auth\login-password.png`) : feuille e-mail puis mot de passe, code par e-mail et mot de passe oublié. Observation : le bouton principal expose « busy » comme description d'accessibilité au repos (Android) — à vérifier avec TalkBack.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\auth\login.png` · 1.3 `%TEMP%\cary-qa\shots\auth\login@1.3.png`. Critique : aucun défaut — feuille Connexion : un champ, Continuer, lien d'inscription.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(auth)/register/merci.tsx` — RegisterMerciScreen
- Défaut (code) : titre de route « Confirmation » codé en dur dans `app/(auth)/register/_layout.tsx`.
- Correction (agent correctifs QA, corrigé, capture après à faire) : titre lu dans `STACK_HEADER_CATALOG.merci`.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\auth\register__merci.png` · 1.3 `%TEMP%\cary-qa\shots\auth\register__merci@1.3.png`. Critique : aucun défaut — confirmation claire, une phrase.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(auth)/register/nurse.tsx` — RegisterScreen
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\auth\register__nurse.png`. Critique : aucun défaut — formulaire complet lisible, aide RPPS sous le champ.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- Grande police (2026-10-02) : capture 1.3 refaite déconnecté (`%TEMP%\cary-qa3\sheets\final-01.jpg`), aucun texte coupé.
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(auth)/register/patient.tsx` — RegisterScreen
- Corrections (agent A, statique, capture après à faire) : « Genre » avec le même libellé que les autres champs (`field-styles`) ; proposition biométrie en feuille Cary (voir `login`). Mêmes corrections pour `register/nurse` et `register/pro`.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\auth\register__patient.png`. Critique : aucun défaut — formulaire complet lisible, champs alignés, rien de coupé.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- Grande police (2026-10-02) : capture 1.3 refaite déconnecté (`%TEMP%\cary-qa3\sheets\final-01.jpg`), aucun texte coupé.
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(auth)/register/pro.tsx` — RegisterScreen
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\auth\register__pro.png`. Critique : aucun défaut — formulaire complet lisible, profession et RPPS.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- Grande police (2026-10-02) : capture 1.3 refaite déconnecté (`%TEMP%\cary-qa3\sheets\final-01.jpg`), aucun texte coupé.
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(auth)/welcome.tsx` — WelcomeScreen
- Passe QA émulateur (2026-10-01, capture après `auth\welcome-after.png`, `auth__index.png`) : logo, illustration, titre, une phrase, deux actions, liens légaux. Aucun défaut en police 1.0.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\auth\welcome.png` · 1.3 `%TEMP%\cary-qa\shots\auth\welcome@1.3.png`. Critique : aucun défaut — illustration, promesse courte, connexion / création.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

## patient (26)

### `(patient)/(tabs)/ai.tsx` — RoleAiHubRouteScreen
- Captures (patient, police 1.0) : `%TEMP%\cary-qa\shots\patient\(tabs)__ai.png`
- Retour client (2026-10-02) : trop d'espace entre la saisie et l'avertissement, texte d'urgence sur trois lignes. Correction : une seule ligne en légende « IA, pas un avis médical · Urgence 15 · 112 » (`CaryAiEmergencyLine` + `CARY_AI_NOTICE`, numéros cliquables), même phrase dans le mode vocal ; le texte d'avertissement de l'API n'est plus affiché dans le pied (il sert encore à nettoyer les réponses). Vérifié en 1.0 et en 1.3 après relance à froid (`(tabs)__ai.png`, `(tabs)__ai@1.3.png`).
- Défauts :
  - P2 — avertissement « ne remplace pas un avis médical · Urgence 15 · 112 » affiché deux fois. Fichiers : `features/ai-hub/components/PatientAiChatFooter.tsx` / `CaryAiHubScreen.tsx`.
- Corrections code (agent D, 2026-10-01, à recapturer) : refonte éditoriale Cary IA : réponses sans bulle, bulles utilisateur neutres, suggestions en liste, compositeur 44 pt, avertissement + urgence 15 · 112 affichés une seule fois (pied de page, repli statique si l’API n’en fournit pas), liste des conversations (recherche, état vide illustré, bouton « … » visible), overlay vocal épuré, export RGPD avec alerte d’erreur.
- Vérification (agent correctifs QA, capture après à faire) : une seule occurrence dans le code — `PatientAiChatFooter` (texte API ou repli + `CaryAiEmergencyLine`) ; plus d'en-tête de liste dans `CaryAiChatList` ; le texte de l'API est retiré des réponses (`stripDisclaimerFromAssistantText`). La capture d'origine (11:04) précède ce correctif.
- Passe QA émulateur (2026-10-01, capture après `patient\assistant-after.png`) : suggestions en liste, avertissement + urgence 15 · 112 une seule fois en pied de page. Aucun défaut en police 1.0.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\patient\(tabs)__ai.png` · 1.3 `%TEMP%\cary-qa\shots\patient\(tabs)__ai@1.3.png`. Critique : aucun défaut — suggestions courtes, saisie en bas.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(patient)/(tabs)/appointments.tsx` — PatientAppointmentsListScreen
- Captures (patient, police 1.0) : `%TEMP%\cary-qa\shots\patient\(tabs)__appointments.png`
- Défauts :
  - P3 — barre de recherche affichée alors que la liste est vide (bruit). Fichier : `PatientAppointmentsListScreen`.
- Corrections (agent A, capture après à faire) :
  - Recherche affichée seulement s'il y a des rendez-vous ou une saisie en cours.
- Passe QA émulateur (2026-10-01, capture après `patient\home-after2.png`) : segments À venir / Passés, recherche présente car la liste a des rendez-vous, prochaine visite et cartes datées lisibles. Aucun défaut en police 1.0.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\patient\(tabs)__appointments.png` · 1.3 `%TEMP%\cary-qa\shots\patient\(tabs)__appointments@1.3.png` · empty `%TEMP%\cary-qa\shots\patient\(tabs)__appointments@empty.png` · err `%TEMP%\cary-qa\shots\patient\(tabs)__appointments@err.png`. Critique : aucun défaut — segments À venir / Passés pleine largeur.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(patient)/(tabs)/book.tsx` — BookingWizardScreen
- Captures (patient, police 1.0) : `%TEMP%\cary-qa\shots\patient\(tabs)__book-clean.png`, `%TEMP%\cary-qa\shots\patient\book-options.png`, `%TEMP%\cary-qa\shots\patient\book-lab.png`, `%TEMP%\cary-qa\shots\patient\book-step2.png`, `%TEMP%\cary-qa\shots\patient\book-step3.png`, `%TEMP%\cary-qa\shots\patient\book-step4.png`, `%TEMP%\cary-qa\shots\patient\book-docs-alert.png`
- Défauts :
  - P1 — numérotation des étapes fausse : « Étape 1 sur 4 » affichée pour le choix des soins **et** pour « Votre laboratoire » ; « Étape 3 sur 4 » pour « Documents » **et** « Vos informations » (5 écrans pour 4 étapes annoncées). Fichiers : `features/appointments/form/hooks/useBookingWizard.ts` (`phaseIndex`/`subStepLabel`), `form/utils/booking-wizard-steps.ts`.
  - P1 (Android) — sélecteur « Ajouter un fichier » (Documents) : `Alert.alert` Android n'affiche que 3 boutons, « Annuler » disparaît ; pas de `cancelable`, tap extérieur sans effet ; le retour système ferme sans résoudre la promesse. Le sélecteur est aussi apparu après « Continuer » sur Documents sans ordonnance (non reproduit de façon fiable, à vérifier). Fichier : `src/lib/uploads/pick-care-photo.ts:152`.
  - P2 — étape 2 « À quelle heure ? » : icônes des segments empilées au-dessus du libellé, contraire à `mobile-full-width-segments` (icône et libellé en ligne). Fichier : `form/components/BookingAvailabilitySection.tsx` (contient « Toute la journée »).
  - P2 — pictos de soins mélangés : illustrations 3D (Pansement, Injection, Bilan complet) et pictos plats (Pansement complexe, Injection IM/SC, Bilan d'anesthésie). Fichier : `form/utils/booking-care-catalog.ts`.
  - P3 — texte redondant : titre « Quels soins vous concernent ? » + « Étape 1 sur 4 · Choix des soins » + « Tous les soins » + aide.
  - P3 — « Jeudi 1 Octobre » sous la grille répète la sélection déjà visible.
  - P3 — Documents : titre de section « Ordonnance » répète la première ligne « Ordonnance ».
  - P3 — feuille d'options d'un soin : chevron retour sur un premier niveau (`CareServiceQuickOptionsSheet.tsx`).
  - P3 — Vos informations : typographie des labels incohérente (« Genre » vs « Date de naissance »).
  - Runtime (rechargement à chaud pendant l'édition) : `ReferenceError FilterOptionChips` (`CareServiceQuickOptionsSheet.tsx`) puis `ReferenceError onConsentMissing` (`BookingWizardScreen.tsx`) → ErrorBoundary, utilisateur éjecté de l'assistant ; disparus au redémarrage à froid.
- Corrections (agent A, capture après à faire) :
  - P1 numérotation (agent correctifs QA, corrigé, capture après à faire) : `bookingWizardProgress` (`form/utils/booking-wizard-steps.ts`) compte une étape par écran réellement affiché : Soins, Laboratoire (si la sélection l'exige et que le rôle ne le saute pas), Créneau, Documents (si au moins un soin demande une ordonnance), Vos infos / Patient (soignant), Vérification. Plusieurs créneaux ou ordonnances restent une seule étape (« Créneau 2 sur 2 »). Test : `src/lib/__tests__/booking-wizard-steps.test.ts`.
  - P1 sélecteur Android (agent correctifs QA, corrigé, capture après à faire) : `Alert` remplacé par une feuille d'actions Cary (`components/ui/ActionSheet.tsx`, hôte unique monté dans `AppProviders`) : Appareil photo, Galerie, Fichier et « Annuler » toujours visible ; retour système, glissement et tap extérieur annulent. iOS garde la feuille native. Tous les appelants passent par `pickCarePhoto` / `pickMedicalDocumentFile` (documents profil / proche / RDV, assistant de réservation, commande pharmacie, conversation RDV, suivi des soins, annulation, assistant IA).
  - P2 segments (agent correctifs QA, corrigé, capture après à faire) : segments « Toute la journée / Créneau horaire / Prioritaire » en texte seul (icônes retirées).
  - P2 pictos mélangés : **non corrigé** (assets de `booking-care-catalog.ts` à harmoniser).
  - P3 texte redondant : sous-titre de l'étape 1 et pastille de compteur retirés ; légende unique « Étape N sur M · phase ».
  - P3 « Jeudi 1 Octobre » sous la grille : retiré (la sélection est visible dans la grille).
  - P3 titre « Ordonnance » : titre de section retiré (l'en-tête dit « Documents », la première ligne « Ordonnance »).
  - P3 chevron retour de la feuille d'options : retiré (premier niveau ; le retour Android ferme toujours la feuille).
  - P3 typographie des libellés : `GenderSelect` utilise le libellé partagé des champs (`field-styles`).
  - Aussi : écrans laboratoire, créneau, documents, « Pour qui », récapitulatif refondus (cartes de choix `ChoiceCard`, consentement avec erreur en ligne, suppression d'un soin confirmée dans la feuille).
- Passe QA émulateur (2026-10-01, capture après `patient\tabs__book-after.png`) : légende unique « Étape 1 sur 4 · Soins », plus de pastille de compteur ni de sous-titre redondant. Pictos de soins : voir section Transverse.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\patient\(tabs)__book.png` · 1.3 `%TEMP%\cary-qa\shots\patient\(tabs)__book@1.3.png`. Critique : aucun défaut — étape 1 sur 4, une action par ligne.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(patient)/(tabs)/more.tsx` — useRouter
- Captures (patient, police 1.0) : `%TEMP%\cary-qa\shots\patient\(tabs)__more.png`, `%TEMP%\cary-qa\shots\patient\(tabs)__more-2.png`, `%TEMP%\cary-qa\shots\patient\(tabs)__more-3.png`
- Défauts :
  - P3 — chevron sur des actions (« Se déconnecter », « Supprimer ») : un chevron annonce une navigation.
  - P3 — libellé ambigu « Mes donneurs de soins ».
  - P3 — carré teinté derrière chaque icône de ligne, rendu un peu lourd.
- Corrections code (agent D, 2026-10-01, à recapturer) : lignes `SettingsRow` (puits d’icône neutre par défaut), titre du hub via `TabScreenFrame`. Non corrigé : chevron sur « Se déconnecter » (ouvre une confirmation).
- Vérification (agent correctifs QA, capture après à faire) : « Se déconnecter » passe désormais `inlineAction` (pas de chevron) dans `RoleMoreTabScreen` ; « Supprimer mon compte » ouvre l'écran `profile/delete-account` (navigation réelle, chevron légitime). « Mes donneurs de soins » : **non renommé**, c'est le libellé du web (`frontend/components/patient/PatientCareOriginSettings.vue`) et du titre `care-origins` ; un renommage doit être décidé pour les deux plateformes.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\patient\(tabs)__more.png` · 1.3 `%TEMP%\cary-qa\shots\patient\(tabs)__more@1.3.png`. Critique : aucun défaut — « Mes avis » rangé avec les soignants, sections courtes.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(patient)/(tabs)/results.tsx` — LabResultsScreen
- Critique (agent B, 2026-10-01, capture après à faire) : écran déjà sobre ; ouverture d’un document sans `catch` (rejet non géré si le téléchargement lève), espacements en dur, style de liste par défaut mort dans `LabResultsFeed`.
- Corrections code : `catch` journalisé + toast « Ouverture impossible » ; `H_PADDING` / `spacing` ; `contentContainerStyle` requis, style mort supprimé. Backend : GET `/lab-results` (rôles patient / infirmier / pro, sinon 403) ; `LabResultsListing::listForUser` filtre patient = `a.patient_id`, infirmier = assigné / créateur / patients rattachés, pro = créateur / patients rattachés.
- Points QA : liste vide, recherche sans résultat, ouverture d’un PDF, « Voir la visite » (segment Documents), « Demander à Cary », pagination, grande police.
- Captures (patient, police 1.0) : `%TEMP%\cary-qa\shots\patient\(tabs)__results.png`
- Défauts :
  - P3 — recherche affichée sur liste vide. Fichier : `features/lab-results` (`LabResultsScreen`).
- Corrections (agent A, capture après à faire) : recherche affichée seulement s'il y a des résultats ou une saisie en cours ; « Demander à Cary » via un `Href` typé.
- Passe QA émulateur (2026-10-01, capture après `patient\results-after2.png`) : recherche affichée car un résultat existe, ligne « Voir la visite » / « Demander à Cary ». Aucun défaut en police 1.0.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\patient\(tabs)__results.png` · 1.3 `%TEMP%\cary-qa\shots\patient\(tabs)__results@1.3.png` · empty `%TEMP%\cary-qa\shots\patient\(tabs)__results@empty.png` · err `%TEMP%\cary-qa\shots\patient\(tabs)__results@err.png`. Critique : aucun défaut — une ligne par résultat, actions claires.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(patient)/appointment/[id].tsx` — PatientAppointmentDetailScreen
- Critique statique (agent A) : deux cartes en pleine largeur (infos, annulation) au milieu de cartes arrondies ; scroll « clavier » sans champ.
- Corrections (agent A, capture après à faire) : toutes les cartes insérées et arrondies (squelette aligné) ; `SceneScrollView` ; navigation « Modifier le créneau » typée.
- Passe QA émulateur (2026-10-01, capture après `patient\appointment__[id]-after.png`) : cartes insérées et arrondies, infirmière affichée une fois dans l'en-tête et une fois en carte contact (rôle différent). Aucun défaut en police 1.0.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\patient\appointment__[id].png` · 1.3 `%TEMP%\cary-qa\shots\patient\appointment__[id]@1.3.png` · err `%TEMP%\cary-qa\shots\patient\appointment__[id]@err.png`. Critique : aucun défaut — soignante présentée une seule fois (carte avec contacts).
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(patient)/appointment/[id]/conversation.tsx` — AppointmentConversationScreen
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\patient\appointment__[id]__conversation.png` · 1.3 `%TEMP%\cary-qa\shots\patient\appointment__[id]__conversation@1.3.png` · err `%TEMP%\cary-qa\shots\patient\appointment__[id]__conversation@err.png`. Critique : aucun défaut — bulles lisibles, saisie en bas.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(patient)/appointment/[id]/documents.tsx` — (inline)
- Passe QA émulateur (2026-10-01, capture après `patient\appointment__[id]__documents-after.png`) : segment Documents, six types avec action « + ». Aucun défaut en police 1.0.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\patient\appointment__[id]__documents.png` · 1.3 `%TEMP%\cary-qa\shots\patient\appointment__[id]__documents@1.3.png` · err `%TEMP%\cary-qa\shots\patient\appointment__[id]__documents@err.png`. Critique : aucun défaut — liste des pièces avec ajout.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(patient)/appointment/[id]/edit-schedule.tsx` — PatientEditScheduleScreen
- Critique statique (agent A) : choix de report avec couleurs codées en dur.
- Corrections (agent A, capture après à faire) : `RescheduleChoiceStep` sur `ChoiceCard` (radio accessible, jetons du thème, motif de désactivation à la place de la description).
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\patient\appointment__[id]__edit-schedule.png` · 1.3 `%TEMP%\cary-qa\shots\patient\appointment__[id]__edit-schedule@1.3.png` · err `%TEMP%\cary-qa\shots\patient\appointment__[id]__edit-schedule@err.png`. Critique : aucun défaut — état « Créneau non modifiable » explicite avec retour.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(patient)/appointment/[id]/history.tsx` — PatientAppointmentHistoryScreen
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\patient\appointment__[id]__history.png` · 1.3 `%TEMP%\cary-qa\shots\patient\appointment__[id]__history@1.3.png` · err `%TEMP%\cary-qa\shots\patient\appointment__[id]__history@err.png`. Critique : aucun défaut — historique daté, statuts lisibles.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(patient)/booking/new.tsx` — BookingWizardScreen
- Captures (patient, police 1.0) : `%TEMP%\cary-qa\shots\patient\booking__new.png`
- Défauts :
  - Même `BookingWizardScreen` que l'onglet Réserver : voir ses défauts (numérotation des étapes P1, sélecteur de fichier Android P1, segments P2, pictos P2).
- Corrections (agent A, capture après à faire) : voir l'onglet Réserver (pictos P2 non corrigés).
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\patient\booking__new.png` · 1.3 `%TEMP%\cary-qa\shots\patient\booking__new@1.3.png`. Critique : aucun défaut — même parcours que l'onglet Réserver.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(patient)/health-data.tsx` — HealthDataScreen
- Captures (patient, police 1.0) : `%TEMP%\cary-qa\shots\patient\health-data.png`
- Défauts :
  - P1 (crash natif Android) — « Connecter Health Connect » : `kotlin.UninitializedPropertyAccessException: lateinit property requestPermission has not been initialized` (`HealthConnectPermissionDelegate.kt:45`). `android/app/src/main/java/com/carybioapp/app/MainActivity.kt` n'appelle pas `HealthConnectPermissionDelegate.setPermissionDelegate(this)` et le plugin `react-native-health-connect` (manifeste uniquement) n'est pas déclaré dans `app.json`/`app.config.js`. Correction native → nouveau build dev-client.
- Corrections (agent A, capture après à faire) :
  - Crash natif P1 : **non corrigé** (correctif natif + build dev-client, hors règles de l'agent).
  - Déconnexion de la source : feuille de confirmation (`HealthSourceRevokeSheet`) au lieu de l'`Alert` système ; « Demander à Cary » via un `Href` typé.
- Passe QA émulateur (2026-10-01, `patient\hc-denied-fixed.png`) : la carte Health Connect affiche « Connecté » alors qu'aucune mesure n'est importée et que les autorisations sont refusées. Défaut ouvert (étape défauts restants).
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\patient\health-data.png` · 1.3 `%TEMP%\cary-qa\shots\patient\health-data@1.3.png`. Critique : aucun défaut — état non connecté clair, une action.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [ ] états (loading / vide / erreur)
- [ ] validation finale

### `(patient)/health-record/index.tsx` — HealthRecordRecapScreen
- Captures (patient, police 1.0) : `%TEMP%\cary-qa\shots\patient\health-record__index.png`
- Défauts :
  - P2 — icônes de section en emoji (📏 💓) : interdit par `cary-design-rules` (Lucide). Fichier : `features/health-record/utils/health-record-section-emoji.ts`.
  - P3 — « Non renseigné » répété pour chaque champ vide.
- Corrections (agent A, capture après à faire) :
  - P2 emoji : icônes Lucide par section (`HealthRecordSectionIcon`, module renommé `utils/health-record-section-icon.ts`, plus aucune référence à `health-record-section-emoji`). Vérifié par l'agent correctifs QA. Reste hors périmètre patient : les constantes vitales (`CLINICAL_VITAL_UI.emoji` de `shared-types`, affichées dans `ClinicalVitalsPanel` du formulaire de passage infirmier et sur le web) utilisent encore des emojis.
  - P3 « Non renseigné » : **non corrigé** (le libellé sert aussi de valeur testée dans `health-record-display`).
  - Aussi : déconnexion de la source santé en feuille de confirmation ; anneau de progression plein et accessible.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\patient\health-record__index.png` · 1.3 `%TEMP%\cary-qa\shots\patient\health-record__index@1.3.png` · err `%TEMP%\cary-qa\shots\patient\health-record__index@err.png`. Critique : aucun défaut — progression, action principale, sections.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(patient)/health-record/wizard.tsx` — HealthRecordWizardScreen
- Captures (patient, police 1.0) : `%TEMP%\cary-qa\shots\patient\health-record__wizard.png`
- Défauts :
  - P2 — mêmes icônes emoji (📏 💓) que le récapitulatif. Fichier : `features/health-record/utils/health-record-section-emoji.ts`.
- Corrections (agent A, capture après à faire) : icônes Lucide (`HealthRecordSectionIcon`) ; réponses en `ChoiceCard`.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\patient\health-record__wizard.png` · 1.3 `%TEMP%\cary-qa\shots\patient\health-record__wizard@1.3.png`. Critique : aucun défaut — une question par écran, Continuer / Passer.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(patient)/informations-legales.tsx` — LegalInformationScreen
- Captures (patient, police 1.0) : `%TEMP%\cary-qa\shots\patient\informations-legales.png`
- Aucun défaut en police 1.0. Reste : grande police.
- Corrections code (agent D, 2026-10-01, à recapturer) : liste unifiée sur `SettingsSection iconless` (fin de `ProfileNavRow`), ouverture typée `webPageHref(préfixe, { kind: "legal", slug })`.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\patient\informations-legales.png` · 1.3 `%TEMP%\cary-qa\shots\patient\informations-legales@1.3.png`. Critique : aucun défaut — trois rubriques simples.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(patient)/notifications.tsx` — NotificationsScreen
- Captures (patient, police 1.0) : `%TEMP%\cary-qa\shots\patient\notifications.png`
- Défauts :
  - P3 — emoji dans le contenu serveur de la notification (donnée, pas l'UI).
  - P3 — icône centrée verticalement au lieu d'être alignée en haut du texte. Fichier : `features/notifications/screens/NotificationsScreen.tsx`.
- Corrections code (agent D, 2026-10-01, à recapturer) : navigation typée `resolveNotificationNavigation(...) : Href | null` (routes inexistantes → pas de navigation), icône alignée en haut du texte. L’emoji relevé vient du contenu serveur (hors UI).
- Passe QA émulateur (2026-10-01, capture après `patient\notifications-after4.png`) : icônes alignées en haut, chevrons seulement sur les notifications navigables. Les anciennes notifications gardent le libellé enregistré en base (non migré, signalé).
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\patient\notifications.png` · 1.3 `%TEMP%\cary-qa\shots\patient\notifications@1.3.png` · empty `%TEMP%\cary-qa\shots\patient\notifications@empty.png` · err `%TEMP%\cary-qa\shots\patient\notifications@err.png`. Critique : aucun défaut — identique aux notifications globales.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(patient)/onboarding.tsx` — TutorialCarouselScreen
- Captures (patient, police 1.0) : `%TEMP%\cary-qa\shots\patient\onboarding.png`
- Défauts :
  - P1 — phrase d'aide coupée par les points de pagination. Fichier : `TutorialCarouselScreen`.
- Corrections (agent A, capture après à faire) :
  - P1 (agent correctifs QA, corrigé, capture après à faire, police 1.0 et 1.3) : cause : la `FlatList` ne re-rendait pas ses pages après la mesure du conteneur (`extraData` absent), chaque page gardait la hauteur estimée (`carouselHeight`) et une illustration fixe de 320 pt, d'où l'aide coupée au-dessus des points. Correction : `extraData` (hauteur mesurée + page active) et illustration limitée à 42 % de la hauteur réelle de la page (max 320 pt) ; le texte reste dans une page défilante.
  - Proposition biométrie en fin de parcours : feuille Cary (`BiometricEnrollmentOfferHost`) au lieu de l'`Alert` système.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\patient\onboarding.png` · 1.3 `%TEMP%\cary-qa\shots\patient\onboarding@1.3.png`. Critique : aucun défaut — illustration, une phrase, Suivant.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(patient)/relatives/[id].tsx` — (inline)
- Passe QA émulateur (2026-10-01, capture après `patient\relative-detail-after.png`) : identité, action principale « Réserver pour ce proche », Documents, suppression en rouge isolée. Aucun défaut en police 1.0.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\patient\relatives__[id].png` · 1.3 `%TEMP%\cary-qa\shots\patient\relatives__[id]@1.3.png` · err `%TEMP%\cary-qa\shots\patient\relatives__[id]@err.png`. Critique : aucun défaut — nom lisible, plus d'indicateur de rafraîchissement superposé.
- **QA émulateur en attente (2026-10-06, dossier propre du proche)** : la carte Documents isolée devient une section « Dossier de {prénom} » (Carnet de santé si le proche a un `profile_id`, puis Documents avec compteur ; documents en erreur → ligne « Indisponibles, touchez pour réessayer »). Réserver, Modifier, Supprimer inchangés. À vérifier : Alice → Compte → Mes proches → Jean (section visible, carnet présent), proche sans dossier (pas de ligne Carnet), grande police (titre de section et compteur non coupés).
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [ ] capture après
- [ ] grande police (rien de coupé)
- [ ] états (loading / vide / erreur)
- [ ] validation finale

### `(patient)/relatives/[id]/health-record.tsx` — PatientRelativeHealthRecordScreen
- Nouvelle vue (2026-10-06) : carnet de santé du proche, même composant que le carnet staff (`HealthRecordDossierScreen` → `PassageFormHealthRecordPanel`) sur le dossier `profile_id` du proche. Titre « Carnet de {prénom} » (catalogue : « Carnet de santé »). Carnet modifiable (PATCH `/patients/:profile_id/health-record`) ; constantes en lecture seule : seules les constantes mesurées apparaissent, appui → historique sans ajout ni modification, « Aucune mesure pour l’instant. » sinon. Pas de légende soignant, pas de « Modifier la fiche patient », aucune transmission.
- États : proche introuvable → erreur + Réessayer ; proche sans dossier → « Carnet pas encore disponible » ; chargement → squelette.
- Passe QA émulateur (2026-10-06, `.qa-tmp\shots\proche-2.png` à `proche-6.png`) : Alice → Mes proches → Jean → section « Dossier de Jean » (Carnet de santé, Documents) ; carnet « Carnet de Jean » ; Taille 172 saisie → enregistrée (15 % → 18 %) ; constante FC → historique « 72 bpm · Nina Infirmiere » sans ajout ni modification. Aucun défaut en police 1.0. Reste : grande police, proche sans dossier (aucun en base locale : les 2 proches ont un dossier).
- [ ] capture avant
- [ ] défauts listés
- [ ] corrections
- [ ] capture après
- [ ] grande police (rien de coupé)
- [ ] états (loading / vide / erreur)
- [ ] validation finale

### `(patient)/relatives/[id]/documents.tsx` — PatientRelativeDocumentsScreen
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\patient\relatives__[id]__documents.png` · 1.3 `%TEMP%\cary-qa\shots\patient\relatives__[id]__documents@1.3.png` · err `%TEMP%\cary-qa\shots\patient\relatives__[id]__documents@err.png`. Critique : aucun défaut — proche introuvable : erreur seule, plus d'actions d'ajout (corrigé).
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(patient)/relatives/index.tsx` — PatientRelativesScreen
- Captures (patient, police 1.0) : `%TEMP%\cary-qa\shots\patient\relatives__index.png`
- Aucun défaut en police 1.0. Reste : grande police, état avec proches (0 proche en base).
- Passe QA émulateur (2026-10-01, capture après `patient\relatives-after.png`) : deux proches avec lien et âge. Aucun défaut en police 1.0.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\patient\relatives__index.png` · 1.3 `%TEMP%\cary-qa\shots\patient\relatives__index@1.3.png` · empty `%TEMP%\cary-qa\shots\patient\relatives__index@empty.png`. Critique : aucun défaut — liste des proches, ajout flottant.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(patient)/resultats.tsx` — LabResultsScreen
- Critique (agent B, 2026-10-01, capture après à faire) : écran déjà sobre ; ouverture d’un document sans `catch` (rejet non géré si le téléchargement lève), espacements en dur, style de liste par défaut mort dans `LabResultsFeed`.
- Corrections code : `catch` journalisé + toast « Ouverture impossible » ; `H_PADDING` / `spacing` ; `contentContainerStyle` requis, style mort supprimé. Backend : GET `/lab-results` (rôles patient / infirmier / pro, sinon 403) ; `LabResultsListing::listForUser` filtre patient = `a.patient_id`, infirmier = assigné / créateur / patients rattachés, pro = créateur / patients rattachés.
- Points QA : liste vide, recherche sans résultat, ouverture d’un PDF, « Voir la visite » (segment Documents), « Demander à Cary », pagination, grande police.
- Captures (patient, police 1.0) : `%TEMP%\cary-qa\shots\patient\resultats.png`
- Défauts :
  - P3 — même écran que l'onglet Résultats : recherche affichée sur liste vide (`LabResultsScreen`).
- Corrections (agent A, capture après à faire) : même correctif que l'onglet Résultats.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\patient\resultats.png` · 1.3 `%TEMP%\cary-qa\shots\patient\resultats@1.3.png` · err `%TEMP%\cary-qa\shots\patient\resultats@err.png`. Critique : aucun défaut — même rendu que l'onglet Résultats.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(patient)/reviews.tsx` — PatientReviewsScreen
- Captures (patient, police 1.0) : `%TEMP%\cary-qa\shots\patient\reviews.png`
- Aucun défaut en police 1.0 (vide + CTA « Voir mes rendez-vous »). Reste : grande police, état avec avis (aucun avis en base).
- Corrections code (agent D, 2026-10-01, à recapturer) : composants avis refondus (carte avis donné avec avatar du professionnel, réponse du professionnel en bloc cité, étoiles accessibles). L’écran lui-même (agent A) garde un cast `as never` et un résumé « 4/5 » arrondi.
- Corrections (agent A, capture après à faire) : cast retiré (route typée) ; résumé maison « 4/5 » remplacé par `ReviewStatsBanner perspective="given"` (moyenne, étoiles, « N avis laissés »).
- Passe QA émulateur (2026-10-01, capture après `patient\reviews-after.png`) : avis, note et réponse du professionnel lisibles. Aucun défaut en police 1.0 (le rangement de « Mes avis » dans le menu Compte est traité à part).
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\patient\reviews.png` · 1.3 `%TEMP%\cary-qa\shots\patient\reviews@1.3.png` · empty `%TEMP%\cary-qa\shots\patient\reviews@empty.png`. Critique : aucun défaut — avis et réponse lisibles.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(patient)/traitements/[id].tsx` — PharmacyOrderDetailScreen
- Passe QA émulateur (2026-10-01, `patient\traitement-detail-after2.png`) : le compositeur « Votre message… » chevauche la barre de gestes. Corrigé dans `PharmacyOrderDetailScreen.tsx` (marge basse `useSceneBottomInset().footerPadding`, vérifié côté pro sur `pro\commandes-pharmacie__[id]-after.png`) ; capture après patient à refaire.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\patient\traitements__[id].png` · 1.3 `%TEMP%\cary-qa\shots\patient\traitements__[id]@1.3.png` · err `%TEMP%\cary-qa\shots\patient\traitements__[id]@err.png`. Critique : aucun défaut — détail sobre, conversation fermée signalée.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(patient)/traitements/index.tsx` — PharmacyOrdersListScreen
- Captures (patient, police 1.0) : `%TEMP%\cary-qa\shots\patient\traitements__index.png`
- Défauts :
  - P2 — vocabulaire incohérent : titre « Mes traitements » / vide « Aucune commande en cours ».
  - P3 — illustration sur disque turquoise, style différent des autres états vides ; pas de phrase d'aide ni d'action.
  - P3 — segment collé au header.
- Corrections (agent correctifs QA, corrigé, capture après à faire) : P2 vocabulaire : côté patient (`scope="patient"`), « Aucun traitement en cours / passé » et « Traitements indisponibles » (terme du web `pages/patient/traitements`) ; les soignants gardent « commande ». P3 illustration / segment : non traités.
- Passe QA émulateur (2026-10-01, capture après `patient\traitements-after.png`) : segments En cours / Historique avec compteurs, carte commande. Aucun défaut en police 1.0.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\patient\traitements__index.png` · 1.3 `%TEMP%\cary-qa\shots\patient\traitements__index@1.3.png` · empty `%TEMP%\cary-qa\shots\patient\traitements__index@empty.png`. Critique : aucun défaut — segments En cours / Historique, statuts lisibles.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(patient)/web.tsx` — AppWebViewScreen
- Corrections code (agent D, 2026-10-01, à recapturer) : route restreinte à une liste blanche (`resolveWebPage` : pages légales `/mentions-legales`, `/politique-confidentialite`, `/cgv`, profil public `/infirmier/<slug>`, toutes présentes dans `frontend/pages`), titre en texte simple (repli `STACK_HEADER_CATALOG.web`, plus de troncature `numberOfLines`), chargement plein écran, erreur réseau / HTTP et page inconnue via `ErrorState` (illustration `error`). Injection du jeton supprimée (paramètre `auth` jamais transmis).
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\patient\web.png` · 1.3 `%TEMP%\cary-qa\shots\patient\web@1.3.png`. Critique : aucun défaut — CGV servies par la web locale, lisibles en 1.0 et 1.3.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

## nurse (34)

### `(nurse)/(tabs)/appointments.tsx` — NurseAgendaScreen
- Critique (agent B, 2026-10-01, capture après à faire) : carte « prochain passage » en doublon de l’onglet Tournée ; messages d’échec d’ouverture d’offre dupliqués avec Demandes.
- Corrections code : carte retirée (`NurseTodayTourCard`, `NurseTourBanner` supprimés) ; hook partagé `use-open-incoming-offer` ; `BookAppointmentCta` remplacé par `AppointmentsBookCta`.
- Points QA : ouvrir une offre : réseau coupé, 403, 404, déjà prise par un autre ; liste vide ; « Nouveau rendez-vous ».
- Passe QA émulateur (2026-10-01, `nurse\agenda-after.png`) : en-tête chargé (segments Liste / Calendrier, recherche + filtre, puces de statut, bandeau « Nouveau rendez-vous ») avant le premier rendez-vous. Défaut ouvert (étape défauts restants).
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\nurse\(tabs)__appointments.png` · 1.3 `%TEMP%\cary-qa\shots\nurse\(tabs)__appointments@1.3.png` · err `%TEMP%\cary-qa\shots\nurse\(tabs)__appointments@err.png`. Critique : aucun défaut — en-tête allégé (création via bouton flottant), filtres sur une ligne.
- Passe Android (2026-10-09, `emulator-5600`, Nina, `.qa-tmp/agenda-list.png` et `agenda-cal.png`) : le filtre (recherche + bouton) est sous Liste / Calendrier et ne se répète plus en puces dans la liste. Le calendrier a le même filtre en haut, pas une seconde barre dans le mois. Les segments Demandes / acceptés restent dans la feuille de filtres.
- Passe retours client (2026-10-06, Nina, `.qa-tmp\shots\nina-agenda-after2.png` / `after3.png`) : défauts relevés : liste triée par date de création (le 7 octobre avant aujourd'hui, RDV passés mêlés) ; passages à heure précise affichés en plage (« Créneau 12:30 - 13:30 »). Corrections : `GET /appointments` infirmier accepte `patient_period` (même filtre que le patient, tri `scheduled_at` croissant pour « à venir », décroissant pour « historique ») ; l'app l'envoie selon le segment (`nurseSegmentPeriod`, préchargement aligné) ; libellé passage = celui de la tournée (`appointmentCreneauLabel` → `formatPassageTourListTimeLabel` : « 12h30 », « Matin · 8h00 — 12h00 »). Tests : `NurseListParisDayBoundaryTest`, `appointment-creneau-label.test.ts`. Après : aujourd'hui d'abord par heure, puis le 7 octobre ; avatars chargés (le cercle gris vu avant était le chargement de l'image DiceBear).
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(nurse)/(tabs)/demandes.tsx` — NurseDemandesScreen
- Critique (agent B, 2026-10-01, capture après à faire) : bandeau de quota Découverte chargé (pastille + double compteur) ; état vide long ; `catch` d’ouverture d’offre toujours « réseau ».
- Corrections code : bandeau épuré (barre, une phrase, « Découvrir l’offre Pro ») ; `offerOpenFailureFromError` : réseau / 403 / 404 / déjà acceptée / indisponible / autre, chacun avec son toast.
- Points QA : accepter, refuser, reporter une offre ; offre déjà prise ; quota atteint ; liste vide.
- Passe QA émulateur (2026-10-01, capture après `nurse\demandes-after.png`) : limite de l'offre Découverte avec action unique, état vide illustré. Aucun défaut en police 1.0.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\nurse\(tabs)__demandes.png` · 1.3 `%TEMP%\cary-qa\shots\nurse\(tabs)__demandes@1.3.png` · err `%TEMP%\cary-qa\shots\nurse\(tabs)__demandes@err.png`. Critique : aucun défaut — quota visible, état vide clair.
- Passe retours client (2026-10-06, Nina, `.qa-tmp\shots\nina-demandes.png` → `nina-demandes-after3.png`) : défaut : « 53 / 10 ce mois-ci, limite atteinte » : `NurseMonthlyAllowance` comptait les passages que l'infirmier planifie pour ses patients (`passage_source = nurse_passage`) comme des rendez-vous acceptés, ce qui bloquait l'acceptation de vraies demandes en offre Découverte (même compteur côté web). Corrections : passages exclus du quota (test `NurseMonthlyAllowancePassageTest`, fixtures SQLite alignées) ; quota rechargé au tirer-pour-rafraîchir (`QueryFlatList.refresh`), au retour au premier plan et après une acceptation ou un refus pour limite (`OfferAppointmentModal`). Après : 6 / 10, bandeau masqué (affiché à partir de 80 %).
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(nurse)/(tabs)/more.tsx` — useRouter
- Écran `RoleMoreTabScreen` (agent D) : aucune correction agent B sur cette route.
- Corrections code (agent D, 2026-10-01, à recapturer) : lignes `SettingsRow` (puits d’icône neutre par défaut), titre du hub via `TabScreenFrame`. Non corrigé : chevron sur « Se déconnecter » (ouvre une confirmation).
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\nurse\(tabs)__more.png` · 1.3 `%TEMP%\cary-qa\shots\nurse\(tabs)__more@1.3.png`. Critique : aucun défaut — sections courtes, profil en tête.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(nurse)/(tabs)/patients.tsx` — PatientsListScreen
- Écran `PatientsListScreen` (agent C) : aucune correction agent B sur cette route.
- Critique (agent C, 2026-10-01, capture après à faire) : icônes colorées vert / orange / rouge sans statut, état vide long, variables et styles morts ; appui long en `Alert.alert` à 4 boutons (Voir, Créer un RDV, Supprimer, Annuler) : Android n'en affiche que 3.
- Corrections code : icônes neutres (icône dédiée aux proches), illustrations `patients` / `search`, « Supprimer » masqué si le créateur est inconnu ; appui long → `StaffPatientActionsSheet` (SheetModal + `DetailActionList`, identique iOS / Android), routes typées sans cast. Backend : GET `/search`, POST `/patients`, DELETE `/patients/:id` (`deletePatientCreatedBy`, 403 si non créateur).
- Points QA : appui long sur un patient (3 actions, « Supprimer » seulement si créateur), enchaînement feuille d’actions → confirmation de suppression (iOS : deux modales successives), recherche sans résultat, liste vide, grande police.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\nurse\(tabs)__patients.png` · 1.3 `%TEMP%\cary-qa\shots\nurse\(tabs)__patients@1.3.png` · err `%TEMP%\cary-qa\shots\nurse\(tabs)__patients@err.png`. Critique : aucun défaut — recherche et liste, ajout flottant.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(nurse)/(tabs)/tournee.tsx` — NurseTourneeScreen
- Critique (agent B, 2026-10-01, capture après à faire) : résumé avec halos décoratifs et surtitre « Ma tournée du jour » faux hors aujourd’hui ; majuscules, troncatures, tailles en dur ; état vide maison ; replanification perdue (commit `de3b9bc`) ; menu d’actions en `Alert` Android à 4 boutons (« Annuler » masqué).
- Corrections code : résumé épuré ; `EmptyState` illustration « tour » ; feuille `TourStopActionsSheet` (SheetModal + `DetailActionList`, identique iOS / Android) : « Changer le créneau », « Déclarer / Modifier l’absence », « Patient de retour » ; replanification PATCH `/nurse/tour/stops/:id/reschedule` (rôle infirmier, CSRF) ; feuille de créneau ouverte en cas d’erreur ; tri accessible 44 pt ; tokens. Fichiers partagés avec la tournée préleveur (agent C) : `TourDayStrip`, `TourSortFilterSheet`, `TourStopCard`, `TourStopRouteChip`, `TourLoadingSkeleton`, `tour-navigation` (sans changement d’API).
- Points QA : Android : menu d’un passage absent (3 actions, fermeture par glissement / fond) ; passage fait (pas de « Changer le créneau ») ; échec de replanification ; lever une absence ; jour vide ; import calendrier ; grande police.
- Passe QA émulateur (2026-10-01, capture après `nurse\tournee-after2.png`) : semaine, progression, prochain passage avec Naviguer / Appeler / Terminé, liste des passages. Aucun défaut en police 1.0.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\nurse\(tabs)__tournee.png` · 1.3 `%TEMP%\cary-qa\shots\nurse\(tabs)__tournee@1.3.png` · err `%TEMP%\cary-qa\shots\nurse\(tabs)__tournee@err.png`. Critique : aucun défaut — progression, prochain passage, actions.
- Passe retours client (2026-10-06, Nina, `.qa-tmp\shots\nina-tour-2.png` → `nina-tour-after.png`) : défaut : en tri « Intelligent », le soin de Simone à 17h–19h passait « Prochain passage » devant Bruno 11h et Alice 14h30, parce que `TourOrderEngine::orderSmart` regroupait toute la journée derrière le premier passage à la même adresse. Correction : regroupement par adresse seulement si les plages horaires se chevauchent (une seule visite possible), jamais sans adresse ; s'applique aussi à la tournée préleveur (même moteur). Tests `TourOrderEngineTest` (3 nouveaux). Après : 8h30 (fait), 11h, 14h30, 17h45 ; prochain passage = Bruno.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(nurse)/abonnement.tsx` — StackChromeScreen
- Critique (agent B, 2026-10-01, capture après à faire) : carte « Abonnement actif » et bouton « Gérer » en double ; URL `cary.bio` en dur ; rien d’affiché si `can_purchase_store === false`.
- Corrections code : source et date de fin en note sous la carte Pro ; `webAppUrl('/nurse/abonnement')` ; texte « Géré sur cary.bio » pour un abonnement Stripe actif ; « Restaurer mes achats » discret ; `ErrorState` / `SkeletonList`. Appels expo-iap inchangés.
- Points QA : offre Découverte, Pro via le store, Pro via Stripe, restauration, achat annulé.
- Passe QA émulateur (2026-10-01, capture après `nurse\abonnement-after.png`) : offres Découverte / Pro lisibles. Le bandeau rouge « [Expo-IAP] initConnection failed » est une notification LogBox de développement (Google Play Billing absent de l'émulateur), invisible en build release.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\nurse\abonnement.png` · 1.3 `%TEMP%\cary-qa\shots\nurse\abonnement@1.3.png` · err `%TEMP%\cary-qa\shots\nurse\abonnement@err.png`. Critique : aucun défaut — offres comparées, offre actuelle signalée.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(nurse)/ai.tsx` — RoleAiHubRouteScreen
- Écran `RoleAiHubRouteScreen` (agent D) : aucune correction agent B sur cette route.
- Corrections code (agent D, 2026-10-01, à recapturer) : refonte éditoriale Cary IA : réponses sans bulle, bulles utilisateur neutres, suggestions en liste, compositeur 44 pt, avertissement + urgence 15 · 112 affichés une seule fois (pied de page, repli statique si l’API n’en fournit pas), liste des conversations (recherche, état vide illustré, bouton « … » visible), overlay vocal épuré, export RGPD avec alerte d’erreur.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\nurse\ai.png` · 1.3 `%TEMP%\cary-qa\shots\nurse\ai@1.3.png`. Critique : aucun défaut — suggestions courtes, saisie en bas.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(nurse)/appointment/[id].tsx` — AppointmentDetailScreen
- Critique (agent B, 2026-10-01, capture après à faire) : trop de cartes, majuscules, actions toutes turquoise ; assertions `id!` ; plomberie de partage morte.
- Corrections code : section « Suivi » (Messages, Suivi des soins, Prescription) ; une seule action turquoise ; `!` supprimés ; partage = POST `share-for-nurse` puis `Share`.
- Points QA : les 4 rôles, mineur, RDV annulé / terminé, lot de RDV, partage infirmier, lien profond photo de soin.
- Passe QA émulateur (2026-10-01, capture après `nurse\rdv-detail-after.png`) : segments Infos / Documents, adresse avec Carte / Waze, patient avec « Voir le profil », contacts, suivi. Aucun défaut en police 1.0.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\nurse\appointment__[id].png` · 1.3 `%TEMP%\cary-qa\shots\nurse\appointment__[id]@1.3.png` · err `%TEMP%\cary-qa\shots\nurse\appointment__[id]@err.png`. Critique : aucun défaut — contacts sur une ligne en 1.0, retour à la ligne propre en 1.3.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(nurse)/appointment/[id]/care-photo/[photoId].tsx` — CarePhotoDiscussionScreen
- Critique (agent B, 2026-10-01, capture après à faire) : en-tête maison ; `appointmentId!` ; `catch` muets.
- Corrections code : titre catalogue « Suivi des soins » ; typage sans `!` ; `catch` journalisés ; `EmptyState`.
- Points QA : fil d’une photo, envoi d’un message, photo indisponible.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\nurse\appointment__[id]__care-photo__[photoId].png` · 1.3 `%TEMP%\cary-qa\shots\nurse\appointment__[id]__care-photo__[photoId]@1.3.png` · err `%TEMP%\cary-qa\shots\nurse\appointment__[id]__care-photo__[photoId]@err.png`. Critique : aucun défaut — fil vide clair, ajout et envoi en bas.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(nurse)/appointment/[id]/conversation.tsx` — AppointmentConversationScreen
- Critique (agent B, 2026-10-01, capture après à faire) : titre « Échanges du rendez-vous » ; état vide maison.
- Corrections code : titre « Messages » ; `EmptyState` illustration « messages » ; erreur « Messages indisponibles » ; cibles 44 pt.
- Points QA : conversation vide, envoi, pièce jointe, erreur réseau.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\nurse\appointment__[id]__conversation.png` · 1.3 `%TEMP%\cary-qa\shots\nurse\appointment__[id]__conversation@1.3.png` · err `%TEMP%\cary-qa\shots\nurse\appointment__[id]__conversation@err.png`. Critique : aucun défaut — état vide clair, saisie en bas.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(nurse)/appointment/[id]/edit.tsx` — RescheduleAppointmentScreen
- Écran `RescheduleAppointmentScreen` (agent A) : aucune correction agent B sur cette route.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\nurse\appointment__[id]__edit.png` · 1.3 `%TEMP%\cary-qa\shots\nurse\appointment__[id]__edit@1.3.png` · err `%TEMP%\cary-qa\shots\nurse\appointment__[id]__edit@err.png`. Critique : aucun défaut — deux choix explicites, action Suivant.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(nurse)/appointment/[id]/exchange.tsx` — CarePhotoDiscussionScreen
- Critique (agent B, 2026-10-01, capture après à faire) : en-tête maison, ombre de photo, titre absent du catalogue.
- Corrections code : titre catalogue « Suivi des soins » ; avatar vers la fiche patient conservé ; `EmptyState`.
- Points QA : galerie vide, galerie avec non-lus, ouverture d’une photo.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\nurse\appointment__[id]__exchange.png` · 1.3 `%TEMP%\cary-qa\shots\nurse\appointment__[id]__exchange@1.3.png` · err `%TEMP%\cary-qa\shots\nurse\appointment__[id]__exchange@err.png`. Critique : aucun défaut — fil vide clair, ajout et envoi en bas.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(nurse)/appointment/[id]/prescription.tsx` — AppointmentPrescriptionScreen
- Critique (agent B, 2026-10-01, capture après à faire) : échec de l’API des documents affiché comme une liste vide ; clé de cache différente de la fiche RDV.
- Corrections code : clé partagée `medicalDocumentsQueryOptions` ; erreur affichée ; titre catalogue « Prescription ».
- Points QA : prescription présente / absente, erreur réseau.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\nurse\appointment__[id]__prescription.png` · 1.3 `%TEMP%\cary-qa\shots\nurse\appointment__[id]__prescription@1.3.png` · err `%TEMP%\cary-qa\shots\nurse\appointment__[id]__prescription@err.png`. Critique : aucun défaut — aide, avertissements et champs lisibles.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(nurse)/appointments/new.tsx` — BookingWizardScreen
- Écran `BookingWizardScreen` (agent A) : aucune correction agent B sur cette route.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\nurse\appointments__new.png` · 1.3 `%TEMP%\cary-qa\shots\nurse\appointments__new@1.3.png`. Critique : aucun défaut — catalogue de soins, une action par ligne.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(nurse)/commandes-pharmacie/[id].tsx` — PharmacyOrderDetailScreen
- Écran `PharmacyOrderDetailScreen` (agent C) : aucune correction agent B sur cette route.
- Critique (agent C, 2026-10-01, capture après à faire) : doublon « Patient : X », bouton « Nouvelle commande » dans le corps ; **bug** : chaque changement de statut envoyait `pharmacy_note: null` et effaçait la note de l’officine.
- Corrections code : en-tête patient + badge, actions officine, carte « Détails », liens, « Annuler la commande » en ligne rouge (confirmation `Alert` à 2 boutons) ; seul `rejection_reason` est envoyé. Backend : GET / PATCH `/pharmacy-orders/:id` (`ALLOWED_TRANSITIONS`, motif obligatoire en refus), GET / POST `/pharmacy-orders/:id/messages`.
- Points QA : badge + nom long, formulaire de refus (motif vide refusé), note conservée après changement de statut, conversation fermée.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\nurse\commandes-pharmacie__[id].png` · 1.3 `%TEMP%\cary-qa\shots\nurse\commandes-pharmacie__[id]@1.3.png` · err `%TEMP%\cary-qa\shots\nurse\commandes-pharmacie__[id]@err.png`. Critique : aucun défaut — détail, ordonnance jointe, échanges.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(nurse)/commandes-pharmacie/[id]/ordonnances.tsx` — PharmacyOrderPrescriptionsScreen
- Écran `PharmacyOrderPrescriptionsScreen` (agent C) : aucune correction agent B sur cette route.
- Critique (agent C, 2026-10-01, capture après à faire) : erreur affichée en texte brut.
- Corrections code : `ErrorState`, lignes libellé / valeur. Backend : GET `/pharmacy-orders/:id` (ordonnances jointes, `PharmacyOrderAccess::canView`).
- Points QA : aucune ordonnance, ouverture d’un document, erreur.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\nurse\commandes-pharmacie__[id]__ordonnances.png` · 1.3 `%TEMP%\cary-qa\shots\nurse\commandes-pharmacie__[id]__ordonnances@1.3.png` · err `%TEMP%\cary-qa\shots\nurse\commandes-pharmacie__[id]__ordonnances@err.png`. Critique : aucun défaut — ordonnance avec voir / télécharger.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(nurse)/commandes-pharmacie/index.tsx` — PharmacyOrdersListScreen
- Écran `PharmacyOrdersListScreen` (agent C) : aucune correction agent B sur cette route.
- Critique (agent C, 2026-10-01, capture après à faire) : badge de statut unique turquoise, ombre et pastille décoratives, textes longs.
- Corrections code : badge sémantique (`pharmacyOrderStatusBadgeVariant`, testé), carte plate, illustration `pharmacy`. Backend : GET `/pharmacy-orders?scope=sent|received|patient` (`PharmacyOrderAccess`).
- Points QA : liste vide, chaque statut, nom long.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\nurse\commandes-pharmacie__index.png` · 1.3 `%TEMP%\cary-qa\shots\nurse\commandes-pharmacie__index@1.3.png` · err `%TEMP%\cary-qa\shots\nurse\commandes-pharmacie__index@err.png`. Critique : aucun défaut — segments En cours / Historique, ajout en haut.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(nurse)/commandes-pharmacie/new.tsx` — PharmacyOrderWizardScreen
- Écran `PharmacyOrderWizardScreen` (agent C) : aucune correction agent B sur cette route.
- Critique (agent C, 2026-10-01, capture après à faire) : erreur avalée en silence, préremplissage d’adresse sans gestion de rejet, cibles de 32 pt, hint « Appuyez sur ✕ », mention de mode redondante.
- Corrections code : erreurs journalisées, préremplissage protégé, patient présélectionné nommé, pastilles proches et corbeille 44 pt, `ErrorState` sur le catalogue. Backend : POST `/pharmacy-orders`. Reste : « Adresse manquante » en `Alert` informative (1 bouton) au lieu d’un message dans le formulaire.
- Points QA : patient présélectionné, proche sans adresse, catalogue en erreur, corbeille.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\nurse\commandes-pharmacie__new.png` · 1.3 `%TEMP%\cary-qa\shots\nurse\commandes-pharmacie__new@1.3.png`. Critique : aucun défaut — étape 1 sur 4, une action principale.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(nurse)/informations-legales.tsx` — LegalInformationScreen
- Écran `LegalInformationScreen` (agent D) : aucune correction agent B sur cette route.
- Corrections code (agent D, 2026-10-01, à recapturer) : liste unifiée sur `SettingsSection iconless` (fin de `ProfileNavRow`), ouverture typée `webPageHref(préfixe, { kind: "legal", slug })`.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\nurse\informations-legales.png` · 1.3 `%TEMP%\cary-qa\shots\nurse\informations-legales@1.3.png`. Critique : aucun défaut — trois rubriques simples.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(nurse)/notifications.tsx` — NotificationsScreen
- Écran `NotificationsScreen` (agent D) : aucune correction agent B sur cette route.
- Corrections code (agent D, 2026-10-01, à recapturer) : navigation typée `resolveNotificationNavigation(...) : Href | null` (routes inexistantes → pas de navigation), icône alignée en haut du texte. L’emoji relevé vient du contenu serveur (hors UI).
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\nurse\notifications.png` · 1.3 `%TEMP%\cary-qa\shots\nurse\notifications@1.3.png` · err `%TEMP%\cary-qa\shots\nurse\notifications@err.png`. Critique : aucun défaut — liste lisible, « Tout lu » entier.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(nurse)/onboarding.tsx` — TutorialCarouselScreen
- Écran `TutorialCarouselScreen` (agent A) : aucune correction agent B sur cette route.
- Passe QA émulateur (2026-10-01, capture après `nurse\onb3b.png`) : illustration, titre court, une phrase, Précédent / Commencer. Aucun défaut en police 1.0.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\nurse\onboarding.png` · 1.3 `%TEMP%\cary-qa\shots\nurse\onboarding@1.3.png`. Critique : aucun défaut — illustration, une phrase, Suivant.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(nurse)/passage/[seriesId].tsx` — PassageDetailScreen
- Critique (agent B, 2026-10-01, capture après à faire) : 1452 lignes ; plusieurs boutons primaires ; suppression via `Alert.alert` ; documents périmés après envoi ; patient non rafraîchi après changement de lieu.
- Corrections code : bouton « … » d’en-tête ; « Lancer la navigation » seule action principale ; `ConfirmSheet` (passage / série) ; documents via `medicalDocumentsQueryOptions` chargés sur l’onglet ; clé patient unifiée.
- Points QA : supprimer un passage puis la série, envoyer un document puis le voir, changer le lieu, marquer fait, « Je pars ».
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\nurse\passage__[seriesId].png` · 1.3 `%TEMP%\cary-qa\shots\nurse\passage__[seriesId]@1.3.png` · err `%TEMP%\cary-qa\shots\nurse\passage__[seriesId]@err.png`. Critique : aucun défaut — le lien profond ouvre le détail (corrigé) ; onglets lisibles en 1.3 (icône au-dessus du libellé) ; ID inconnu : « Passage indisponible ».
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(nurse)/passage/new.tsx` — PassageFormScreen
- Critique (agent B, 2026-10-01, capture après à faire) : lignes de champs maison, majuscules, pas d’état « aucun patient », deux clés de cache patient, `eslint-disable` dans les panneaux.
- Corrections code : en-tête patient (appel / SMS) ; `SettingsSection` Planification / Créneaux / Lieu / Durée / Soins / Note ; un bouton « Enregistrer le passage » ; états vide / chargement / erreur ; Planification et Soins accessibles ; `eslint-disable` supprimés ; prop morte `refreshKey` supprimée du panneau carnet.
- Points QA : arrivée sans patient, série multi-jours, adresse personnalisée, soins, échec d’enregistrement.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\nurse\passage__new.png` · 1.3 `%TEMP%\cary-qa\shots\nurse\passage__new@1.3.png`. Critique : aucun défaut — état « aucun patient » avec action.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(nurse)/passage/patient-pick.tsx` — PassagePatientPickScreen
- Critique (agent B, 2026-10-01, capture après à faire) : liste maison, états incomplets.
- Corrections code : recherche, états vide / erreur, transmission `start_date` et `mode`.
- Points QA : recherche sans résultat, retour vers le formulaire avec le bon mode.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\nurse\passage__patient-pick.png` · 1.3 `%TEMP%\cary-qa\shots\nurse\passage__patient-pick@1.3.png` · err `%TEMP%\cary-qa\shots\nurse\passage__patient-pick@err.png`. Critique : aucun défaut — recherche et liste des patients.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(nurse)/patient/[id].tsx` — PatientDetailScreen
- Écran `PatientDetailScreen` (agent C) : aucune correction agent B sur cette route.
- Critique (agent C, 2026-10-01, capture après à faire) : « Appeler » en action principale, six pastilles turquoise en majuscules, carte isolée « Modifier », icône verte décorative, bouton pharmacie visible même sans droit (403 à la création).
- Corrections code : action principale « Créer un rendez-vous », contacts secondaires ; lignes libellé / valeur ; « Modifier » en en-tête ; section « Dossier » (Documents, Ordonnances, Historique, Carnet de santé, pharmacie seulement si `canOrder`) ; « Supprimer le patient » en ligne rouge discrète. Backend : GET / PUT `/users/:id`, DELETE `/patients/:id`.
- Points QA : « Modifier » dans l’en-tête, trois boutons de contact sur une ligne en grande police, ligne pharmacie absente si module inactif, patient sans téléphone / e-mail.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\nurse\patient__[id].png` · 1.3 `%TEMP%\cary-qa\shots\nurse\patient__[id]@1.3.png` · err `%TEMP%\cary-qa\shots\nurse\patient__[id]@err.png`. Critique : aucun défaut — contacts sur une ligne, fiche et dossier lisibles.
- Passe retours client (2026-10-06, Nina sur Bruno, `.qa-tmp\shots\nina-bruno-2.png` → `nina-bruno-phone-after.png`) : « Autres numéros » (lot 5) : ajout d'un numéro « Aidant » de bout en bout (POST `/patients/:id/phones`). Défaut : numéro ajouté affiché brut (« 0611223344 ») sous un principal en paires. Correction : `formatFrenchPhoneDisplay` (shared-utils, test `external-nurse-invite.test.ts`) sur le principal, les autres numéros et la confirmation de suppression ; `created_at` des numéros lu via `UNIX_TIMESTAMP` (voir Transmissions).
- **QA émulateur en attente (2026-10-06, dossier propre du proche)** : un proche s'ouvre comme un patient normal (son dossier `profile_id`). Hub → résultat « Proche de … » → dossier du proche ; ancien lien `?relative_id=` → redirection vers le dossier du proche (squelette, puis dossier ; « Dossier du proche pas encore disponible » s'il n'en a pas). RDV d'un proche → bouton « Dossier de Jean » (au lieu de « Profil du titulaire · … »). Parcours : Nina → RDV de Jean → Dossier de Jean ; Nina → passage d'un proche → carnet / documents / transmissions sur le dossier du proche. L'ancienne vue `patient/[id]/relative/[relativeId]` est supprimée.
- Passe QA émulateur (2026-10-06, `.qa-tmp\shots\nina-4.png`, `nina-5.png`) : Nina → Agenda → RDV de Jean (lien Parent, pris par Alice) → « Dossier de Jean Patiente » → fiche de Jean (né le 02/11/1950, son téléphone, e-mail technique masqué « Patient sans email renseigné »), jamais celle d'Alice. Aucun défaut en police 1.0. Reste : passage d'un proche, hub, grande police.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(nurse)/patient/[id]/transmissions.tsx` — StaffPatientTransmissionsScreen
- Nouvelle vue (lot 6) : fil des transmissions par jour du soin, « Nouvelle transmission », mention « Pour le médecin », modification par l'auteur sous 24 h. Backend : GET / POST `/patients/:id/transmissions`, PATCH `/patients/:id/transmissions/:tid` (`PatientTransmissionService`, rôles nurse / pro / admin en lecture, accès dossier).
- Passe retours client (2026-10-06, Nina sur Bruno, `.qa-tmp\shots\nina-bruno-transmissions.png` → `nina-transmissions-after3.png`) : défauts : heure décalée de 2 h (11:39 affiché à 10:35) : `created_at` (TIMESTAMP) relu par PHP comme UTC alors que MySQL le rend dans son fuseau ; même défaut dans `PatientPhoneService` ; heure d'écriture d'aujourd'hui affichée sous « Hier » pour une saisie après coup. Corrections : `UNIX_TIMESTAMP()` + `AppTimezone::iso8601FromUnix` dans les deux services (tests avec fuseau de session `+05:00`) ; `transmissionTimeLabel` (shared-utils) : heure le jour du soin, sinon « Écrite le 6 oct. », mobile et web (`PatientTransmissionsPanel`).
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [ ] grande police (rien de coupé)
- [ ] états (loading / vide / erreur)
- [ ] validation finale

### `(nurse)/patient/[id]/documents.tsx` — StaffPatientDocumentsScreen
- Écran `StaffPatientDocumentsScreen` (agent C) : aucune correction agent B sur cette route.
- Critique (agent C, 2026-10-01, capture après à faire) : requête profil chargée uniquement pour un titre long « Documents de X ».
- Corrections code : requête profil supprimée, titre « Documents », tirer-pour-actualiser recharge directement les documents. Backend : GET `/patient-documents?user_id=` (`PatientDossierAccess` pour les rôles staff).
- Points QA : liste vide, ouverture d’un PDF / image, rafraîchissement.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\nurse\patient__[id]__documents.png` · 1.3 `%TEMP%\cary-qa\shots\nurse\patient__[id]__documents@1.3.png` · err `%TEMP%\cary-qa\shots\nurse\patient__[id]__documents@err.png`. Critique : aucun défaut — pièces avec ajout.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(nurse)/patient/[id]/health-record.tsx` — StaffHealthRecordScreen
- Écran `StaffHealthRecordScreen` (agent C). Agent B a modifié `PassageFormHealthRecordPanel` (variante `screen`) : hero simplifié, `ErrorState`, `eslint-disable` et prop morte `refreshKey` supprimés. À revérifier par l’agent C.
- Critique (agent C, 2026-10-01, capture après à faire) : le tirer-pour-actualiser s’arrêtait immédiatement (compteur `refreshKey` sans attendre le rechargement), constantes cliniques non rafraîchies, écran vide sans identifiant ; double marge basse avec le panneau.
- Corrections code : rafraîchissement = refetch réel du carnet (`staffRecap`) et des constantes (`clinicalVitalsQueryKey`) ; « Patient introuvable » sans identifiant ; `SceneScrollView` ; marge basse portée par le panneau seul. Panneau `PassageFormHealthRecordPanel` (variante `screen`, modifié par B) revérifié : hero sans ombre, `ErrorState`, `refreshKey` supprimé — reste une bordure de 1 px au lieu du trait fin des autres cartes. Backend : GET `/patients/:id/health-record` ; PATCH corrigé : `upsertAnswersForStaff` vérifie `PatientDossierAccess` **avant** l’écriture (avant : écriture puis 403) ; test `HealthRecordAclTest`.
- Points QA : tirer-pour-actualiser (spinner jusqu’à la fin du chargement), éditer une section, constantes, erreur d’accès (patient non rattaché), grande police sur l’anneau de progression.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\nurse\patient__[id]__health-record.png` · 1.3 `%TEMP%\cary-qa\shots\nurse\patient__[id]__health-record@1.3.png` · err `%TEMP%\cary-qa\shots\nurse\patient__[id]__health-record@err.png`. Critique : aucun défaut — titre unique dans l'en-tête, constantes lisibles.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(nurse)/patient/[id]/history.tsx` — StaffPatientHistoryScreen
- Écran `StaffPatientHistoryScreen` (agent C) : aucune correction agent B sur cette route.
- Critique (agent C, 2026-10-01, capture après à faire) : une erreur réseau s’affichait comme un historique vide ; pagination client inutile sur une liste virtualisée.
- Corrections code : `ErrorState`, pagination client retirée, état vide « Aucun rendez-vous passé ». Backend : GET `/appointments` filtré patient + GET `/users/:id`.
- Points QA : erreur réseau (réessayer), historique vide, long historique.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\nurse\patient__[id]__history.png` · 1.3 `%TEMP%\cary-qa\shots\nurse\patient__[id]__history@1.3.png` · err `%TEMP%\cary-qa\shots\nurse\patient__[id]__history@err.png`. Critique : aucun défaut — historique daté.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(nurse)/patient/[id]/prescriptions.tsx` — PatientPrescriptionsScreen
- Écran `PatientPrescriptionsScreen` (agent C) : aucune correction agent B sur cette route.
- Critique (agent C, 2026-10-01, capture après à faire) : section avec ombre, textes de passage longs, lignes d’historique tronquées, traits d’icône à 2, assertion `user!`, composants morts.
- Corrections code : bordure fine sans ombre, phrases courtes, illustration `prescriptions` (vide / sans accès), aucune troncature, traits 1,75 ; `PrescriptionAppointmentPicker`, `PrescriptionRdvScheduleRow`, `PrescriptionHistoryList` supprimés. Backend : GET `/pro/prescriptions` ou `/nurse/prescriptions`, POST `/prescriptions/generate`, POST `/appointments/:id/generate-prescription`, POST `/medical-documents`.
- Points QA : historique vide, compte sans accès, génération d’une prescription, nom de patient long.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\nurse\patient__[id]__prescriptions.png` · 1.3 `%TEMP%\cary-qa\shots\nurse\patient__[id]__prescriptions@1.3.png` · err `%TEMP%\cary-qa\shots\nurse\patient__[id]__prescriptions@err.png`. Critique : patient inconnu, le formulaire d'ordonnance s'affichait au lieu d'une erreur « patient introuvable ».
- Correction (2026-10-02) : `PatientPrescriptionsScreen` charge le patient (`useStaffPatientProfile`, hook partagé avec la fiche et l'historique) ; chargement en squelette, 404 → `ErrorState` « Patient introuvable ». Capture après `%TEMP%\cary-qa\shots\nurse\patient__[id]__prescriptions@notfound.png`.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(nurse)/prescriptions.tsx` — StackChromeScreen
- Écran `PrescriptionsScreen` (agent C) : aucune correction agent B sur cette route.
- Critique (agent C, 2026-10-01, capture après à faire) : section avec ombre, textes de passage longs, lignes d’historique tronquées, traits d’icône à 2, assertion `user!`, composants morts.
- Corrections code : bordure fine sans ombre, phrases courtes, illustration `prescriptions` (vide / sans accès), aucune troncature, traits 1,75 ; `PrescriptionAppointmentPicker`, `PrescriptionRdvScheduleRow`, `PrescriptionHistoryList` supprimés. Backend : GET `/pro/prescriptions` ou `/nurse/prescriptions`, POST `/prescriptions/generate`, POST `/appointments/:id/generate-prescription`, POST `/medical-documents`.
- Points QA : historique vide, compte sans accès, génération d’une prescription, nom de patient long.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\nurse\prescriptions.png` · 1.3 `%TEMP%\cary-qa\shots\nurse\prescriptions@1.3.png` · err `%TEMP%\cary-qa\shots\nurse\prescriptions@err.png`. Critique : hors ligne, aucun message d'erreur, le sélecteur de patient restait vide sans explication.
- Correction (2026-10-02) : `PrescriptionWorkspaceScreen` affiche `ErrorState` « Patients indisponibles » avec « Réessayer » quand la liste des patients échoue sans données en cache. Vérifié en mode avion, capture `%TEMP%\cary-qa\shots\nurse\prescriptions@offline.png`.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(nurse)/qr-code.tsx` — QrCodeScreen
- Critique (agent B, 2026-10-01, capture après à faire) : placeholder d’exemple inventé alors que le backend renvoie l’accroche réellement imprimée (`effective_tagline`) ; aucune indication qu’un champ vide garde l’accroche par défaut ; marges en dur.
- Corrections code : placeholder = `effective_tagline` quand aucune accroche perso n’est enregistrée ; description « Laissez vide pour garder l’accroche Cary. » ; `H_PADDING`. Backend : GET / PATCH `/qr/me` (rôles nurse, lab, subaccount, pro ; PATCH avec CSRF, accroche tronquée à 120), GET `/qr/me/png` (même rôles, affiche ou QR seul) ; QR toujours celui de l’utilisateur connecté.
- Points QA : génération de l’affiche, échec de l’affiche (réessayer), partager l’affiche / QR seul / lien, enregistrer puis vider l’accroche (l’affiche se régénère), statistiques 30 jours, grande police.
- Complément (agent C, 2026-10-01, capture après à faire) : « QR code seul » ne partageait rien sur Android (`Share.share({ url })` iOS uniquement) → `exportLocalFile` (expo-sharing) ; une action principale « Partager l’affiche », « QR code seul » / « Lien » secondaires ; statistiques neutres « 30 derniers jours » ; affiche sans ombre avec `ErrorState` + réessayer ; erreurs en toast.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\nurse\qr-code.png` · 1.3 `%TEMP%\cary-qa\shots\nurse\qr-code@1.3.png`. Critique : aucun défaut — affiche, partage, statistiques.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [ ] états (loading / vide / erreur)
- [ ] validation finale

### `(nurse)/resultats.tsx` — LabResultsScreen
- Critique (agent B, 2026-10-01, capture après à faire) : écran déjà sobre ; ouverture d’un document sans `catch` (rejet non géré si le téléchargement lève), espacements en dur, style de liste par défaut mort dans `LabResultsFeed`.
- Corrections code : `catch` journalisé + toast « Ouverture impossible » ; `H_PADDING` / `spacing` ; `contentContainerStyle` requis, style mort supprimé. Backend : GET `/lab-results` (rôles patient / infirmier / pro, sinon 403) ; `LabResultsListing::listForUser` filtre patient = `a.patient_id`, infirmier = assigné / créateur / patients rattachés, pro = créateur / patients rattachés.
- Points QA : liste vide, recherche sans résultat, ouverture d’un PDF, « Voir la visite » (segment Documents), « Demander à Cary », pagination, grande police.
- Complément (agent C, 2026-10-01, capture après à faire) : seule la 1re page (50) était chargée → `useLabResultsInfinite` (pagination au défilement, total backend) ; indicateur d’ouverture sur la ligne, chevron, icône neutre.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\nurse\resultats.png` · 1.3 `%TEMP%\cary-qa\shots\nurse\resultats@1.3.png` · err `%TEMP%\cary-qa\shots\nurse\resultats@err.png`. Critique : aucun défaut — recherche et résultat lisible.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(nurse)/reviews.tsx` — NurseReviewsScreen
- Critique (agent B, 2026-10-01, capture après à faire) : en-tête de liste en composant, états vides maison, compteurs morts (`all`, `answered`).
- Corrections code : en-tête en élément, phrase d’aide courte, `EmptyState` illustration « reviews », compteur réduit à `pending` ; backend PUT `/reviews/:id/response` réservé à l’évalué (403 sinon).
- Points QA : aucun avis, répondre, avis déjà répondu, filtre « À répondre ».
- Corrections code (agent D, 2026-10-01, à recapturer) : composants avis refondus (moyenne en grand, segments Tous / À répondre / Répondus, carte avis reçu, feuille « Répondre à l’avis » avec aide « Visible sur votre profil public Cary. »). Reste côté écran (agent B) : phrase d’aide `sectionHint` à retirer.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\nurse\reviews.png` · 1.3 `%TEMP%\cary-qa\shots\nurse\reviews@1.3.png` · err `%TEMP%\cary-qa\shots\nurse\reviews@err.png`. Critique : aucun défaut — note, filtres, réponse.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(nurse)/web.tsx` — AppWebViewScreen
- Écran `AppWebViewScreen` (agent D) : aucune correction agent B sur cette route.
- Corrections code (agent D, 2026-10-01, à recapturer) : route restreinte à une liste blanche (`resolveWebPage` : pages légales `/mentions-legales`, `/politique-confidentialite`, `/cgv`, profil public `/infirmier/<slug>`, toutes présentes dans `frontend/pages`), titre en texte simple (repli `STACK_HEADER_CATALOG.web`, plus de troncature `numberOfLines`), chargement plein écran, erreur réseau / HTTP et page inconnue via `ErrorState` (illustration `error`). Injection du jeton supprimée (paramètre `auth` jamais transmis).
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\nurse\web.png` · 1.3 `%TEMP%\cary-qa\shots\nurse\web@1.3.png`. Critique : DÉFAUT OUVERT — défaut ouvert : web locale démarrée en fin de session, capture à refaire pour ce rôle (contenu vérifié côté patient).
- [x] capture avant
- [x] défauts listés
- Correction (2026-10-02) : la WebView ouvre la page avec `?embed=1` ; le site (`useEmbeddedView`, `MarketingAppShell`, pages légales) masque alors en-tête, pied de page et « Retour à l'accueil ». Captures 1.0 / 1.3 relues (`%TEMP%\cary-qa3\sheets\web-01.jpg`), aucun défaut. États erreur : `ErrorState` réseau / HTTP non recapturé.
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [ ] états (loading / vide / erreur)
- [ ] validation finale

## pro (33)

### `(pro)/(tabs)/appointments.tsx` — RoleFilteredAppointmentsListScreen
- Critique (agent C, 2026-10-01, capture après à faire) : branche préleveur jamais exécutée, imports et styles morts, états vides bavards.
- Corrections code : branche et filtres préleveur supprimés ; trois états vides (recherche, filtre actif + « Retirer le filtre », liste vide + « Nouveau rendez-vous »). Backend : GET `/appointments` (statuts en paramètre).
- Points QA : chaque filtre, recherche sans résultat, liste vide.
- Passe QA émulateur (2026-10-01, `pro-home.png` → `pro\home-filter-badge-after3.png`) : badge de filtre actif et puce « En attente » corrigés. Compte officine (`pharma\home.png` → `pharma\home-after.png`) : état vide avec un second bouton « Nouveau rendez-vous » identique au bandeau ; action retirée de l'état vide dans `RoleFilteredAppointmentsListScreen.tsx`.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\pro\(tabs)__appointments.png` · 1.3 `%TEMP%\cary-qa\shots\pro\(tabs)__appointments@1.3.png` · err `%TEMP%\cary-qa\shots\pro\(tabs)__appointments@err.png`. Critique : aucun défaut — accueil, nouveau RDV, liste par jour.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(pro)/(tabs)/calendar.tsx` — CalendarScreen
- Critique (agent C, 2026-10-01, capture après à faire) : chaque jour affiché trois fois (bandeau, liste, feuille), cellules bordées turquoise, flèches de 34 pt, animations décoratives, erreur en état vide.
- Corrections code : sélection d’un jour → liste en dessous (« jour · N rendez-vous »), cellules sans bordure (disque = sélection, anneau = aujourd’hui, point = RDV), flèches 44 pt, `ErrorState`. Backend : GET `/appointments` sur la plage du mois.
- Points QA : sélection d’un jour, balayage de mois, jour sans RDV, grande police sur le titre du mois.
- Passe QA émulateur (2026-10-01, `pro\(tabs)__calendar.png` → `pro\(tabs)__calendar-day5.png`) : mois et jour sans majuscule (« octobre 2026 », « vendredi ») et disque de sélection carré sur Android. Corrigé : `capitalizeFrench` dans `CalendarScreen.tsx`, bordure transparente permanente sur `dayDisc` / `dot` (Android perd l'arrondi sans bordure).
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\pro\(tabs)__calendar.png` · 1.3 `%TEMP%\cary-qa\shots\pro\(tabs)__calendar@1.3.png` · err `%TEMP%\cary-qa\shots\pro\(tabs)__calendar@err.png`. Critique : aucun défaut — calendrier mensuel, jour sélectionné, état vide.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(pro)/(tabs)/more.tsx` — useRouter
- Corrections code (agent D, 2026-10-01, à recapturer) : lignes `SettingsRow` (puits d’icône neutre par défaut), titre du hub via `TabScreenFrame`. Non corrigé : chevron sur « Se déconnecter » (ouvre une confirmation).
- Passe QA émulateur (2026-10-01, capture après `pro\(tabs)__more-2.png`) : Activité / Professionnel / Réglages / Aide, « Supprimer mon compte » sous « Se déconnecter ». « Partager mon profil » : l'alerte « Profil public indisponible » était une impasse ; elle propose désormais « Ouvrir mon profil » (`use-share-public-profile.ts`, appelants pro et infirmier).
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\pro\(tabs)__more.png` · 1.3 `%TEMP%\cary-qa\shots\pro\(tabs)__more@1.3.png`. Critique : aucun défaut — sections courtes, profil en tête.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(pro)/(tabs)/patients.tsx` — PatientsListScreen
- Critique (agent C, 2026-10-01, capture après à faire) : icônes colorées vert / orange / rouge sans statut, état vide long, variables et styles morts ; appui long en `Alert.alert` à 4 boutons (Voir, Créer un RDV, Supprimer, Annuler) : Android n'en affiche que 3.
- Corrections code : icônes neutres (icône dédiée aux proches), illustrations `patients` / `search`, « Supprimer » masqué si le créateur est inconnu ; appui long → `StaffPatientActionsSheet` (SheetModal + `DetailActionList`, identique iOS / Android), routes typées sans cast. Backend : GET `/search`, POST `/patients`, DELETE `/patients/:id` (`deletePatientCreatedBy`, 403 si non créateur).
- Points QA : appui long sur un patient (3 actions, « Supprimer » seulement si créateur), enchaînement feuille d’actions → confirmation de suppression (iOS : deux modales successives), recherche sans résultat, liste vide, grande police.
- Passe QA émulateur (2026-10-01, capture après `pro\(tabs)__patients.png`) : recherche, compteur, contact sur une ligne, bouton d'ajout. Aucun défaut en police 1.0.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\pro\(tabs)__patients.png` · 1.3 `%TEMP%\cary-qa\shots\pro\(tabs)__patients@1.3.png` · err `%TEMP%\cary-qa\shots\pro\(tabs)__patients@err.png`. Critique : aucun défaut — recherche, liste, ajout flottant.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(pro)/(tabs)/prescriptions.tsx` — PrescriptionsScreen
- Critique (agent C, 2026-10-01, capture après à faire) : section avec ombre, textes de passage longs, lignes d’historique tronquées, traits d’icône à 2, assertion `user!`, composants morts.
- Corrections code : bordure fine sans ombre, phrases courtes, illustration `prescriptions` (vide / sans accès), aucune troncature, traits 1,75 ; `PrescriptionAppointmentPicker`, `PrescriptionRdvScheduleRow`, `PrescriptionHistoryList` supprimés. Backend : GET `/pro/prescriptions` ou `/nurse/prescriptions`, POST `/prescriptions/generate`, POST `/appointments/:id/generate-prescription`, POST `/medical-documents`.
- Points QA : historique vide, compte sans accès, génération d’une prescription, nom de patient long.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\pro\(tabs)__prescriptions.png` · 1.3 `%TEMP%\cary-qa\shots\pro\(tabs)__prescriptions@1.3.png` · err `%TEMP%\cary-qa\shots\pro\(tabs)__prescriptions@err.png`. Critique : aucun défaut — cadre unique : choix du patient puis création.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(pro)/ai.tsx` — RoleAiHubRouteScreen
- Corrections code (agent D, 2026-10-01, à recapturer) : refonte éditoriale Cary IA : réponses sans bulle, bulles utilisateur neutres, suggestions en liste, compositeur 44 pt, avertissement + urgence 15 · 112 affichés une seule fois (pied de page, repli statique si l’API n’en fournit pas), liste des conversations (recherche, état vide illustré, bouton « … » visible), overlay vocal épuré, export RGPD avec alerte d’erreur.
- Passe QA émulateur (2026-10-01, `pro\ai.png` → `pro\ai-after.png`) : suggestions « Expliquer mes résultats » / « Analyser mes documents » rédigées pour un patient alors que le contexte pro contient les résultats et documents de ses patients. Corrigé : `patient_lab_results` « Résultats récents des patients » et `patient_docs` dans `backend/lib/ai/AiQuickSuggestionsService.php` (+ test `AiQuickSuggestionsServiceTest`), messages dans `ai-hub/utils/ai-navigation.ts`. Réponse indisponible en local (`XAI_API_KEY` absente).
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\pro\ai.png` · 1.3 `%TEMP%\cary-qa\shots\pro\ai@1.3.png`. Critique : aucun défaut — suggestions, saisie en bas.
- Passe retours client (2026-10-06, Pierre, `.qa-tmp\shots\pro-ai2.png` → `pro-ai3.png`) : défaut : réponse d'urgence (« douleur thoracique… ») affichée deux fois, carte rouge puis le même titre et les mêmes consignes en texte. Le serveur enregistre ces consignes comme contenu du message (historique, copie, export) et les envoie aussi en `metadata.emergency`. Correction : `assistantBubbleText` ne répète pas le texte quand la carte d'urgence est présente (contenu toujours fixe côté serveur : `AiEmergencyDetector::messageContent`) ; test `ai-hub-components.test.tsx`. Après : carte seule, actions copier / régénérer / avis conservées.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(pro)/appointment/[id].tsx` — AppointmentDetailScreen
- Passe QA émulateur (2026-10-01, capture après `pro\appointment__[id]-after.png`) : intervenant affiché une seule fois, adresse, prestation, patient, contacts, suivi. Aucun défaut en police 1.0.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\pro\appointment__[id].png` · 1.3 `%TEMP%\cary-qa\shots\pro\appointment__[id]@1.3.png`. Critique : aucun défaut — contacts sur une ligne en 1.0, retour à la ligne propre en 1.3.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- États (2026-10-02) : erreur vérifiée sur planche `%TEMP%\cary-qa3\sheets\err-detail-0*.jpg` (identifiant inconnu ou API coupée) : message clair et « Réessayer ».
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(pro)/appointment/[id]/care-photo/[photoId].tsx` — CarePhotoDiscussionScreen
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\pro\appointment__[id]__care-photo__[photoId].png` · 1.3 `%TEMP%\cary-qa\shots\pro\appointment__[id]__care-photo__[photoId]@1.3.png`. Critique : aucun défaut — fil vide clair, ajout et envoi en bas.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- États (2026-10-02) : erreur vérifiée sur planche `%TEMP%\cary-qa3\sheets\err-detail-0*.jpg` (identifiant inconnu ou API coupée) : message clair et « Réessayer ».
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(pro)/appointment/[id]/conversation.tsx` — AppointmentConversationScreen
- Passe QA émulateur (2026-10-01, → `pro\appointment__[id]__conversation-after3.png`) : compositeur collé à la barre de gestes. Corrigé : `paddingBottom` via `useSceneBottomInset()` dans `AppointmentConversationScreen.tsx`.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\pro\appointment__[id]__conversation.png` · 1.3 `%TEMP%\cary-qa\shots\pro\appointment__[id]__conversation@1.3.png`. Critique : aucun défaut — état vide clair, saisie en bas.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- États (2026-10-02) : erreur vérifiée sur planche `%TEMP%\cary-qa3\sheets\err-detail-0*.jpg` (identifiant inconnu ou API coupée) : message clair et « Réessayer ».
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(pro)/appointment/[id]/edit.tsx` — RescheduleAppointmentScreen
- Passe QA émulateur (2026-10-01, `pro\appointment__[id]__edit-form.png` → `pro\appointment__[id]__edit-after.png`, `edit-form-after2.png`) : pied de page sur la barre de gestes, nom patient inversé, lien retour décalé, catégorie sélectionnée hors écran, chiffres Raleway elzéviriens (« 8hoo »). Corrigé : `RescheduleAppointmentScreen.tsx` (`footerPadding`, `reschedulePatientName`), `CategoryPicker.tsx` (défilement vers la puce choisie), `typography.ts` (`lining-nums`), `BookingTimeRangeSlider.tsx`.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\pro\appointment__[id]__edit.png` · 1.3 `%TEMP%\cary-qa\shots\pro\appointment__[id]__edit@1.3.png`. Critique : aucun défaut — deux choix explicites, action Suivant.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- États (2026-10-02) : erreur vérifiée sur planche `%TEMP%\cary-qa3\sheets\err-detail-0*.jpg` (identifiant inconnu ou API coupée) : message clair et « Réessayer ».
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(pro)/appointment/[id]/exchange.tsx` — CarePhotoDiscussionScreen
- Passe QA émulateur (2026-10-01, capture après `pro\appointment__[id]__care-photo.png`) : « Suivi des soins » vide illustré, compositeur avec « + ». Aucun défaut en police 1.0.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\pro\appointment__[id]__exchange.png` · 1.3 `%TEMP%\cary-qa\shots\pro\appointment__[id]__exchange@1.3.png`. Critique : aucun défaut — fil vide clair, ajout et envoi en bas.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- États (2026-10-02) : erreur vérifiée sur planche `%TEMP%\cary-qa3\sheets\err-detail-0*.jpg` (identifiant inconnu ou API coupée) : message clair et « Réessayer ».
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(pro)/appointment/[id]/prescription.tsx` — AppointmentPrescriptionScreen
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\pro\appointment__[id]__prescription.png` · 1.3 `%TEMP%\cary-qa\shots\pro\appointment__[id]__prescription@1.3.png`. Critique : aucun défaut — aide, avertissements et champs lisibles.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- États (2026-10-02) : erreur vérifiée sur planche `%TEMP%\cary-qa3\sheets\err-detail-0*.jpg` (identifiant inconnu ou API coupée) : message clair et « Réessayer ».
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(pro)/appointments/new.tsx` — BookingWizardScreen
- Passe QA émulateur (2026-10-01, `pro\appointments__new-step4.png` → `pro\appointments__new-step4-after.png`) : titre « Patient » redondant, aide prescription au ton culpabilisant. Corrigé : `FormPatientSection.tsx`, `appointment-document-fields.ts`, sous-titre de `CareServiceQuickOptionsSheet.tsx`. Signalé : l'aide « Que puis-je prescrire en tant qu'infirmier ? » s'affiche aussi pour un médecin (règle `shouldShowNursePrescriptionScopeHelp`, inchangée).
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\pro\appointments__new.png` · 1.3 `%TEMP%\cary-qa\shots\pro\appointments__new@1.3.png`. Critique : aucun défaut — catalogue de soins, une action par ligne.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(pro)/commandes-pharmacie/[id].tsx` — PharmacyOrderDetailScreen
- Critique (agent C, 2026-10-01, capture après à faire) : doublon « Patient : X », bouton « Nouvelle commande » dans le corps ; **bug** : chaque changement de statut envoyait `pharmacy_note: null` et effaçait la note de l’officine.
- Corrections code : en-tête patient + badge, actions officine, carte « Détails », liens, « Annuler la commande » en ligne rouge (confirmation `Alert` à 2 boutons) ; seul `rejection_reason` est envoyé. Backend : GET / PATCH `/pharmacy-orders/:id` (`ALLOWED_TRANSITIONS`, motif obligatoire en refus), GET / POST `/pharmacy-orders/:id/messages`.
- Points QA : badge + nom long, formulaire de refus (motif vide refusé), note conservée après changement de statut, conversation fermée.
- Passe QA émulateur (2026-10-01, `pro\commandes-pharmacie__[id]-2.png` → `pro\commandes-pharmacie__[id]-after.png`) : compositeur sur la barre de gestes et bouton « + » Nouvelle commande dans l'en-tête d'un détail. Corrigé dans `PharmacyOrderDetailScreen.tsx` (inset bas, en-tête sans action). Ordonnance ouverte dans la visionneuse PDF système.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\pro\commandes-pharmacie__[id].png` · 1.3 `%TEMP%\cary-qa\shots\pro\commandes-pharmacie__[id]@1.3.png`. Critique : aucun défaut — détail, ordonnance jointe, annulation.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- États (2026-10-02) : erreur vérifiée sur planche `%TEMP%\cary-qa3\sheets\err-detail-0*.jpg` (identifiant inconnu ou API coupée) : message clair et « Réessayer ».
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(pro)/commandes-pharmacie/[id]/ordonnances.tsx` — PharmacyOrderPrescriptionsScreen
- Critique (agent C, 2026-10-01, capture après à faire) : erreur affichée en texte brut.
- Corrections code : `ErrorState`, lignes libellé / valeur. Backend : GET `/pharmacy-orders/:id` (ordonnances jointes, `PharmacyOrderAccess::canView`).
- Points QA : aucune ordonnance, ouverture d’un document, erreur.
- Passe QA émulateur (2026-10-01, capture après `pro\commandes-pharmacie__[id]__ordonnances.png`) : ligne Ordonnance avec Voir / Télécharger. Aucun défaut en police 1.0.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\pro\commandes-pharmacie__[id]__ordonnances.png` · 1.3 `%TEMP%\cary-qa\shots\pro\commandes-pharmacie__[id]__ordonnances@1.3.png`. Critique : aucun défaut — ordonnance avec voir / télécharger.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- États (2026-10-02) : erreur vérifiée sur planche `%TEMP%\cary-qa3\sheets\err-detail-0*.jpg` (identifiant inconnu ou API coupée) : message clair et « Réessayer ».
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(pro)/commandes-pharmacie/index.tsx` — PharmacyOrdersListScreen
- Critique (agent C, 2026-10-01, capture après à faire) : badge de statut unique turquoise, ombre et pastille décoratives, textes longs.
- Corrections code : badge sémantique (`pharmacyOrderStatusBadgeVariant`, testé), carte plate, illustration `pharmacy`. Backend : GET `/pharmacy-orders?scope=sent|received|patient` (`PharmacyOrderAccess`).
- Points QA : liste vide, chaque statut, nom long.
- Passe QA émulateur (2026-10-01, captures après `pro\commandes-pharmacie__new-sent.png`, `pro\commandes-pharmacie-historique.png`) : En cours / Historique, nouvelle commande « En attente » visible après envoi, état vide illustré. Aucun défaut en police 1.0.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\pro\commandes-pharmacie__index.png` · 1.3 `%TEMP%\cary-qa\shots\pro\commandes-pharmacie__index@1.3.png`. Critique : aucun défaut — segments, statuts lisibles.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- États (2026-10-02) : erreur vérifiée sur planche `%TEMP%\cary-qa3\sheets\err-detail-0*.jpg` (identifiant inconnu ou API coupée) : message clair et « Réessayer ».
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(pro)/commandes-pharmacie/new.tsx` — PharmacyOrderWizardScreen
- Critique (agent C, 2026-10-01, capture après à faire) : erreur avalée en silence, préremplissage d’adresse sans gestion de rejet, cibles de 32 pt, hint « Appuyez sur ✕ », mention de mode redondante.
- Corrections code : erreurs journalisées, préremplissage protégé, patient présélectionné nommé, pastilles proches et corbeille 44 pt, `ErrorState` sur le catalogue. Backend : POST `/pharmacy-orders`. Reste : « Adresse manquante » en `Alert` informative (1 bouton) au lieu d’un message dans le formulaire.
- Points QA : patient présélectionné, proche sans adresse, catalogue en erreur, corbeille.
- Passe QA émulateur (2026-10-01, `pro\commandes-pharmacie__new-2b.png`, `new-4.png` → `new-2-after.png`, `new-4-after.png`) : « Ajouter un patient » collé au sélecteur, libellés « Bénéficiaire » et « Ordonnance » en titre au lieu de libellés de champ, date ISO dans le récapitulatif. Corrigé : `PrescriptionPatientSelectField.tsx`, `PharmacyOrderWizardScreen.tsx` (`buildFieldStyles`, `formatPharmacyDesiredDate`). Envoi vérifié jusqu'au backend. Signalé : « Retour » quitte l'assistant sans confirmation.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\pro\commandes-pharmacie__new.png` · 1.3 `%TEMP%\cary-qa\shots\pro\commandes-pharmacie__new@1.3.png`. Critique : aucun défaut — étape 1 sur 4, une action principale.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(pro)/commandes-recues/[id].tsx` — PharmacyOrderDetailScreen
- Critique (agent C, 2026-10-01, capture après à faire) : doublon « Patient : X », bouton « Nouvelle commande » dans le corps ; **bug** : chaque changement de statut envoyait `pharmacy_note: null` et effaçait la note de l’officine.
- Corrections code : en-tête patient + badge, actions officine, carte « Détails », liens, « Annuler la commande » en ligne rouge (confirmation `Alert` à 2 boutons) ; seul `rejection_reason` est envoyé. Backend : GET / PATCH `/pharmacy-orders/:id` (`ALLOWED_TRANSITIONS`, motif obligatoire en refus), GET / POST `/pharmacy-orders/:id/messages`.
- Points QA : badge + nom long, formulaire de refus (motif vide refusé), note conservée après changement de statut, conversation fermée.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\pharma\commandes-recues__[id].png` · 1.3 `%TEMP%\cary-qa\shots\pharma\commandes-recues__[id]@1.3.png`. Critique : aucun défaut — action principale « Marquer terminée », détails, ordonnance, fiches.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- États (2026-10-02) : erreur vérifiée sur planche `%TEMP%\cary-qa3\sheets\err-detail-0*.jpg` (identifiant inconnu ou API coupée) : message clair et « Réessayer ».
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(pro)/commandes-recues/[id]/ordonnances.tsx` — PharmacyOrderPrescriptionsScreen
- Critique (agent C, 2026-10-01, capture après à faire) : erreur affichée en texte brut.
- Corrections code : `ErrorState`, lignes libellé / valeur. Backend : GET `/pharmacy-orders/:id` (ordonnances jointes, `PharmacyOrderAccess::canView`).
- Points QA : aucune ordonnance, ouverture d’un document, erreur.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\pharma\commandes-recues__[id]__ordonnances.png` · 1.3 `%TEMP%\cary-qa\shots\pharma\commandes-recues__[id]__ordonnances@1.3.png`. Critique : aucun défaut — ordonnance jointe visible par l'officine (accès serveur corrigé), voir / télécharger.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- États (2026-10-02) : erreur vérifiée sur planche `%TEMP%\cary-qa3\sheets\err-detail-0*.jpg` (identifiant inconnu ou API coupée) : message clair et « Réessayer ».
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(pro)/commandes-recues/index.tsx` — PharmacyInboxScreen
- Critique (agent C, 2026-10-01, capture après à faire) : badge de statut unique turquoise, ombre et pastille décoratives, textes longs.
- Corrections code : badge sémantique (`pharmacyOrderStatusBadgeVariant`, testé), carte plate, illustration `pharmacy`. Backend : GET `/pharmacy-orders?scope=sent|received|patient` (`PharmacyOrderAccess`).
- Points QA : liste vide, chaque statut, nom long.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\pharma\commandes-recues__index.png` · 1.3 `%TEMP%\cary-qa\shots\pharma\commandes-recues__index@1.3.png`. Critique : aucun défaut — segments En cours / Historique, statuts lisibles.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- États (2026-10-02) : erreur vérifiée sur planche `%TEMP%\cary-qa3\sheets\err-detail-0*.jpg` (identifiant inconnu ou API coupée) : message clair et « Réessayer ».
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(pro)/informations-legales.tsx` — LegalInformationScreen
- Corrections code (agent D, 2026-10-01, à recapturer) : liste unifiée sur `SettingsSection iconless` (fin de `ProfileNavRow`), ouverture typée `webPageHref(préfixe, { kind: "legal", slug })`.
- Passe QA émulateur (2026-10-01, capture après `pro\informations-legales.png`) : trois documents avec sous-titre. Aucun défaut en police 1.0.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\pro\informations-legales.png` · 1.3 `%TEMP%\cary-qa\shots\pro\informations-legales@1.3.png`. Critique : aucun défaut — trois rubriques simples.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(pro)/notifications.tsx` — NotificationsScreen
- Corrections code (agent D, 2026-10-01, à recapturer) : navigation typée `resolveNotificationNavigation(...) : Href | null` (routes inexistantes → pas de navigation), icône alignée en haut du texte. L’emoji relevé vient du contenu serveur (hors UI).
- Passe QA émulateur (2026-10-01, capture après `pro\notifications.png`) : commande, labo, message, résultats ; chaque tap mène au bon écran (détail commande, Résultats, détail RDV). Libellé « En attente labo » conservé sur les anciennes notifications (non migré, signalé).
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\pro\notifications.png` · 1.3 `%TEMP%\cary-qa\shots\pro\notifications@1.3.png` · err `%TEMP%\cary-qa\shots\pro\notifications@err.png`. Critique : aucun défaut — liste lisible.
- Passe retours client (2026-10-06, Pierre, `.qa-tmp\shots\pro-notifs.png` → `pro-notif-open.png`) : « Transmission pour le médecin » (écrite par Nina sur Bruno) reçue et ouverte sur les transmissions de Bruno ; badge décrémenté. Aucun défaut.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(pro)/onboarding.tsx` — TutorialCarouselScreen
- Passe QA émulateur (2026-10-01, captures après `pro\onboarding.png`, `onboarding-2.png`, `onboarding-3.png`) : trois écrans illustrés, Passer / Précédent / Terminer. Aucun défaut en police 1.0.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\pro\onboarding.png` · 1.3 `%TEMP%\cary-qa\shots\pro\onboarding@1.3.png`. Critique : aucun défaut — illustration, une phrase, Suivant.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(pro)/patient/[id].tsx` — PatientDetailScreen
- Critique (agent C, 2026-10-01, capture après à faire) : « Appeler » en action principale, six pastilles turquoise en majuscules, carte isolée « Modifier », icône verte décorative, bouton pharmacie visible même sans droit (403 à la création).
- Corrections code : action principale « Créer un rendez-vous », contacts secondaires ; lignes libellé / valeur ; « Modifier » en en-tête ; section « Dossier » (Documents, Ordonnances, Historique, Carnet de santé, pharmacie seulement si `canOrder`) ; « Supprimer le patient » en ligne rouge discrète. Backend : GET / PUT `/users/:id`, DELETE `/patients/:id`.
- Points QA : « Modifier » dans l’en-tête, trois boutons de contact sur une ligne en grande police, ligne pharmacie absente si module inactif, patient sans téléphone / e-mail.
- Passe QA émulateur (2026-10-01, `pro\patient__[id].png` → `pro\patient__[id]-after2.png`) : écran blanc (le `RefreshControl` Android cloné perdait `style` et `children`) puis carte Informations avec double marge. Corrigé : `AppRefreshControl.tsx` (transmet `style` et `children`), `Card padding="none"` dans `PatientDetailScreen.tsx`.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\pro\patient__[id].png` · 1.3 `%TEMP%\cary-qa\shots\pro\patient__[id]@1.3.png`. Critique : aucun défaut — contacts sur une ligne, fiche et dossier lisibles.
- **QA émulateur en attente (2026-10-06)** : mêmes points que `(nurse)/patient/[id].tsx` (proche = dossier propre, redirection `?relative_id=`, « Dossier de … » depuis un RDV ou une commande pharmacie pour un proche).
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- États (2026-10-02) : erreur vérifiée sur planche `%TEMP%\cary-qa3\sheets\err-detail-0*.jpg` (identifiant inconnu ou API coupée) : message clair et « Réessayer ».
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(pro)/patient/[id]/transmissions.tsx` — StaffPatientTransmissionsScreen
- Passe retours client (2026-10-06, Pierre sur Bruno, `.qa-tmp\shots\pro-notif-open.png`) : même écran que l'infirmier (voir `(nurse)/patient/[id]/transmissions.tsx`) : fil par jour, auteur et rôle, mention « Pour le médecin », heure d'écriture ou « Écrite le 6 oct. ». Le médecin lit les transmissions de Nina sans pouvoir les modifier (droit réservé à l'auteur pendant 24 h, `PatientTransmissionService`) et peut en écrire. Aucun défaut en police 1.0.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [ ] grande police (rien de coupé)
- [ ] états (loading / vide / erreur)
- [ ] validation finale

### `(pro)/patient/[id]/documents.tsx` — StaffPatientDocumentsScreen
- Critique (agent C, 2026-10-01, capture après à faire) : requête profil chargée uniquement pour un titre long « Documents de X ».
- Corrections code : requête profil supprimée, titre « Documents », tirer-pour-actualiser recharge directement les documents. Backend : GET `/patient-documents?user_id=` (`PatientDossierAccess` pour les rôles staff).
- Points QA : liste vide, ouverture d’un PDF / image, rafraîchissement.
- Passe QA émulateur (2026-10-01, capture après `pro\patient__[id]__documents.png`) : affiché depuis la correction `AppRefreshControl` (écran blanc avant). Aucun défaut en police 1.0.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\pro\patient__[id]__documents.png` · 1.3 `%TEMP%\cary-qa\shots\pro\patient__[id]__documents@1.3.png`. Critique : aucun défaut — pièces avec ajout.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- États (2026-10-02) : erreur vérifiée sur planche `%TEMP%\cary-qa3\sheets\err-detail-0*.jpg` (identifiant inconnu ou API coupée) : message clair et « Réessayer ».
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(pro)/patient/[id]/health-record.tsx` — StaffHealthRecordScreen
- Critique (agent C, 2026-10-01, capture après à faire) : le tirer-pour-actualiser s’arrêtait immédiatement (compteur `refreshKey` sans attendre le rechargement), constantes cliniques non rafraîchies, écran vide sans identifiant ; double marge basse avec le panneau.
- Corrections code : rafraîchissement = refetch réel du carnet (`staffRecap`) et des constantes (`clinicalVitalsQueryKey`) ; « Patient introuvable » sans identifiant ; `SceneScrollView` ; marge basse portée par le panneau seul. Panneau `PassageFormHealthRecordPanel` (variante `screen`, modifié par B) revérifié : hero sans ombre, `ErrorState`, `refreshKey` supprimé — reste une bordure de 1 px au lieu du trait fin des autres cartes. Backend : GET `/patients/:id/health-record` ; PATCH corrigé : `upsertAnswersForStaff` vérifie `PatientDossierAccess` **avant** l’écriture (avant : écriture puis 403) ; test `HealthRecordAclTest`.
- Points QA : tirer-pour-actualiser (spinner jusqu’à la fin du chargement), éditer une section, constantes, erreur d’accès (patient non rattaché), grande police sur l’anneau de progression.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\pro\patient__[id]__health-record.png` · 1.3 `%TEMP%\cary-qa\shots\pro\patient__[id]__health-record@1.3.png`. Critique : aucun défaut — titre unique, constantes lisibles.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- États (2026-10-02) : erreur vérifiée sur planche `%TEMP%\cary-qa3\sheets\err-detail-0*.jpg` (identifiant inconnu ou API coupée) : message clair et « Réessayer ».
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(pro)/patient/[id]/history.tsx` — StaffPatientHistoryScreen
- Critique (agent C, 2026-10-01, capture après à faire) : une erreur réseau s’affichait comme un historique vide ; pagination client inutile sur une liste virtualisée.
- Corrections code : `ErrorState`, pagination client retirée, état vide « Aucun rendez-vous passé ». Backend : GET `/appointments` filtré patient + GET `/users/:id`.
- Points QA : erreur réseau (réessayer), historique vide, long historique.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\pro\patient__[id]__history.png` · 1.3 `%TEMP%\cary-qa\shots\pro\patient__[id]__history@1.3.png`. Critique : aucun défaut — historique daté.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- Correction (2026-10-02) : patient inconnu → `ErrorState` « Patient introuvable » au lieu de « Aucun rendez-vous passé » (`StaffPatientHistoryScreen`, hook `useStaffPatientProfile`). Capture `%TEMP%\cary-qa\shots\pro\patient__[id]__history@err.png`.
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(pro)/patient/[id]/prescriptions.tsx` — PatientPrescriptionsScreen
- Critique (agent C, 2026-10-01, capture après à faire) : section avec ombre, textes de passage longs, lignes d’historique tronquées, traits d’icône à 2, assertion `user!`, composants morts.
- Corrections code : bordure fine sans ombre, phrases courtes, illustration `prescriptions` (vide / sans accès), aucune troncature, traits 1,75 ; `PrescriptionAppointmentPicker`, `PrescriptionRdvScheduleRow`, `PrescriptionHistoryList` supprimés. Backend : GET `/pro/prescriptions` ou `/nurse/prescriptions`, POST `/prescriptions/generate`, POST `/appointments/:id/generate-prescription`, POST `/medical-documents`.
- Points QA : historique vide, compte sans accès, génération d’une prescription, nom de patient long.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\pro\patient__[id]__prescriptions.png` · 1.3 `%TEMP%\cary-qa\shots\pro\patient__[id]__prescriptions@1.3.png`. Critique : aucun défaut — créer / historique, aide claire.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- États (2026-10-02) : erreur vérifiée sur planche `%TEMP%\cary-qa3\sheets\err-detail-0*.jpg` (identifiant inconnu ou API coupée) : message clair et « Réessayer ».
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(pro)/prescriptions.tsx` — StackChromeScreen
- Critique (agent C, 2026-10-01, capture après à faire) : section avec ombre, textes de passage longs, lignes d’historique tronquées, traits d’icône à 2, assertion `user!`, composants morts.
- Corrections code : bordure fine sans ombre, phrases courtes, illustration `prescriptions` (vide / sans accès), aucune troncature, traits 1,75 ; `PrescriptionAppointmentPicker`, `PrescriptionRdvScheduleRow`, `PrescriptionHistoryList` supprimés. Backend : GET `/pro/prescriptions` ou `/nurse/prescriptions`, POST `/prescriptions/generate`, POST `/appointments/:id/generate-prescription`, POST `/medical-documents`.
- Points QA : historique vide, compte sans accès, génération d’une prescription, nom de patient long.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\pro\prescriptions.png` · 1.3 `%TEMP%\cary-qa\shots\pro\prescriptions@1.3.png`. Critique : aucun défaut — choix du patient puis création.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- États (2026-10-02) : erreur vérifiée sur planche `%TEMP%\cary-qa3\sheets\err-detail-0*.jpg` (identifiant inconnu ou API coupée) : message clair et « Réessayer ».
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(pro)/professionnel/[id].tsx` — PharmacyPartyContactScreen
- Critique (agent C, 2026-10-01, capture après à faire) : aucun état de chargement, erreur brute.
- Corrections code : chargement visible, `ErrorState`, lignes libellé / valeur ; appel / SMS via `buildPhoneContactActions`, e-mail `mailto:` avec échec journalisé.
- Points QA : professionnel sans téléphone, chargement, grande police.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\pharma\professionnel__[id].png` · 1.3 `%TEMP%\cary-qa\shots\pharma\professionnel__[id]@1.3.png`. Critique : aucun défaut — contacts sur une ligne en 1.0 et 1.3, coordonnées lisibles.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [ ] états (loading / vide / erreur)
- [ ] validation finale

### `(pro)/qr-code.tsx` — QrCodeScreen
- Critique (agent B, 2026-10-01, capture après à faire) : placeholder d’exemple inventé alors que le backend renvoie l’accroche réellement imprimée (`effective_tagline`) ; aucune indication qu’un champ vide garde l’accroche par défaut ; marges en dur.
- Corrections code : placeholder = `effective_tagline` quand aucune accroche perso n’est enregistrée ; description « Laissez vide pour garder l’accroche Cary. » ; `H_PADDING`. Backend : GET / PATCH `/qr/me` (rôles nurse, lab, subaccount, pro ; PATCH avec CSRF, accroche tronquée à 120), GET `/qr/me/png` (même rôles, affiche ou QR seul) ; QR toujours celui de l’utilisateur connecté.
- Points QA : génération de l’affiche, échec de l’affiche (réessayer), partager l’affiche / QR seul / lien, enregistrer puis vider l’accroche (l’affiche se régénère), statistiques 30 jours, grande police.
- Complément (agent C, 2026-10-01, capture après à faire) : « QR code seul » ne partageait rien sur Android (`Share.share({ url })` iOS uniquement) → `exportLocalFile` (expo-sharing) ; une action principale « Partager l’affiche », « QR code seul » / « Lien » secondaires ; statistiques neutres « 30 derniers jours » ; affiche sans ombre avec `ErrorState` + réessayer ; erreurs en toast.
- Passe QA émulateur (2026-10-01, `pro\qr-code.png`) : affiche vide. Cause : le PNG renvoyé par `/qr/me/png` commençait par des avertissements PHP 8.2 (propriété dynamique `QRencode::$cmyk`, paramètres optionnels avant requis). Corrigé dans `backend/lib/third_party/phpqrcode/phpqrcode.php` ; tests `tests/qr` verts ; affiche visible ensuite. Capture après propre à refaire (la capture de contrôle contient un texte d'essai temporaire, retiré du code).
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\pro\qr-code.png` · 1.3 `%TEMP%\cary-qa\shots\pro\qr-code@1.3.png`. Critique : aucun défaut — affiche, partage, statistiques.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [ ] états (loading / vide / erreur)
- [ ] validation finale

### `(pro)/resultats.tsx` — LabResultsScreen
- Critique (agent B, 2026-10-01, capture après à faire) : écran déjà sobre ; ouverture d’un document sans `catch` (rejet non géré si le téléchargement lève), espacements en dur, style de liste par défaut mort dans `LabResultsFeed`.
- Corrections code : `catch` journalisé + toast « Ouverture impossible » ; `H_PADDING` / `spacing` ; `contentContainerStyle` requis, style mort supprimé. Backend : GET `/lab-results` (rôles patient / infirmier / pro, sinon 403) ; `LabResultsListing::listForUser` filtre patient = `a.patient_id`, infirmier = assigné / créateur / patients rattachés, pro = créateur / patients rattachés.
- Points QA : liste vide, recherche sans résultat, ouverture d’un PDF, « Voir la visite » (segment Documents), « Demander à Cary », pagination, grande police.
- Complément (agent C, 2026-10-01, capture après à faire) : seule la 1re page (50) était chargée → `useLabResultsInfinite` (pagination au défilement, total backend) ; indicateur d’ouverture sur la ligne, chevron, icône neutre.
- Passe QA émulateur (2026-10-01, capture après `pro\resultats.png`) : recherche patient / analyse, résultat avec Voir la visite / Demander à Cary. Aucun défaut en police 1.0.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\pro\resultats.png` · 1.3 `%TEMP%\cary-qa\shots\pro\resultats@1.3.png`. Critique : aucun défaut — recherche et résultat lisible.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- États (2026-10-02) : erreur vérifiée sur planche `%TEMP%\cary-qa3\sheets\err-detail-0*.jpg` (identifiant inconnu ou API coupée) : message clair et « Réessayer ».
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(pro)/web.tsx` — AppWebViewScreen
- Corrections code (agent D, 2026-10-01, à recapturer) : route restreinte à une liste blanche (`resolveWebPage` : pages légales `/mentions-legales`, `/politique-confidentialite`, `/cgv`, profil public `/infirmier/<slug>`, toutes présentes dans `frontend/pages`), titre en texte simple (repli `STACK_HEADER_CATALOG.web`, plus de troncature `numberOfLines`), chargement plein écran, erreur réseau / HTTP et page inconnue via `ErrorState` (illustration `error`). Injection du jeton supprimée (paramètre `auth` jamais transmis).
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\pro\web.png` · 1.3 `%TEMP%\cary-qa\shots\pro\web@1.3.png`. Critique : DÉFAUT OUVERT — défaut ouvert : web locale démarrée en fin de session, capture à refaire pour ce rôle (contenu vérifié côté patient).
- [x] capture avant
- [x] défauts listés
- Correction (2026-10-02) : la WebView ouvre la page avec `?embed=1` ; le site (`useEmbeddedView`, `MarketingAppShell`, pages légales) masque alors en-tête, pied de page et « Retour à l'accueil ». Captures 1.0 / 1.3 relues (`%TEMP%\cary-qa3\sheets\web-01.jpg`), aucun défaut. États erreur : `ErrorState` réseau / HTTP non recapturé.
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [ ] états (loading / vide / erreur)
- [ ] validation finale

## preleveur (14)

### `(preleveur)/(tabs)/calendar.tsx` — CalendarScreen
- Critique (agent C, 2026-10-01, capture après à faire) : chaque jour affiché trois fois (bandeau, liste, feuille), cellules bordées turquoise, flèches de 34 pt, animations décoratives, erreur en état vide.
- Corrections code : sélection d’un jour → liste en dessous (« jour · N rendez-vous »), cellules sans bordure (disque = sélection, anneau = aujourd’hui, point = RDV), flèches 44 pt, `ErrorState`. Backend : GET `/appointments` sur la plage du mois.
- Points QA : sélection d’un jour, balayage de mois, jour sans RDV, grande police sur le titre du mois.
- Passe QA émulateur (2026-10-01, `prel-agenda.png` → `av-ag2.png`) : avatar de Claire différent de la liste Patients et de la Tournée ; pictogramme « Bilan martial » vide (simple chargement, présent à la recapture). Avatar corrigé (graine par identifiant, genre renvoyé par la tournée, voir Tournée). Aucun défaut restant en police 1.0.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\preleveur\(tabs)__calendar.png` · 1.3 `%TEMP%\cary-qa\shots\preleveur\(tabs)__calendar@1.3.png` · err `%TEMP%\cary-qa\shots\preleveur\(tabs)__calendar@err.png`. Critique : aucun défaut — calendrier, jour sélectionné, liste du jour.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(preleveur)/(tabs)/index.tsx` — PreleveurAppointmentsListScreen
- Critique (agent C, 2026-10-01, capture après à faire) : titres en majuscules ; « Aucun prélèvement » affiché sous des demandes présentes.
- Corrections code : sections « À traiter » / « Missions confirmées », état vide réduit à une ligne s’il y a des demandes, illustration `search`. Backend : GET `/appointments` (`assigned_only`, `preleveur_segment=mes_demandes`).
- Points QA : demandes seules, missions seules, rien, recherche.
- Passe QA émulateur (2026-10-01, `prel-reload.png`, `relaunch3.png`) : recherche, CTA « Demander un prélèvement », cartes par jour avec `CareIcon` (HbA1c, Glycémie à jeun, CRP, Bilan rénal) lisibles. Aucun défaut en police 1.0.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\preleveur\(tabs)__index.png` · 1.3 `%TEMP%\cary-qa\shots\preleveur\(tabs)__index@1.3.png` · err `%TEMP%\cary-qa\shots\preleveur\(tabs)__index@err.png`. Critique : aucun défaut — accueil, demande de prélèvement, liste par jour.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(preleveur)/(tabs)/more.tsx` — useRouter
- Corrections code (agent D, 2026-10-01, à recapturer) : lignes `SettingsRow` (puits d’icône neutre par défaut), titre du hub via `TabScreenFrame`. Non corrigé : chevron sur « Se déconnecter » (ouvre une confirmation).
- Passe QA émulateur (2026-10-01, `plus-bottom.png` → `plus-bottom4.png`) : « Supprimer mon compte » rangé parmi les réglages courants. Corrigé dans `RoleMoreTabScreen.tsx` (commun à tous les rôles) : déplacé dans le dernier groupe, sous « Se déconnecter » ; la FAQ (« Plus, puis Supprimer mon compte ») reste exacte. « Se déconnecter » n’a plus de chevron.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\preleveur\(tabs)__more.png` · 1.3 `%TEMP%\cary-qa\shots\preleveur\(tabs)__more@1.3.png`. Critique : aucun défaut — sections courtes, déconnexion en bas.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(preleveur)/(tabs)/patients.tsx` — PreleveurPatientsListScreen
- Critique (agent C, 2026-10-01, capture après à faire) : erreur brute + bouton séparé, sous-titre de remplissage.
- Corrections code : `ErrorState`, illustrations, « Ajouter un patient ». Backend : GET `/patients` ; tap → nouveau RDV avec `patient_id`.
- Points QA : liste vide, erreur, ajout.
- Passe QA émulateur (2026-10-01, `prel-patients.png` → `pat3.png`) : e-mail coupé sur deux lignes (« …@test / .invalid ») dans la 2e ligne. Corrigé dans `patients/utils/patient-contact-display.ts` (`patientListSubtitle` : un seul contact, téléphone sinon e-mail ; la recherche couvre toujours l’e-mail ; aussi utilisé par `PrescriptionPatientSelectSheet`).
- Reste (comportement, non modifié) : le tap sur un patient ouvre directement un nouveau RDV (pas de fiche patient côté préleveur), alors que le chevron suggère une fiche.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\preleveur\(tabs)__patients.png` · 1.3 `%TEMP%\cary-qa\shots\preleveur\(tabs)__patients@1.3.png` · err `%TEMP%\cary-qa\shots\preleveur\(tabs)__patients@err.png`. Critique : aucun défaut — icône calendrier explicite : le tap crée un rendez-vous.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(preleveur)/(tabs)/tournee.tsx` — TourneeScreen
- Critique (agent C, 2026-10-01, capture après à faire) : carte dégradée « Ma tournée du jour » fausse pour une autre date, lignes avec ombre, index turquoise, textes coupés, boutons 32×28 ; clé de cache `'preleveur-tour'` dupliquée dans `tour-navigation`.
- Corrections code : ligne « N arrêts · X terminés · ~km », lignes plates, boutons monter / descendre 44 pt, état vide ; clé unique `PRELEVEUR_TOUR_QUERY_ROOT` / `preleveurTourQueryKey` (`tournee-preleveur/hooks/preleveur-tour-query.ts`). Pas de menu d’actions en `Alert` (rien à aligner sur `TourStopActionsSheet`). Backend : GET `/preleveur/tour`, `/preleveur/tour/summary`, PATCH `/preleveur/tour/order`, POST `/preleveur/tour/optimize` (`assigned_to = ?`).
- Points QA : réordonnancement manuel, tri, autre date, nom long, préférence de navigation (Waze / Maps).
- Passe QA émulateur (2026-10-01, `prel-tournee2.png` → `av-ag.png`) : avatar du « Prochain arrêt » différent des autres écrans, car `/preleveur/tour` ne renvoyait ni genre ni photo. Corrigé dans `backend/lib/preleveur-tour/PreleveurTourService.php` (`patient_gender`, `profile_image_url` issus de l’enrichissement commun `AppointmentListPayload`, comme la tournée infirmier) et dans `tournee-preleveur/api/preleveur-tour.service.ts` (type). Vérifié par l’API (genres identiques sur `/patients`, `/appointments` et `/preleveur/tour`) et à l’écran.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\preleveur\(tabs)__tournee.png` · 1.3 `%TEMP%\cary-qa\shots\preleveur\(tabs)__tournee@1.3.png` · err `%TEMP%\cary-qa\shots\preleveur\(tabs)__tournee@err.png`. Critique : aucun défaut — prochain arrêt, actions, liste des arrêts.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(preleveur)/ai.tsx` — RoleAiHubRouteScreen
- Corrections code (agent D, 2026-10-01, à recapturer) : refonte éditoriale Cary IA : réponses sans bulle, bulles utilisateur neutres, suggestions en liste, compositeur 44 pt, avertissement + urgence 15 · 112 affichés une seule fois (pied de page, repli statique si l’API n’en fournit pas), liste des conversations (recherche, état vide illustré, bouton « … » visible), overlay vocal épuré, export RGPD avec alerte d’erreur.
- Passe QA émulateur (2026-10-01, `prel\ai2.png` → `prel-ai3.png`) : suggestions « Prendre un rendez-vous » (interdit au préleveur par `AiBookingAccess::ROLES`) et « Question sur mon suivi » (formulation patient), en doublon avec « Demander un prélèvement ». Corrigé dans `backend/lib/ai/AiQuickSuggestionsService.php` : `book` réservé au patient, `patient_rdv` seulement si `AiBookingAccess::allows`, question générale `case_question` « Question sur un dossier » pour les professionnels, repli aligné. Mobile : message `case_question` dans `ai-hub/utils/ai-navigation.ts`. Test : `backend/tests/ai/AiQuickSuggestionsServiceTest.php`. Après : une seule suggestion « Question sur un dossier » + « Demander un prélèvement ».
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\preleveur\ai.png` · 1.3 `%TEMP%\cary-qa\shots\preleveur\ai@1.3.png`. Critique : aucun défaut — suggestions courtes, saisie en bas.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(preleveur)/appointment/[id].tsx` — AppointmentDetailScreen
- Passe QA émulateur (2026-10-01, `prel-detail.png`, `prel-detail3.png` → `prel-detail4.png`) :
  - bandeau « Rendez-vous terminé » en doublon du badge « Terminé » de l’en-tête → retiré de `AppointmentDetailScreen.tsx` (l’état terminal masque toujours le bloc d’actions) ;
  - libellé « Prélèvement » répété pour chaque analyse → `build-rdv-info-rows.ts` (`pushBloodItemRows`) regroupe sous « Prélèvements », et `RdvAppointmentInfoSection.tsx` affiche les lignes suivantes sans libellé ni séparateur (le libellé revient seulement si des options s’intercalent) ;
  - actions « Envoyer un SMS » et « Itinéraire Waze » en doublon des boutons SMS / Waze de la carte → retirées de `DetailSidebarActions.tsx` (code mort `patientPhone` et `useAppointmentNavigation` supprimé).
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\preleveur\appointment__[id].png` · 1.3 `%TEMP%\cary-qa\shots\preleveur\appointment__[id]@1.3.png`. Critique : aucun défaut — prélèvements, patient, laboratoire, contacts.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- États (2026-10-02) : erreur vérifiée sur planche `%TEMP%\cary-qa3\sheets\err-detail-0*.jpg` (identifiant inconnu ou API coupée) : message clair et « Réessayer ».
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(preleveur)/appointment/[id]/conversation.tsx` — AppointmentConversationScreen
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\preleveur\appointment__[id]__conversation.png` · 1.3 `%TEMP%\cary-qa\shots\preleveur\appointment__[id]__conversation@1.3.png`. Critique : aucun défaut — bulles lisibles, saisie en bas.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- États (2026-10-02) : erreur vérifiée sur planche `%TEMP%\cary-qa3\sheets\err-detail-0*.jpg` (identifiant inconnu ou API coupée) : message clair et « Réessayer ».
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(preleveur)/appointment/[id]/edit.tsx` — RescheduleAppointmentScreen
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\preleveur\appointment__[id]__edit.png` · 1.3 `%TEMP%\cary-qa\shots\preleveur\appointment__[id]__edit@1.3.png`. Critique : aucun défaut — deux choix explicites, action Suivant.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- États (2026-10-02) : erreur vérifiée sur planche `%TEMP%\cary-qa3\sheets\err-detail-0*.jpg` (identifiant inconnu ou API coupée) : message clair et « Réessayer ».
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(preleveur)/appointments/new.tsx` — BookingWizardScreen
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\preleveur\appointments__new.png` · 1.3 `%TEMP%\cary-qa\shots\preleveur\appointments__new@1.3.png`. Critique : aucun défaut — catalogue de prélèvements, une action par ligne.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(preleveur)/informations-legales.tsx` — LegalInformationScreen
- Corrections code (agent D, 2026-10-01, à recapturer) : liste unifiée sur `SettingsSection iconless` (fin de `ProfileNavRow`), ouverture typée `webPageHref(préfixe, { kind: "legal", slug })`.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\preleveur\informations-legales.png` · 1.3 `%TEMP%\cary-qa\shots\preleveur\informations-legales@1.3.png`. Critique : aucun défaut — trois entrées claires, aucun texte coupé.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(preleveur)/notifications.tsx` — NotificationsScreen
- Corrections code (agent D, 2026-10-01, à recapturer) : navigation typée `resolveNotificationNavigation(...) : Href | null` (routes inexistantes → pas de navigation), icône alignée en haut du texte. L’emoji relevé vient du contenu serveur (hors UI).
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\preleveur\notifications.png` · 1.3 `%TEMP%\cary-qa\shots\preleveur\notifications@1.3.png` · err `%TEMP%\cary-qa\shots\preleveur\notifications@err.png`. Critique : aucun défaut — liste datée lisible, action « Tout lu » en tête.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(preleveur)/onboarding.tsx` — TutorialCarouselScreen
- Passe QA émulateur (2026-10-01) : illustration « rendez-vous » côté patient montrée aux professionnels → `TutorialIllustration.tsx` (prop `role`, `PROFESSIONAL_OVERRIDES`), vérifié.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\preleveur\onboarding.png` · 1.3 `%TEMP%\cary-qa\shots\preleveur\onboarding@1.3.png`. Critique : aucun défaut — une illustration, une phrase, une action « Suivant ».
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `(preleveur)/web.tsx` — AppWebViewScreen
- Corrections code (agent D, 2026-10-01, à recapturer) : route restreinte à une liste blanche (`resolveWebPage` : pages légales `/mentions-legales`, `/politique-confidentialite`, `/cgv`, profil public `/infirmier/<slug>`, toutes présentes dans `frontend/pages`), titre en texte simple (repli `STACK_HEADER_CATALOG.web`, plus de troncature `numberOfLines`), chargement plein écran, erreur réseau / HTTP et page inconnue via `ErrorState` (illustration `error`). Injection du jeton supprimée (paramètre `auth` jamais transmis).
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\preleveur\web.png` · 1.3 `%TEMP%\cary-qa\shots\preleveur\web@1.3.png`. Critique : DÉFAUT OUVERT — défaut ouvert : web locale démarrée en fin de session, capture à refaire pour ce rôle (contenu vérifié côté patient).
- [x] capture avant
- [x] défauts listés
- Correction (2026-10-02) : la WebView ouvre la page avec `?embed=1` ; le site (`useEmbeddedView`, `MarketingAppShell`, pages légales) masque alors en-tête, pied de page et « Retour à l'accueil ». Captures 1.0 / 1.3 relues (`%TEMP%\cary-qa3\sheets\web-01.jpg`), aucun défaut. États erreur : `ErrorState` réseau / HTTP non recapturé.
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [ ] états (loading / vide / erreur)
- [ ] validation finale

## profile (partagé) (18)

### `profile/care-origins.tsx` — ProfileCareOriginsScreen
- Captures (patient, police 1.0) : `%TEMP%\cary-qa\shots\profile\care-origins.png`
- Défauts :
  - P3 — titre « Mes donneurs de soins » maladroit.
- Passe QA émulateur (2026-10-01, capture après `patient\caregivers-after.png`) : trois professionnels avec interrupteurs, aide en une phrase. Aucun défaut en police 1.0.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\profile\care-origins.png` · 1.3 `%TEMP%\cary-qa\shots\profile\care-origins@1.3.png` · err `%TEMP%\cary-qa\shots\profile\care-origins@err.png`. Critique : aucun défaut — interrupteurs et explication courte.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `profile/delete-account.tsx` — ProfileDeleteAccountScreen
- Captures (patient, police 1.0) : `%TEMP%\cary-qa\shots\profile\delete-account.png`
- Défauts :
  - P3 — trois cards de puces (dense).
  - P3 — bouton final sous la barre de gestes tant qu'on ne fait pas défiler.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\profile\delete-account.png` · 1.3 `%TEMP%\cary-qa\shots\profile\delete-account@1.3.png`. Critique : aucun défaut — conséquences claires, confirmation par saisie ; rien de coupé en 1.3.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `profile/documents.tsx` — ProfileDocumentsScreen
- Captures (patient, police 1.0) : `%TEMP%\cary-qa\shots\profile\documents.png`
- Défauts :
  - P2 — sous-titre « Appareil photo, galerie ou fichier » répété 4 fois.
  - P2 — lignes sur fond turquoise dans une card blanche (effet card dans card) ; icônes grises vs icône d'en-tête turquoise. Fichier : `ProfileDocumentsScreen`.
- Corrections (agent correctifs QA, corrigé, capture après à faire) : une liste simple dans une seule carte. En-tête « Documents médicaux » retiré de `ProfileDocumentsPremiumPanel` (le titre de l'écran le dit déjà ; aussi retiré du dossier patient soignant `patient/[id]/documents`) ; dans `medical-documents-stack`, plus de fond teinté par ligne (turquoise « à ajouter », vert « enregistré ») et plus d'aide « Appareil photo, galerie ou fichier » répétée (seul « Envoi en cours… » s'affiche pendant l'envoi ; l'état « enregistré » reste lisible par l'icône verte et la ligne « Ajouté le… »). Chargement : squelette au lieu de lignes « à ajouter » prématurées. Ces lignes sont partagées avec les documents d'un rendez-vous.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\profile\documents.png` · 1.3 `%TEMP%\cary-qa\shots\profile\documents@1.3.png` · empty `%TEMP%\cary-qa\shots\profile\documents@empty.png`. Critique : aucun défaut — pièces et mention de chiffrement ; rien de coupé en 1.3.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `profile/help/[slug].tsx` — HelpFaqTopicScreen
- Corrections code (agent D, 2026-10-01, à recapturer) : contenu issu de la FAQ réécrite (voir `profile/help/index.tsx`).
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\profile\help__[slug].png` · 1.3 `%TEMP%\cary-qa\shots\profile\help__[slug]@1.3.png`. Critique : aucun défaut — réponse courte, lien vers le support.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `profile/help/index.tsx` — HelpScreen
- Captures (patient, police 1.0) : `%TEMP%\cary-qa\shots\profile\help__index.png`
- Défauts :
  - P2 — contenu périmé : « C'est quoi Plus ? », section « Menu Plus — Mon compte » alors que l'onglet s'appelle « Compte ».
  - P3 — titre de section « Détail d'un rendez-vous (patient) » expose le rôle. Fichier : `features/help/help-faq-content.ts` (l. 129, 197, 284, 347 : « Menu Plus »).
- Corrections code (agent D, 2026-10-01, à recapturer) : FAQ réécrite sur les libellés réels (`navigation/role-tabs.ts`) : onglet « Compte » côté patient, « Plus » ailleurs ; Accueil / Agenda / Tournée au lieu de « RDV » / « Calendrier » ; alertes sous la cloche ; rubriques sans rôle entre parenthèses ; lignes `SettingsSection`.
- Correction (agent correctifs QA, corrigé, capture après à faire) : le libellé de l'onglet compte n'est plus recopié en dur dans la FAQ, il est lu dans `ROLE_TABS` (onglet `more`). Rubriques patient vérifiées contre `app/(patient)/(tabs)/more.tsx` (carnet, documents, traitements, données santé, proches, avis).
- Passe QA émulateur (2026-10-01, capture après `pro\profile__help.png`) : recherche, « Revoir le guide de démarrage », questions par onglet adaptées au rôle pro. Aucun défaut en police 1.0.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\profile\help__index.png` · 1.3 `%TEMP%\cary-qa\shots\profile\help__index@1.3.png`. Critique : aucun défaut — recherche et questions par rubrique.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `profile/index.tsx` — ProfileScreen
- Captures (patient, police 1.0) : `%TEMP%\cary-qa\shots\profile\index.png`
- Défauts :
  - P2 — même formulaire que `profile/personal` sous un autre titre (« Mon profil » / « Informations personnelles ») : doublon de route.
  - P3 — avatar différent de celui de l'onglet Compte.
- Correction (agent correctifs QA, corrigé, capture après à faire) : P2 doublon : route `app/profile/personal.tsx` supprimée avec son titre `personal` du catalogue ; `/profile` (« Mon profil ») est la seule route. Aucun lien, deep link ni notification ne pointait vers `/profile/personal` (vérifié dans `apps/mobile`, `frontend`, `backend`), donc pas de redirection. P3 avatar : non traité.
- Passe QA émulateur (2026-10-01, capture après `patient\profile-after-d.png`) : champs alignés, e-mail non modifiable expliqué, NIR avec aide, bouton d'enregistrement fixe. Côté pro (`pro\profile-4.png`) : l'adresse publique affichait « cary.fr » codé en dur alors que le lien partagé est construit par `webAppUrl` ; corrigé dans `ProfileProView.tsx` (capture après pro à refaire).
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\profile\index.png` · 1.3 `%TEMP%\cary-qa\shots\profile\index@1.3.png` · err `%TEMP%\cary-qa\shots\profile\index@err.png`. Critique : aucun défaut — formulaire profil, action Enregistrer.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `profile/menu.tsx` — ProfileHubScreen
- Captures (patient, police 1.0) : `%TEMP%\cary-qa\shots\profile\menu.png`
- Rend le hub de l'onglet Compte : mêmes remarques que `(patient)/(tabs)/more.tsx` (chevrons sur actions, « Mes donneurs de soins »).
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\profile\menu.png` · 1.3 `%TEMP%\cary-qa\shots\profile\menu@1.3.png`. Critique : aucun défaut — même rangement corrigé que l'onglet Compte.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `profile/nurse/care-types.tsx` — ProfileNurseCareTypesScreen
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\profile\nurse__care-types.png` · 1.3 `%TEMP%\cary-qa\shots\profile\nurse__care-types@1.3.png` · err `%TEMP%\cary-qa\shots\profile\nurse__care-types@err.png`. Critique : aucun défaut — liste d'interrupteurs lisible.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `profile/nurse/coordinates.tsx` — ProfileNurseCoordinatesScreen
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\profile\nurse__coordinates.png` · 1.3 `%TEMP%\cary-qa\shots\profile\nurse__coordinates@1.3.png` · err `%TEMP%\cary-qa\shots\profile\nurse__coordinates@err.png`. Critique : aucun défaut — formulaire aligné, Enregistrer.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `profile/nurse/coverage.tsx` — ProfileNurseCoverageScreen
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\profile\nurse__coverage.png` · 1.3 `%TEMP%\cary-qa\shots\profile\nurse__coverage@1.3.png` · err `%TEMP%\cary-qa\shots\profile\nurse__coverage@err.png`. Critique : aucun défaut — carte, rayon, modification.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `profile/nurse/presentation.tsx` — ProfileNursePresentationScreen
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\profile\nurse__presentation.png` · 1.3 `%TEMP%\cary-qa\shots\profile\nurse__presentation@1.3.png` · err `%TEMP%\cary-qa\shots\profile\nurse__presentation@err.png`. Critique : aucun défaut — biographie, expérience, visibilité.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `profile/nurse/qualifications.tsx` — ProfileNurseQualificationsScreen
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\profile\nurse__qualifications.png` · 1.3 `%TEMP%\cary-qa\shots\profile\nurse__qualifications@1.3.png` · err `%TEMP%\cary-qa\shots\profile\nurse__qualifications@err.png`. Critique : aucun défaut — diplômes avec interrupteurs.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `profile/nurse/settings.tsx` — ProfileNurseSettingsScreen
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\profile\nurse__settings.png` · 1.3 `%TEMP%\cary-qa\shots\profile\nurse__settings@1.3.png`. Critique : aucun défaut — redirection voulue vers Présentation.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `profile/pharmacy-settings.tsx` — ProfilePharmacySettingsScreen
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\profile\pharmacy-settings.png` · 1.3 `%TEMP%\cary-qa\shots\profile\pharmacy-settings@1.3.png`. Critique : aucun défaut — modes de commande, jours, pause.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- États (2026-10-02) : erreur vérifiée sur planche `%TEMP%\cary-qa3\sheets\err-detail-0*.jpg` (identifiant inconnu ou API coupée) : message clair et « Réessayer ».
- [x] états (loading / vide / erreur)
- [x] validation finale

### `profile/preferences.tsx` — (inline)
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\profile\preferences.png` · 1.3 `%TEMP%\cary-qa\shots\profile\preferences@1.3.png`. Critique : aucun défaut — redirection vers « Mon profil ».
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `profile/security.tsx` — ProfileSecurityScreen
- Captures (patient, police 1.0) : `%TEMP%\cary-qa\shots\profile\security.png`
- Défauts :
  - P3 — aide « Facultatif : le code e-mail reste disponible » placée dans la card avant les champs. Fichier : `ProfileSecurityScreen`.
- Passe QA émulateur (2026-10-01, captures après `patient\security-after.png`, `pro\profile__security.png`) : biométrie, mot de passe facultatif (pro sans mot de passe) ou changement (patient). Aucun défaut en police 1.0.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\profile\security.png` · 1.3 `%TEMP%\cary-qa\shots\profile\security@1.3.png`. Critique : aucun défaut — champs alignés, action désactivée tant que vide.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `profile/settings.tsx` — AppSettingsScreen
- Captures (patient, police 1.0) : `%TEMP%\cary-qa\shots\profile\settings.png`
- Défauts :
  - P3 — descriptions trop longues (Standard / Agrandi).
  - P3 — « Taille du texte » en ligne dans la card alors que les autres titres de section sont hors card. Fichier : `AppSettingsScreen`.
- Passe QA émulateur (2026-10-01, captures après `patient\settings-after.png`, `pro\profile__settings.png`) : notifications, taille du texte, couleurs accessibles, version. Aucun défaut en police 1.0.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\profile\settings.png` · 1.3 `%TEMP%\cary-qa\shots\profile\settings@1.3.png`. Critique : aucun défaut — réglages groupés, version affichée.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale

### `profile/support.tsx` — SupportScreen
- Captures (patient, police 1.0) : `%TEMP%\cary-qa\shots\profile\support.png`
- Aucun défaut en police 1.0 (formulaire pré-rempli, action en bas). Reste : grande police.
- Passe QA émulateur (2026-10-01, capture après `pro\profile__support.png`) : nom et e-mail préremplis, motif, message, infos jointes repliées, action fixe. Aucun défaut en police 1.0.
- Passe auto (2026-10-01, `%TEMP%\cary-qa3\run.ps1`) : 1.0 `%TEMP%\cary-qa\shots\profile\support.png` · 1.3 `%TEMP%\cary-qa\shots\profile\support@1.3.png`. Critique : aucun défaut — formulaire court, action en bas.
- [x] capture avant
- [x] défauts listés
- [x] corrections
- [x] capture après
- [x] grande police (rien de coupé)
- [x] états (loading / vide / erreur)
- [x] validation finale


## Transverse — illustrations de soins (2026-10-01, agent pictogrammes puis agent illustrations)

Défaut QA : visuels de soins mélangés selon l'écran — illustrations 3D (`care-art`), SVG plats de quatre jeux différents (Lucide, Medical Icons, Health Icons, Covid) selon l'icône choisie par l'admin, image importée, et emojis calculés (`careEmojiForCareItem` / `careEmojiForLabel`, repli `📋`, emojis de filtres `catalogGroupFilterEmoji`).

- Critique :
  - P1 — trois styles graphiques dans la même liste (3D en couleur, pictogramme plat, image) : rendu « catalogue bricolé », contraire à la direction éditoriale médicale.
  - P1 — couverture 3D insuffisante : 26 illustrations pour 48 catégories actives en base QA (`GET /categories`, `oneandlab_test`) ; 34 retombent sur deux visuels génériques (`prise-de-sang`, `soins-infirmiers`), donc la moitié de la liste de réservation montre la même image.
  - P2 — puits turquoise (`textLink`) dans la liste de réservation : le turquoise est réservé aux actions et à la sélection.
  - P2 — détail RDV : ligne soin en `Row wrap`, un libellé long passait sous le pictogramme au lieu de revenir à la ligne.
  - P3 — emojis encore calculés côté mobile (champ `emoji` des lignes RDV, repli `📋`) et filtres emoji morts.
- Première décision (remplacée) : Lucide partout sur mobile, faute de couverture 3D.
- **Décision client (ferme) : une illustration 3D générée par catégorie, web et mobile.** 37 illustrations ajoutées pour couvrir toutes les catégories réelles (63 clés dans `CARE_ARTWORK_KEYS`) ; le visuel du type (`prise-de-sang` / `soins-infirmiers`) ne sert plus qu'à une catégorie inconnue. Les anciennes clés d'alias devenues des catégories à part entière (`injection-intramusculaire`, `injection-sous-cutanee`, `pansement-complexe`, `soins-de-plaies`) ont leur propre illustration.
- Corrections :
  - Map unique `CARE_ARTWORK_IMAGES` (`constants/care-artwork-images.ts`, une entrée `require` par clé) ; 26 PNG `assets/care-art` restaurés depuis HEAD, 37 nouveaux produits par `scripts/care-artwork/process.py` (sortie web + mobile rétablie).
  - Rendu unique `CareIcon` conservé (même API pour les 9 écrans migrés) mais pointé vers l'illustration de `careArtworkKey()` ; puits neutre `surfaceAlt` (36 pt, illustration 32 pt) en liste, illustration 20 pt à côté d'un libellé (16 pt dans les mini-tags compacts) ; toujours masqué aux lecteurs d'écran (`no-hide-descendants`) ; ligne soin du détail RDV toujours sans `wrap`.
  - Nom de catégorie du catalogue prioritaire sur le libellé dénormalisé du RDV (`careSourceFromCatalog`, `features/categories/utils/care-source.ts`). `care_categories.icon` et `image_url` ignorés sur mobile.
  - Supprimés comme code mort : map Lucide `care-icon.ts` et son test (remplacé par `src/lib/__tests__/care-source.test.ts`). Non restaurés : `CarePictogram`, `CareCategoryThumb`, `care-category-display` (emojis), `care-category-image`, `care-icons.json` + attributions (jeux SVG Medical / Health / Covid). Toujours retirés : champ `emoji` et repli `📋` de `rdv-catalog-lines`, `catalogGroupFilterEmoji`.
- À vérifier en capture : lisibilité des illustrations à 16 / 20 pt (mini-tags et lignes de détail), cohérence de style des 37 nouvelles illustrations avec les 26 existantes, aucun rognage dans le puits.
- Vues concernées (capture après à faire, police 1.0 et 1.3) :
  - [x] réservation, étape soins (`(patient)/(tabs)/book.tsx`, `(patient)/booking/new.tsx`, réservations infirmier / pro) — `CareSelectionStep` — vérifié 2026-10-02 (planches patient-1.3-02, nurse-1.0-01) : illustrations nettes, non rognées en 1.0 et 1.3.
  - [ ] réservation, panier (`SelectedServicesDetailSheet`) et contexte de planification (`BookingWizardSegmentContext`)
  - [ ] listes et cartes RDV, ordonnances, tournée infirmier — mini-tags `RdvCareTagsRow`
  - [x] détail RDV (tous rôles) — `RdvAppointmentInfoSection` — vérifié 2026-10-02 (planches patient-1.3-02, nurse-1.0-01) : illustrations nettes, non rognées en 1.0 et 1.3.
  - [ ] aperçu d'offre infirmier / préleveur — `OfferAppointmentPreviewBody`
  - [ ] passage infirmier, choix du soin — `PassageCareSection`
  - [ ] profil infirmier, soins proposés — `ProfileCareTypesSection` ; fiche publique d'un soignant — `ProviderPublicProfileSheet`
- `CareServiceQuickOptionsSheet` n'affiche aucun pictogramme (titre texte) : rien à changer.

## Pro / infirmier / labo — « Nouveau patient », patient déjà enregistré (2026-10-02)

Défaut signalé : « Utiliser ce dossier » ne fait rien. Reproduit sur emulator-5600 (pro, e-mail de Simone Leroy, patiente non rattachée au pro).

- Cause : `POST /patients/adopt` exige le consentement du patient quand le dossier n'est pas encore rattaché (`PatientProfessionalAccessService::adoptPatientForStaff`, `PATIENT_BOOKING_CONSENT_REQUIRED`) ; le contrôle mobile refusait l'action avant l'appel, mais la case de consentement et le message d'erreur étaient tout en bas de la sheet, sous les documents : rien de visible près du bouton.
- Correction : quand un doublon est détecté, la case de consentement et l'erreur sont rendues dans la carte « Patient déjà enregistré », juste au-dessus des actions (`PatientDuplicatePrompt` accepte `children`) ; sans doublon, elles restent en bas du formulaire. Jamais affichées deux fois.
- Vérifié après : sans case cochée, bordure rouge et message sous la case dans la carte ; case cochée → sheet fermée, Simone Leroy ajoutée à « Mes patients » (3 patients).
- Variante prise de RDV (`FormPatientSection`) inchangée : elle signale déjà le consentement manquant par toast.


## Prescription — aide « Que puis-je prescrire en tant qu'infirmier ? » (2026-10-02)

Défaut signalé : l'encart s'affichait aussi chez les pros médecins.

- Cause : la condition ne regardait que le type d'ordonnance (`nursing`), or `resolvePrescriptionKindForRole` renvoie `nursing` pour l'infirmier **et** pour le pro.
- Correction : règle unique `shouldShowNursePrescriptionScopeHelp` (`packages/shared-utils/src/nurse-prescription-scope.ts`), utilisée par le mobile (`PrescriptionComposer`) et le web (`PrescriptionSection.vue`) : rôle `nurse`, ou rôle `pro` avec l'emploi « Infirmier IPA » (`isProIpaEmploi`). Le backend renvoie désormais `emploi` aussi en scope mobile (`User::getById`, identifiants professionnels toujours masqués, test ajouté).
- Vérifié après : pro médecin (Pierre Medecin) → encart absent ; infirmière (Nina) → encart présent en tête de la prescription d'un RDV. Cas pro IPA couvert par le test unitaire `nurse-prescription-scope-help.test.ts` (pas de compte pro IPA en base QA).
- Point signalé, non modifié : un pro médecin rédige aussi une ordonnance de type `nursing` (`resolvePrescriptionKindForRole`).

## Connexion / inscription — code OTP (2026-10-02)

Défauts signalés : impossible de coller le code ; « le dernier chiffre s'efface ».

- Cause : `maxLength` coupait un collage contenant autre chose que 6 chiffres ; le « dernier chiffre qui s'efface » était un code refusé : le champ était vidé et l'erreur partait dans un toast tronqué.
- Correction (`OtpCodeStep`, `LoginFlow`, `RegisterScreen`) : saisie filtrée sur les chiffres puis limitée à 6, envoi automatique au 6ᵉ chiffre, erreur affichée en entier sous le champ (remplace l'aide), effacée à la saisie ou au renvoi du code.
- Vérifié après sur emulator-5600 : saisie chiffre par chiffre → connexion ; mauvais code → message complet sous le champ, champ vidé ; collage d'un texte contenant le code → 6 chiffres retenus → connexion.
- Sheets de connexion : plus de double évitement du clavier (`NativeSheetBody`, `KeyboardScrollView enabled={!fitToContents}`) : la sheet se pose juste au-dessus du clavier, sans vide ni contenu hors écran.

## Patient — commander en pharmacie depuis « Mes traitements » (2026-10-02)

Défaut signalé : le patient ne peut pas passer de commande pharmacie.

- Backend vérifié : `PharmacyModuleConfig::canOrder` inclut `patient` ; `PharmacyOrderService::create` accepte le patient pour lui-même (`isPatientSelf`). Seul le mobile bloquait (`newOrderHref` à `null` pour le patient).
- Correction : bouton « + » / « Commander en pharmacie » piloté par `can_order` du serveur ; route `(patient)/traitements/new` → `PharmacyOrderWizardScreen` en mode patient (bénéficiaire « Moi » ou un proche, pas de choix de patient, textes à la 2ᵉ personne, retour à « Mes traitements »).
- Vérifié après sur emulator-5600 (Alice) : Click & collect → Moi → Pharmacie du Vieux-Port → récap « Pour : Moi » → commande envoyée, en tête de « Mes traitements » ; en base : `requester_role = patient`, patient = demandeur, `en_attente`.

## Binôme infirmier, messages pharmacie, remplacer une ordonnance (2026-10-06) — QA émulateur en attente

Vues ajoutées ou modifiées, sans capture avant / après à ce stade (QA émulateur faite par l'utilisateur) :

- Fiche RDV infirmier : section « Infirmiers » (lignes confrères avec avatar + portée, « Ajouter un confrère ») ; vue confrère « Partagé par X » + « Me retirer », sans Partager / Redispatcher / Annuler. À vérifier : troncature des noms longs, bouton « Retirer » en grande police.
- Sheet « Ajouter un confrère » : recherche → résultat → portée en segments pleine largeur → deux sélecteurs de date pour une période. À vérifier : hauteur de la sheet avec clavier ouvert, segments à 3 libellés en grande police.
- Tournée : icône « Confrères et remplacements » en tête de l'en-tête, sheet « Confrères » (vide : « Aucun partage en cours ») ; mention « Avec X » / « Partagé avec vous » sur les arrêts. À vérifier : nombre d'icônes d'en-tête sur petit écran.
- Fiche passage : section « Infirmiers » avec portée « Toute la série » ; suppression masquée pour le confrère.
- Fiche commande pharmacie : ligne « Messages » + compteur à la place de la conversation ; nouvelle vue Messages (bulles, composer, « Conversation fermée pour cette commande. »), défilement au message notifié.
- Patient : « Ordonnances » d'un traitement ouvre `(patient)/traitements/[id]/ordonnances`.
- Remplacer une ordonnance : bouton « Remplacer » sur l'ordonnance (documents RDV, historique, commande) → fichier → confirmation → toast « Ordonnance remplacée ».

Web (même périmètre) : panneau « Infirmiers » sur la fiche RDV et la fiche passage infirmier, bouton « Confrères » sur la tournée (`?date=`), pages Messages des commandes (pro envoyées / reçues, infirmier, patient, admin en lecture seule), page ordonnances patient, « Remplacer » sur les ordonnances.
