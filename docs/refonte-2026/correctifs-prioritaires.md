# Correctifs prioritaires — 15 septembre 2026

## Création de rendez-vous

- Une clé client persistée par compte retrouve le même identifiant après perte de réponse. Clé et rendez-vous sont enregistrés dans la même transaction MySQL ; les appels concurrents attendent le verrou unique.
- Réutiliser la clé avec un contenu différent produit un refus 409. Une réponse déjà finalisée est renvoyée sans répéter le traitement normal après création.
- Clés conservées par les formulaires web/mobile lors des reprises : lots, création mobile simple et reprogrammation. Le patient déjà créé dans le formulaire mobile est aussi conservé.
- Migration **107_appointment_creation_requests.sql à appliquer avant le déploiement du backend et des clients**. Aucune migration ni écriture de production exécutée ici. Les anciennes applications sans clé conservent leur comportement antérieur.
- Limites : le rechargement ou la fermeture du formulaire perd sa clé locale ; les anciennes applications sans clé ne bénéficient pas de cette garantie. La remise des notifications après un arrêt brutal reste un sujet distinct. Les essais de concurrence utilisent la garde réelle et des écritures synthétiques, pas deux requêtes HTTP authentifiées complètes.

## Calendrier

- Toute la dernière journée du mois figure dans la liste.
- Regroupement, sélection du jour, affichage et déplacement du calendrier web suivent les dates françaises, y compris les dates ISO avec décalage.
- Heures et dates de reprogrammation corrigées sur web/mobile. Tris mobiles et export de tournée utilisent les instants français.
- Les adresses objet du calendrier utilisent leur libellé lisible.

## Vérifications

- 15 assertions MySQL : concurrence, réponse perdue, conflit de contenu, isolation des comptes, rollback et état de réponse.
- 21 assertions de reprise de formulaire ; 104 assertions de dates et créneaux dans trois fuseaux.
- 236 assertions PHP locales ; typage web et contrôle mobile réussis (0 erreur, 86 avertissements).
- Exports iOS/Android réussis.
- 54 scénarios navigateur ciblés réussis en deux exécutions : 50 parcours existants avec dossiers fictifs et 4 cas de fin de mois à Dubaï/Los Angeles, en 360/1440 pixels. La correction visuelle d’adresse est également validée : quatre scénarios repassés sur la compilation finale et capture contrôlée.

## Recette mobile physique

Aucun appareil ni émulateur Android accessible via ADB ; SDK Android absent des emplacements habituels. Les exports ne remplacent pas les essais sur téléphone : clavier, navigation tactile, permissions de localisation, caméra et fichiers restent à vérifier sur appareil. La recette exhaustive de chaque action de chaque vue n’est pas déclarée terminée.
