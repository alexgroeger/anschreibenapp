#!/bin/bash

# Lokaler Test für Cloud Storage Integration
# Testet die API-Endpoints und Funktionalität ohne echten Cloud Storage Bucket

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== Lokaler Test: Cloud Storage Integration ===${NC}\n"

BASE_URL="${1:-http://localhost:3000}"

echo -e "Testing against: ${GREEN}$BASE_URL${NC}\n"

# Test 1: Status-Endpoint (ohne Cloud Storage)
echo -e "${YELLOW}Test 1: Status-Endpoint (ohne Cloud Storage)${NC}"
STATUS_RESPONSE=$(curl -s "$BASE_URL/api/admin/database/sync" || echo "ERROR")
if echo "$STATUS_RESPONSE" | grep -q "cloudStorageConfigured"; then
    echo -e "${GREEN}✓ Status-Endpoint funktioniert${NC}"
    echo "Response: $(echo $STATUS_RESPONSE | jq -r '.message' 2>/dev/null || echo $STATUS_RESPONSE)"
else
    echo -e "${RED}✗ Status-Endpoint Fehler${NC}"
    echo "Response: $STATUS_RESPONSE"
fi
echo ""

# Test 2: App läuft
echo -e "${YELLOW}Test 2: App Health Check${NC}"
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/hello" || echo "000")
if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓ App läuft${NC}"
else
    echo -e "${RED}✗ App nicht erreichbar (HTTP $HEALTH_RESPONSE)${NC}"
    echo "Starten Sie die App mit: npm run dev"
    exit 1
fi
echo ""

# Test 3: Admin-Panel erreichbar
echo -e "${YELLOW}Test 3: Admin-Panel erreichbar${NC}"
ADMIN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/admin/database" || echo "000")
if [ "$ADMIN_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓ Admin-Panel erreichbar${NC}"
else
    echo -e "${YELLOW}⚠ Admin-Panel HTTP $ADMIN_RESPONSE (kann normal sein bei SSR)${NC}"
fi
echo ""

# Test 4: Database Stats Endpoint
echo -e "${YELLOW}Test 4: Database Stats${NC}"
STATS_RESPONSE=$(curl -s "$BASE_URL/api/admin/database/stats" || echo "ERROR")
if echo "$STATS_RESPONSE" | grep -q "stats"; then
    echo -e "${GREEN}✓ Database Stats funktioniert${NC}"
else
    echo -e "${RED}✗ Database Stats Fehler${NC}"
    echo "Response: $STATS_RESPONSE"
fi
echo ""

echo -e "${GREEN}=== Lokale Tests abgeschlossen ===${NC}\n"
echo -e "${YELLOW}Hinweis:${NC} Für vollständige Cloud Storage Tests benötigen Sie:"
echo "  1. Google Cloud SDK installiert"
echo "  2. Cloud Storage Bucket erstellt"
echo "  3. GCS_BUCKET_NAME in .env.local gesetzt"
echo "  4. Authentifizierung: gcloud auth application-default login"

