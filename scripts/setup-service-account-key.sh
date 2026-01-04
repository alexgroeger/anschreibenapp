#!/bin/bash

# Script zum Erstellen eines Service Account Keys für unabhängigen Cloud Storage Zugriff
# Dieser Key kann von jedem Computer aus verwendet werden

set -e

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Service Account Key für Cloud Storage${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Schritt 1: Projekt-ID ermitteln
echo -e "${YELLOW}Schritt 1: Projekt-ID ermitteln...${NC}"
PROJECT_ID=$(gcloud config get-value project 2>/dev/null || echo "")

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Fehler: Kein Projekt konfiguriert.${NC}"
    echo "Bitte setzen Sie das Projekt mit: gcloud config set project PROJECT_ID"
    exit 1
fi

echo -e "${GREEN}✓ Projekt-ID: $PROJECT_ID${NC}"

# Schritt 2: Service Account Name
SERVICE_ACCOUNT_NAME="anschreiben-storage"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

# Schritt 3: Prüfe ob Service Account existiert
echo -e "${YELLOW}Schritt 2: Prüfe Service Account...${NC}"
if gcloud iam service-accounts describe "$SERVICE_ACCOUNT_EMAIL" --project="$PROJECT_ID" &>/dev/null; then
    echo -e "${GREEN}✓ Service Account existiert bereits: $SERVICE_ACCOUNT_EMAIL${NC}"
else
    echo -e "${YELLOW}Service Account existiert nicht. Erstelle neuen Service Account...${NC}"
    
    gcloud iam service-accounts create "$SERVICE_ACCOUNT_NAME" \
      --display-name="Anschreiben App Storage Service Account" \
      --description="Service Account für Cloud Storage Zugriff der Anschreiben App" \
      --project="$PROJECT_ID"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Service Account erstellt: $SERVICE_ACCOUNT_EMAIL${NC}"
    else
        echo -e "${RED}✗ Fehler beim Erstellen des Service Accounts${NC}"
        exit 1
    fi
fi

# Schritt 4: Berechtigungen setzen
echo -e "${YELLOW}Schritt 3: Setze Storage-Berechtigungen...${NC}"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/storage.objectAdmin" \
  --condition=None

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Berechtigungen gesetzt${NC}"
else
    echo -e "${RED}✗ Fehler beim Setzen der Berechtigungen${NC}"
    exit 1
fi

# Schritt 5: Key erstellen
echo -e "${YELLOW}Schritt 4: Erstelle Service Account Key...${NC}"
KEY_DIR="./keys"
mkdir -p "$KEY_DIR"

KEY_FILE="${KEY_DIR}/${SERVICE_ACCOUNT_NAME}-key.json"

# Prüfe ob Key bereits existiert
if [ -f "$KEY_FILE" ]; then
    echo -e "${YELLOW}Key existiert bereits: $KEY_FILE${NC}"
    echo -e "${YELLOW}Möchten Sie einen neuen Key erstellen? (j/n)${NC}"
    read -r response
    if [[ ! "$response" =~ ^[Jj]$ ]]; then
        echo "Abgebrochen. Verwende existierenden Key."
    else
        echo "Erstelle neuen Key..."
        gcloud iam service-accounts keys create "$KEY_FILE" \
          --iam-account="$SERVICE_ACCOUNT_EMAIL" \
          --project="$PROJECT_ID"
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Neuer Key erstellt: $KEY_FILE${NC}"
        else
            echo -e "${RED}✗ Fehler beim Erstellen des Keys${NC}"
            exit 1
        fi
    fi
else
    gcloud iam service-accounts keys create "$KEY_FILE" \
      --iam-account="$SERVICE_ACCOUNT_EMAIL" \
      --project="$PROJECT_ID"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Key erstellt: $KEY_FILE${NC}"
    else
        echo -e "${RED}✗ Fehler beim Erstellen des Keys${NC}"
        exit 1
    fi
fi

# Schritt 6: Key als Secret in Cloud Run setzen (optional)
echo ""
echo -e "${YELLOW}Schritt 5: Key als Secret in Cloud Run setzen (optional)...${NC}"
echo -e "${BLUE}Möchten Sie den Key als Secret in Cloud Run speichern? (j/n)${NC}"
read -r response

if [[ "$response" =~ ^[Jj]$ ]]; then
    SECRET_NAME="anschreiben-storage-key"
    
    # Prüfe ob Secret bereits existiert
    if gcloud secrets describe "$SECRET_NAME" --project="$PROJECT_ID" &>/dev/null; then
        echo -e "${YELLOW}Secret existiert bereits. Aktualisiere...${NC}"
        gcloud secrets versions add "$SECRET_NAME" \
          --data-file="$KEY_FILE" \
          --project="$PROJECT_ID"
    else
        echo -e "${YELLOW}Erstelle neues Secret...${NC}"
        gcloud secrets create "$SECRET_NAME" \
          --data-file="$KEY_FILE" \
          --project="$PROJECT_ID"
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Secret erstellt/aktualisiert: $SECRET_NAME${NC}"
        echo ""
        echo -e "${YELLOW}Um den Secret in Cloud Run zu verwenden, führen Sie aus:${NC}"
        echo "gcloud run services update anschreiben-app \\"
        echo "  --update-secrets GOOGLE_APPLICATION_CREDENTIALS=$SECRET_NAME:latest \\"
        echo "  --region europe-west1 \\"
        echo "  --project $PROJECT_ID"
    else
        echo -e "${YELLOW}⚠ Secret konnte nicht erstellt werden (kann ignoriert werden)${NC}"
    fi
fi

# Zusammenfassung
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Setup erfolgreich abgeschlossen!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Zusammenfassung:"
echo "  Projekt-ID: $PROJECT_ID"
echo "  Service Account: $SERVICE_ACCOUNT_EMAIL"
echo "  Key-Datei: $KEY_FILE"
echo ""
echo "Nächste Schritte:"
echo ""
echo "1. Für lokale Entwicklung:"
echo "   export GOOGLE_APPLICATION_CREDENTIALS=\"$KEY_FILE\""
echo ""
echo "2. Für Cloud Run (mit Secret):"
echo "   gcloud run services update anschreiben-app \\"
echo "     --update-secrets GOOGLE_APPLICATION_CREDENTIALS=anschreiben-storage-key:latest \\"
echo "     --region europe-west1"
echo ""
echo "3. Key-Datei sicher aufbewahren!"
echo "   - Fügen Sie 'keys/' zu .gitignore hinzu"
echo "   - Teilen Sie den Key nur mit autorisierten Personen"
echo ""

