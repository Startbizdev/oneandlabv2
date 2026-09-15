# Refonte Cary — suivi du 15 septembre 2026

> Mise à jour des trois priorités demandées : voir [correctifs-prioritaires.md](correctifs-prioritaires.md), notamment la migration 107, les calendriers corrigés et les limites de recette mobile. Les constats plus anciens ci-dessous décrivent aussi les étapes précédentes.

## Périmètre et état réel

Travail en cours sur la webapp Nuxt, l’app React Native et les parcours associés. L’inventaire compte 122 pages web, 127 fichiers de routage mobile, 156 composants Vue et 440 composants/écrans TSX. Une amélioration partagée ne constitue pas une recette complète de toutes les pages.

La couleur #1CC7B5, le logo, les scripts de synchronisation et les modifications préexistantes sont conservés. Aucun déploiement, changement de prix, migration ou écriture de production n’a été effectué.

## Modifications réalisées

- Système visuel partagé : fonds sobres, contraste des boutons, tailles tactiles, titres, tableaux, états vides, cartes de rendez-vous et navigation responsive pour tous les rôles.
- Sélection multisoins web/mobile avec pictogrammes et filtres compacts ; géolocalisation compacte en consultation, carte plus grande en édition.
- Tableaux de bord, calendrier, recherche patients avec gestion des erreurs et réponses obsolètes, tournée infirmière avec reprise après erreur.
- Messagerie mobile avec clavier, téléchargement authentifié, contrôle de l’envoi et route préleveur dédiée.
- Bibliothèque de documents patient : API limitée au patient, appels authentifiés, ajout et suppression confirmée ; séparation des documents du titulaire et des proches lors des copies.
- Offres infirmier et laboratoire présentées par des composants communs ; gratuit conservé ; conditions d’essai explicites. Gestion mobile dirigée vers la source de facturation, sans badges superposés.
- Backend Checkout : contrôle des offres autorisées, refus d’un second abonnement courant, essai unique selon l’historique, réutilisation d’une requête Checkout identique.
- Accueil et pages commerciales : sections simplifiées, texte orienté parcours, FAQ accessible et données structurées, canonical, robots et sitemap des pages publiques principales. Les espaces privés sont noindex.

## Intégrité des rendez-vous

Les créations du rendez-vous, de ses actes et de ses journaux utilisent désormais une transaction commune. L’exécuteur du brouillon payé partage cette connexion et garde le verrou jusqu’au commit, aussi bien pour Stripe que pour IAP. Les notifications sont différées après commit. Un échec conserve un état permettant une nouvelle tentative. Un champ JSON client `paid: true` ne vaut plus preuve de paiement.

Le modèle existant est conservé : lots via creation_batch_id, actes multiples et anciens rendez-vous fusionnés. Ne pas confondre plusieurs actes au même passage, passages récurrents et anciens lots.

### Limites à résoudre avant remplacement en production

- Les tests SQLite de rollback ne remplacent pas une simulation MySQL avec deux webhooks concurrents et des reçus IAP de test.
- Les nouvelles copies de fichiers sont suivies et nettoyées après rollback, et une pièce manquante fait échouer la tentative au lieu de finaliser un dossier incomplet. Un arrêt brutal du processus peut encore laisser des fichiers orphelins ; prévoir une réconciliation.
- Les créations ordinaires disposent désormais d’une reprise en mémoire du formulaire (web/mobile), avec conservation des identifiants et pièces déjà envoyées. Une réponse réseau perdue ou un rechargement nécessite toujours une idempotence serveur persistée.
- Un arrêt du processus après commit et avant notification n’est pas compensé par une file transactionnelle persistante.
- Tester les paiements différents utilisant une même transaction IAP, les renouvellements et les droits acquis en préproduction.

## Audit de production en lecture seule

`backend/scripts/audit-booking-readonly.php` a été exécuté via SSH sur le serveur autorisé, dans une transaction READ ONLY terminée par ROLLBACK. Le résultat local `audit-production-agrege.json` ne contient que schéma et agrégats, sans identité ou document médical.

