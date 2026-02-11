#!/bin/bash

# Script pour vérifier les logs du serveur backend
# Usage: ./check-logs.sh

echo "🔍 Vérification des logs backend"
echo "================================"
echo ""

# Vérifier où PHP écrit ses logs
PHP_ERROR_LOG=$(php -i 2>/dev/null | grep "error_log" | head -1 | awk '{print $3}')

if [ -z "$PHP_ERROR_LOG" ] || [ "$PHP_ERROR_LOG" = "no value" ]; then
    echo "⚠️  PHP error_log non configuré"
    echo ""
    echo "Les logs sont probablement affichés dans la console où le serveur est démarré."
    echo ""
    echo "Pour voir les logs en temps réel:"
    echo "1. Démarrez le serveur dans un terminal:"
    echo "   cd backend && ./start-server.sh"
    echo ""
    echo "2. Dans un autre terminal, surveillez les logs système:"
    echo "   tail -f /var/log/system.log  # macOS"
    echo "   ou regardez directement la console du serveur"
else
    echo "✅ PHP error_log configuré: $PHP_ERROR_LOG"
    echo ""
    echo "📋 Dernières lignes des logs:"
    echo "----------------------------"
    if [ -f "$PHP_ERROR_LOG" ]; then
        tail -50 "$PHP_ERROR_LOG" | grep -E "(REQUEST-OTP|INDEX.PHP)" || echo "Aucun log récent trouvé"
    else
        echo "Le fichier de log n'existe pas encore"
    fi
fi

echo ""
echo "💡 Pour voir les logs en temps réel pendant que le serveur tourne:"
echo "   - Regardez la console où vous avez démarré le serveur avec ./start-server.sh"
echo "   - Les logs error_log() s'affichent directement dans cette console"
echo ""




