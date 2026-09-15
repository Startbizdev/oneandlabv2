# Offres et activation — constat au 15 septembre 2026

## Ce que les données permettent de décider

L’audit `audit-commercial-agrege.json` a été exécuté en transaction SQL en lecture seule, puis annulé. Il contient des comptes agrégés, aucun dossier patient ni identifiant individuel.

- 329 comptes infirmiers, 12 laboratoires, 8 préleveurs et 46 professionnels.
- 4 contrats infirmiers au statut local actif, 2 en essai et 2 annulés. Aucun contrat laboratoire trouvé dans cette table.
- Une souscription Apple active/en essai a une échéance passée : synchronisation à contrôler avant de compter ses droits ou son revenu.
- Parmi 323 infirmiers sans contrat Pro actif/en essai, 286 ont zéro rendez-vous confirmé/planifié/en cours/terminé daté du mois, 36 en ont 1 à 4 et un en a 5 à 9. Aucun n’en a 10 ou plus.

Le mois est incomplet et les comptes peuvent être anciens ou inactifs. Ce décompte par date de rendez-vous est un indicateur d’activité, pas le compteur contractuel par date d’acceptation. Il ne mesure ni la demande locale non satisfaite ni la fréquentation de l’application.

**Décision : améliorer l’activation et proposer Pro dans les situations où sa valeur est concrète. Ces données ne justifient pas encore une réduction générale du gratuit.** Il s’agit d’une interprétation prudente de cet instantané, pas d’une preuve de causalité.

## Changements dans l’application

| Offre | Utilité mise en avant | Limites conservées |
|---|---|---|
| Infirmier Découverte | Présence et premiers rendez-vous | Gratuit, 10 acceptations/mois, 20 km |
| Infirmier Pro | Activité régulière, secteur étendu | 29 €/mois, rendez-vous illimités, 100 km |
| Laboratoire gratuit | Ouvrir son espace | Aucun préleveur ni sous-compte rattaché |
| Laboratoire Starter | Organiser une petite équipe | 49 €/mois, deux préleveurs |
| Laboratoire Pro | Coordonner plusieurs équipes | 129 €/mois, préleveurs et sous-comptes illimités |

Le gratuit laboratoire apparaît désormais dans la comparaison. Les clients connectés accèdent à leur espace depuis cette entrée ; elle ne déclenche aucun paiement. Les offres payantes restent présentées avec leur cas d’usage. Les contrats existants ouvrent leur gestion au lieu d’une seconde souscription.

La bannière infirmier propose Pro à partir de 80 % du quota effectivement chargé. Avant ce seuil, le parcours reste centré sur l’activité. Pour les laboratoires gratuits, la proposition apparaît dans les espaces d’équipe. Le choix de 80 % est une hypothèse produit à mesurer, pas un seuil validé par une expérimentation.

La carte de couverture reste un autre point de comparaison utile : expliquer les 20/100 km au moment où le professionnel ajuste son secteur. La création du premier secteur et la reprise d’un enregistrement refusé ont été corrigées.

## Mesurer avant de changer les prix

Suivre par cohorte d’inscription : profil et secteur complétés, premier rendez-vous accepté, deuxième mois actif, consultation des offres, ouverture d’un paiement, premier paiement réussi, renouvellement, annulation. La collecte complète de ces événements n’est pas encore implémentée ; les visites de tarifs et ouvertures de paiement ne doivent pas être déduites des seules souscriptions.

Le MRR doit provenir des montants récurrents de facturation et être séparé des essais, encaissements, taxes et frais des boutiques. Les libellés à 29/49/129 € ne permettent pas de reconstituer un revenu réel. [Définition et rapports Stripe](https://docs.stripe.com/billing/subscriptions/analytics).

Contrôler aussi les paiements échoués, les moyens de paiement à mettre à jour et les reprises disponibles dans le service de facturation. Aucun réglage Stripe ni message client n’a été modifié ou envoyé pendant cet audit. [Reprise des paiements Stripe](https://docs.stripe.com/billing/revenue-recovery/smart-retries).

Une expérimentation ultérieure sur les nouveaux comptes pourra comparer les quotas, la durée d’essai ou la tarification, avec suivi de l’activation et de la rétention. Les droits des clients existants restent inchangés dans cette refonte. Aucun gain de MRR n’est encore établi.
