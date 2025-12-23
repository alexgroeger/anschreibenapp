# Deployment Pipeline Dokumentation

Diese Dokumentation beschreibt die manuell auslösbare Deployment-Pipeline mit automatisierten Tests für die Anschreiben App.

## Übersicht

Die Pipeline führt automatisch End-to-End-Tests vor dem Deployment aus und blockiert das Deployment, wenn Tests fehlschlagen. Die Pipeline besteht aus folgenden Phasen:

1. **Pre-Deployment Checks**: Code-Qualität (Linting, TypeScript)
2. **E2E Tests**: Automatische Tests gegen die aktuelle Production-URL
3. **Build**: Docker Image erstellen (nur bei erfolgreichen Tests)
4. **Pre-Deploy Backup**: Datenbank-Backup erstellen
5. **Deploy**: Deployment zu Cloud Run
6. **Post-Deploy Verification**: Smoke Tests nach dem Deployment

## Pipeline-Flow

```
Pre-Deployment Checks
  ↓
E2E Tests (gegen aktuelle Production)
  ↓ (bei Fehler: Pipeline stoppt)
Build Docker Image
  ↓
Push Image to Registry
  ↓
Database Backup
  ↓
Deploy to Cloud Run
  ↓
Post-Deploy Smoke Tests
  ↓ (bei Fehler: Warnung, aber Deployment bleibt)
Erfolgreich
```

## Manuelle Ausführung

### Option 1: Google Cloud Build (Empfohlen)

#### Über Google Cloud Console:

1. Öffnen Sie die [Cloud Build Console](https://console.cloud.google.com/cloud-build)
2. Klicken Sie auf "Triggers" → "Create Trigger"
3. Konfigurieren Sie den Trigger:
   - **Name**: `manual-deploy`
   - **Event**: Manual invocation
   - **Configuration**: Cloud Build configuration file
   - **Location**: Repository root
   - **Cloud Build configuration file**: `cloudbuild.yaml`
4. Klicken Sie auf "Create"
5. Zum Ausführen: Klicken Sie auf den Trigger → "Run trigger"

#### Über gcloud CLI:

```bash
# Projekt setzen
gcloud config set project gen-lang-client-0764998759

# Pipeline manuell auslösen
gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions=_GOOGLE_GENERATIVE_AI_API_KEY=your-api-key
```

### Option 2: GitHub Actions

1. Öffnen Sie das GitHub Repository
2. Gehen Sie zu "Actions" → "Manual Deployment Pipeline"
3. Klicken Sie auf "Run workflow"
4. Wählen Sie den Branch und die Optionen
5. Klicken Sie auf "Run workflow"

**Voraussetzungen:**
- GitHub Secret `GCP_SA_KEY`: Service Account Key für Google Cloud
- GitHub Secret `GOOGLE_GENERATIVE_AI_API_KEY`: Google Gemini API Key

## Test-Suites

### E2E Tests (Pre-Deployment)

Die folgenden Test-Suites werden vor dem Deployment ausgeführt:

1. **homepage.spec.ts**: Basis-Funktionalität und Navigation
2. **api-health.spec.ts**: API-Endpunkt-Verfügbarkeit
3. **extraction.spec.ts**: Job-Extraktion (Text-Input und File-Upload)
4. **application-flow.spec.ts**: Vollständiger Workflow-UI
5. **dashboard.spec.ts**: Dashboard-Funktionalität

### Smoke Tests (Post-Deployment)

Nach dem Deployment werden kurze Smoke Tests ausgeführt:

1. **post-deploy.spec.ts**: Basis-Funktionalität nach Deployment
2. Health Checks für kritische API-Endpunkte
3. Console-Error-Checks

## Test-Konfiguration

### Umgebungsvariablen

- `TEST_BASE_URL`: URL der zu testenden Umgebung (Standard: Production-URL)
- `CI=true`: Aktiviert CI-Modus (Headless-Browser, Retries)

### Test-Ausführung lokal

```bash
# Alle E2E Tests ausführen
npm run test:e2e

# Tests mit UI
npm run test:e2e:ui

# Tests im headed Modus
npm run test:e2e:headed

# Nur Smoke Tests
npm run test:smoke
```

## Test-Isolation

**Wichtig**: Die Tests sind so konzipiert, dass sie keine echten Daten in Production erstellen oder löschen:

- Tests sind **read-only** (lesen nur Daten)
- Keine POST/PUT/DELETE-Operationen gegen Production
- API-Tests prüfen nur Verfügbarkeit und Struktur, nicht Funktionalität mit echten Daten

## Fehlerbehandlung

### Wenn Pre-Deployment Tests fehlschlagen:

- Pipeline stoppt automatisch
- Kein Docker-Build wird ausgeführt
- Kein Deployment erfolgt
- Fehler werden in Cloud Build Logs ausgegeben

### Wenn Post-Deployment Tests fehlschlagen:

- Deployment bleibt aktiv (wurde bereits deployed)
- Warnung wird in Logs ausgegeben
- Manueller Rollback kann erforderlich sein

## Rollback-Strategie

Falls nach dem Deployment Probleme auftreten:

### Automatischer Rollback (bei Post-Deploy-Test-Fehlern):

Aktuell nicht implementiert. Manueller Rollback erforderlich.

### Manueller Rollback:

```bash
# Vorherige Revision finden
gcloud run revisions list --service=anschreiben-app --region=europe-west1

# Zu vorheriger Revision zurückkehren
gcloud run services update-traffic anschreiben-app \
  --to-revisions=REVISION_NAME=100 \
  --region=europe-west1
```

## Monitoring

### Cloud Build Logs

Alle Test-Ergebnisse werden in Cloud Build Logs gespeichert:

```bash
# Logs ansehen
gcloud builds log BUILD_ID --project=gen-lang-client-0764998759
```

### Test-Artefakte

Test-Reports und Screenshots werden in Cloud Storage gespeichert:

- Location: `gs://PROJECT_ID-build-artifacts/test-results/`
- HTML-Reports: `gs://PROJECT_ID-build-artifacts/playwright-report/`

## Troubleshooting

### Tests schlagen fehl wegen Timeout

- Erhöhen Sie `timeout` in `playwright.config.ts`
- Prüfen Sie die Netzwerkverbindung zur Production-URL

### Tests schlagen fehl wegen API-Key

- Tests können auch ohne API-Key laufen (nur UI/API-Verfügbarkeit)
- Für vollständige Tests: API-Key in Secret Manager konfigurieren

### Pipeline hängt beim Build

- Prüfen Sie Cloud Build Quotas
- Erhöhen Sie `timeout` in `cloudbuild.yaml`

## Best Practices

1. **Vor jedem Deployment**: Tests lokal ausführen
2. **Bei Fehlern**: Logs prüfen und Probleme beheben
3. **Regelmäßig**: Test-Suites aktualisieren bei neuen Features
4. **Monitoring**: Cloud Build Notifications aktivieren

## Nächste Schritte

- [ ] Staging-Umgebung einrichten für sicherere Tests
- [ ] Automatischer Rollback bei Post-Deploy-Test-Fehlern
- [ ] Erweiterte Test-Coverage für kritische Features
- [ ] Performance-Tests hinzufügen
- [ ] Test-Ergebnisse in externe Tools integrieren

## Support

Bei Problemen:
- Cloud Build Logs prüfen
- Test-Logs in Cloud Storage ansehen
- GitHub Issues erstellen

