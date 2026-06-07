#!/bin/bash

# Script de démarrage du serveur API OneAndLab V2
# Usage: ./start-server.sh [port]

PORT=${1:-8888}

echo "🚀 Démarrage du serveur API OneAndLab V2 sur le port $PORT..."
echo ""
echo "📍 URL: http://localhost:$PORT"
echo "📁 Dossier: $(pwd)"
echo ""
echo "Appuyez sur Ctrl+C pour arrêter le serveur"
echo ""

# Vérifier que nous sommes dans le bon dossier
if [ ! -f "index.php" ]; then
    echo "❌ Erreur: index.php non trouvé. Assurez-vous d'être dans le dossier backend/"
    exit 1
fi

# Démarrer le serveur PHP avec le routeur (utilise php du PATH : MAMP, Homebrew, etc.)
# Utiliser 0.0.0.0 pour écouter sur toutes les interfaces (IPv4)
PHP_BIN=$(command -v php 2>/dev/null) || PHP_BIN="/Applications/MAMP/bin/php/php8.3.14/bin/php"
if [ -z "$PHP_BIN" ] || [ ! -x "$PHP_BIN" ]; then
    echo "❌ Erreur: PHP introuvable. Installez PHP ou configurez le chemin dans ce script."
    exit 1
fi
exec "$PHP_BIN" -S 0.0.0.0:$PORT index.php

