#!/bin/bash

# Cloud Storage Setup Script für Anschreiben App
# Dieses Script erstellt einen Cloud Storage Bucket und konfiguriert die notwendigen Berechtigungen

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Cloud Storage Setup für Anschreiben App ===${NC}\n"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Fehler: gcloud ist nicht installiert.${NC}"
    echo "Installieren Sie Google Cloud SDK: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if gsutil is installed
if ! command -v gsutil &> /dev/null; then
    echo -e "${RED}Fehler: gsutil ist nicht installiert.${NC}"
    exit 1
fi

# Get project ID
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)

if [ -z "$CURRENT_PROJECT" ]; then
    echo -e "${YELLOW}Kein Projekt ausgewählt.${NC}"
    read -p "Geben Sie Ihre Google Cloud Projekt-ID ein: " PROJECT_ID
    gcloud config set project "$PROJECT_ID"
else
    echo -e "Aktuelles Projekt: ${GREEN}$CURRENT_PROJECT${NC}"
    read -p "Projekt verwenden? (j/n): " USE_CURRENT
    if [ "$USE_CURRENT" != "j" ] && [ "$USE_CURRENT" != "J" ]; then
        read -p "Geben Sie Ihre Google Cloud Projekt-ID ein: " PROJECT_ID
        gcloud config set project "$PROJECT_ID"
    else
        PROJECT_ID="$CURRENT_PROJECT"
    fi
fi

echo -e "\n${GREEN}Projekt: $PROJECT_ID${NC}\n"

# Set bucket name
BUCKET_NAME="${PROJECT_ID}-anschreiben-data"
echo -e "Bucket-Name: ${GREEN}$BUCKET_NAME${NC}"

# Check if bucket already exists
if gsutil ls -b "gs://$BUCKET_NAME" &> /dev/null; then
    echo -e "${YELLOW}Bucket existiert bereits: gs://$BUCKET_NAME${NC}"
    read -p "Fortfahren? (j/n): " CONTINUE
    if [ "$CONTINUE" != "j" ] && [ "$CONTINUE" != "J" ]; then
        echo "Abgebrochen."
        exit 0
    fi
else
    # Create bucket
    echo -e "\n${GREEN}Erstelle Cloud Storage Bucket...${NC}"
    
    # Ask for region
    echo "Wählen Sie eine Region:"
    echo "1) europe-west1 (Belgien) - Empfohlen für Europa"
    echo "2) us-central1 (Iowa) - Empfohlen für USA"
    echo "3) asia-east1 (Taiwan) - Empfohlen für Asien"
    read -p "Region (1-3, Standard: 1): " REGION_CHOICE
    
    case $REGION_CHOICE in
        2) REGION="us-central1" ;;
        3) REGION="asia-east1" ;;
        *) REGION="europe-west1" ;;
    esac
    
    echo -e "Region: ${GREEN}$REGION${NC}"
    
    gsutil mb -l "$REGION" "gs://$BUCKET_NAME"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Bucket erfolgreich erstellt${NC}"
    else
        echo -e "${RED}✗ Fehler beim Erstellen des Buckets${NC}"
        exit 1
    fi
fi

# Enable versioning (optional)
echo -e "\n${YELLOW}Versionierung aktivieren? (empfohlen für Backups)${NC}"
read -p "Versionierung aktivieren? (j/n, Standard: j): " ENABLE_VERSIONING

if [ "$ENABLE_VERSIONING" != "n" ] && [ "$ENABLE_VERSIONING" != "N" ]; then
    gsutil versioning set on "gs://$BUCKET_NAME"
    echo -e "${GREEN}✓ Versionierung aktiviert${NC}"
fi

# Enable required APIs
echo -e "\n${GREEN}Aktiviere notwendige APIs...${NC}"
gcloud services enable storage.googleapis.com --project="$PROJECT_ID"
gcloud services enable cloudbuild.googleapis.com --project="$PROJECT_ID"
gcloud services enable run.googleapis.com --project="$PROJECT_ID"
gcloud services enable containerregistry.googleapis.com --project="$PROJECT_ID"

echo -e "${GREEN}✓ APIs aktiviert${NC}"

# Check Service Account permissions
echo -e "\n${GREEN}Prüfe Service Account Berechtigungen...${NC}"
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

echo "Service Account: $SERVICE_ACCOUNT"

# Check if service account has storage permissions
HAS_PERMISSION=$(gcloud projects get-iam-policy "$PROJECT_ID" \
    --flatten="bindings[].members" \
    --filter="bindings.members:serviceAccount:$SERVICE_ACCOUNT AND bindings.role:roles/storage.*" \
    --format="value(bindings.role)" 2>/dev/null | head -1)

if [ -z "$HAS_PERMISSION" ]; then
    echo -e "${YELLOW}Service Account hat möglicherweise keine Storage-Berechtigungen.${NC}"
    echo "Für Cloud Run werden normalerweise automatisch Berechtigungen vergeben."
    echo "Falls Probleme auftreten, führen Sie aus:"
    echo -e "${YELLOW}gcloud projects add-iam-policy-binding $PROJECT_ID \\${NC}"
    echo -e "${YELLOW}  --member=\"serviceAccount:$SERVICE_ACCOUNT\" \\${NC}"
    echo -e "${YELLOW}  --role=\"roles/storage.objectAdmin\"${NC}"
else
    echo -e "${GREEN}✓ Service Account hat Storage-Berechtigungen${NC}"
fi

# Summary
echo -e "\n${GREEN}=== Setup abgeschlossen ===${NC}\n"
echo -e "Bucket-Name: ${GREEN}$BUCKET_NAME${NC}"
echo -e "Bucket-URL: ${GREEN}gs://$BUCKET_NAME${NC}\n"

echo -e "${YELLOW}Nächste Schritte:${NC}"
echo "1. Setzen Sie die Environment-Variable:"
echo -e "   ${GREEN}export GCS_BUCKET_NAME=\"$BUCKET_NAME\"${NC}"
echo ""
echo "2. Für lokale Entwicklung, authentifizieren Sie sich:"
echo -e "   ${GREEN}gcloud auth application-default login${NC}"
echo ""
echo "3. Für Cloud Run Deployment, fügen Sie die Environment-Variable hinzu:"
echo -e "   ${GREEN}--set-env-vars GCS_BUCKET_NAME=\"$BUCKET_NAME\"${NC}"
echo ""
echo "4. Testen Sie die Synchronisation:"
echo -e "   ${GREEN}curl http://localhost:3000/api/admin/database/sync${NC}"
echo ""

echo -e "${GREEN}✓ Setup erfolgreich abgeschlossen!${NC}"

