#!/bin/bash
# Script pour voir les logs des appointments

LOG_FILE="logs/appointments.log"

if [ -f "$LOG_FILE" ]; then
    echo "=== Dernières lignes du log appointments.log ==="
    echo ""
    tail -n 100 "$LOG_FILE"
else
    echo "Le fichier de log $LOG_FILE n'existe pas encore."
    echo "Il sera créé automatiquement lors de la première requête."
fi




