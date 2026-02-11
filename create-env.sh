#!/bin/bash

# Script pour créer les fichiers .env (backend et frontend) avec toutes les variables nécessaires

BACKEND_ENV_FILE="backend/.env"
FRONTEND_ENV_FILE="frontend/.env"

# Fonction pour générer une clé hexadécimale
generate_hex_key() {
    if command -v openssl &> /dev/null; then
        openssl rand -hex 32
    elif command -v python3 &> /dev/null; then
        python3 -c "import secrets; print(secrets.token_hex(32))"
    else
        echo "❌ Erreur: openssl ou python3 requis pour générer les clés"
        exit 1
    fi
}

# Fonction pour générer un secret JWT
generate_jwt_secret() {
    if command -v openssl &> /dev/null; then
        openssl rand -base64 64 | tr -d '\n'
    elif command -v python3 &> /dev/null; then
        python3 -c "import secrets, base64; print(base64.b64encode(secrets.token_bytes(48)).decode())"
    else
        echo "❌ Erreur: openssl ou python3 requis pour générer les clés"
        exit 1
    fi
}

# Vérifier si les fichiers .env existent déjà
if [ -f "$BACKEND_ENV_FILE" ] || [ -f "$FRONTEND_ENV_FILE" ]; then
    echo "⚠️  Des fichiers .env existent déjà."
    read -p "Voulez-vous les remplacer ? (o/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[OoYy]$ ]]; then
        echo "❌ Annulé."
        exit 0
    fi
fi

# Générer les clés
KEK_HEX=$(generate_hex_key)
JWT_SECRET=$(generate_jwt_secret)

# Créer le fichier .env du backend
cat > "$BACKEND_ENV_FILE" << EOF
# ============================================================================
# Configuration Backend - OneAndLab V2
# ============================================================================

# Base de Données MySQL (MAMP)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=oneandlab
DB_USER=root
DB_PASS=

# Chiffrement HDS (Key Encryption Key)
# Générée automatiquement - NE PAS PARTAGER cette clé
BACKEND_KEK_HEX=$KEK_HEX

# JWT Secret (pour les tokens d'authentification)
# Généré automatiquement - NE PAS PARTAGER cette clé
JWT_SECRET=$JWT_SECRET

# CORS (origines autorisées, séparées par des virgules)
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8888

# Configuration SMTP (Email OVH)
# IMPORTANT: Modifiez SMTP_PASS avec votre mot de passe réel après génération
SMTP_HOST=pro3.mail.ovh.net
SMTP_PORT=587
SMTP_USER=contact@oneandlab.fr
SMTP_PASS=CHANGEZ_MOI_APRES_GENERATION
SMTP_SECURE=false
SMTP_FROM_EMAIL=contact@oneandlab.fr
SMTP_FROM_NAME=OneAndLab
EMAIL_FROM=contact@oneandlab.fr

# URL du Frontend (pour les liens dans les emails)
FRONTEND_URL=http://localhost:3000

# Configuration Twilio (SMS - optionnel pour le développement)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=

# Stockage des fichiers (chemin absolu ou relatif depuis la racine du projet)
UPLOAD_DIR=uploads
EOF

# Créer le fichier .env du frontend
cat > "$FRONTEND_ENV_FILE" << EOF
# ============================================================================
# Configuration Frontend - OneAndLab V2
# ============================================================================

# URL de l'API Backend
API_BASE_URL=http://localhost:8888/api
EOF

echo "✅ Fichiers .env créés avec succès !"
echo ""
echo "📁 Backend: $(pwd)/$BACKEND_ENV_FILE"
echo "📁 Frontend: $(pwd)/$FRONTEND_ENV_FILE"
echo ""
echo "🔑 Clés générées:"
echo "   - KEK_HEX: ${KEK_HEX:0:16}..."
echo "   - JWT_SECRET: ${JWT_SECRET:0:16}..."
echo ""
echo "⚠️  IMPORTANT:"
echo "   - Ne partagez JAMAIS ces fichiers .env (ils contiennent des clés secrètes)"
echo "   - Les fichiers .env sont déjà dans .gitignore pour votre sécurité"
echo "   - Configurez SMTP_USER et SMTP_PASS pour l'envoi d'emails"
echo "   - Configurez Twilio si vous voulez envoyer des SMS"