Constats : 42 lots multirendez-vous, aucun lot partagé entre plusieurs patients dans le contrôle réalisé, aucun acte orphelin ni parent fusionné manquant. 14 brouillons pending_payment ; aucun brouillon completed à auditer. Aucun doublon d’abonnement actif dans l’agrégat contrôlé. Ces résultats ne prouvent pas l’absence de concurrence future.

## Vérifications

- Build Nuxt réussi après les dernières corrections des passages infirmiers, le nettoyage et la correction du typage.
- Mobile : TypeScript, règles de layout/styles et ESLint passent avec 0 erreur et 86 avertissements existants. Les bundles iOS et Android ont été exportés après les corrections des profils, formations et horaires. Ce ne sont pas des binaires signés ni une recette sur appareil.
- Navigateur : 244 scénarios réussis ensemble en 5 min 36 s sur la compilation finale isolée, couvrant les parcours documentés dans l’inventaire. L’ancien scénario nécessitant un compte réel est exclu, comme indiqué dans verification.md.
- Calendrier mobile : 14 assertions couvrent les 51 rendez-vous sur deux pages, les dates et filtres, une page en échec et les réponses répétées ou invalides.
- Données historiques d’édition : 13 assertions pour les adresses objet/texte/JSON, les coordonnées absentes, disponibilités et options de soin.
- PHP : 236 assertions SQLite/locales réussies ensemble, plus 75 assertions MySQL 8.4 sur données fictives (quota concurrent, unicité des reçus, modifications concurrentes des actes, effacement des champs facultatifs, limites de mois et fuseaux). Syntaxe des fichiers modifiés vérifiée.
- Administration : 19 assertions JavaScript couvrent la réhydratation, le corps PUT des actes, les fichiers binaires et l’horaire indépendant du fuseau du navigateur.
- Reprise des documents mobile : 7 assertions vérifient la fusion des fichiers et la reprise sans renvoyer les pièces déjà acceptées.
- Reprise de création partielle : 16 assertions couvrent le deuxième RDV en échec, la reprise sans doublon, les pièces déjà envoyées et une nouvelle demande distincte.
- Géométrie de couverture : 17 assertions précédemment réussies.

Les réponses API des tests navigateur sont fictives. Aucun rendez-vous ni paiement réel n’est soumis. Aucun test sur appareil iOS ou Android n’est encore réalisé. La compilation Nuxt ne remplace pas un contrôle TypeScript intégral des templates. Ce contrôle passe désormais sans erreur, contre 801 diagnostics au début de cette passe ; aucun contournement global du typage n’a été ajouté. Commande reproductible : `npm run typecheck --workspace=oneandlab-frontend`.

## Travail restant

Recette des vues remplies et détails de chaque rôle, formulaires de création et modification, parcours multi-passages complets, vérification native sur appareil, simulation des paiements concurrents, reprise des fichiers médicaux, compléments SEO des profils/villes, analyse des fichiers réellement inutilisés et validation en préproduction. Le travail ne doit pas être présenté comme une refonte complète livrée tant que ces vérifications restent ouvertes.

## Corrections complémentaires vérifiées ou en recette

- Actions de modération et fenêtres des avis rétablies ; une même page de réponse sert infirmier, laboratoire et sous-compte. Le texte reste disponible après refus de l’API, et la pagination des avis est accessible.
- Calendrier : déplacement enregistré via l’API uniquement pour les rôles autorisés, filtre d’équipe conservé. Recette réussie : toutes les pages de rendez-vous du mois et navigation du 31 janvier vers février.
- Les tableaux de soins récurrents ne doivent pas inventer une durée de sept jours ni une fréquence quotidienne ; les visites uniques sont exclues.
- Modification administrateur : conservation des adresses historiques, des créneaux, de la durée, de la fréquence et des options. Un document refusé laisse le formulaire ouvert pour reprendre ; les fichiers déjà acceptés dans cette session sont mémorisés.
- Édition des actes : rendez-vous, tables des actes et journal partagent une transaction. Les identifiants et sources historiques des lignes conservées restent stables. Les tests SQLite vérifient l’isolation et le rollback ; 26 assertions MySQL supplémentaires exécutent le vrai modèle de modification avec deux connexions concurrentes, formulaire chiffré, actes et journal.
- Horaires modifiés : une heure saisie est transmise comme heure locale France, sans conversion par le fuseau du navigateur ; les instants explicitement zonés sont convertis côté API vers Europe/Paris.
- Tableaux de bord laboratoire/sous-compte : toutes les pages de la journée et des demandes en attente sont chargées séparément. Les statistiques indisponibles ne sont plus présentées comme zéro.
- Journal et QR codes : détails de tableau rétablis, erreurs avec reprise, recherche des QR au-delà des 100 premiers profils ; sélection d’adresse au clavier et cible tactile nommée pour modifier l’adresse.
- Annuaires locaux : profils rendus en HTML serveur, pagination après 24 profils, erreur distincte d’un résultat vide et HTTP 503 en cas d’indisponibilité.
- Profils publics : chargement SSR partagé, canonical sans paramètres de campagne, JSON-LD limité aux données publiques, HTTP 404 pour un profil absent et 301 pour un ancien slug. Images et liens de réservation conservés. Le nouveau formulaire d’avis interroge l’historique du patient connecté, et contrôle la réussite de l’envoi.

