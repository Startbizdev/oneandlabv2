# Annuaires et réservation

- `/infirmiers` et `/laboratoires` : variante de héros dédiée aux annuaires, illustration CSS, recherche par ville et accès direct à la réservation. Le champ utilise le filtre `city` déjà présent dans l’API, avec remise à la première page et effacement du filtre. Il s’agit d’une correspondance de ville, pas d’une recherche géographique par distance.
- `/rendez-vous/nouveau` : header du layout patient adapté au parcours, logo agrandi, repère Rendez-vous, commandes de 44 px minimum. Titre de sélection plus visible.
- Barre flottante avec compteur, panier et Continuer. État vide permanent avec action désactivée. Détails et retrait des soins conservés ; fermeture du panier avec retour du focus. Textes et commandes du panier agrandis.

Validation : TypeScript et compilation réussis. 40 scénarios initiaux validés ; les deux échecs liés au retour du focus du panier ont été corrigés, puis huit tests ciblés sont passés, soit 42 scénarios uniques validés. Journaux : `verification-directory-booking-browser.log` et `verification-directory-booking-final.log`. Captures inspectées : `captures/variante-annuaire-1440.png`, `captures/variante-reservation-360.png`, `captures/variante-reservation-1440.png`.

Recette sur API fictive. Localhost relancé ensuite avec l’API habituelle de production ; aucun déploiement ni écriture de production pendant les tests.
