# OneAndLab V2

Plateforme de gestion de rendez-vous médicaux à domicile (prises de sang + soins infirmiers), conforme aux normes HDS (Hébergement de Données de Santé) et RGPD.

## Architecture

- **Backend** : PHP 8.2+ avec API REST
- **Base de données** : MySQL 8.0+
- **Frontend** : Nuxt 3 + Nuxt UI + Tailwind CSS

## Installation

### Backend

1. Installer les dépendances PHP :
```bash
composer install
```

2. Configurer les variables d'environnement :
```bash
cp .env.example .env
# Éditer .env avec vos valeurs
```

3. Générer les clés de chiffrement :
```bash
# KEK (Key Encryption Key)
openssl rand -hex 32

# JWT Secret
openssl rand -hex 32
```

4. Créer la base de données et exécuter les migrations :
```bash
mysql -u root -p < database/migrations/001_create_profiles.sql
# Répéter pour toutes les migrations...
mysql -u root -p < database/seeds/initial_data.sql
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Structure du projet

Voir `prompt.txt` pour la documentation complète.

## Conformité HDS

- Chiffrement AES-256-GCM de tous les champs PII
- Enveloppe encryption (KEK/DEK)
- Logs de traçabilité dans `access_logs`
- Rotation mensuelle de la KEK recommandée

## Licence

Propriétaire - OneAndLab
