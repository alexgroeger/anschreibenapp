#!/bin/bash

# Script zum Reparieren oder Ersetzen einer beschädigten Datenbank

set -e

# Farben für Output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Konfiguration
PROJECT_ID="gen-lang-client-0764998759"
PROJECT_NUMBER="411832844870"
REGION="europe-west1"
SERVICE_NAME="anschreiben-app"
BUCKET_NAME="${PROJECT_NUMBER}-anschreiben-data"

echo -e "${GREEN}=== Datenbank-Reparatur Script ===${NC}\n"
echo "Projekt-ID: $PROJECT_ID"
echo "Bucket-Name: $BUCKET_NAME"
echo ""

# Prüfe ob gcloud installiert ist
if ! command -v gcloud &> /dev/null; then
    if [ -f "$HOME/google-cloud-sdk/bin/gcloud" ]; then
        export PATH="$HOME/google-cloud-sdk/bin:$PATH"
    else
        echo -e "${RED}Fehler: gcloud ist nicht installiert${NC}"
        exit 1
    fi
fi

# Projekt setzen
gcloud config set project $PROJECT_ID

echo -e "${YELLOW}Schritt 1: Prüfe Cloud Storage Datenbank...${NC}"

# Prüfe ob Datenbank in Cloud Storage existiert
if gcloud storage ls "gs://$BUCKET_NAME/anschreiben.db" &> /dev/null; then
    echo -e "${GREEN}✓ Datenbank existiert in Cloud Storage${NC}"
    
    # Lade Datenbank herunter
    echo -e "${YELLOW}Schritt 2: Lade Datenbank herunter...${NC}"
    TEMP_DB="/tmp/anschreiben_check.db"
    gcloud storage cp "gs://$BUCKET_NAME/anschreiben.db" "$TEMP_DB"
    
    # Prüfe Integrität
    echo -e "${YELLOW}Schritt 3: Prüfe Datenbank-Integrität...${NC}"
    
    # Versuche Datenbank zu öffnen (benötigt sqlite3)
    if command -v sqlite3 &> /dev/null; then
        if sqlite3 "$TEMP_DB" "PRAGMA integrity_check;" &> /dev/null; then
            RESULT=$(sqlite3 "$TEMP_DB" "PRAGMA integrity_check;" | head -1)
            if [ "$RESULT" = "ok" ]; then
                echo -e "${GREEN}✓ Datenbank ist nicht beschädigt${NC}"
                rm -f "$TEMP_DB"
                exit 0
            else
                echo -e "${RED}✗ Datenbank ist beschädigt: $RESULT${NC}"
            fi
        else
            echo -e "${RED}✗ Datenbank kann nicht geöffnet werden${NC}"
        fi
    else
        echo -e "${YELLOW}sqlite3 nicht verfügbar, überspringe Integritätsprüfung${NC}"
    fi
    
    # Prüfe Backup
    echo -e "${YELLOW}Schritt 4: Prüfe Backup...${NC}"
    if gcloud storage ls "gs://$BUCKET_NAME/anschreiben_backup.db" &> /dev/null; then
        echo -e "${GREEN}✓ Backup existiert${NC}"
        TEMP_BACKUP="/tmp/anschreiben_backup_check.db"
        gcloud storage cp "gs://$BUCKET_NAME/anschreiben_backup.db" "$TEMP_BACKUP"
        
        if command -v sqlite3 &> /dev/null; then
            if sqlite3 "$TEMP_BACKUP" "PRAGMA integrity_check;" &> /dev/null; then
                BACKUP_RESULT=$(sqlite3 "$TEMP_BACKUP" "PRAGMA integrity_check;" | head -1)
                if [ "$BACKUP_RESULT" = "ok" ]; then
                    echo -e "${GREEN}✓ Backup ist nicht beschädigt${NC}"
                    echo -e "${YELLOW}Ersetze beschädigte Datenbank mit Backup...${NC}"
                    gcloud storage cp "$TEMP_BACKUP" "gs://$BUCKET_NAME/anschreiben.db"
                    echo -e "${GREEN}✓ Datenbank wurde mit Backup ersetzt${NC}"
                    rm -f "$TEMP_DB" "$TEMP_BACKUP"
                    exit 0
                else
                    echo -e "${RED}✗ Backup ist auch beschädigt${NC}"
                fi
            fi
        fi
        rm -f "$TEMP_BACKUP"
    else
        echo -e "${YELLOW}Kein Backup gefunden${NC}"
    fi
    
    rm -f "$TEMP_DB"
    
    echo -e "${YELLOW}Schritt 5: Lösche beschädigte Datenbank...${NC}"
    echo -e "${RED}WARNUNG: Dies löscht die beschädigte Datenbank in Cloud Storage!${NC}"
    read -p "Möchten Sie fortfahren? (j/n): " CONFIRM
    if [ "$CONFIRM" = "j" ] || [ "$CONFIRM" = "J" ]; then
        gcloud storage rm "gs://$BUCKET_NAME/anschreiben.db"
        gcloud storage rm "gs://$BUCKET_NAME/anschreiben_backup.db" 2>/dev/null || true
        echo -e "${GREEN}✓ Beschädigte Datenbank wurde gelöscht${NC}"
        echo -e "${YELLOW}Die App wird beim nächsten Start eine neue Datenbank erstellen${NC}"
    else
        echo "Abgebrochen."
        exit 0
    fi
else
    echo -e "${YELLOW}Keine Datenbank in Cloud Storage gefunden${NC}"
fi

echo ""
echo -e "${GREEN}=== Reparatur abgeschlossen ===${NC}"
echo ""
echo "Nächste Schritte:"
echo "1. Die App wird beim nächsten Start eine neue Datenbank erstellen"
echo "2. Erstellen Sie neue Einträge in der App"
echo "3. Die Datenbank wird automatisch zu Cloud Storage synchronisiert"

