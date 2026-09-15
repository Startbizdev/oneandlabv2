# Nouvelle composition des héros publics

Ce lot remplace la composition précédente, au-delà des ajustements de texte et d'espacement : titre centré sur deux niveaux, action principale, bandeau panoramique avec parcours éditorial sur fond vert profond, photo et bénéfices sur une ligne. Adaptation en pile sur mobile. Contenu du parcours spécifique à chaque public.

Pages : accueil, patients, infirmiers, laboratoires, professionnels, contact et les deux pages tarifs. Aucun espace métier modifié dans ce lot.

TypeScript et compilation réussis. 26 scénarios publics validés : 23 dans `verification-public-hero-browser.log`, puis 3 contrôles de rendu Contact dans `verification-public-hero-contact.log`. La page Contact n'a pas de canonical dans sa configuration actuelle ; cette lacune antérieure n'est pas corrigée par la refonte visuelle et reste à traiter séparément. Les tests ajoutés pour Contact vérifient le rendu du héros, sans exiger cette métadonnée.

Captures inspectées : `captures/hero-nouvelle-composition-home-1440.png`, `captures/hero-nouvelle-composition-home-360.png`, `captures/hero-nouvelle-composition-labs-1440.png`. Recette en navigateur avec données fictives, sans écritures en production. Localhost a été relancé sur la nouvelle compilation avec son API habituelle.
