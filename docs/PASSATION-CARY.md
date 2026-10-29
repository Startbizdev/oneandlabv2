# Cary : document de passation

Ce document permet à un développeur de reprendre l'exploitation de Cary. Il ne contient **aucun secret** : seulement où les trouver et comment opérer.

---

## 1. Comptes de service (tous au nom de ZENFACT SAS)

| Service | Usage | Où se connecter |
|---|---|---|
| GitHub (compte Cary) | Code source | https://github.com |
| AWS (région Paris, eu-west-3) | Serveur EC2, stockage S3, coffre-fort de secrets | https://console.aws.amazon.com |
| Domaine cary.bio | DNS | Registrar du domaine |
| Apple Developer / App Store Connect | Application iPhone | https://appstoreconnect.apple.com |
| Google Play Console | Application Android | https://play.google.com/console |
| Stripe | Abonnements web | https://dashboard.stripe.com |
| Brevo | E-mails et SMS | https://app.brevo.com |
| Twilio | SMS de secours | https://console.twilio.com |
| Google Cloud (Maps) | Recherche d'adresses | https://console.cloud.google.com |
| xAI | Assistant IA | https://console.x.ai |
| Expo (EAS) | Compilation et envoi des applications mobiles | https://expo.dev |

---

## 2. Où sont les secrets

- **Coffre-fort AWS** : AWS Systems Manager → Parameter Store (région Paris), paramètres `/cary/prod/*`, chiffrés (SecureString).
  - `backend-kek` : clé maîtresse de chiffrement des données ;
  - `legacy-encryption-key` : ancienne clé (lecture des données anciennes) ;
  - `backup-key` : clé de chiffrement des sauvegardes ;
  - `jwt-secret` : signature des sessions ;
  - `apple-iap-p8` : clé Apple des achats intégrés ;
  - `env-part1` et `env-part2` : configuration complète du serveur (`.env`), en deux morceaux. Pour reconstituer le fichier, mettre les deux bout à bout.
- **Sur le serveur** : `/var/www/oneandlab/.env` (configuration), `/root/.cary-backup.key` (clé des sauvegardes), `/var/www/oneandlab/persistent/keys/` (clé Apple).
- Le coffre-fort est mis à jour automatiquement chaque nuit, si un secret a changé.
- **Sans la clé maîtresse et la clé des sauvegardes, les données chiffrées et les sauvegardes sont illisibles.**

---

## 3. Architecture en production

| Élément | Où |
|---|---|
| Serveur | AWS EC2 (Ubuntu 24.04), région Paris, accès SSH par clé, utilisateur `ubuntu` |
| Site web (Nuxt) | `/var/www/oneandlab/frontend`, processus PM2 `oneandlab-frontend` (port 3000, local) |
| API (PHP 8.2) | `/var/www/oneandlab/backend`, servie par Nginx + PHP-FPM |
| Base de données | MySQL sur le serveur |
| Documents | AWS S3 `cary-files-519428392323` (versionné) |
| Sauvegardes et archives | AWS S3 `cary-backups-519428392323` |
| Configuration Nginx | `docs/nginx-cary.conf` (copie de `/etc/nginx/sites-enabled/cary.bio`) |

---

## 4. Déployer

Depuis un poste avec le dépôt et la clé SSH du serveur :

- **API seulement** : `bash scripts/deploy-backend-only.sh`
- **Site web seulement** : `bash scripts/deploy-frontend-release.sh`
- **Version complète avec contrôle de la base** : `bash scripts/deploy-safe-release.sh`

Avant chaque déploiement, les tests doivent passer :
- API : `npm run test:backend`
- Web : `npm run typecheck -w oneandlab-frontend` et `npm run test:unit -w oneandlab-frontend`
- Mobile : `npm run mobile:verify`

---

## 5. Publier les applications mobiles

Depuis `apps/mobile` :

- **iPhone** :
  1. Si la version actuelle est déjà publiée, monter la version avec `node scripts/bump-ios-store-version.cjs`.
  2. Lancer `SKIP_IOS_VERSION_BUMP=1 node scripts/run-eas-ios.cjs build --platform ios --profile production --clear-cache --auto-submit --non-interactive`.
- **Android** : `node scripts/run-eas-android.cjs build --platform android --profile production --auto-submit --non-interactive`. L'envoi se fait sur la piste interne de Google Play, à promouvoir ensuite dans la Play Console.

---

## 6. Tâches automatiques du serveur

| Quand | Quoi | Journal |
|---|---|---|
| Toutes les 5 minutes | Supervision (site, API, disque, mémoire, sauvegarde) avec alerte par e-mail | `/var/log/cary-monitor.log` |
| Chaque nuit à 03:30 | Sauvegarde chiffrée de la base vers S3, puis mise à jour du coffre-fort | `/var/log/cary-backup.log` |
| Chaque dimanche à 04:00 | Nettoyage du serveur (anciennes versions, journaux, paquets) | `/var/log/cary-housekeeping.log` |
| Le 1er du mois à 04:30 | Test de restauration de la sauvegarde | `/var/log/cary-restore-test.log` |
| Le 2 du mois à 04:00 | Archivage du journal d'accès sur S3 | `/var/log/cary-archive-access-logs.log` |

Les scripts sont dans `scripts/backup/`, `scripts/maintenance/` et `scripts/monitoring/`, avec chacun un script d'installation.

---

## 7. Restaurer

**Base de données** (en root sur le serveur) :
1. Prendre la dernière sauvegarde : dans `/var/backups/oneandlab/daily/`, ou la télécharger depuis la console S3 (`cary-backups-519428392323/db/`).
2. La déchiffrer et la restaurer : `openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass file:/root/.cary-backup.key -in FICHIER.sql.zst.enc | zstd -dq | mysql NOM_DE_LA_BASE`.

**Document supprimé ou écrasé** : dans la console S3, bucket `cary-files-519428392323`, activer « Afficher les versions » et restaurer la version précédente. Elle est disponible pendant 30 jours.

**Serveur entièrement perdu** :
1. Créer un nouveau serveur EC2 Ubuntu en région Paris, avec le rôle IAM `cary-server-backup`.
2. Installer Nginx, PHP 8.2, MySQL, Node.js et PM2.
3. Récupérer le code depuis GitHub et la configuration (`.env` + clés) depuis le coffre-fort.
4. Restaurer la base (voir ci-dessus) et déployer.
5. Les documents sont déjà sur S3 : rien à restaurer de ce côté.

---

## 8. Points d'attention

- **Ne jamais déployer** de modification de base sans passer par `deploy-safe-release.sh`, qui fait une copie de la base avant.
- Le **journal d'accès** (`access_logs`) ne doit jamais être vidé : c'est la traçabilité HDS. Il est archivé chaque mois sur S3.
- Les **anciennes versions** du site et les copies de déploiement sont nettoyées automatiquement : seules les 3 dernières sont gardées.
