# Cary : réponses au questionnaire technique

| | |
|---|---|
| **Propriétaire de la plateforme Cary** | **ZENFACT SAS** — SIREN 927 659 508 — 230 B avenue Corot, 13014 Marseille — Présidente : Shany Amar |
| **Prestataire de développement** | **Startbiz LLC** — License 2218328.01 |

**Légende :** ✅ en place · ⏳ en cours

---

## En bref

| Sujet | État |
|---|---|
| Propriété | ✅ Tous les comptes sont au nom de ZENFACT SAS : code source (GitHub), AWS, domaine cary.bio, Apple, Google Play, Stripe, Brevo, Twilio, Google Maps, xAI. ⏳ À finaliser : signature de l'attestation de cession des droits. |
| Coût actuel | Environ 50 USD/mois, soit environ 45 €/mois. |
| Technologies | ✅ Standards et répandues : PHP, MySQL, Nuxt/Vue, React Native/Expo. Faciles à reprendre. |
| Chiffrement des données de santé | ✅ AES-256-GCM, dans la base comme sur les fichiers. |
| Stockage des documents | ✅ AWS S3, région Paris : privé, chiffré, historique des versions. |
| Traçabilité des accès aux dossiers | ✅ Journal d'accès complet, jamais supprimé, archivé chaque mois. |
| Sauvegardes | ✅ Quotidiennes, chiffrées, vérifiées, copiées sur AWS S3 Paris et testées chaque mois. |
| Sécurité | ✅ Test d'intrusion interne réalisé, aucune faille critique, durcissements appliqués. Un test indépendant reste conseillé. |
| Maintenance du serveur | ✅ Nettoyage et archivage automatiques. Disque utilisé à 37 %. |
| Hébergement HDS | ✅ Données hébergées chez AWS Paris, certifié HDS. ZENFACT SAS administre sa propre plateforme en tant que responsable de traitement. Voir § 3. |
| Messages (SMS, e-mails, notifications) | ✅ Simple transmission de messages courts, pas d'hébergement de données de santé : hors champ HDS. Voir § 3. |
| Montée en charge | ✅ Serveur volontairement dimensionné au juste besoin pour maîtriser les coûts. Sur AWS, il peut passer à une taille supérieure à tout moment, en quelques minutes, sans changer le code. |

---

## 1. Le code et les accès

### Le code appartient-il bien à Cary (contrat avec cession des droits) ?
✅ **Oui.** Le code, les applications, la base de données, les contenus et les comptes appartiennent à ZENFACT SAS. Startbiz LLC intervient comme prestataire de développement, et cède à ZENFACT SAS l'intégralité des droits patrimoniaux sur ce qu'elle a développé pour Cary.

Cette cession doit être **écrite et signée** par les deux sociétés : en droit français, une cession de droits d'auteur doit préciser les droits cédés, leur étendue, leur destination, le territoire et la durée. Le modèle d'attestation est dans le document **Attestation de cession des droits**, à faire relire par l'avocat de ZENFACT SAS puis à signer.

### Le code, l'hébergement et le nom de domaine sont-ils au nom de la société ?

| Élément | Titulaire | État |
|---|---|---|
| Serveur et stockage AWS | ✅ **ZENFACT SAS** | Au nom de la société. |
| Domaine cary.bio | ✅ **ZENFACT SAS** | Au nom de la société. |
| Apple App Store (Apple Developer) | ✅ **ZENFACT SAS** | Au nom de la société. |
| Google Play Console | ✅ **ZENFACT SAS** | Au nom de la société. Passage au type de compte « Organisation » en cours de validation par Google. |
| Stripe (paiements web) | ✅ **ZENFACT SAS** | Au nom de la société. |
| Brevo (e-mails) | ✅ **ZENFACT SAS** | Au nom de la société. |
| Twilio (SMS) | ✅ **ZENFACT SAS** | Au nom de la société. |
| Google Maps (adresses) | ✅ **ZENFACT SAS** | Au nom de la société. |
| xAI (assistant IA) | ✅ **ZENFACT SAS** | Au nom de la société. |
| Code source (GitHub) | ✅ **ZENFACT SAS** | Compte GitHub Cary de la société. |

