#!/bin/bash

# Script zum Setzen der Cloud Storage Berechtigungen für Cloud Run
# Dieses Script setzt die notwendigen IAM-Berechtigungen für den Compute Service Account

set -e

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Cloud Storage Berechtigungen einrichten${NC}"
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

# Schritt 2: Projektnummer ermitteln
echo -e "${YELLOW}Schritt 2: Projektnummer ermitteln...${NC}"
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)" 2>/dev/null || echo "")

if [ -z "$PROJECT_NUMBER" ]; then
    echo -e "${RED}Fehler: Konnte Projektnummer nicht ermitteln.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Projektnummer: $PROJECT_NUMBER${NC}"

# Schritt 3: Service Account bestimmen
echo -e "${YELLOW}Schritt 3: Service Account bestimmen...${NC}"
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
echo -e "${GREEN}✓ Service Account: $SERVICE_ACCOUNT${NC}"

# Schritt 4: Aktuelle Berechtigungen prüfen
echo -e "${YELLOW}Schritt 4: Aktuelle Berechtigungen prüfen...${NC}"
HAS_STORAGE_PERMISSION=$(gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:$SERVICE_ACCOUNT AND bindings.role:roles/storage.objectAdmin" \
  --format="value(bindings.role)" 2>/dev/null || echo "")

if [ -n "$HAS_STORAGE_PERMISSION" ]; then
    echo -e "${GREEN}✓ Service Account hat bereits Storage-Berechtigungen${NC}"
    echo ""
    echo -e "${YELLOW}Möchten Sie die Berechtigung trotzdem erneut setzen? (j/n)${NC}"
    read -r response
    if [[ ! "$response" =~ ^[Jj]$ ]]; then
        echo "Abgebrochen."
        exit 0
    fi
fi

# Schritt 5: Storage-Berechtigung setzen
echo -e "${YELLOW}Schritt 5: Storage-Berechtigung setzen...${NC}"
echo "Setze roles/storage.objectAdmin für $SERVICE_ACCOUNT..."

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/storage.objectAdmin" \
  --condition=None

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Berechtigung erfolgreich gesetzt${NC}"
else
    echo -e "${RED}✗ Fehler beim Setzen der Berechtigung${NC}"
    exit 1
fi

# Schritt 6: Berechtigung verifizieren
echo -e "${YELLOW}Schritt 6: Berechtigung verifizieren...${NC}"
VERIFIED=$(gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:$SERVICE_ACCOUNT AND bindings.role:roles/storage.objectAdmin" \
  --format="value(bindings.role)" 2>/dev/null || echo "")

if [ -n "$VERIFIED" ]; then
    echo -e "${GREEN}✓ Berechtigung erfolgreich verifiziert${NC}"
else
    echo -e "${YELLOW}⚠ Warnung: Berechtigung konnte nicht verifiziert werden${NC}"
    echo "Dies kann normal sein, wenn die Änderung noch propagiert wird."
fi

# Schritt 7: Bucket-Zugriff testen (optional)
echo ""
echo -e "${YELLOW}Schritt 7: Bucket-Zugriff testen (optional)...${NC}"
BUCKET_NAME="${PROJECT_NUMBER}-anschreiben-data"
echo "Teste Zugriff auf Bucket: gs://$BUCKET_NAME"

# Prüfe ob Bucket existiert
if gcloud storage buckets describe "gs://$BUCKET_NAME" --project=$PROJECT_ID &>/dev/null; then
    echo -e "${GREEN}✓ Bucket existiert: gs://$BUCKET_NAME${NC}"
    
    # Versuche Bucket-Inhalt aufzulisten (testet Berechtigungen)
    if gcloud storage ls "gs://$BUCKET_NAME/" --project=$PROJECT_ID &>/dev/null; then
        echo -e "${GREEN}✓ Bucket-Zugriff erfolgreich getestet${NC}"
    else
        echo -e "${YELLOW}⚠ Warnung: Bucket-Zugriff konnte nicht getestet werden${NC}"
        echo "Dies kann normal sein, wenn die Berechtigungen noch propagiert werden."
    fi
else
    echo -e "${YELLOW}⚠ Bucket existiert noch nicht: gs://$BUCKET_NAME${NC}"
    echo "Der Bucket wird beim nächsten Deployment automatisch erstellt."
fi

# Zusammenfassung
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Setup erfolgreich abgeschlossen!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Zusammenfassung:"
echo "  Projekt-ID: $PROJECT_ID"
echo "  Projektnummer: $PROJECT_NUMBER"
echo "  Service Account: $SERVICE_ACCOUNT"
echo "  Berechtigung: roles/storage.objectAdmin"
echo ""
echo "Nächste Schritte:"
echo "  1. Service neu deployen (oder warten auf nächstes Deployment)"
echo "  2. Dokument hochladen in der WebApp testen"
echo "  3. Logs prüfen: gcloud run services logs read anschreiben-app --region europe-west1"
echo ""

