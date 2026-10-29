# Cary : registre des activités de traitement (article 30 RGPD)

> **Brouillon à valider par ZENFACT SAS.** Les durées de conservation proposées suivent les référentiels de la CNIL pour le secteur de la santé. Elles deviennent applicables une fois validées par la société.

**Responsable de traitement :** ZENFACT SAS — SIREN 927 659 508 — 230 B avenue Corot, 13014 Marseille — Présidente : Shany Amar
**Contact protection des données :** contact@cary.bio

---

## Traitement 1 — Gestion des comptes utilisateurs

| Rubrique | Contenu |
|---|---|
| Finalité | Créer et gérer les comptes des patients, des professionnels (infirmiers, laboratoires, préleveurs, pharmacies, médecins) et des administrateurs ; authentification. |
| Base légale | Exécution du contrat (conditions générales). |
| Personnes concernées | Patients, proches rattachés à un patient, professionnels de santé, personnel des laboratoires. |
| Données | Identité, e-mail, téléphone, adresse, date de naissance, sexe, photo de profil ; pour les professionnels : RPPS ou Adeli, SIRET, zone d'intervention ; codes de connexion et mots de passe (hachés). |
| Destinataires | Équipe habilitée de ZENFACT SAS ; professionnels liés au patient pour les données nécessaires au rendez-vous. |
| Sous-traitants | AWS (hébergement, Paris), Brevo (e-mails et SMS, France). |
| Durée | Pendant la vie du compte, puis **3 ans après la dernière activité** ; suppression immédiate sur demande de la personne (bouton dans l'application). |

## Traitement 2 — Prise et gestion des rendez-vous de soins à domicile

| Rubrique | Contenu |
|---|---|
| Finalité | Planifier les prélèvements et les soins à domicile, les attribuer à un professionnel, organiser les tournées, notifier les personnes concernées. |
| Base légale | Exécution du contrat ; article 9.2.h RGPD (prise en charge sanitaire) pour les données de santé. |
| Données | Type de soin ou d'analyse, date et créneau, adresse d'intervention, informations du formulaire de rendez-vous, statut du rendez-vous, échanges entre professionnels et patient, photos de soins. |
| Destinataires | Patient ; professionnel ou laboratoire attribué ; équipe habilitée de ZENFACT SAS. |
| Sous-traitants | AWS (Paris), Brevo (notifications e-mail et SMS), Twilio (SMS de secours), Expo (notifications sur téléphone), Google Maps (recherche d'adresse). |
| Durée | **5 ans après le dernier rendez-vous** en base active, puis **15 ans en archive** (référentiel CNIL des cabinets de santé). |

## Traitement 3 — Dossier de santé et documents du patient

| Rubrique | Contenu |
|---|---|
| Finalité | Conserver les documents utiles à la prise en charge (ordonnances, carte Vitale, mutuelle, résultats d'analyses), le carnet de santé, les constantes, les transmissions entre soignants et les données de santé connectées (Apple Santé, Health Connect) avec l'accord du patient. |
| Base légale | Article 9.2.h RGPD ; consentement du patient pour les données de santé connectées et pour l'accès des professionnels à son dossier. |
| Données | Documents médicaux chiffrés, réponses du carnet de santé, mesures de santé, transmissions, n° de sécurité sociale. |
| Destinataires | Patient ; professionnels ayant un lien avec le patient (rendez-vous, lien de soin, commande pharmacie en cours). |
| Sous-traitants | AWS (Paris, infrastructure certifiée HDS) ; documents stockés sur AWS S3 Paris. |
| Sécurité | Chiffrement AES-256 de chaque donnée et de chaque document ; journal de chaque accès. |
| Durée | **5 ans après la dernière intervention**, puis **15 ans en archive** (référentiel CNIL). |

## Traitement 4 — Commandes en pharmacie

| Rubrique | Contenu |
|---|---|
| Finalité | Transmettre une ordonnance et une commande à la pharmacie choisie, suivre la commande (retrait ou livraison). |
| Base légale | Exécution du contrat ; article 9.2.h RGPD. |
| Données | Ordonnances, mode de retrait, adresse de livraison, messages avec la pharmacie. |
| Destinataires | Pharmacie destinataire ; patient ; professionnel demandeur. |
| Durée | Identique au dossier de santé (5 ans + 15 ans d'archive). |

## Traitement 5 — Abonnements et paiements

| Rubrique | Contenu |
|---|---|
| Finalité | Gérer les abonnements des professionnels et les paiements des patients (créneaux prioritaires). |
| Base légale | Exécution du contrat ; obligation légale (comptabilité). |
| Données | Identité de facturation, offre souscrite, historique de paiement. Les numéros de carte ne passent jamais par Cary : ils sont gérés par Stripe, Apple ou Google. |
| Sous-traitants | Stripe, Apple, Google. |
| Durée | **10 ans** pour les pièces comptables (article L.123-22 du Code de commerce). |

## Traitement 6 — Journal d'accès aux données de santé (traçabilité)

| Rubrique | Contenu |
|---|---|
| Finalité | Savoir qui a consulté quelle donnée de santé, et quand. |
| Base légale | Obligation de sécurité (article 32 RGPD) ; traçabilité des accès aux dossiers patients. |
| Données | Identifiant de l'utilisateur, rôle, donnée consultée, date et heure. |
| Destinataires | Équipe habilitée de ZENFACT SAS ; autorités sur demande. |
| Durée | **3 mois en base**, puis archivé chiffré sur AWS S3 Paris, **jusqu'à 20 ans** (recommandation de l'ANS pour les traces d'accès aux dossiers patients). |

## Traitement 7 — Assistant IA

| Rubrique | Contenu |
|---|---|
| Finalité | Répondre aux questions des utilisateurs et les aider dans leurs démarches. |
| Base légale | Exécution du contrat ; consentement pour l'envoi de documents à l'assistant. |
| Données | Questions et documents soumis. Avant l'envoi, les noms sont remplacés par des alias, et téléphone, e-mail, n° de sécurité sociale, IBAN, adresse et position sont masqués. |
| Sous-traitant | xAI (États-Unis), rétention zéro activée : aucune conservation chez le fournisseur. |
| Durée | Conversations conservées **1 an** dans Cary, puis supprimées. |

## Traitement 8 — Journaux techniques et sécurité

| Rubrique | Contenu |
|---|---|
| Finalité | Sécurité, détection des incidents, diagnostic. |
| Base légale | Intérêt légitime (sécurité du service). |
| Données | Adresse IP, date, page ou API appelée, erreurs. |
| Durée | **1 an** (recommandation CNIL sur la journalisation : 6 mois à 1 an). |

---

## Mise en œuvre des durées de conservation

| Durée | Mise en œuvre |
|---|---|
| Journal d'accès (3 mois en base, puis archive) | ✅ Automatique chaque mois. |
| Journaux techniques (1 an) | ✅ Automatique chaque semaine. |
| Sauvegardes (30 jours) | ✅ Automatique (règle de cycle de vie S3). |
| Suppression d'un compte à la demande | ✅ Disponible dans l'application. |
| Conversations de l'assistant (1 an) | Suppression automatique à mettre en place avant la première échéance (fin 2027). |
| Comptes inactifs (3 ans) | Suppression automatique à mettre en place avant la première échéance (2029). |
| Dossiers et documents de santé (5 ans + 15 ans d'archive) | Archivage à mettre en place avant la première échéance (2031). |

## Mesures de sécurité communes

- Hébergement AWS en région Paris, infrastructure certifiée HDS.
- Chiffrement AES-256 des données de santé et des documents ; HTTPS (TLS 1.2 et 1.3).
- Contrôle des accès selon le rôle et le lien réel avec le patient.
- Sauvegardes quotidiennes chiffrées, testées chaque mois ; clés dans le coffre-fort AWS.
- Pare-feu, connexion au serveur par clé uniquement, blocage des tentatives répétées, supervision avec alertes.

## Exercice des droits

Les personnes exercent leurs droits (accès, rectification, effacement, opposition, portabilité) à **contact@cary.bio**. Un patient peut aussi supprimer lui-même son compte depuis l'application. Réponse sous 30 jours. Réclamation possible auprès de la CNIL.