### Si le développeur n'était plus disponible, quelqu'un d'autre pourrait-il reprendre ?
Oui, à condition d'avoir les accès ci-dessus.
- ✅ Les technologies sont courantes, sans outil propriétaire ni no-code.
- ✅ Le projet est structuré : un dépôt unique avec le site, l'appli mobile, l'API, la base et des modules partagés.
- ✅ Environ 1 000 tests automatisés côté serveur, et des tests web et mobile.
- ✅ **Continuité assurée** : tous les comptes et tous les secrets appartiennent à ZENFACT SAS. Les procédures d'exploitation sont documentées par le prestataire.
- ✅ **Clés de chiffrement et configuration** : une copie est conservée dans le coffre-fort de secrets AWS de ZENFACT SAS (AWS Systems Manager, chiffrement AWS KMS). Elle est mise à jour automatiquement à chaque changement. Le serveur peut déposer les secrets mais pas les relire : seuls les administrateurs du compte AWS y ont accès.

---

## 2. Les technologies et l'architecture

### Avec quoi sont faits le site, l'application et la base ?

| Brique | Technologie |
|---|---|
| Site web | Nuxt 3 (Vue.js), Nuxt UI, Tailwind, rendu côté serveur (Node.js) |
| Applications iPhone et Android | React Native avec Expo (un seul code pour les deux plateformes) |
| API (serveur) | PHP 8.2, servi par Nginx |
| Base de données | MySQL |
| Documents (ordonnances, cartes Vitale, photos de soins, pièces jointes) | AWS S3, région Paris : chiffrés par l'application avant l'envoi, puis par S3 |
| Tâches automatiques | Clôture des RDV, expiration des offres, relances, sauvegardes, maintenance |

### Outils no-code ou services externes ?
Aucun outil no-code. Services externes utilisés :

| Service | Usage | Localisation |
|---|---|---|
| AWS (EC2 et S3) | Serveur, stockage des documents, sauvegardes | Paris (eu-west-3) |
| Brevo | E-mails : codes de connexion, notifications | France / UE |
| Brevo SMS | SMS (confirmations de RDV, invitations) ; Twilio en secours | France / UE |
| Expo Push | Notifications sur les téléphones | États-Unis |
| Google Maps (Places / Geocoding) | Recherche d'adresses | États-Unis (certifié Data Privacy Framework UE–US) |
| xAI (modèle Grok) | Assistant IA intégré | États-Unis, rétention zéro activée |
| Stripe | Abonnements sur le web | UE / États-Unis |
| Apple / Google | Achats intégrés et distribution des applis | États-Unis |
| Let's Encrypt | Certificats HTTPS | — |

### Schéma simple

```
 Patients / infirmiers / labos / pharmacies / pros
        │                         │
   Appli iPhone/Android        Site web cary.bio
   (Expo, React Native)        (Nuxt, Node.js)
        │                         │
        └────────── HTTPS ────────┘
                     │
            Serveur AWS Paris
          ┌──────────────────────────┐
          │ Nginx → API PHP → MySQL  │
          │ Tâches planifiées        │
          └──────────────────────────┘
               │                │
     Documents chiffrés    Sauvegardes chiffrées
       (AWS S3 Paris)        (AWS S3 Paris)

   Services externes : Brevo (e-mail), Twilio (SMS), Expo (push),
   Google Maps (adresses), xAI (assistant), Stripe / Apple / Google (paiements)
```

### Comment sont séparés les accès entre infirmiers, labos et pharmacies ?
- ✅ Connexion par **code à usage unique envoyé par e-mail** (valable 5 minutes) ou par mot de passe. Mots de passe et codes sont stockés **hachés** (bcrypt), jamais en clair. La session est portée par un jeton signé (JWT).
- ✅ Chaque compte a un **rôle** : patient, infirmier, préleveur, laboratoire, sous-compte de laboratoire, professionnel (médecin, pharmacie…), administrateur.
- ✅ Chaque demande est vérifiée **côté serveur**. Un professionnel n'accède à un dossier patient que s'il a un lien réel avec ce patient : RDV, lien patient, ou commande reçue pour une pharmacie. Un laboratoire ne voit que ses préleveurs et ses patients.
- ✅ Les droits sont fins. Par exemple, une pharmacie lit les documents du patient d'une commande, mais ne peut pas les modifier, et perd l'accès si la commande est refusée ou annulée.
- ✅ Ces règles sont couvertes par des tests automatisés.

