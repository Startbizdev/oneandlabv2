# Recherche, calendrier et déploiement — 15 septembre 2026

- Recherche admin : annulation des requêtes dépassées, réponse la plus récente uniquement, suppression du double appel lors du retour en page 1.
- Recherche patients infirmier/pro : un seul chargement initial, debounce 220 ms, annulation des recherches précédentes.
- Audit des profils : INSERT groupés par 250 ; un enregistrement distinct par profil, avec acteur, champs, date et contexte réseau conservés. Aucun index de données personnelles en clair ajouté.
- Calendriers partagés : état isolé par écran, affichage progressif, pages de 250 et chargement de toutes les pages. La vue API calendrier conserve les filtres d’autorisation et évite les enrichissements de cartes inutilisés (avis, photos, regroupements de soins).
- Notifications et dispatch : créneaux JSON rendus via le formateur partagé, notamment 8h00 - 10h00 et 15h00 - 20h00.

## Vérifications

Build et typecheck Nuxt réussis. 13 tests navigateur réussis : recherche concurrente, première page visible pendant le chargement de la suivante, fin de mois dans deux fuseaux à 360/1440 px, notifications et dispatch. Test SQLite : 503 traces d’accès individuelles conservées dans trois lots. Syntaxe PHP vérifiée.

La recherche textuelle admin conserve son balayage des profils chiffrés et sa limite historique de 5 000 candidats ; aucun engagement de latence sur de gros volumes sans mesure réelle. Recette téléphone physique non effectuée.

## Mise en production

`buildscriptoneandlab.sh` utilise désormais un build local et une activation préparée dans `/var/lib/oneandlab-releases`, hors racine HTTP. Les anciens fichiers restent disponibles pour retour arrière. Les répertoires de documents, stockage, clés et dépendances sont conservés par liens vers la version précédente. Seule la migration additive 107 est exécutée avant activation ; les anciennes migrations de transformation ne sont pas rejouées.

Sauvegarde préparatoire : 77 tables, archive 96 312 341 octets. Copie locale indépendante vérifiée par SHA-256, lecture gzip complète, 77 CREATE TABLE et marqueur de fin mysqldump. Ce contrôle ne remplace pas une restauration complète d’essai. L’activation doit encore confirmer les contrôles applicatifs et le maintien des tables/comptages ; sa réussite est consignée séparément.

L’erreur Chrome `reportAllChanges/startTime` correspond à la trace du script de mesure injecté par DevTools, absente des bundles Cary : https://github.com/GoogleChrome/web-vitals/issues/792. Aucun masque global des erreurs ajouté à l’application.
