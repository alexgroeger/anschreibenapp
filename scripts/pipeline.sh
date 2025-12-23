#!/bin/bash

# Pipeline Management Script für Anschreiben Muckibude
# Vereinfacht die Verwaltung von Deployment-Pipelines

set -e

# Farben für Output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Konfiguration
PROJECT_ID="gen-lang-client-0764998759"
REGION="europe-west1"
SERVICE_NAME="anschreiben-app"
PRODUCTION_URL="https://anschreiben-app-411832844870.europe-west1.run.app"

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

# Prüfe ob gcloud installiert ist
check_gcloud() {
    if ! command -v gcloud &> /dev/null; then
        print_error "gcloud ist nicht installiert oder nicht im PATH"
        echo "Bitte installieren Sie gcloud (siehe SETUP_GCLOUD.md)"
        exit 1
    fi
    print_success "gcloud gefunden"
}

# Prüfe ob eingeloggt
check_auth() {
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        print_warning "Nicht bei Google Cloud eingeloggt"
        echo "Bitte loggen Sie sich ein:"
        gcloud auth login
    fi
    print_success "Authentifiziert"
}

# Tests lokal ausführen
run_tests() {
    print_header "Tests lokal ausführen"
    
    if [ ! -d "node_modules" ]; then
        print_warning "Dependencies nicht installiert, installiere..."
        npm install
    fi
    
    if [ ! -d "node_modules/@playwright" ]; then
        print_warning "Playwright nicht installiert, installiere..."
        npx playwright install --with-deps chromium
    fi
    
    echo ""
    echo "Welche Tests möchten Sie ausführen?"
    echo "1) Alle E2E Tests"
    echo "2) Nur API Health Tests"
    echo "3) Nur Smoke Tests"
    echo "4) Tests mit UI"
    echo "5) Einzelne Test-Suite"
    read -p "Auswahl (1-5): " test_choice
    
    case $test_choice in
        1)
            npm run test:e2e
            ;;
        2)
            npm run test:e2e -- tests/e2e/api-health.spec.ts
            ;;
        3)
            npm run test:smoke
            ;;
        4)
            npm run test:e2e:ui
            ;;
        5)
            echo "Verfügbare Test-Suites:"
            find tests/e2e -name "*.spec.ts" -type f | sed 's|tests/e2e/||' | sed 's|\.spec\.ts||'
            read -p "Test-Suite Name (ohne .spec.ts): " suite_name
            npm run test:e2e -- "tests/e2e/${suite_name}.spec.ts"
            ;;
        *)
            print_error "Ungültige Auswahl"
            exit 1
            ;;
    esac
}

# Pipeline manuell auslösen
trigger_pipeline() {
    print_header "Pipeline manuell auslösen"
    
    check_gcloud
    check_auth
    
    # Projekt setzen
    gcloud config set project $PROJECT_ID
    
    # API Key prüfen
    if [ -z "$GOOGLE_GENERATIVE_AI_API_KEY" ]; then
        print_warning "GOOGLE_GENERATIVE_AI_API_KEY ist nicht gesetzt"
        read -p "Möchten Sie den API Key jetzt eingeben? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            read -sp "API Key: " api_key
            echo
            export GOOGLE_GENERATIVE_AI_API_KEY="$api_key"
        else
            print_error "API Key erforderlich"
            exit 1
        fi
    fi
    
    print_success "Starte Pipeline..."
    gcloud builds submit \
        --config=cloudbuild.yaml \
        --substitutions=_GOOGLE_GENERATIVE_AI_API_KEY=$GOOGLE_GENERATIVE_AI_API_KEY \
        --project=$PROJECT_ID
}

# Pipeline Status prüfen
check_pipeline_status() {
    print_header "Pipeline Status"
    
    check_gcloud
    check_auth
    
    gcloud config set project $PROJECT_ID
    
    echo ""
    echo "Letzte 5 Builds:"
    gcloud builds list --limit=5 --format="table(id,status,createTime,source.repoSource.branchName)"
}

# Service Status prüfen
check_service_status() {
    print_header "Cloud Run Service Status"
    
    check_gcloud
    check_auth
    
    gcloud config set project $PROJECT_ID
    
    echo ""
    echo "Service Informationen:"
    gcloud run services describe $SERVICE_NAME \
        --region=$REGION \
        --format="table(status.url,status.latestReadyRevisionName,status.conditions[0].status)"
    
    echo ""
    echo "Aktuelle URL: $PRODUCTION_URL"
}

# Logs ansehen
view_logs() {
    print_header "Service Logs"
    
    check_gcloud
    check_auth
    
    gcloud config set project $PROJECT_ID
    
    echo ""
    echo "Zeige letzte Logs (Ctrl+C zum Beenden)..."
    gcloud run services logs read $SERVICE_NAME --region=$REGION --limit=50
}

# Rollback durchführen
rollback() {
    print_header "Rollback zu vorheriger Version"
    
    check_gcloud
    check_auth
    
    gcloud config set project $PROJECT_ID
    
    echo ""
    echo "Verfügbare Revisionen:"
    gcloud run revisions list --service=$SERVICE_NAME --region=$REGION --format="table(name,status.conditions[0].status,metadata.creationTimestamp)"
    
    echo ""
    read -p "Revision Name (für Rollback): " revision_name
    
    if [ -z "$revision_name" ]; then
        print_error "Revision Name erforderlich"
        exit 1
    fi
    
    print_warning "Rollback zu: $revision_name"
    read -p "Fortfahren? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        gcloud run services update-traffic $SERVICE_NAME \
            --to-revisions=$revision_name=100 \
            --region=$REGION
        print_success "Rollback durchgeführt"
    else
        print_warning "Rollback abgebrochen"
    fi
}

# Hauptmenü
show_menu() {
    echo ""
    print_header "Pipeline Management"
    echo ""
    echo "1) Tests lokal ausführen"
    echo "2) Pipeline manuell auslösen"
    echo "3) Pipeline Status prüfen"
    echo "4) Service Status prüfen"
    echo "5) Logs ansehen"
    echo "6) Rollback durchführen"
    echo "7) Beenden"
    echo ""
}

# Hauptlogik
main() {
    if [ $# -eq 0 ]; then
        # Interaktives Menü
        while true; do
            show_menu
            read -p "Auswahl (1-7): " choice
            
            case $choice in
                1)
                    run_tests
                    ;;
                2)
                    trigger_pipeline
                    ;;
                3)
                    check_pipeline_status
                    ;;
                4)
                    check_service_status
                    ;;
                5)
                    view_logs
                    ;;
                6)
                    rollback
                    ;;
                7)
                    print_success "Auf Wiedersehen!"
                    exit 0
                    ;;
                *)
                    print_error "Ungültige Auswahl"
                    ;;
            esac
            
            echo ""
            read -p "Drücken Sie Enter um fortzufahren..."
        done
    else
        # Direkte Befehle
        case $1 in
            test|tests)
                run_tests
                ;;
            trigger|deploy)
                trigger_pipeline
                ;;
            status)
                check_pipeline_status
                ;;
            service)
                check_service_status
                ;;
            logs)
                view_logs
                ;;
            rollback)
                rollback
                ;;
            *)
                echo "Verfügbare Befehle: test, trigger, status, service, logs, rollback"
                exit 1
                ;;
        esac
    fi
}

main "$@"