---

## 3. L'hébergement et la conformité santé (HDS)

### Où est hébergée la plateforme ? L'hébergeur est-il certifié HDS ?
- ✅ Chez **Amazon Web Services, région Paris (eu-west-3)** : un serveur EC2 sous Ubuntu 24.04 et un stockage S3.
- ✅ AWS est certifié HDS pour cette région, pour la partie infrastructure : datacenters, matériel, réseau, virtualisation, stockage.
- ✅ **ZENFACT SAS administre sa propre plateforme en tant que responsable de traitement.** La certification HDS vise les prestataires qui hébergent des données de santé **pour le compte de tiers** (article L.1111-8 du Code de la santé publique). Un responsable de traitement qui héberge ses propres données chez un hébergeur certifié n'est pas lui-même soumis à la certification : c'est le cas de ZENFACT SAS avec AWS.
- ✅ **Rôle confirmé dans les documents publics de Cary** : la politique de confidentialité désigne ZENFACT SAS comme responsable du traitement, et les conditions générales de vente présentent Cary comme la plateforme de mise en relation et de gestion des rendez-vous. Les professionnels de santé sont des clients abonnés qui utilisent la plateforme : ils n'en confient pas l'hébergement à ZENFACT.
- ✅ **AWS figure sur la liste officielle des hébergeurs certifiés HDS** publiée par l'ANS. La certification s'applique à tous les clients des régions couvertes, dont Paris : il n'y a pas d'avenant particulier à signer.

### Toutes les données de santé (base, fichiers, sauvegardes) sont-elles chez l'hébergeur HDS ?
- ✅ **Base de données** : sur le serveur AWS Paris.
- ✅ **Documents** : sur AWS S3 Paris.
- ✅ **Sauvegardes et archives** : sur AWS S3 Paris, dans un espace séparé.
- Tout est sur le compte AWS de ZENFACT SAS, en région Paris.

### Des données patients passent-elles par des outils non HDS ?
**Aucune donnée de santé n'est hébergée hors de l'infrastructure HDS.** Le dossier patient, les documents, les sauvegardes et le journal d'accès sont tous stockés chez AWS, en région Paris.

La certification HDS vise l'**hébergement**, c'est-à-dire le stockage de données de santé pour le compte d'un professionnel ou d'un patient (article L.1111-8 du Code de la santé publique). Le fait de se voir confier des données pour une courte période ne constitue pas une activité d'hébergement (article R.1111-8-8). Les SMS, e-mails et notifications ne font que **transmettre des messages courts** : ils n'entrent pas dans le champ de la certification HDS.

| Canal | Ce qui y passe | Analyse |
|---|---|---|
| SMS (Brevo, France ; Twilio en secours) | Confirmation de RDV, invitations des soignants | ✅ Transmission d'un message court, pas d'hébergement. |
| Notifications push (Expo) | Titre et texte de la notification | ✅ Transmission d'un message court, pas d'hébergement. |
| E-mail (Brevo, France) | Codes de connexion, notifications | ✅ Transmission, pas d'hébergement. |
| Assistant IA (xAI) | Questions et documents soumis à l'assistant | ✅ **Rétention zéro activée** : xAI ne conserve ni les questions ni les réponses, il s'agit d'une simple transmission. ✅ Une **barrière de confidentialité** remplace les noms par des alias (« Patient A ») et masque téléphone, e-mail, n° de sécurité sociale, IBAN, adresse et GPS ; la date de naissance devient un âge. |
| Google Maps | Adresses saisies | ✅ Adresse seule, sans lien médical. |
| Outils d'analyse d'audience | — | ✅ Aucun outil d'analyse (Google Analytics, etc.) n'est intégré. |

