# Emails Cary

L’ensemble des emails transactionnels partage désormais la même identité : logo Cary, primaire #1CC7B5, titres vert foncé, fond clair, carte arrondie et boutons contrastés. Les anciens réglages bleus sont remplacés par le turquoise. Les liens par défaut pointent vers cary.bio. Les adresses SMTP et de réponse existantes sont conservées.

Couverture : accueil, connexion, mot de passe (lien/code et notifications administrateur), inscription acceptée, demande de rendez-vous simple/multiple, confirmation simple/multiple, annulation, demande professionnelle par rôle, attribution préleveur, résultats, avis, incidents, suspension, fermeture de compte, alertes administrateur et contact.

Les variables, récapitulatifs, motifs, délais et destinations d’action sont conservés. Les textes d’attente de prise en charge ne promettent plus un délai non garanti. Une alternative texte accompagne le HTML et conserve les URL des actions.

Validation : `php backend/tests/email-brand-standalone.php` contrôle 24 variantes sans aucun envoi SMTP. Contrôles navigateur sur 48 rendus à 320 et 600 px, avec vérification des débordements et du chargement du logo ; inspection visuelle du code de connexion et de la confirmation. Structure en tables et styles intégrés ; Outlook et Gmail natifs n’ont pas été testés directement.

Ce lot ne modifie ni le schéma ni les données de la base. Déploiement ciblé du moteur Email.php avec sauvegarde de la version précédente.
