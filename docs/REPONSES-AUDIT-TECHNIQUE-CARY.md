# Cary : réponses au questionnaire technique

*Établi le 29 octobre 2026 à partir du code source, de la configuration du serveur de production et des comptes de publication.*

| | |
|---|---|
| **Propriétaire de la plateforme Cary** | **ZENFACT SAS** — SIREN 927 659 508 — 230 B avenue Corot, 13014 Marseille — Présidente : Shany Amar |
| **Prestataire de développement** | **Startbiz LLC** — License 2218328.01 |

**Légende :** ✅ vérifié dans le code ou sur le serveur · ⚠️ point faible ou risque · ❓ à confirmer par la société (je ne peux pas le vérifier depuis le code).

---

## En bref

| Sujet | État |
|---|---|
| Propriété | ✅ Tout appartient à ZENFACT SAS : AWS, domaine cary.bio, Apple, Google Play, Stripe, Brevo, Twilio, Google Maps et xAI sont à son nom. Restent à faire : signer l'attestation de cession (annexe A) et transférer le dépôt de code (GitHub Cary) et le projet Expo. |
| Coût actuel | Environ 50 USD/mois, soit environ 45 €/mois. |
| Technologies | ✅ Standards et répandues : PHP, MySQL, Nuxt/Vue, React Native/Expo. Faciles à reprendre. |
| Chiffrement des données de santé | ✅ AES-256-GCM, en base comme sur les fichiers. |
| Traçabilité des accès aux dossiers | ✅ Journal d'accès conservé 12 mois. |
| Hébergement | ⚠️ AWS région Paris : infrastructure certifiée HDS, mais l'administration du serveur ne l'est pas. Voir § 3. |
| Sauvegardes | ✅ Depuis le 29 octobre 2026 : sauvegarde quotidienne chiffrée et vérifiée de la base et de tous les fichiers, copiée sur AWS S3 Paris et conservée 30 jours. |
| Test d'intrusion | ✅ Test interne du 29 octobre 2026 : aucune faille critique. 5 durcissements sur 7 appliqués le jour même. Un test indépendant reste conseillé. |
| Services hors UE recevant des données | ⚠️ SMS (Twilio), notifications (Expo), assistant IA (xAI). Voir § 3. |
| Montée en charge | ⚠️ Un seul petit serveur (2 processeurs, 2 Go de mémoire) fait tout tourner. |

---

## 1. Le code et les accès

### Le code appartient-il bien à Cary (contrat avec cession des droits) ?
✅ **Oui. Le code, les applications, la base de données, les contenus et les comptes appartiennent à ZENFACT SAS.** Startbiz LLC intervient uniquement comme prestataire de développement, et cède à ZENFACT SAS l'intégralité des droits patrimoniaux sur ce qu'elle a développé pour Cary.

Pour que ce soit opposable, cette cession doit être **écrite et signée** par les deux sociétés : en droit français, une cession de droits d'auteur doit lister les droits cédés, leur étendue, leur destination, le territoire et la durée. Le modèle d'attestation est en **annexe A** de ce document, à faire relire par l'avocat de ZENFACT SAS puis à signer.

### Le code, l'hébergement et le nom de domaine sont-ils au nom de la société ?
État au 29 octobre 2026 :

| Élément | Titulaire | État |
|---|---|---|
| Serveur AWS (hébergement) | ✅ **ZENFACT SAS** | Au nom de la société. |
| Code source (GitHub) | ⏳ Compte GitHub **Cary**, créé par la société | Le dépôt est encore dans l'organisation « Startbizdev » de Startbiz LLC : **transfert vers le compte Cary à faire**. |
| Apple App Store (Apple Developer) | ✅ **ZENFACT SAS** | Au nom de la société. |
| Google Play Console | ✅ **ZENFACT SAS** | Au nom de la société. Passage au type de compte « Organisation » en cours de validation par Google. |
| Stripe (paiements web) | ✅ **ZENFACT SAS** | Au nom de la société. |
| Brevo (e-mails) | ✅ **ZENFACT SAS** | Au nom de la société. |
| Twilio (SMS) | ✅ **ZENFACT SAS** | Au nom de la société. |
| Google Maps (adresses) | ✅ **ZENFACT SAS** | Au nom de la société. |
| xAI (assistant IA) | ✅ **ZENFACT SAS** | Au nom de la société. |
| Builds mobiles (Expo / EAS) | ⏳ Compte « startbiz » de Startbiz LLC | Créer un compte Expo au nom de ZENFACT SAS et y transférer le projet. |
| Domaine cary.bio | ✅ **ZENFACT SAS** | Au nom de la société. |