Au titre du **RGPD** (et non du HDS), les contrats de sous-traitance avec ces prestataires doivent couvrir les données personnelles qu'ils transmettent.

### Sait-on qui a consulté quel dossier, et quand ?
✅ **Oui.** Chaque accès à une donnée de santé est enregistré dans un **journal d'accès** : qui, avec quel rôle, quelle donnée, et quand.
- **Il n'est jamais supprimé.** L'ANS recommande de conserver les traces d'accès aux dossiers patients jusqu'à 20 ans, comme les dossiers médicaux.
- Les **3 derniers mois** restent dans la base, pour une consultation rapide.
- Chaque mois, les mois plus anciens sont **exportés, compressés, chiffrés et archivés sur AWS S3 Paris**, sans date d'expiration. Chaque export est vérifié ligne par ligne avant d'être retiré de la base.
- ✅ La journalisation est **exhaustive** : chaque donnée de santé affichée est tracée, ce qui va au-delà du minimum attendu. L'archivage mensuel maîtrise le volume.

---

## 4. La sécurité et les données

### Les données sont-elles chiffrées ?
- ✅ **Chiffrement applicatif AES-256-GCM** avec un système de clés à deux niveaux : une clé maîtresse chiffre une clé par donnée (méthode dite « KEK/DEK », recommandée pour la santé).
- ✅ **Champs chiffrés** : identité, téléphone, e-mail, adresse, n° de sécurité sociale, contenu des RDV.
- ✅ **Documents** : chaque fichier est chiffré par l'application, puis stocké sur S3, lui-même chiffré.
- ✅ **Échanges** en HTTPS (TLS 1.2 et 1.3 uniquement).
- ✅ **Sauvegardes** chiffrées avec une clé dédiée.
- ✅ **Clés sous coffre-fort** : la clé maîtresse, la clé des sauvegardes et la configuration du serveur ont une copie chiffrée dans le coffre-fort AWS de la société (AWS Systems Manager, chiffrement AWS KMS), mise à jour automatiquement.

### Y a-t-il des sauvegardes ? A-t-on testé une restauration ?
✅ **Oui.**
- **Chaque nuit**, la base complète est exportée sans interrompre le service, compressée, **chiffrée en AES-256**, puis **contrôlée automatiquement** : le fichier est relu en entier pour vérifier qu'il est complet et lisible.
- Chaque sauvegarde est **copiée sur AWS S3 Paris** et conservée **30 jours**. Les 3 derniers jours restent aussi sur le serveur, pour une restauration rapide.
- **Le serveur peut déposer des sauvegardes, mais ne peut ni les lire ni les supprimer.** Même un serveur piraté ne pourrait pas effacer les sauvegardes.
- **Documents** : le stockage S3 conserve l'historique des versions. Un document supprimé ou écrasé reste récupérable pendant 30 jours.
- **Test de restauration automatique chaque mois** : la dernière sauvegarde est déchiffrée et restaurée dans une base temporaire, puis comparée à la production (profils, RDV, documents, commandes pharmacie, proches). La base temporaire est ensuite supprimée.

À compléter :
- ✅ La procédure de restauration complète, y compris sur un nouveau serveur, est documentée.

### Un test d'intrusion a-t-il été fait ?
✅ **Un test d'intrusion interne a été réalisé sur la production (cary.bio).** Les tests étaient non destructifs, menés depuis Internet comme un attaquant extérieur, et complétés par une revue de la configuration du serveur et du code.

✅ Le RGPD (article 32) demande de tester régulièrement l'efficacité des mesures de sécurité, sans imposer de test d'intrusion par un prestataire externe. Cary est testé en continu : test d'intrusion interne, environ 1 000 tests automatiques rejoués avant chaque déploiement, test de restauration mensuel et supervision. Un test par un prestataire indépendant (environ 5 000 à 15 000 €) reste possible, par exemple à la demande d'un grand compte ou d'un investisseur.

