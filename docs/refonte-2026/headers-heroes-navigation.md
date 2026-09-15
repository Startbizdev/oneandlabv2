# Headers, héros et navigation — 15 septembre 2026

- Header public : libellés courts, sous-menus accessibles au clic, header simplifié sur `/rendez-vous`.
- Menu mobile reconstruit avec un dialogue natif : arrière-plan inerte, Échap, retour du focus, défilement indépendant, fermeture au changement de route et au passage desktop. Compte, notifications, connexion et destinations conservés.
- Héros partagés : titres et descriptions raccourcis, typographie et espacements adaptés, CTA principal distinct, images moins hautes sur mobile. Accueil, patients, infirmiers, laboratoires, professionnels et tarifs concernés.
- Headers des espaces : titres plus compacts, descriptions mesurées, actions qui passent à la ligne.
- Wizards : titres sans répétition des soins, repère du rendez-vous courant, retour textuel et action principale de 48 px, marge de sécurité en bas.

## Vérification

Compilation de production réussie. Recette Chromium sur données fictives : 53 scénarios uniques validés à 360, 768 et 1440 px. Les 51 scénarios de réservation, espaces et pages publiques passent dans `verification-headers-browser.log`. Les deux tests de navigation passent dans `verification-navigation.log`, après correction d’une assertion qui confondait le focus de la barre du navigateur avec le focus de la page derrière un dialogue natif.

Captures inspectées : `captures/hero-refonte-1440.png`, `captures/hero-refonte-360.png`, `captures/menu-refonte-360.png`, calendrier mobile dans les résultats Playwright. Aucun test sur téléphone physique effectué pour ce lot.

Localhost a été relancé sur la compilation actualisée, avec l’API Cary habituelle. Aucun déploiement ni changement de données de production pendant la recette.
