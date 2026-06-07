#!/bin/bash

# Script de test pour simuler un upload HTTP réel

echo "=== TEST UPLOAD HTTP RÉEL ==="
echo ""

# 1. Créer un fichier de test
TEST_FILE="/tmp/test-carte-vitale.txt"
echo "Ceci est un fichier de test pour la carte vitale" > "$TEST_FILE"
echo "✅ Fichier de test créé: $TEST_FILE"
echo ""

# 2. Login pour obtenir un token
echo "📝 Login pour obtenir un token..."
LOGIN_RESPONSE=$(curl -s -X POST "http://localhost:8888/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@oneandlab.fr",
    "password": "Patient123!"
  }')

echo "Réponse login: $LOGIN_RESPONSE"
echo ""

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | sed 's/"token":"//;s/"//')

if [ -z "$TOKEN" ]; then
  echo "❌ ERREUR: Impossible d'obtenir le token"
  echo "Créez d'abord un patient avec:"
  echo "  php backend/setup-database.php"
  exit 1
fi

echo "✅ Token obtenu: ${TOKEN:0:20}..."
echo ""

# 3. Obtenir le token CSRF
echo "📝 Obtention du token CSRF..."
CSRF_RESPONSE=$(curl -s -X POST "http://localhost:8888/api/csrf/token" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN")

echo "Réponse CSRF: $CSRF_RESPONSE"
echo ""

CSRF_TOKEN=$(echo "$CSRF_RESPONSE" | grep -o '"token":"[^"]*"' | sed 's/"token":"//;s/"//')

if [ -z "$CSRF_TOKEN" ]; then
  echo "❌ ERREUR: Impossible d'obtenir le token CSRF"
  exit 1
fi

echo "✅ Token CSRF obtenu: ${CSRF_TOKEN:0:20}..."
echo ""

# 4. Upload du document
echo "📤 Upload du document..."
UPLOAD_RESPONSE=$(curl -s -X POST "http://localhost:8888/api/patient-documents/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -F "file=@$TEST_FILE" \
  -F "document_type=carte_vitale")

echo "Réponse upload:"
echo "$UPLOAD_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$UPLOAD_RESPONSE"
echo ""

# 5. Vérifier si l'upload a réussi
if echo "$UPLOAD_RESPONSE" | grep -q '"success":true'; then
  echo "✅ Upload réussi!"
  
  # 6. Récupérer les documents
  echo ""
  echo "📥 Récupération des documents..."
  DOCS_RESPONSE=$(curl -s -X GET "http://localhost:8888/api/patient-documents" \
    -H "Authorization: Bearer $TOKEN")
  
  echo "Documents disponibles:"
  echo "$DOCS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$DOCS_RESPONSE"
  echo ""
  
  # 7. Vérifier les fichiers sur le disque
  echo "📁 Vérification des fichiers sur le disque..."
  ls -lah /Users/alessandro/Documents/onev2/backend/uploads/medical/
  echo ""
  
  # Compter les dossiers (sauf celui de test)
  COUNT=$(find /Users/alessandro/Documents/onev2/backend/uploads/medical/ -mindepth 1 -maxdepth 1 -type d ! -name "test-*" | wc -l)
  echo "Nombre de documents uploadés: $COUNT"
  
else
  echo "❌ Upload échoué!"
  echo "$UPLOAD_RESPONSE"
fi

# Nettoyer
rm -f "$TEST_FILE"




