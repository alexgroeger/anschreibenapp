#!/bin/bash

# Deployment Script für Google Cloud Run
# Projekt-ID: gen-lang-client-0764998759

set -e

# Farben für Output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Konfiguration
PROJECT_ID="gen-lang-client-0764998759"
REGION="europe-west1"
SERVICE_NAME="anschreiben-app"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo -e "${GREEN}=== Google Cloud Run Deployment ===${NC}"
echo "Projekt-ID: $PROJECT_ID"
echo "Region: $REGION"
echo "Service: $SERVICE_NAME"
echo ""

# Prüfe ob gcloud installiert ist
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Fehler: gcloud ist nicht installiert oder nicht im PATH${NC}"
    echo "Bitte installieren Sie gcloud (siehe SETUP_GCLOUD.md) und führen Sie dann aus:"
    echo "  export PATH=\"\$HOME/google-cloud-sdk/bin:\$PATH\""
    exit 1
fi

# Prüfe ob eingeloggt
echo -e "${YELLOW}Schritt 1: Authentifizierung prüfen...${NC}"
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "Bitte loggen Sie sich ein:"
    gcloud auth login
fi

# Projekt setzen
echo -e "${YELLOW}Schritt 2: Projekt konfigurieren...${NC}"
gcloud config set project $PROJECT_ID

# APIs aktivieren
echo -e "${YELLOW}Schritt 3: APIs aktivieren...${NC}"
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# API Key prüfen
echo ""
echo -e "${YELLOW}Schritt 4: API Key konfigurieren...${NC}"
if [ -z "$GOOGLE_GENERATIVE_AI_API_KEY" ]; then
    echo -e "${YELLOW}Warnung: GOOGLE_GENERATIVE_AI_API_KEY ist nicht gesetzt.${NC}"
    echo "Bitte setzen Sie die Environment-Variable:"
    echo "  export GOOGLE_GENERATIVE_AI_API_KEY=\"ihr-api-key\""
    echo ""
    read -p "Möchten Sie fortfahren ohne API Key? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    ENV_VARS=""
else
    ENV_VARS="--set-env-vars GOOGLE_GENERATIVE_AI_API_KEY=$GOOGLE_GENERATIVE_AI_API_KEY"
fi

# Docker Image bauen und pushen
echo -e "${YELLOW}Schritt 5: Docker Image bauen und pushen...${NC}"
echo "Dies kann einige Minuten dauern..."
gcloud builds submit --tag $IMAGE_NAME

# Cloud Run Service deployen
echo -e "${YELLOW}Schritt 6: Cloud Run Service deployen...${NC}"
gcloud run deploy $SERVICE_NAME \
    --image $IMAGE_NAME \
    --region $REGION \
    --platform managed \
    --allow-unauthenticated \
    --port 8080 \
    --memory 2Gi \
    --cpu 2 \
    --timeout 300 \
    --max-instances 10 \
    $ENV_VARS

# Service URL abrufen
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)')

echo ""
echo -e "${GREEN}=== Deployment erfolgreich! ===${NC}"
echo -e "${GREEN}Service URL: $SERVICE_URL${NC}"
echo ""
echo "Nächste Schritte:"
echo "1. Testen Sie die App: $SERVICE_URL"
echo "2. Falls API Key fehlt, setzen Sie ihn:"
echo "   gcloud run services update $SERVICE_NAME --update-env-vars GOOGLE_GENERATIVE_AI_API_KEY=ihr-key --region $REGION"
echo "3. Logs ansehen:"
echo "   gcloud run services logs read $SERVICE_NAME --region $REGION"
