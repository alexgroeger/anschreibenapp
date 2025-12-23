#!/bin/bash

# Script zum sofortigen Setzen der GCS_BUCKET_NAME Environment-Variable in Cloud Run
# Dies behebt das Problem, dass Daten nach einem Refresh verloren gehen

set -e

# Farben für Output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Konfiguration
PROJECT_NUMBER="411832844870"
PROJECT_ID="gen-lang-client-0764998759"  # Projekt-ID (nicht Projektnummer)
REGION="europe-west1"
SERVICE_NAME="anschreiben-app"
BUCKET_NAME="${PROJECT_NUMBER}-anschreiben-data"  # Bucket wurde mit Projektnummer erstellt

echo -e "${GREEN}=== Cloud Storage Fix für Anschreiben App ===${NC}\n"
echo "Projekt-ID: $PROJECT_ID"
echo "Projekt-Nummer: $PROJECT_NUMBER"
echo "Service: $SERVICE_NAME"
echo "Bucket-Name: $BUCKET_NAME"
echo ""

# Prüfe ob gcloud installiert ist und füge zum PATH hinzu falls nötig
if ! command -v gcloud &> /dev/null; then
    # Prüfe übliche Installationspfade
    if [ -f "$HOME/google-cloud-sdk/bin/gcloud" ]; then
        export PATH="$HOME/google-cloud-sdk/bin:$PATH"
    elif [ -f "/usr/local/bin/gcloud" ]; then
        export PATH="/usr/local/bin:$PATH"
    else
        echo -e "${RED}Fehler: gcloud ist nicht installiert oder nicht im PATH${NC}"
        echo "Bitte fügen Sie gcloud zum PATH hinzu:"
        echo "  export PATH=\"\$HOME/google-cloud-sdk/bin:\$PATH\""
        exit 1
    fi
fi

# Projekt setzen
echo -e "${YELLOW}Schritt 1: Projekt konfigurieren...${NC}"
gcloud config set project $PROJECT_ID

# Verwende gcloud storage statt gsutil (moderner und funktioniert mit neueren Python-Versionen)
USE_GCLOUD_STORAGE=true
echo -e "${YELLOW}Verwende gcloud storage für Cloud Storage Operationen...${NC}"

# Prüfe ob Bucket existiert
echo -e "${YELLOW}Schritt 2: Prüfe Cloud Storage Bucket...${NC}"

# Prüfe ob Bucket existiert
BUCKET_EXISTS=false
if [ "$USE_GCLOUD_STORAGE" = true ]; then
    if gcloud storage buckets describe "gs://$BUCKET_NAME" --project="$PROJECT_ID" &> /dev/null; then
        BUCKET_EXISTS=true
    fi
else
    if gsutil ls -b "gs://$BUCKET_NAME" &> /dev/null; then
        BUCKET_EXISTS=true
    fi
fi

if [ "$BUCKET_EXISTS" = true ]; then
    echo -e "${GREEN}✓ Bucket existiert bereits: gs://$BUCKET_NAME${NC}"
else
    echo -e "${YELLOW}Bucket existiert nicht. Erstelle Bucket...${NC}"
    
    # Storage API aktivieren
    gcloud services enable storage.googleapis.com --project="$PROJECT_ID"
    
    # Bucket erstellen
    if [ "$USE_GCLOUD_STORAGE" = true ]; then
        gcloud storage buckets create "gs://$BUCKET_NAME" \
            --location="$REGION" \
            --project="$PROJECT_ID"
    else
        gsutil mb -l "$REGION" "gs://$BUCKET_NAME"
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Bucket erfolgreich erstellt${NC}"
    else
        echo -e "${RED}✗ Fehler beim Erstellen des Buckets${NC}"
        exit 1
    fi
fi

# Prüfe Service Account Berechtigungen
echo -e "${YELLOW}Schritt 3: Prüfe Service Account Berechtigungen...${NC}"
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

echo "Service Account: $SERVICE_ACCOUNT"

# Setze Berechtigungen (falls nötig)
echo -e "${YELLOW}Setze Storage-Berechtigungen für Service Account...${NC}"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/storage.objectAdmin" \
    --condition=None 2>/dev/null || echo "Berechtigungen bereits gesetzt oder Fehler (kann ignoriert werden)"

# Setze Environment-Variable in Cloud Run
echo -e "${YELLOW}Schritt 4: Setze GCS_BUCKET_NAME in Cloud Run...${NC}"

# Hole aktuelle Environment-Variablen und baue Update-String
ENV_VARS="GCS_BUCKET_NAME=$BUCKET_NAME"

# Prüfe ob GOOGLE_GENERATIVE_AI_API_KEY bereits gesetzt ist
API_KEY=$(gcloud run services describe $SERVICE_NAME \
    --project="$PROJECT_ID" \
    --region $REGION \
    --format='value(spec.template.spec.containers[0].env[?(@.name=="GOOGLE_GENERATIVE_AI_API_KEY")].value)' 2>/dev/null || echo "")

if [ -n "$API_KEY" ]; then
    echo "GOOGLE_GENERATIVE_AI_API_KEY ist bereits gesetzt, behalte ihn bei..."
    ENV_VARS="GOOGLE_GENERATIVE_AI_API_KEY=$API_KEY,$ENV_VARS"
fi

# Update Environment-Variablen
echo "Setze Environment-Variablen: $ENV_VARS"
gcloud run services update $SERVICE_NAME \
    --project="$PROJECT_ID" \
    --region $REGION \
    --update-env-vars "$ENV_VARS"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Environment-Variable erfolgreich gesetzt${NC}"
else
    echo -e "${RED}✗ Fehler beim Setzen der Environment-Variable${NC}"
    exit 1
fi

# Warte kurz, damit der Service aktualisiert wird
echo -e "${YELLOW}Warte 5 Sekunden, damit der Service aktualisiert wird...${NC}"
sleep 5

# Service URL abrufen
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --project="$PROJECT_ID" --region $REGION --format 'value(status.url)')

echo ""
echo -e "${GREEN}=== Fix erfolgreich abgeschlossen! ===${NC}\n"
echo -e "${GREEN}Service URL: $SERVICE_URL${NC}\n"
echo "Nächste Schritte:"
echo "1. Prüfen Sie die Admin-Seite: $SERVICE_URL/admin/database"
echo "2. Die Fehlermeldung sollte jetzt verschwunden sein"
echo "3. Erstellen Sie einen Test-Eintrag und prüfen Sie, ob er nach einem Refresh erhalten bleibt"
echo ""
echo "Zum Prüfen der Synchronisation:"
echo "  curl $SERVICE_URL/api/admin/database/sync"
echo ""
echo -e "${YELLOW}Hinweis:${NC} Nach dem nächsten Deployment über die Pipeline wird GCS_BUCKET_NAME automatisch gesetzt."