### Sources de vérification des textes et du référencement

- [Ameli — actes et déplacements à domicile](https://www.ameli.fr/infirmier/exercice-liberal/facturation-remuneration/tarifs-conventionnels/actes-domicile) : formulation conditionnelle de la prise en charge.
- [Google — JavaScript et référencement](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics) : contenu rendu et traitement des pages indisponibles.
- [Google — URL canoniques](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls) : conservation d’une URL de référence. Aucun classement ou résultat enrichi n’est garanti.

### Recette des données publiques

Démarrer `node frontend/e2e/fixtures/public-api-server.cjs` (écoute locale 8889), puis le serveur de prévisualisation avec `NUXT_PUBLIC_API_BASE=/api` et `NUXT_API_INTERNAL_BASE=http://127.0.0.1:8889/api`. Les tests `public-directory.spec.ts` et `public-profile.spec.ts` utilisent uniquement ces profils synthétiques. Ne pas utiliser cette origine fictive pour un déploiement.

## Nettoyage et contrôles des composants

- 33 composants Vue abandonnés retirés après analyse des références, sans suppression de page ou route mobile. Liste conservée dans `composants-retires.json` ; analyse reproductible par `scripts/audit-unused-web-components.mjs`.
- Types des composants Nuxt UI remis en accord avec la version installée ; options de formulaires, documents et données historiques corrigées.
- Passages infirmiers : 13 fenêtres passent au slot de contenu actuel ; les notes sont sérialisées depuis leur valeur. Une réponse API en échec conserve la fenêtre et la saisie. Création, modification après refus API et date de naissance validées dans la recette des 148 scénarios. Les deux scénarios de reprise de chargement passent également dans la recette de 150 scénarios.

- Laboratoire Pro : conservation du `null` signifiant illimité dans les limites affichées et les contrôles de création de préleveurs/sous-comptes. Gratuit et Starter gardent leurs limites respectives. Syntaxe PHP vérifiée ; contrôle avec abonnement réel à faire en préproduction.
- Anti-doublon staff : comparaison complète de la demande à partir d’une empreinte calculée côté serveur et conservée dans les données chiffrées. Deux proches, soins, doses ou lots différents au même créneau ne sont plus fusionnés par la seule proximité temporelle. 16 assertions. La fenêtre reste de 45 secondes et ne constitue pas une idempotence durable/concurrente.
- Mobile passages : une ordonnance refusée ne recrée plus les passages déjà confirmés durant la même session ; 15 assertions couvrent la reprise, une demande modifiée et deux envois simultanés. Sans rendez-vous matérialisé, le document est enregistré dans la bibliothèque du patient. États d’erreur et reprise ajoutés au chargement du patient, du passage et des documents.

- Accès : une vérification d’email indisponible ne redirige plus vers une inscription ; les retours API des demandes et réinitialisations de mot de passe sont vérifiés. Recette des codes commençant par zéro ajoutée.
- Administration des assistants : réglages lisibles, champs nommés, refus d’enregistrement conservant la saisie et actions en cours désactivées. Un export refusé ne démonte plus tout le formulaire.
- Annuaires nationaux : chargement SSR partagé avec les pages par ville, API interne configurable, reprise d’erreur et canonical complet. Les erreurs réseau publiques n’affichent plus les instructions de démarrage du backend. Compilation et recette des 157 scénarios réussies.

- Notifications administrateur : filtres compatibles avec Nuxt UI, reprise après erreur des listes, conservation des sélections, pagination complète des destinataires et envoi bloqué si cette liste est indisponible. Dix assertions de pagination et deux tests navigateur ; aucun email réellement envoyé.
- Abonnements : erreur de chargement distincte du pack gratuit, nouvelle souscription bloquée pendant la vérification, abonnés existants dirigés vers la gestion depuis les tarifs publics. Les achats Apple/Google se gèrent sur leur service respectif, y compris depuis le web. Six tests navigateur supplémentaires.
- API mobile des abonnements : chemin du bootstrap corrigé et contrôle local de méthode HTTP effectué sans base de données. La réponse web expose la source de facturation déjà stockée. Syntaxe PHP vérifiée.
- Achats mobiles : réponse serveur explicitement vérifiée avant de terminer une transaction ; chargement d’abonnement en échec réessayable ; restauration refusée non assimilée à une absence d’achat. Vérification TypeScript/styles/ESLint et exports iOS/Android réussis, sans recette native ni achat sandbox.
- Pages publiques : 26 contrôles supplémentaires couvrent les pages commerciales, inscriptions, contact et textes légaux à 360 et 1440 pixels.
- Synchronisation des profils : un rendez-vous pour un proche ne recopie plus sa naissance, son genre ou son adresse sur le titulaire du compte. Même règle pour les brouillons payés. Huit assertions couvrent cette séparation et les anciens formats d’adresse.
- Administration : suivi « À traiter » des paiements et synchronisations ; catalogues, inscriptions et historique des notifications réessayables. Valeurs de visibilité normalisées, brouillons conservés, destinataires chargés sur toutes les pages. Dix scénarios passent dans la recette globale des 201 tests.
- Retours de paiement : vérifications séquentielles et annulables, reprise manuelle, distinction entre demande enregistrée, session expirée et API indisponible. Aucun état réseau ne prouve à lui seul qu’un paiement a été encaissé ou qu’un professionnel a accepté le rendez-vous.
- Liens partagés et QR : reprise après erreur, affichage complet des lots, noindex, suppression des formulations de rareté artificielle, redirection serveur relative conservant les paramètres d’attribution au professionnel.
- Disponibilités : retrait des reflets dorés animés, palette Cary et sélection accessible au clavier ; libellé « Horaire prioritaire », prix conservé, confirmation du professionnel explicitée. Même présentation et libellé sur mobile ; les identifiants de produit et de disponibilité restent compatibles.

- Quota infirmier : un calcul partagé entre affichage, confirmation et réaffectation exclut les demandes en attente, annulées, refusées ou expirées. La reconfirmation du même rendez-vous ne consomme pas une place supplémentaire ; mois calculés en Europe/Paris. Douze assertions locales, complétées par les contrôles MySQL de concurrence et de fuseaux décrits ci-dessous.


- Tutoriels : progression visible, navigation par rôle, conservation du lien infirmier uniquement pour ce rôle, sortie possible lorsque le stockage local est indisponible. Contenu mobile défilable, étapes voisines masquées aux lecteurs d’écran. Cinq scénarios web réussis.
- Liens de notification : espaces professionnel, sous-compte, laboratoire, infirmier et préleveur conservés indépendamment du soin ; rôles de destinataires maintenus lors des renvois administrateur. Dix-sept assertions email/SMS avec transport fictif, aucun message réellement envoyé.
- Réservation des équipes : reprise du catalogue, des listes paginées, des profils et des affectations ; une réponse tardive ne remplace plus le patient choisi. Six scénarios navigateur sur quatre rôles et deux annuaires ; 16 assertions de pagination web/mobile.
- Sélection mobile : identité et adresse appliquées ensemble après chargement complet, reprise d’erreur, invalidation des anciennes réponses. Quatorze assertions sur réponses et géocodages retardés, changement de patient, reprise et démontage du formulaire. Le typage et les contrôles de styles passent avec 86 avertissements existants.

- Documents de réservation : changement de personne invalidant les réponses tardives et les pièces précédentes ; erreur réessayable distincte d’une bibliothèque vide, sur le web et le mobile.
- Proches : formulaires conservés après refus, ajout vierge après modification, erreurs de chargement réessayables et suppression reprise sans fermeture prématurée. Les champs facultatifs peuvent être explicitement effacés ; le journal ne recopie plus leurs valeurs. Douze assertions PHP, neuf assertions du service mobile et deux scénarios navigateur à 360/1440 pixels.
- Gestion des abonnements : un abonnement actif est sélectionné avant un ancien contrat annulé, avec filtrage de la source pour le portail Stripe. Onze assertions locales ; aucun appel de facturation réel.
- Dernier contrôle mobile : vérification TypeScript/styles/ESLint réussie (86 avertissements existants), exports JavaScript iOS et Android réussis. Ces exports ne sont pas des binaires signés et ne remplacent pas une recette sur appareil.
- Date de naissance web : mois lisible à 360 pixels et sélecteurs remis à zéro lors du passage à un nouveau patient, sans effacer un jour en cours de saisie. Six scénarios équipes/annuaires repassés après compilation et TypeScript sans erreur.
- Démonstration de tableau : `/admin/test-table` limitée au développement et à l’administrateur, HTTP 404 vérifié sur la version compilée.
- Couverture native : création du premier secteur rétablie, réponses API refusées traitées comme erreurs, brouillon conservé après échec et limites indisponibles réessayables. Dix assertions sur le service de couverture ; typage/styles/ESLint sans erreur. Interaction de la carte sur appareil encore à vérifier.
- Offre laboratoire gratuite rendue visible, avec accès direct à l’espace pour les comptes connectés. Distinction Starter/Pro fondée sur la taille de l’équipe ; prix et droits existants conservés.
- Audit commercial de production en lecture seule : volumes agrégés et limites d’interprétation dans `audit-commercial-agrege.json` et `offres-et-activation.md`. Mois incomplet, aucun MRR réel déduit des prix affichés. Les bannières Pro deviennent contextuelles à partir de 80 % du quota infirmier ou dans les espaces d’équipe laboratoire.
- Confirmation des lots : statut, offres retirées, historique et journaux partagent une transaction. Vingt-quatre assertions sur le vrai modèle vérifient le rollback des lots infirmier/laboratoire/préleveur après échec du journal ou dépassement du quota.
- Quota concurrent : verrou de profil partagé entre confirmation infirmier et réaffectation, puis contrôle du résultat complet avant commit. Quinze assertions locales, dont refus avant écriture d’une transaction préexistante pouvant contenir un ancien instantané. Quatorze assertions MySQL 8.4.8 en REPEATABLE READ vérifient deux connexions concurrentes avec une place restante : une réussite, un refus, compteur à dix, affectation et historique du refus restaurés. Test sur la garde partagée et des écritures synthétiques, pas sur des requêtes HTTP authentifiées ni des paiements.
- MySQL de recette : archive officielle Oracle dans le répertoire temporaire Windows `oneandlab-mysql-8.4.8`, instance liée à 127.0.0.1:13316, données fictives uniquement, sans service Windows installé. L’extension PDO MySQL est activée pour la commande de test, sans modification du php.ini.

- Quota et fuseaux : production en UTC, historique en TIMESTAMP ; comparaison des instants d’acceptation avec les limites du mois français. Douze assertions MySQL couvrent trois fuseaux de connexion et le changement d’heure.
- Reçus IAP : index unique existant vérifié en production en lecture seule ; conflit explicite 409 et rollback conservés. Dix assertions MySQL concurrentes utilisent les migrations existantes, sans appel aux stores ni paiement réel.
- Profils natifs : chargement réessayable, réponses API et identité contrôlées, indicateurs historiques normalisés, champs facultatifs effaçables. Les brouillons survivent aux actualisations du profil ; cache complet séparé du profil compact avec invalidation commune. 20 assertions API, 13 sur les brouillons, six sur le cache et 13 MySQL sur les champs facultatifs.
- Formations natives : sauvegardes sérialisées par compte, annulation des anciens délais avant une modification immédiate, rejet d’une écriture en attente après changement de compte. Huit assertions utilisent le moteur réel des mutations TanStack. Vérification mobile sans erreur et exports iOS/Android réussis ; aucune recette sur appareil.

- Administration des secteurs et attributions : corrections des recherches obsolètes, erreurs avec reprise, sélection de tous les infirmiers paginés, conservation des brouillons et contrôle des réponses de sauvegarde. Dix assertions sur les requêtes d’attribution et 11 sur la géométrie ; cinq scénarios navigateur réussis à 360 et 1440 pixels, dont la sélection du 101e infirmier et la reprise du profil indisponible.
- La portée maximale du secteur redimensionne le tracé, et le déplacement du centre conserve les directions de ses points. Dans le formulaire, la carte prépare la modification ; seul l’enregistrement du formulaire la persiste.

- Statistiques du laboratoire : la période « Ce mois » exclut les mois futurs et respecte le calendrier français. Dix-sept assertions couvrent les bornes, le changement d’heure et les dates manquantes. La page distingue une API indisponible d’une activité nulle, affiche la durée inconnue par un tiret, et réutilise la carte de rendez-vous commune en conservant équipe, adresse, récurrence et notes. Deux scénarios navigateur réussis à 360/1440 pixels, avec les détails et l’horaire français visibles.

- Durées historiques : le libellé d’une série de prélèvements accepte nombres et textes (12 assertions). La planification web/mobile partage désormais la conversion des durées (30 assertions), y compris les durées personnalisées, sans convertir un nombre invalide en nombre de passages.

- Création de patients : après création du compte, un échec de document conserve son identifiant et les fichiers restants dans le formulaire monté. La reprise ne recrée pas le patient et ne renvoie pas les pièces déjà confirmées. Quatre scénarios pro/lab à 360/1440 pixels ; ce mécanisme ne couvre pas une réponse de création perdue ni un rechargement de page.
- Chargement des dossiers : erreurs de profil et de proche réessayables sans retour éditable au titulaire ; bibliothèque indisponible distincte d’une bibliothèque vide. Les réponses obsolètes des pièces jointes et historiques sont ignorées. Le changement de mode de la page initialise un formulaire vierge. Quatre scénarios supplémentaires couvrent les échecs de fiches, la reprise des documents et le changement de patient pendant une réponse différée.
- Dates web et mobile : DATETIME sans fuseau interprété comme une horloge française, ISO avec décalage conservé comme un instant. Les créneaux historiques gardent leurs minutes. 95 assertions sur les vrais adaptateurs web/mobile et les passages infirmiers, sous trois fuseaux du terminal. Typage et compilation web, vérification mobile (0 erreur, 86 avertissements) et exports iOS/Android réussis.
- Compteurs laboratoire : requête limitée aux champs de reporting, sans lecture des dossiers cliniques pour stats_only=1 ; noms d’équipe chargés en groupe. Les anciens rendez-vous fusionnés sont exclus comme dans la liste. Seize assertions SQLite vérifient le périmètre d’équipe, les fusions, l’absence de chargement clinique et la compatibilité des détails. La vue détaillée complète conserve encore un chargement par rendez-vous.

## Points repérés à la clôture, non corrigés dans cette livraison

- Des calculs de date restent locaux au terminal dans le calendrier web, la reprogrammation et des tris de listes. Le correctif partagé de créneau ne couvre pas encore tous ces appels. Le filtre de liste mensuelle du calendrier utilise aussi une borne au début du dernier jour ; les rendez-vous ultérieurs de cette journée demandent une correction et une recette ciblée.
- La création ordinaire conserve un risque de doublon lorsque le serveur a créé le rendez-vous mais que sa réponse est perdue ; les reprises en mémoire ne remplacent pas une clé de création persistée et un traitement des opérations après création.
- Aucune recette physique des 127 routes mobiles, aucun achat sandbox Apple/Google et aucune garantie de non-régression exhaustive ne sont fournis par les exports et tests locaux.
