#!/bin/bash

# Script pour démarrer MySQL via MAMP
# Usage: ./start-mysql.sh

MAMP_MYSQL="/Applications/MAMP/Library/bin/mysql"
MAMP_START="/Applications/MAMP/bin/startApache.sh"

echo "🔍 Vérification de MAMP..."

# Vérifier si MAMP est installé
if [ ! -d "/Applications/MAMP" ]; then
    echo "❌ MAMP n'est pas installé dans /Applications/MAMP"
    echo "   Installez MAMP depuis https://www.mamp.info/"
    exit 1
fi

# Vérifier si MySQL est déjà démarré
if ps aux | grep -i "[m]ysqld" > /dev/null; then
    echo "✅ MySQL est déjà démarré"
    
    # Tester la connexion
    if $MAMP_MYSQL -u root -e "SELECT 1" > /dev/null 2>&1; then
        echo "✅ Connexion MySQL réussie"
        echo ""
        echo "📊 Informations MySQL:"
        $MAMP_MYSQL -u root -e "SELECT VERSION() as version;" 2>/dev/null || echo "   (connexion en cours de test...)"
    else
        echo "⚠️  MySQL semble démarré mais la connexion échoue"
        echo "   Essayez de démarrer MAMP depuis l'interface graphique"
    fi
    exit 0
fi

echo "🚀 Démarrage de MAMP..."

# Méthode 1: Démarrer via l'interface MAMP (recommandé)
if [ -f "/Applications/MAMP/MAMP.app/Contents/MacOS/MAMP" ]; then
    echo "   Ouverture de l'interface MAMP..."
    open -a MAMP
    echo ""
    echo "✅ MAMP devrait démarrer dans quelques secondes"
    echo "   Vérifiez que les serveurs Apache et MySQL sont démarrés (boutons verts)"
    echo ""
    echo "🌐 Accès:"
    echo "   - Interface MAMP: http://localhost:8888/MAMP/"
    echo "   - phpMyAdmin: http://localhost:8888/phpMyAdmin5/"
else
    echo "⚠️  Interface MAMP non trouvée"
    echo "   Démarrez MAMP manuellement depuis Applications > MAMP"
fi

echo ""
echo "⏳ Attente de 5 secondes pour que MySQL démarre..."
sleep 5

# Tester la connexion
if $MAMP_MYSQL -u root -e "SELECT 1" > /dev/null 2>&1; then
    echo "✅ MySQL est démarré et accessible"
    echo ""
    echo "📊 Test de connexion:"
    $MAMP_MYSQL -u root -e "SELECT VERSION() as version;" 2>/dev/null
else
    echo "⚠️  MySQL n'est pas encore accessible"
    echo "   Attendez quelques secondes de plus ou vérifiez MAMP"
fi




