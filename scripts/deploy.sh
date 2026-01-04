#!/bin/bash

# Standard Deployment Pipeline für Anschreiben App
# Basierend auf DEPLOYMENT_NOW4.md

set -e

# Farben für Output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funktionen
print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Prüfe ob gcloud installiert ist und füge es zum PATH hinzu falls nötig
check_gcloud() {
    if command -v gcloud &> /dev/null; then
        return 0
    fi
    
    GCLOUD_PATHS=(
        "$HOME/google-cloud-sdk/bin/gcloud"
        "/usr/local/bin/gcloud"
        "/opt/homebrew/bin/gcloud"
    )
    
    for path in "${GCLOUD_PATHS[@]}"; do
        if [ -f "$path" ]; then
            export PATH="$(dirname $path):$PATH"
            print_success "gcloud gefunden: $path"
            return 0
        fi
    done
    
    print_error "gcloud nicht gefunden. Bitte installieren Sie Google Cloud SDK."
    exit 1
}

# Environment Setup
print_header "Environment Setup"
check_gcloud

export GCP_PROJECT_ID="gen-lang-client-0764998759"
export PROJECT_NUMBER="411832844870"
export GCP_REGION="europe-west1"
export SERVICE_NAME="anschreiben-app"
export BUCKET_NAME="411832844870-anschreiben-data"
export GOOGLE_GENERATIVE_AI_API_KEY="AIzaSyDdkGOTSdz0q0Zd4SmZW5LnVThmDM0iHiI"
export IMAGE_NAME="gcr.io/$GCP_PROJECT_ID/$SERVICE_NAME:latest"

print_success "Projekt-ID: $GCP_PROJECT_ID"
print_success "Region: $GCP_REGION"
print_success "Service: $SERVICE_NAME"
print_success "Bucket: $BUCKET_NAME"
print_success "Image: $IMAGE_NAME"

# Schritt 1: Projekt setzen
print_header "Schritt 1: Projekt setzen"
gcloud config set project $GCP_PROJECT_ID
print_success "Projekt gesetzt: $GCP_PROJECT_ID"

# Schritt 2: Docker Image bauen und pushen
print_header "Schritt 2: Docker Image bauen und pushen"
echo "Image-Name: $IMAGE_NAME"
echo ""

# Wechsle ins Projekt-Verzeichnis
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

print_success "Arbeitsverzeichnis: $PROJECT_DIR"

# Baue und pushe Image
echo "Starte Build..."
gcloud builds submit --tag $IMAGE_NAME --project=$GCP_PROJECT_ID

# Prüfe ob Image erfolgreich erstellt wurde
echo ""
print_header "Prüfe Image"
if gcloud container images describe $IMAGE_NAME --project=$GCP_PROJECT_ID &> /dev/null; then
    print_success "Image erfolgreich erstellt: $IMAGE_NAME"
    
    # Zeige Image-Tags
    echo "Verfügbare Tags:"
    gcloud container images list-tags gcr.io/$GCP_PROJECT_ID/$SERVICE_NAME --limit=3 --project=$GCP_PROJECT_ID
else
    print_error "Image konnte nicht erstellt werden!"
    echo "Bitte prüfen Sie die Build-Logs."
    exit 1
fi

# Schritt 3: Prüfe Service
print_header "Schritt 3: Prüfe Service"
if ! gcloud run services describe $SERVICE_NAME --region=$GCP_REGION --project=$GCP_PROJECT_ID &> /dev/null; then
    print_error "Service $SERVICE_NAME existiert nicht!"
    echo "Bitte verwenden Sie DEPLOY_NOW2.md für das initiale Deployment."
    exit 1
fi
print_success "Service gefunden: $SERVICE_NAME"

# Schritt 4: Cloud Run Service Update
print_header "Schritt 4: Cloud Run Service Update"
echo "Service: $SERVICE_NAME"
echo "Region: $GCP_REGION"
echo "Image: $IMAGE_NAME"
echo "Bucket: $BUCKET_NAME"
echo ""

# Service Update mit allen erforderlichen Konfigurationen
# Beachte: --update-secrets für GOOGLE_APPLICATION_CREDENTIALS wird beibehalten falls gesetzt
gcloud run services update $SERVICE_NAME \
  --image="gcr.io/$GCP_PROJECT_ID/$SERVICE_NAME:latest" \
  --region=$GCP_REGION \
  --set-env-vars="GCS_BUCKET_NAME=$BUCKET_NAME,DATABASE_PATH=/anschreiben-app/database.sqlite,GOOGLE_GENERATIVE_AI_API_KEY=$GOOGLE_GENERATIVE_AI_API_KEY" \
  --add-volume="name=gcs-1,type=cloud-storage,bucket=$BUCKET_NAME" \
  --add-volume-mount="volume=gcs-1,mount-path=/anschreiben-app" \
  --service-account="411832844870-compute@developer.gserviceaccount.com" \
  --project=$GCP_PROJECT_ID

print_success "Service Update abgeschlossen"

# Schritt 5: Service URL abrufen
print_header "Schritt 5: Service URL abrufen"
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
  --region=$GCP_REGION \
  --format="value(status.url)" \
  --project=$GCP_PROJECT_ID)

print_success "Service URL: $SERVICE_URL"

# Schritt 6: Validierung und Logs prüfen
print_header "Schritt 6: Validierung und Logs prüfen"
echo "Warte 15 Sekunden auf Service-Bereitschaft..."
sleep 15

echo ""
print_header "Prüfe Startup-Logs"
gcloud run services logs read $SERVICE_NAME \
  --region=$GCP_REGION \
  --limit=30 \
  --project=$GCP_PROJECT_ID | grep -E "(SQLite database path|Using Cloud Storage bucket|Mount directory|Database|Cloud Storage|anschreiben.db|download|upload|sync|File parsing|Cloud Storage:)" || echo "Keine relevanten Logs gefunden"

# Zusammenfassung
echo ""
print_header "Deployment abgeschlossen"
echo ""
print_success "✅ Update erfolgreich!"
echo "Service URL: $SERVICE_URL"
echo "Verwendeter Bucket: $BUCKET_NAME"
echo "Verwendetes Image: $IMAGE_NAME"
echo ""
echo "Nächste Schritte:"
echo "1. Testen Sie die App: $SERVICE_URL"
echo "2. Prüfen Sie das Admin-Panel: $SERVICE_URL/admin/database"
echo "3. Testen Sie den Dokumentenupload"
echo ""

