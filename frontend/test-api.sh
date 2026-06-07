#!/bin/bash

# Script de test pour valider les endpoints API
# Usage: ./test-api.sh

API_BASE="http://localhost:8888/api"
TEST_EMAIL="test@example.com"

echo "🧪 Tests API - Backend PHP"
echo "=========================="
echo ""
echo "Base URL: $API_BASE"
echo ""

# Fonction pour afficher le résultat d'un test
test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    
    echo "📋 Test: $name"
    echo "   $method $endpoint"
    
    if [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$API_BASE$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X GET \
            "$API_BASE$endpoint")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo "   ✅ Succès (HTTP $http_code)"
        echo "   Réponse: $body" | head -c 200
        echo ""
    elif [ "$http_code" -ge 400 ] && [ "$http_code" -lt 500 ]; then
        echo "   ⚠️  Erreur client (HTTP $http_code) - Peut être normal selon le contexte"
        echo "   Réponse: $body" | head -c 200
        echo ""
    else
        echo "   ❌ Erreur serveur (HTTP $http_code)"
        echo "   Réponse: $body" | head -c 200
        echo ""
    fi
    echo ""
}

# Test 1: POST /auth/request-otp
test_endpoint "Request OTP" "POST" "/auth/request-otp" "{\"email\":\"$TEST_EMAIL\"}"

# Test 2: POST /auth/verify-otp (va échouer car pas de vrai OTP, mais teste la connexion)
test_endpoint "Verify OTP" "POST" "/auth/verify-otp" "{\"user_id\":\"1\",\"otp\":\"123456\"}"

# Test 3: GET /users (va échouer car pas authentifié, mais teste la connexion)
test_endpoint "Get Users" "GET" "/users" ""

# Test 4: GET /appointments (va échouer car pas authentifié, mais teste la connexion)
test_endpoint "Get Appointments" "GET" "/appointments" ""

echo "=========================="
echo "✅ Tests terminés"
echo ""
echo "Note: Les erreurs 401/403 sont normales si vous n'êtes pas authentifié."
echo "L'important est que les requêtes atteignent bien le serveur (pas de 'Failed to fetch')."




