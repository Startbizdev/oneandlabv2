# Cary : continuité et passation

## Comptes

Tous les comptes de service sont au nom de **ZENFACT SAS** : code source (GitHub), hébergement et stockage (AWS, région Paris), domaine cary.bio, Apple App Store, Google Play, Stripe, Brevo, Twilio, Google Maps, xAI.

## Secrets

Les clés de chiffrement, la clé des sauvegardes et la configuration du serveur sont conservées dans le **coffre-fort de secrets AWS de ZENFACT SAS** (AWS Systems Manager, chiffrement AWS KMS). Elles y sont mises à jour automatiquement. Seuls les administrateurs du compte AWS y ont accès.

## Exploitation

- **Sauvegardes** quotidiennes chiffrées, conservées hors du serveur et testées chaque mois.
- **Supervision** automatique, avec alertes en cas d'incident.
- **Maintenance** du serveur et archivage des journaux automatisés.
- Les **procédures d'exploitation** (déploiement, publication des applications, restauration) sont documentées et tenues à jour par le prestataire, Startbiz LLC.

## En cas de changement de prestataire

ZENFACT SAS détient tous les comptes et tous les secrets. Un nouveau prestataire peut reprendre l'exploitation à partir des accès de la société.

L'accompagnement du nouveau prestataire par Startbiz LLC (**réversibilité**) est une **prestation facturée**, réalisée sur devis :

| Volet | Contenu | Durée estimée |
|---|---|---|
| Documentation d'exploitation | Architecture, déploiement, publication des applications, sauvegardes et restauration, supervision | 4 à 5 jours |
| Transfert de compétences | Sessions avec l'équipe reprenante : code (web, mobile, API), base de données, sécurité, conformité | 5 à 7 jours |
| Transfert de l'exploitation | Remise des accès techniques, bascule et vérification des déploiements, des sauvegardes et de la supervision | 3 à 4 jours |
| Assistance après reprise | Réponses aux questions de l'équipe reprenante pendant le premier mois | 3 à 4 jours |
| **Total** | | **15 à 20 jours** |

**Estimation : 7 500 € à 10 000 €**, sur la base de **500 € par jour**. Montant définitif fixé par devis, au tarif de Startbiz LLC en vigueur au moment de la demande.
