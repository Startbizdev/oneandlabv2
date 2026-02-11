# Setup de la Base de Données - OneAndLab V2

Ce guide explique comment configurer la base de données pour le développement local avec MAMP et phpMyAdmin.

## 📋 Prérequis

1. **MAMP** installé et démarré
2. **phpMyAdmin** accessible (généralement sur `http://localhost:8888/phpMyAdmin5/`)
3. **PHP** configuré dans MAMP
4. Variable d'environnement `BACKEND_KEK_HEX` configurée (clé de chiffrement)

## 🔧 Configuration

### 1. Créer les fichiers `.env` (backend et frontend)

**Méthode automatique (recommandée)** :

```bash
./create-env.sh
```

Ou avec le script PHP :

```bash
php generate-env.php
```

Ces scripts créent automatiquement :
- `.env` à la racine (backend) avec toutes les variables nécessaires
- `frontend/.env` (frontend) avec la configuration API

**Méthode manuelle** :

Copiez les fichiers `.env.example` et remplissez les valeurs :

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env
```

Puis éditez les fichiers pour configurer les valeurs.

#### Variables Backend (`.env`)

| Variable | Description | Valeur par défaut | Requis |
|----------|-------------|-------------------|--------|
| `DB_HOST` | Hôte MySQL | `localhost` | ✅ |
| `DB_PORT` | Port MySQL | `3306` | ✅ |
| `DB_NAME` | Nom de la base | `oneandlab` | ✅ |
| `DB_USER` | Utilisateur MySQL | `root` | ✅ |
| `DB_PASS` | Mot de passe MySQL | (vide) | ✅ |
| `BACKEND_KEK_HEX` | Clé de chiffrement HDS (64 caractères hex) | (généré) | ✅ |
| `JWT_SECRET` | Secret pour les tokens JWT | (généré) | ✅ |
| `CORS_ALLOWED_ORIGINS` | Origines autorisées (séparées par virgules) | `http://localhost:3000,http://localhost:8888` | ✅ |
| `SMTP_HOST` | Serveur SMTP | `ssl0.ovh.net` | ✅ |
| `SMTP_PORT` | Port SMTP | `465` | ✅ |
| `SMTP_USER` | Utilisateur SMTP | (vide) | ⚠️ Pour emails |
| `SMTP_PASS` | Mot de passe SMTP | (vide) | ⚠️ Pour emails |
| `SMTP_FROM_EMAIL` | Email expéditeur | `noreply@oneandlab.fr` | ✅ |
| `SMTP_FROM_NAME` | Nom expéditeur | `OneAndLab` | ✅ |
| `FRONTEND_URL` | URL du frontend (pour liens emails) | `http://localhost:3000` | ✅ |
| `TWILIO_ACCOUNT_SID` | Compte Twilio (SMS) | (vide) | ⚪ Optionnel |
| `TWILIO_AUTH_TOKEN` | Token Twilio | (vide) | ⚪ Optionnel |
| `TWILIO_FROM_NUMBER` | Numéro Twilio | (vide) | ⚪ Optionnel |
| `UPLOAD_DIR` | Dossier de stockage des fichiers | `uploads` | ✅ |

#### Variables Frontend (`frontend/.env`)

| Variable | Description | Valeur par défaut | Requis |
|----------|-------------|-------------------|--------|
| `API_BASE_URL` | URL de l'API backend | `http://localhost:8888/api` | ✅ |

**Génération manuelle des clés** :

```bash
# KEK_HEX (64 caractères hexadécimaux)
openssl rand -hex 32

# JWT_SECRET (base64)
openssl rand -base64 64
```

### 2. Exécuter les migrations

**Méthode 1 : Via phpMyAdmin (Recommandé pour les migrations)**

1. Ouvrez phpMyAdmin : `http://localhost:8888/phpMyAdmin5/`
2. Sélectionnez l'onglet "SQL"
3. Copiez-collez le contenu du fichier `database/all-migrations.sql`
4. Cliquez sur "Exécuter"
5. Les tables seront créées avec les données initiales (catégories de soins)

**Méthode 2 : Via le script PHP (Automatique - migrations + utilisateurs)**

Le script PHP exécute toutes les migrations ET crée les utilisateurs de test :

```bash
cd backend
php setup-database.php
```

Ou via navigateur :
```
http://localhost:8888/backend/setup-database.php
```

## 👥 Utilisateurs de Test Créés

Après l'exécution du script PHP, les utilisateurs suivants seront créés :

| Email | Rôle | Description |
|-------|------|-------------|
| `admin@oneandlab.fr` | `super_admin` | Administrateur principal |
| `lab@oneandlab.fr` | `lab` | Laboratoire |
| `subaccount@oneandlab.fr` | `subaccount` | Sous-compte |
| `preleveur@oneandlab.fr` | `preleveur` | Préleveur |
| `infirmier@oneandlab.fr` | `nurse` | Infirmier |
| `pro@oneandlab.fr` | `pro` | Professionnel |
| `patient@oneandlab.fr` | `patient` | Patient |

**Note** : Tous les mots de passe doivent être configurés via le système d'authentification OTP (One-Time Password).

## 🔐 Chiffrement des Données

Toutes les données sensibles (emails, noms, téléphones, etc.) sont chiffrées avec AES-256-GCM conformément aux normes HDS (Hébergeur de Données de Santé).

- Chaque champ a sa propre clé de chiffrement (DEK - Data Encryption Key)
- Les DEK sont chiffrées avec la KEK (Key Encryption Key) stockée dans les variables d'environnement
- Les emails sont également hashés (SHA256) pour permettre la recherche sans déchiffrement

## 📁 Structure des Fichiers

```
database/
├── migrations/          # Migrations SQL individuelles
│   ├── 001_create_profiles.sql
│   ├── 002_create_appointments.sql
│   └── ...
├── seeds/              # Données initiales
│   └── initial_data.sql
├── all-migrations.sql  # Toutes les migrations en un seul fichier
└── README-SETUP.md     # Ce fichier

backend/
└── setup-database.php  # Script PHP pour setup complet
```

## 🚀 Utilisation

### Réinitialiser la base de données

Si vous devez réinitialiser complètement la base :

1. Dans phpMyAdmin, supprimez la base `oneandlab`
2. Réexécutez le script SQL ou le script PHP

### Ajouter de nouvelles migrations

1. Créez un nouveau fichier dans `database/migrations/` avec le numéro suivant
2. Ajoutez le contenu dans `database/all-migrations.sql`
3. Réexécutez les migrations

## ⚠️ Notes Importantes

- **Ne jamais** commiter la clé `BACKEND_KEK_HEX` dans le dépôt Git
- Les utilisateurs créés sont pour le **développement uniquement**
- En production, utilisez des processus sécurisés pour créer les comptes administrateurs
- Le système d'authentification utilise OTP (One-Time Password) envoyé par email/SMS

## 🐛 Dépannage

### Erreur "KEK non configurée"
- Vérifiez que le fichier `.env` existe et contient `BACKEND_KEK_HEX`
- Vérifiez que la valeur est une chaîne hexadécimale de 64 caractères

### Erreur de connexion à la base de données
- Vérifiez que MAMP est démarré
- Vérifiez les paramètres dans `.env` (host, port, user, password)
- Par défaut, MAMP utilise `root` sans mot de passe

### Erreur "Table already exists"
- C'est normal si vous réexécutez les migrations
- Les migrations utilisent `CREATE TABLE IF NOT EXISTS` pour éviter les erreurs

## 📞 Support

Pour toute question ou problème, consultez la documentation du projet ou contactez l'équipe de développement.