**Résultats :**

| Contrôle | Résultat |
|---|---|
| HTTPS | ✅ Imposé. Seuls TLS 1.2 et 1.3 sont acceptés. Certificat renouvelé automatiquement. |
| Fichiers sensibles (`.env`, `.git`, journaux, sauvegardes, documents, scripts) | ✅ Aucun n'est accessible depuis Internet. |
| API sans connexion | ✅ Refusée. |
| Jeton de connexion falsifié | ✅ Rejeté. |
| Injection SQL | ✅ Requêtes à la base paramétrées. |
| Appels depuis un site tiers (CORS) | ✅ Refusés. |
| Messages d'erreur | ✅ Génériques, sans détail technique. |
| Force brute sur la connexion | ✅ Nombre de tentatives limité par IP et par compte. |
| Mots de passe et codes | ✅ Hachés en bcrypt. |
| Ports ouverts | ✅ Seuls SSH, HTTP et HTTPS. La base n'est pas exposée sur Internet. |
| Accès SSH | ✅ Par clé uniquement, connexion root interdite, blocage automatique des IP après 5 échecs (fail2ban). |
| Content-Security-Policy | ✅ En place : interdiction d'afficher Cary dans un site tiers et de détourner l'adresse de base des liens. |
| Pare-feu | ✅ Actif sur le serveur, en plus de celui d'AWS. |
| En-têtes de sécurité HTTP | ✅ HSTS, protection contre l'affichage dans une fausse page (X-Frame-Options), X-Content-Type-Options, Referrer-Policy. |
| Version du serveur | ✅ Masquée. |
| Mises à jour système | ✅ À jour. |
| Contrôle des droits entre rôles | ✅ Couvert par les tests automatisés, rejoués avant chaque déploiement. |


**Non couvert par ce test :** tests authentifiés sur la production avec des comptes de chaque rôle (couverts par les tests automatisés), analyse de l'application mobile, ingénierie sociale, tests de charge.

### Le RGPD est-il traité ?
- ✅ **Consentement** : il est recueilli quand un professionnel crée ou suit un patient.
- ✅ **Droit à l'effacement** : un patient peut supprimer lui-même son compte depuis l'appli (profil, documents, avis…). Une sécurité empêche la suppression si un RDV ou une commande est en cours. Un professionnel fait une demande de suppression, traitée par l'administrateur.
- ✅ **Durées de conservation** :
  - journal d'accès conservé et archivé ;
  - journaux techniques conservés 1 an ;
  - nettoyage automatique chaque semaine.
- ✅ **Durées de conservation appliquées automatiquement chaque mois**, d'après les référentiels CNIL du secteur de la santé :
  - dossiers de soins : archivés après 5 ans sans activité (plus visibles des professionnels, toujours accessibles au patient, réactivés à la reprise des soins), puis supprimés 15 ans plus tard ;
  - comptes sans aucun soin : supprimés après 3 ans d'inactivité, avec un e-mail d'avertissement 30 jours avant ;
  - conversations de l'assistant : supprimées après 1 an ;
  - comptabilité : 10 ans.
  Aucune suppression n'a lieu tant qu'un rendez-vous, un abonnement ou une commande est en cours.
- ✅ **Registre des traitements** et **analyse d'impact** rédigés, à signer par ZENFACT SAS.
- ✅ **Contact protection des données** : contact@cary.bio, indiqué dans la politique de confidentialité et les mentions légales.

### Y a-t-il déjà eu une panne importante ou un incident de sécurité ?
- **Aucun incident de sécurité** (intrusion ou fuite de données) connu.
- **Aucune panne majeure.** Quelques incidents d'exploitation mineurs, sans perte ni fuite de données, ont été corrigés rapidement : par exemple, des numéros RPPS/Adeli restaurés à partir des demandes d'inscription.
- ✅ **Supervision automatique toutes les 5 minutes** : site, API, base de données, services, disque, mémoire, sauvegarde de la nuit et test de restauration. Une alerte part par e-mail dès qu'un problème est détecté, et un message signale le retour à la normale.

---

