#!/bin/bash

# Quick Deploy Script - Ohne Tests, direktes Deployment
# Verwendet die vorhandene gcloud Installation

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# gcloud Pfad (vorhandene Installation)
GCLOUD="${HOME}/google-cloud-sdk/bin/gcloud"

# Konfiguration
PROJECT_ID="gen-lang-client-0764998759"
PROJECT_NUMBER="411832844870"
REGION="europe-west1"
SERVICE_NAME="anschreiben-app"
BUCKET_NAME="411832844870-anschreiben-data"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Zeit-Tracking
START_TIME=$(date +%s)

# Funktionen
print_status() {
    local step=$1
    local elapsed=$(($(date +%s) - START_TIME))
    local minutes=$((elapsed / 60))
    local seconds=$((elapsed % 60))
    echo -e "${BLUE}[$(printf "%02d:%02d" $minutes $seconds)]${NC} ${GREEN}✓${NC} $step"
}

print_error() {
    local step=$1
    local elapsed=$(($(date +%s) - START_TIME))
    local minutes=$((elapsed / 60))
    local seconds=$((elapsed % 60))
    echo -e "${RED}[$(printf "%02d:%02d" $minutes $seconds)]${NC} ${RED}✗${NC} $step"
    exit 1
}

print_info() {
    local step=$1
    local elapsed=$(($(date +%s) - START_TIME))
    local minutes=$((elapsed / 60))
    local seconds=$((elapsed % 60))
    echo -e "${BLUE}[$(printf "%02d:%02d" $minutes $seconds)]${NC} ${YELLOW}→${NC} $step"
}

# Prüfe gcloud Installation
if [ ! -f "$GCLOUD" ]; then
    print_error "gcloud nicht gefunden unter: $GCLOUD"
fi

echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Quick Deploy - Anschreiben App       ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo "Projekt: $PROJECT_ID"
echo "Service: $SERVICE_NAME"
echo "Region:  $REGION"
echo ""

# Schritt 1: Projekt setzen
print_info "Projekt setzen..."
if ! $GCLOUD config set project $PROJECT_ID 2>&1; then
    print_error "Fehler beim Setzen des Projekts"
fi
print_status "Projekt gesetzt"

# Schritt 2: API-Key holen
print_info "API-Key holen..."
if [ -f .env.local ]; then
    API_KEY=$(grep GOOGLE_GENERATIVE_AI_API_KEY .env.local | cut -d'=' -f2 | head -1 | tr -d '"' | tr -d "'")
    if [ -n "$API_KEY" ]; then
        export GOOGLE_GENERATIVE_AI_API_KEY="$API_KEY"
        print_status "API-Key aus .env.local geladen"
    fi
fi

if [ -z "$GOOGLE_GENERATIVE_AI_API_KEY" ]; then
    print_info "API-Key aus bestehendem Service holen..."
    API_KEY=$($GCLOUD run services describe $SERVICE_NAME \
        --region=$REGION \
        --format='value(spec.template.spec.containers[0].env[0].value)' 2>/dev/null || echo "")
    
    if [ -n "$API_KEY" ]; then
        export GOOGLE_GENERATIVE_AI_API_KEY="$API_KEY"
        print_status "API-Key aus Service geladen"
    else
        print_error "API-Key nicht gefunden. Bitte GOOGLE_GENERATIVE_AI_API_KEY setzen."
    fi
fi

# Schritt 3: Cloud Storage prüfen
print_info "Cloud Storage Bucket prüfen..."
if ! $GCLOUD storage buckets describe gs://$BUCKET_NAME --project=$PROJECT_ID &>/dev/null; then
    print_info "Bucket erstellen..."
    if ! $GCLOUD storage buckets create gs://$BUCKET_NAME \
        --location=$REGION \
        --project=$PROJECT_ID 2>&1; then
        print_error "Fehler beim Erstellen des Buckets"
    fi
    print_status "Bucket erstellt"
else
    print_status "Bucket existiert bereits"
fi

# Schritt 4: Docker Image bauen
print_info "Docker Image bauen..."
BUILD_START=$(date +%s)

