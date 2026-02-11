#!/bin/bash

# Script pour tuer tous les processus sur les ports utilisés par le projet
# Usage: ./kill-ports.sh [port1] [port2] ...

PORTS=(8888 3000 8000)

# Si des ports sont passés en argument, les utiliser
if [ $# -gt 0 ]; then
    PORTS=("$@")
fi

echo "🔪 Arrêt des processus sur les ports..."
echo ""

for PORT in "${PORTS[@]}"; do
    PIDS=$(lsof -ti:$PORT 2>/dev/null)
    
    if [ -z "$PIDS" ]; then
        echo "✅ Port $PORT: Aucun processus actif"
    else
        echo "🛑 Port $PORT: Arrêt des processus $(echo $PIDS | tr '\n' ' ')"
        kill -9 $PIDS 2>/dev/null
        sleep 0.5
        
        # Vérifier si les processus sont bien arrêtés
        if lsof -ti:$PORT >/dev/null 2>&1; then
            echo "   ⚠️  Certains processus résistent, tentative forcée..."
            kill -9 $(lsof -ti:$PORT) 2>/dev/null
        fi
        
        if lsof -ti:$PORT >/dev/null 2>&1; then
            echo "   ❌ Port $PORT: Échec de l'arrêt"
        else
            echo "   ✅ Port $PORT: Libéré"
        fi
    fi
done

echo ""
echo "✅ Terminé"