### Si le développeur n'était plus disponible, quelqu'un d'autre pourrait-il reprendre ?
Oui, techniquement, à condition d'avoir les accès ci-dessus.
- ✅ Les technologies sont courantes, sans outil propriétaire ni no-code.
- ✅ Le projet est structuré : un dépôt unique avec le site, l'appli mobile, l'API, la base et des modules partagés.
- ✅ Il y a beaucoup de tests automatisés : environ 1 000 tests serveur (113 fichiers) et environ 90 fichiers de tests web et mobile.
- ✅ Des scripts de déploiement et des guides internes existent (dossier `docs/`, fichiers `AGENTS.md`).
- ⚠️ **Il manque un document de passation** : liste des comptes, des secrets (où ils sont, pas leur valeur) et des procédures (déployer, publier l'appli, restaurer la base).
- ⚠️ Les clés de chiffrement (KEK) n'existent que sur le serveur. **Si elles sont perdues, les données chiffrées sont illisibles définitivement.** Il faut une copie sécurisée hors du serveur, dans un coffre-fort de secrets détenu par la société.

---

## 2. Les technologies et l'architecture

### Avec quoi sont faits le site, l'application et la base ?
| Brique | Technologie |
|---|---|
| Site web | Nuxt 3 (Vue.js), Nuxt UI, Tailwind, rendu côté serveur, Node.js géré par PM2 |
| Applications iPhone et Android | React Native avec Expo (un seul code pour les deux plateformes) |
| API (serveur) | PHP 8.2 sans framework, servi par Nginx et PHP-FPM |
| Base de données | MySQL (environ 6,8 Go aujourd'hui) |
| Fichiers (ordonnances, documents, photos) | Stockés **chiffrés** sur **AWS S3, région Paris** (bucket `cary-files-519428392323`, privé, versionné) depuis le 29 octobre 2026. Chaque fichier est chiffré par l'application avant l'envoi, puis par S3. |
| Tâches automatiques | 6 tâches planifiées : clôture des RDV, expiration des offres, relances, purge des journaux… |

### Outils no-code ou services externes ?
Aucun outil no-code. Services externes utilisés :

| Service | Usage | Localisation |
|---|---|---|
| AWS EC2 | Hébergement du serveur | Paris (eu-west-3) |
| Brevo | E-mails : codes de connexion, notifications | France / UE |
| Twilio | SMS (confirmations de RDV, invitations) | ⚠️ États-Unis |
| Expo Push | Notifications sur les téléphones | ⚠️ États-Unis |
| Google Maps (Places / Geocoding) | Recherche d'adresses | ⚠️ États-Unis |
| xAI (modèle Grok) | Assistant IA intégré | ⚠️ États-Unis |
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
          Serveur AWS Paris (une seule machine)
          ┌──────────────────────────────────┐
          │ Nginx → API PHP 8.2 → MySQL       │
          │          │                        │
          │   Fichiers chiffrés sur disque    │
          │   Tâches planifiées (cron)        │
          └──────────────────────────────────┘
                     │
   Services externes : Brevo (e-mail), Twilio (SMS), Expo (push),
   Google Maps (adresses), xAI (assistant), Stripe / Apple / Google (paiements)
```

### Comment sont séparés les accès entre infirmiers, labos et pharmacies ?
- ✅ Connexion par **code à usage unique envoyé par e-mail** (valable 5 minutes) ou par mot de passe. Les mots de passe et les codes sont stockés **hachés** (bcrypt), jamais en clair. La session est ensuite portée par un jeton signé (JWT) valable 7 jours.
- ✅ Chaque compte a un **rôle** : patient, infirmier, préleveur, laboratoire, sous-compte de laboratoire, professionnel (médecin, pharmacie…), administrateur.
- ✅ Chaque demande est vérifiée **côté serveur**. Un professionnel n'accède à un dossier patient que s'il a un lien réel avec ce patient : RDV pris avec lui, lien patient, ou commande reçue pour une pharmacie. Un laboratoire ne voit que ses préleveurs et ses patients.
- ✅ Les droits sont fins. Par exemple, une pharmacie lit les documents du patient d'une commande, mais ne peut pas les modifier, et perd l'accès si la commande est refusée ou annulée.
- ✅ Ces règles sont couvertes par des tests automatisés.

---

## 3. L'hébergement et la conformité santé (HDS)

### Où est hébergée la plateforme ? L'hébergeur est-il certifié HDS ?
- ✅ Chez **Amazon Web Services, région Paris (eu-west-3)**, sur une machine virtuelle EC2 sous Ubuntu 24.04.
- ✅ AWS est certifié HDS pour cette région, pour la partie infrastructure : datacenters, matériel, réseau, virtualisation.
- ⚠️ **Le point à traiter : l'administration du serveur.** Avec une machine EC2 « brute », c'est nous qui administrons le système d'exploitation, la base et les sauvegardes, pas AWS. Or l'activité « administration et exploitation du système d'information contenant des données de santé » relève aussi de la certification HDS. Deux solutions :
  1. confier l'exploitation à un **infogérant certifié HDS** sur AWS ;
  2. migrer vers une offre HDS **« clé en main »** (OVHcloud, Scaleway, Clever Cloud…) où l'hébergeur prend en charge cette activité.
- ❓ Vérifier aussi que le compte AWS de la société a bien accepté les conditions HDS d'AWS (avenant disponible dans « AWS Artifact »).

**À faire valider par un juriste ou un consultant HDS avant d'affirmer que la plateforme est « conforme HDS ».**

### Toutes les données de santé (base, fichiers, sauvegardes) sont-elles chez l'hébergeur HDS ?
- ✅ La base et les fichiers sont sur le serveur AWS Paris.
- ✅ Les sauvegardes sont sur AWS S3, région Paris, dans le même compte AWS de ZENFACT SAS (voir § 4).
- ⚠️ Les copies de base faites ponctuellement pour développer ou tester se trouvent sur le poste du développeur. Elles devraient être interdites, ou anonymisées.
- ⚠️ D'anciens fichiers médicaux **chiffrés** ont été présents dans l'historique du dépôt de code. Ils ont été retirés du suivi en septembre 2026, mais restent dans l'historique. Ils sont illisibles sans les clés du serveur, mais il est préférable de **purger l'historique Git**.

### Des données patients passent-elles par des outils non HDS ?
Oui, en partie :

| Canal | Ce qui y passe | Risque |
|---|---|---|
| SMS (Twilio, États-Unis) | Confirmation de RDV avec le type de soin, invitations avec le nom du patient | ⚠️ Donnée de santé indirecte hors UE. Passer sur Brevo SMS (UE) et réduire le contenu au minimum (« Votre RDV est confirmé, voir l'appli »). |
| Notifications push (Expo, États-Unis) | Titre et texte de la notification | ⚠️ Vérifier qu'aucun nom ni soin n'apparaît dans le texte. |
| E-mail (Brevo, France) | Codes de connexion, notifications | Hébergeur UE, mais pas HDS : garder des contenus sans données de santé. |
| Assistant IA (xAI, États-Unis) | Questions et documents soumis à l'assistant | ✅ Une **barrière de confidentialité** remplace les noms par des alias (« Patient A ») et masque téléphone, e-mail, n° de sécurité sociale, IBAN, adresse, GPS ; la date de naissance devient un âge. ⚠️ Le contenu médical lui-même part vers un fournisseur américain : prévoir un fournisseur hébergé en UE (Mistral, Azure OpenAI UE…), déjà possible car le code accepte d'autres fournisseurs. |
| Google Maps | Adresses saisies | Adresse seule, sans lien médical. Risque faible. |
| Outils d'analyse d'audience | — | ✅ Aucun outil d'analyse (Google Analytics, etc.) n'est intégré. |

### Sait-on qui a consulté quel dossier, et quand ?
✅ Oui. Chaque déchiffrement d'une donnée de santé est enregistré dans un **journal d'accès** (qui, quel rôle, quelle donnée, quand). Ce journal est conservé **12 mois**, puis purgé automatiquement chaque mois. La durée est réglable, avec un minimum de 6 mois.

---

## 4. La sécurité et les données

### Les données sont-elles chiffrées ?
- ✅ **Chiffrement applicatif AES-256-GCM** avec un système de clés à deux niveaux : une clé maîtresse chiffre une clé par donnée (méthode dite « KEK/DEK », recommandée pour la santé).
- ✅ Champs chiffrés : identité, téléphone, e-mail, adresse, n° de sécurité sociale, contenu des RDV.
- ✅ Les **fichiers** (ordonnances, comptes rendus, photos de soins) sont chiffrés un par un sur le disque.
- ✅ Échanges en **HTTPS** (TLS Let's Encrypt).
- ⚠️ La clé maîtresse est dans un fichier de configuration du serveur. Mieux : un coffre-fort de clés (AWS KMS ou équivalent).

### Y a-t-il des sauvegardes ? A-t-on testé une restauration ?
**Mis en place le 29 octobre 2026 :**
- ✅ **Sauvegarde automatique chaque nuit à 03:30** (heure de Paris).
- ✅ **Base complète**, exportée sans interrompre le service, compressée puis **chiffrée en AES-256** avec une clé propre aux sauvegardes.
- ✅ **Contrôle automatique** après chaque sauvegarde : le fichier est entièrement déchiffré et décompressé pour vérifier qu'il est complet et lisible. Sinon, la sauvegarde est marquée en échec.
- ✅ Première sauvegarde réussie le 29 octobre 2026 : 148 Mo chiffrés, en 2 min 30.
- ✅ Les 3 derniers jours sont gardés sur le serveur pour une restauration rapide.
- ✅ Scripts versionnés dans le dépôt (`scripts/backup/`), journal sur le serveur (`/var/log/cary-backup.log`).

- ✅ **Copie hors du serveur vers AWS S3, région Paris, en place depuis le 29 octobre 2026 :**
  - bucket privé `cary-backups-519428392323`, sur le compte AWS de ZENFACT SAS ;
  - accès public bloqué, chiffrement S3 activé, historique des versions activé ;
  - chaque nuit, la base chiffrée y est envoyée. Les fichiers présents sur le disque au 29/10 y ont été copiés ;
  - depuis le 29/10, les documents sont stockés directement sur S3 (bucket `cary-files-519428392323`), **avec l'historique des versions** : un fichier supprimé ou écrasé reste récupérable 30 jours. Le serveur ne peut pas effacer ces anciennes versions ;
  - **conservation de 30 jours** : sauvegardes de la base et anciennes versions de fichiers supprimées automatiquement au-delà ;
  - le serveur n'a qu'un droit **d'écriture** (rôle IAM `cary-server-backup`). Il ne peut ni lire ni supprimer les sauvegardes : même un serveur piraté ne peut pas les effacer ;
  - premier envoi vérifié le 29 octobre 2026 : **7 468 fichiers (6,3 Go), identiques au serveur**, plus la base (148 Mo). Durée totale : 3 min 30.

**À terminer :**
- ⏳ **Clés hors du serveur** : la clé des sauvegardes et la clé maîtresse de chiffrement doivent être copiées dans le coffre-fort de mots de passe de ZENFACT SAS. Sans elles, aucune sauvegarde n'est restaurable.
- ✅ **Test de restauration automatique** (`scripts/backup/cary-restore-test.sh`), programmé la nuit du 30 octobre 2026 puis chaque 1er du mois à 04:30. Il déchiffre la dernière sauvegarde, la restaure dans une base temporaire et compare les tables clés avec la production : profils, RDV, documents, commandes pharmacie, proches. Il supprime ensuite la base temporaire. Le résultat est écrit dans `/var/log/cary-restore-test.log`.
- ⏳ Faire une fois un test de restauration des **fichiers** depuis S3, depuis la console AWS : le serveur ne peut pas relire S3, c'est voulu.

### Un test d'intrusion a-t-il été fait ?
✅ **Un test d'intrusion interne a été réalisé le 29 octobre 2026** sur la production (cary.bio). Les tests étaient non destructifs, menés depuis Internet comme un attaquant extérieur, et complétés par une revue de la configuration du serveur. Un audit interne du code avait déjà été mené en septembre 2026 (dossier `docs/AUDIT-360-*`).

⚠️ Ce test a été réalisé par l'équipe de développement : **il ne remplace pas un test d'intrusion par un prestataire indépendant** (environ 5 000 à 15 000 €), qui sera demandé par un grand compte, un investisseur ou un auditeur HDS.

**Ce qui a résisté :**

| Contrôle | Résultat |
|---|---|
| HTTPS | ✅ Imposé : le HTTP redirige vers le HTTPS. Seuls TLS 1.2 et 1.3 sont acceptés (1.0 et 1.1 refusés). Certificat valide, renouvelé automatiquement. |
| Fichiers sensibles | ✅ Aucun n'est accessible : `.env`, `.git`, journaux, sauvegardes, dossiers de documents médicaux, scripts de test et de débogage, `composer`, `vendor`, `phpinfo`. Tous répondent 404. |
| API sans connexion | ✅ Refusée (401) : liste des patients, utilisateurs, statistiques admin, journaux. |
| Jeton falsifié (JWT « alg: none » se déclarant super admin) | ✅ Rejeté. |
| Injection SQL | ✅ Les requêtes à la base sont paramétrées (requêtes préparées PDO), vérifié dans le code. La tentative dans l'URL a été stoppée dès le contrôle de connexion. |
| CORS (appel de l'API depuis un site tiers) | ✅ Les origines inconnues ne sont pas autorisées. |
| Messages d'erreur | ✅ Génériques : aucune trace technique ni chemin de fichier affiché. |
| Force brute sur la connexion | ✅ Limitée : 15 demandes de code par IP sur 15 minutes, 10 essais de code par compte sur 15 minutes, 20 essais de mot de passe par IP sur 15 minutes. |
| Stockage des secrets de connexion | ✅ Mots de passe et codes hachés en bcrypt. |
| Ports ouverts | ✅ Seuls 22 (SSH), 80 et 443 sont joignables. La base MySQL n'est pas exposée sur Internet. |
| SSH | ✅ Connexion par clé uniquement, mots de passe désactivés. |
| Mises à jour | ✅ PHP 8.2.35 et MySQL 8.0.46 à jour, aucune mise à jour de sécurité en attente sur le serveur. |
| Contrôle des droits entre rôles | ✅ Couvert par environ 1 000 tests automatisés, rejoués avant chaque déploiement. |

**Constats et corrections** (aucune faille critique trouvée). Les corrections ont été appliquées en production le 29 octobre 2026, puis vérifiées : site, API, connexion SSH et sauvegardes toujours fonctionnels.

| Gravité | Constat | État |
|---|---|---|
| Moyenne | **En-têtes de sécurité absents.** | ✅ **Corrigé** : ajout de HSTS (1 an), X-Frame-Options, X-Content-Type-Options et Referrer-Policy sur le site et l'API. ⏳ La Content-Security-Policy reste à définir : il faut d'abord lister les domaines utilisés par le site (Stripe, Google Maps…) pour ne rien casser. |
| Moyenne | **SSH ouvert à tout Internet** (port 22), même s'il n'accepte que des clés. | ✅ Atténué : fail2ban bannit 1 heure après 5 échecs. ⏳ Restreindre le port 22 aux adresses IP de l'équipe, dans le groupe de sécurité AWS (à faire dans la console AWS). |
| Faible | Version du serveur affichée et en-tête `x-powered-by: Nuxt`. | ✅ **Corrigé** : la version n'est plus affichée et l'en-tête est masqué. |
| Faible | Fichier `.DS_Store` public. | ✅ **Corrigé** : fichiers supprimés, et tout fichier caché (`.env`, `.git`, `.DS_Store`…) est désormais refusé par Nginx. |
| Faible | Pare-feu du serveur (ufw) inactif ; site Nuxt joignable sur le port 3000 sans seconde barrière. | ✅ **Corrigé** : pare-feu actif (seuls 22, 80 et 443 sont ouverts). Le port 3000 n'est plus joignable depuis Internet. |
| Faible | Connexion root par clé autorisée ; pas de fail2ban. | ✅ **Corrigé** : `PermitRootLogin no`, fail2ban installé et actif. |
| Faible | Session valable 7 jours. | ⏳ À arbitrer : choix produit, avec un impact sur la reconnexion des utilisateurs. |

La configuration Nginx durcie est versionnée dans `docs/nginx-cary.conf`.

**Non couvert par ce test :**
- les tests authentifiés sur la production avec des comptes de chaque rôle (aujourd'hui couverts par les tests automatisés) ;
- l'analyse de l'application mobile (décompilation) ;
- l'ingénierie sociale ;
- les tests de charge et de déni de service.

### Le RGPD est-il traité ?
- ✅ **Consentement :** un consentement est recueilli quand un professionnel crée ou suit un patient (module « consentement patient »).
- ✅ **Droit à l'effacement :** un patient peut supprimer lui-même son compte depuis l'appli : profil, documents, avis… Une sécurité empêche la suppression si un RDV ou une commande est en cours. Un professionnel fait une demande de suppression, traitée par l'administrateur.
- ✅ **Durée de conservation :** les journaux d'accès sont purgés à 12 mois.
- ⚠️ Il n'y a **pas de règle de conservation automatique** pour les dossiers médicaux, les RDV anciens et les comptes inactifs. Il faut la définir avec un juriste (la durée légale dépend de la nature du document), puis l'automatiser.
- ❓ Le registre des traitements, l'analyse d'impact (AIPD, obligatoire pour des données de santé à grande échelle), le DPO et les contrats de sous-traitance avec chaque service externe relèvent de la société.

### Y a-t-il déjà eu une panne importante ou un incident de sécurité ?
- Aucun incident de sécurité (intrusion, fuite) n'est connu ni visible dans le code.
- Incidents d'exploitation récents, sans fuite de données :
  - **perte de n° RPPS/Adeli** sur des profils professionnels, restaurés par script le 27 octobre 2026 à partir des demandes d'inscription ;
  - le 28 octobre 2026, le serveur web n'avait plus le droit d'écrire dans le dossier des brouillons de RDV. Constaté juste après un déploiement et corrigé le jour même ; on ne sait pas si c'était dû au déploiement ou plus ancien.
- ⚠️ Il n'y a **pas de supervision automatique** (alerte si le site tombe, si le disque se remplit, si des erreurs se multiplient). À mettre en place : un outil de surveillance de disponibilité et des alertes AWS CloudWatch.

---

## 5. La suite : croissance et coûts

### La plateforme tiendrait-elle avec 10 fois plus d'utilisateurs ?
Aujourd'hui, environ **2 100 comptes** : 1 580 patients, 412 infirmiers, 70 professionnels, 17 laboratoires, 9 préleveurs.

Le code tiendrait. **Le serveur, non, en l'état.** Ce qui casserait, dans l'ordre :
1. **La mémoire du serveur.** 2 Go pour le site, l'API et la base de données ensemble, dont la moitié est déjà utilisée. → Machine plus grosse et base séparée (AWS RDS).
2. **Le disque.** ✅ Réglé pour les documents : depuis le 29 octobre 2026, ils sont sur S3, sans limite de taille. Le disque est passé de 70 % à 64 %. Il reste 3,1 Go de fichiers orphelins, qu'aucun document en base ne référence : copiés dans les sauvegardes, à supprimer après validation.
3. **Une seule machine = aucune redondance.** Si elle tombe, tout est coupé, pendant les mises à jour aussi. → Deux serveurs derrière un répartiteur de charge.
4. Le volume de la base (6,8 Go) est à surveiller : certaines tables de journaux grossissent vite.

Aucune réécriture n'est nécessaire : c'est surtout un changement d'infrastructure, qui peut se faire en même temps que la mise en conformité HDS.

### Combien coûtent l'hébergement et les services par mois ?
**Aujourd'hui : environ 50 USD par mois, soit environ 45 € par mois**, hébergement et services compris.

Ce montant couvre :
- le serveur AWS Paris (t3.small, disque de 48 Go), titulaire ZENFACT SAS ;
- les services à l'usage : e-mails (Brevo), SMS (Twilio), assistant IA (xAI), adresses (Google Maps) ;
- les builds mobiles sur le forfait gratuit d'Expo (les builds attendent leur tour dans une file).

Non compris, car payés à part ou prélevés sur les ventes :
- Apple Developer : 99 $ par an ;
- Google Play : 25 $ payés une fois ;
- commissions Stripe, Apple et Google sur les ventes.

À prévoir avec la mise en conformité HDS (hébergement infogéré et sauvegardes) : **150 à 400 € par mois**, selon le prestataire. C'est une estimation de marché, pas un devis.

### Qu'est-ce qui reste à développer pour bien servir les laboratoires ?
Ce qui existe déjà :
- abonnements Lab Starter et Lab Pro ;
- gestion des préleveurs et des sous-comptes ;
- tournées des préleveurs ;
- RDV de prélèvement à domicile ;
- statistiques et dépôt des résultats.

Pistes à valider avec les laboratoires clients (❓ besoin à confirmer) :
- **connexion au logiciel du laboratoire (SIL)** pour recevoir les demandes et renvoyer les résultats automatiquement, au lieu de les déposer à la main ;
- **traçabilité des tubes** : étiquettes, code-barres, heure de prélèvement, conditions de transport ;
- **facturation tiers payant** et lien avec l'Assurance maladie ;
- tableau de bord multi-sites pour les groupes de laboratoires ;
- signature électronique et transmission sécurisée des comptes rendus (messagerie MSSanté).

### Que referait-on différemment en repartant de zéro ?
1. **Démarrer directement sur un hébergeur HDS infogéré**, plutôt qu'un serveur à administrer soi-même.
2. **Mettre en place les sauvegardes et la supervision dès le premier jour.**
3. **Ouvrir aussi GitHub et Expo au nom de la société dès le départ**, comme l'ont été AWS, Apple, Google Play, Stripe et les autres services.
4. **Séparer dès le début** la base de données, les fichiers (stockage objet) et le serveur applicatif.
5. Choisir d'emblée des **fournisseurs européens** pour les SMS, les notifications et l'IA.
6. Utiliser un framework PHP standard (Laravel ou Symfony) plutôt que du PHP sans framework. Le code actuel est propre et testé, mais un framework facilite le recrutement et la reprise.

---

## Plan d'action recommandé

| Priorité | Action | Délai indicatif |
|---|---|---|
| 1 | Sauvegardes : ✅ quotidiennes, chiffrées, copiées sur S3 et testées chaque mois depuis le 29/10. Reste : copier les clés dans le coffre-fort | Cette semaine |
| 1 bis | Durcissements : ✅ en-têtes, pare-feu, fail2ban, root SSH, `.DS_Store`. Reste : SSH limité aux IP de l'équipe (AWS), Content-Security-Policy | 2 semaines |
| 2 | Signer l'attestation de cession (annexe A) ; transférer le dépôt vers le compte GitHub Cary et le projet Expo vers un compte ZENFACT SAS | 2 semaines |
| 3 | Conformité HDS : infogérant HDS sur AWS, ou migration vers un hébergeur HDS clé en main | 1 à 3 mois |
| 4 | SMS via un fournisseur UE avec contenu minimal ; IA via un fournisseur UE ; vérifier le texte des notifications | 1 mois |
| 5 | Supervision et alertes (disponibilité, disque, erreurs) | 2 semaines |
| 6 | Fichiers : ✅ sur S3 depuis le 29/10. Reste : base de données séparée du serveur (RDS) | Avec le point 3 |
| 7 | Test d'intrusion par un prestataire indépendant | Avant levée de fonds ou grand compte |
| 8 | Règles de conservation des données de santé (avec un juriste) + AIPD | 1 à 2 mois |

---

## Annexe A — Attestation de cession des droits (modèle)

> **Modèle à faire relire par l'avocat de ZENFACT SAS avant signature.** Il ne remplace pas un conseil juridique.

**ATTESTATION DE CESSION DE DROITS DE PROPRIÉTÉ INTELLECTUELLE**

Entre :

**Startbiz LLC**, License n° 2218328.01, représentée par ____________________, ci-après « le Cédant » ;

et :

**ZENFACT SAS**, immatriculée sous le n° SIREN 927 659 508, dont le siège est situé 230 B avenue Corot, 13014 Marseille, représentée par Mme Shany Amar, Présidente, ci-après « le Cessionnaire ».

**Article 1 — Objet.** Le Cédant cède au Cessionnaire, à titre exclusif, l'ensemble des droits patrimoniaux d'auteur sur les créations qu'il a réalisées pour la plateforme **Cary** (ci-après « les Créations ») :
- le code source et le code objet du site web, des applications mobiles iOS et Android, de l'API et des scripts ;
- les schémas et migrations de base de données ;
- la documentation, les maquettes, les éléments graphiques et les textes ;
- toutes les versions passées, présentes et futures réalisées dans le cadre de la prestation.

**Article 2 — Droits cédés.** Les droits de reproduction, de représentation, d'adaptation, de modification, de traduction, d'arrangement, de correction, d'intégration dans d'autres logiciels, de commercialisation, de distribution (y compris sur l'App Store et Google Play), de mise à disposition du public et de sous-licence, sur tout support et par tout moyen, connu ou inconnu à ce jour.

**Article 3 — Étendue.** La cession vaut pour le monde entier et pour toute la durée légale de protection des droits d'auteur.

**Article 4 — Prix.** La cession est comprise dans le prix de la prestation de développement déjà facturée et réglée. Elle ne donne lieu à aucune rémunération supplémentaire.

**Article 5 — Comptes et accès.** Le Cédant s'engage à transférer au Cessionnaire, ou à remettre sur simple demande, les dépôts de code, les comptes de service, les clés et les accès techniques liés à Cary. Il s'engage aussi à n'en conserver aucune copie au-delà de ce qui est nécessaire à la poursuite de sa mission.

**Article 6 — Composants tiers.** Les bibliothèques open source utilisées restent soumises à leurs licences respectives. Le Cédant garantit qu'elles permettent l'usage commercial de Cary.

**Article 7 — Garantie.** Le Cédant garantit être l'auteur des Créations, ou titulaire des droits sur celles-ci, et qu'elles ne portent pas atteinte aux droits d'un tiers.

Fait à ____________________, le ____ / ____ / ________, en deux exemplaires.

| Pour Startbiz LLC | Pour ZENFACT SAS |
|---|---|
| Nom : | Shany Amar, Présidente |
| Signature : | Signature : |

---

*Sources sur la certification HDS d'AWS : [AWS – Hébergeur de données de santé](https://aws.amazon.com/fr/compliance/hds/), [Le Monde Informatique – « AWS certifié HDS, oui mais »](https://www.lemondeinformatique.fr/actualites/lire-aws-certifie-hebergeur-de-donnees-de-sante-oui-mais-74667.html).*