# Starte Build und hole Build ID aus Output
print_info "Starte Build..."
BUILD_OUTPUT=$($GCLOUD builds submit --tag $IMAGE_NAME:latest --project=$PROJECT_ID 2>&1) || {
    echo ""
    print_error "Fehler beim Bauen des Docker Images"
    echo ""
    echo "Build-Output:"
    echo "$BUILD_OUTPUT"
}

# Extrahiere Build ID aus Output
BUILD_ID=$(echo "$BUILD_OUTPUT" | grep -oE 'builds/[a-f0-9-]+' | head -1 | cut -d'/' -f2 || echo "")

if [ -z "$BUILD_ID" ]; then
    # Fallback: Versuche Build ID aus letztem Build zu holen
    BUILD_ID=$($GCLOUD builds list --limit=1 --format='value(id)' --project=$PROJECT_ID 2>/dev/null || echo "")
fi

if [ -n "$BUILD_ID" ]; then
    print_info "Build ID: $BUILD_ID"
    
    # Prüfe Build-Status
    STATUS=$($GCLOUD builds describe $BUILD_ID --project=$PROJECT_ID --format='value(status)' 2>/dev/null || echo "UNKNOWN")
    elapsed=$(($(date +%s) - BUILD_START))
    minutes=$((elapsed / 60))
    seconds=$((elapsed % 60))
    
    if [ "$STATUS" = "SUCCESS" ]; then
        print_status "Build erfolgreich abgeschlossen ($(printf "%02d:%02d" $minutes $seconds))"
    elif [ "$STATUS" = "FAILURE" ] || [ "$STATUS" = "CANCELLED" ] || [ "$STATUS" = "EXPIRED" ] || [ "$STATUS" = "TIMEOUT" ]; then
        print_error "Build fehlgeschlagen: $STATUS"
        echo ""
        echo "Build-Logs ansehen:"
        echo "  $GCLOUD builds log $BUILD_ID --project=$PROJECT_ID"
    else
        print_status "Build abgeschlossen (Status: $STATUS)"
    fi
else
    print_status "Build abgeschlossen"
fi

# Schritt 5: Deployment zu Cloud Run
print_info "Deployment zu Cloud Run..."
DEPLOY_START=$(date +%s)

if ! $GCLOUD run deploy $SERVICE_NAME \
    --image $IMAGE_NAME:latest \
    --region $REGION \
    --platform managed \
    --allow-unauthenticated \
    --port 8080 \
    --memory 2Gi \
    --cpu 2 \
    --timeout 300 \
    --max-instances 10 \
    --set-env-vars "GOOGLE_GENERATIVE_AI_API_KEY=$GOOGLE_GENERATIVE_AI_API_KEY,GCS_BUCKET_NAME=$BUCKET_NAME" \
    --project=$PROJECT_ID 2>&1; then
    print_error "Fehler beim Deployment zu Cloud Run"
fi

DEPLOY_ELAPSED=$(($(date +%s) - DEPLOY_START))
print_status "Deployment abgeschlossen ($(printf "%02d:%02d" $((DEPLOY_ELAPSED / 60)) $((DEPLOY_ELAPSED % 60))))"

# Schritt 6: Service URL abrufen
print_info "Service URL abrufen..."
SERVICE_URL=$($GCLOUD run services describe $SERVICE_NAME \
    --region=$REGION \
    --format='value(status.url)' \
    --project=$PROJECT_ID 2>/dev/null || echo "")

if [ -z "$SERVICE_URL" ]; then
    print_error "Service URL konnte nicht abgerufen werden"
fi

# Gesamtzeit
TOTAL_ELAPSED=$(($(date +%s) - START_TIME))
TOTAL_MINUTES=$((TOTAL_ELAPSED / 60))
TOTAL_SECONDS=$((TOTAL_ELAPSED % 60))

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Deployment erfolgreich!             ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Service URL:${NC} $SERVICE_URL"
echo -e "${GREEN}Gesamtzeit:${NC} $(printf "%02d:%02d" $TOTAL_MINUTES $TOTAL_SECONDS)"
echo ""
echo -e "${BLUE}Nächste Schritte:${NC}"
echo "  • Service testen: curl $SERVICE_URL"
echo "  • Admin-Panel: $SERVICE_URL/admin/database"
echo "  • Logs ansehen: $GCLOUD run services logs read $SERVICE_NAME --region=$REGION"
echo ""