## 5. La suite : croissance et coûts

### La plateforme tiendrait-elle avec 10 fois plus d'utilisateurs ?
Aujourd'hui, environ **2 100 comptes** : 1 580 patients, 412 infirmiers, 70 professionnels, 17 laboratoires, 9 préleveurs.

**Oui. Le code tiendrait, et l'infrastructure suit la croissance.**

Le serveur actuel (2 processeurs, 2 Go de mémoire) est **volontairement dimensionné au juste besoin**, pour ne pas payer de capacité inutilisée. C'est l'avantage d'AWS : on paie ce qu'on utilise, et on adapte au fur et à mesure.
1. **Puissance du serveur.** ✅ Sur AWS, on passe à un serveur plus puissant **à tout moment, en quelques minutes**, sans modifier le code. Il suffit de changer le type d'instance, par exemple 4 ou 8 Go de mémoire.
2. **Stockage.** ✅ Déjà prêt : les documents sont sur S3, sans limite de taille. Le disque du serveur est utilisé à 37 %, avec un nettoyage et un archivage automatiques.
3. **Étape suivante, quand le volume le justifiera :** séparer la base de données (AWS RDS), puis ajouter un second serveur derrière un répartiteur de charge, pour qu'une panne ou une mise à jour ne coupe jamais le service.

Aucune réécriture n'est nécessaire : ce sont des évolutions d'infrastructure, faites au fil de la croissance.

### Combien coûtent l'hébergement et les services par mois ?
**Environ 50 USD par mois, soit environ 45 € par mois**, hébergement et services compris :
- **serveur AWS Paris et stockage S3** (documents, sauvegardes, archives : quelques euros par mois) ;
- **services à l'usage** : e-mails (Brevo), SMS (Twilio), assistant IA (xAI), adresses (Google Maps).

Non compris, car payés à part ou prélevés sur les ventes :
- Apple Developer : 99 $ par an ;
- Google Play : 25 $ payés une fois ;
- commissions Stripe, Apple et Google sur les ventes.


### Qu'est-ce qui reste à développer pour bien servir les laboratoires ?
Les fonctionnalités existantes et les évolutions prévues sont détaillées dans le document **Pistes d'évolution**.

### Que referait-on différemment en repartant de zéro ?
1. **Mettre en place la supervision dès le premier jour.**
2. **Séparer dès le début** la base de données et le serveur applicatif.
3. **Choisir d'emblée un fournisseur d'IA hébergé en Europe sur une infrastructure HDS.**
4. **Utiliser un framework PHP standard** (Laravel ou Symfony). Le code actuel est propre et testé, mais un framework facilite le recrutement et la reprise.

---

## Plan d'action recommandé

| Priorité | Action | Délai indicatif |
|---|---|---|
| 1 | Signer l'attestation de cession des droits | 2 semaines |
| 2 | Valider et signer le registre des traitements et l'analyse d'impact | 2 semaines |
| 3 | Assistant IA : vérifier le contrat de traitement des données (DPA) de xAI ; à terme, IA hébergée en France sur infrastructure HDS (le code le permet déjà) | 1 à 3 mois |
| 4 | Selon la croissance : serveur plus puissant (quelques minutes), puis base séparée (RDS) et second serveur | Au fil de la croissance |
| 5 | Optionnel : test d'intrusion par un prestataire indépendant | À la demande d'un grand compte ou d'un investisseur |

---

*Sources : [AWS – Hébergeur de données de santé](https://aws.amazon.com/fr/compliance/hds/) · [Le Monde Informatique – « AWS certifié HDS, oui mais »](https://www.lemondeinformatique.fr/actualites/lire-aws-certifie-hebergeur-de-donnees-de-sante-oui-mais-74667.html) · [CNIL – recommandation sur la journalisation](https://cnil.fr/la-cnil-publie-une-recommandation-relative-aux-mesures-de-journalisation) · [ANS – conservation des traces des dossiers patients](https://esante.gouv.fr/faq/quelles-est-la-duree-de-conservation-des-traces-techniques-et-applicatives-des-dossiers-patient)*
