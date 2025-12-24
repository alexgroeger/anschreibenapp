# Deployment Pipeline Dokumentation

Diese Dokumentation beschreibt die manuell auslösbare Deployment-Pipeline mit automatisierten Tests für die Anschreiben Muckibude.

## Übersicht

Die Pipeline führt automatisch End-to-End-Tests vor dem Deployment aus und blockiert das Deployment, wenn Tests fehlschlagen. Die Pipeline besteht aus folgenden Phasen:

1. **Setup & Prerequisites**: APIs aktivieren, Cloud Storage Bucket prüfen/erstellen
2. **Code Quality & Tests**: Dependencies installieren, TypeScript-Check, E2E Tests gegen Production
3. **Build & Push**: Docker Image erstellen und zu Container Registry pushen
4. **Pre-Deploy Backup**: Datenbank-Backup zu Cloud Storage erstellen
5. **Deploy**: Deployment zu Cloud Run (mit GCS_BUCKET_NAME Environment-Variable)
6. **Post-Deploy Verification**: Service Status prüfen, Smoke Tests ausführen, finale Status-Ausgabe
7. **Cloud Storage Sync**: Automatische Synchronisation beim Container-Start

## Pipeline-Flow

```
PHASE 1: Setup & Prerequisites
  ├─ APIs aktivieren (Cloud Build, Cloud Run, Container Registry, Storage)
  └─ Cloud Storage Bucket prüfen/erstellen
  ↓
PHASE 2: Code Quality & Tests
  ├─ Dependencies installieren (npm ci)
  ├─ TypeScript Type-Check
  └─ E2E Tests (gegen aktuelle Production)
  ↓ (bei Fehler: Pipeline stoppt)
PHASE 3: Build & Push
  ├─ Docker Image bauen
  └─ Image zu Container Registry pushen
  ↓
PHASE 4: Pre-Deployment Backup
  └─ Datenbank-Backup zu Cloud Storage
  ↓
PHASE 5: Deployment
  └─ Deploy zu Cloud Run (mit GCS_BUCKET_NAME)
  ↓
PHASE 6: Post-Deployment Verification
  ├─ Service Status prüfen
  ├─ Health Check durchführen
  ├─ Smoke Tests ausführen
  └─ Finale Status-Ausgabe
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
export GCP_PROJECT_ID="gen-lang-client-0764998759"
gcloud config set project $GCP_PROJECT_ID

# API-Key aus .env.local holen (falls vorhanden)
export GOOGLE_GENERATIVE_AI_API_KEY="$(grep GOOGLE_GENERATIVE_AI_API_KEY .env.local | cut -d'=' -f2)"

# Oder API-Key aus Cloud Run holen (falls nicht in .env.local)
if [ -z "$GOOGLE_GENERATIVE_AI_API_KEY" ]; then
  API_KEY=$(gcloud run services describe anschreiben-app --region=europe-west1 --format='value(spec.template.spec.containers[0].env[0].value)')
  export GOOGLE_GENERATIVE_AI_API_KEY="$API_KEY"
fi

# Pipeline ausführen
gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions=_GOOGLE_GENERATIVE_AI_API_KEY=$GOOGLE_GENERATIVE_AI_API_KEY
```

**Alternative**: Über das Pipeline-Script (empfohlen):
```bash
npm run pipeline:trigger
```

**Hinweis**: Die Pipeline setzt automatisch `GCS_BUCKET_NAME=411832844870-anschreiben-data` als Environment-Variable (verwendet Projektnummer, nicht Projekt-ID). Stellen Sie sicher, dass der Cloud Storage Bucket existiert (siehe Cloud Storage Setup).

### Option 2: GitHub Actions

1. Öffnen Sie das GitHub Repository
2. Gehen Sie zu "Actions" → "Manual Deployment Pipeline"
3. Klicken Sie auf "Run workflow"
4. Wählen Sie den Branch und die Optionen
5. Klicken Sie auf "Run workflow"

**Voraussetzungen:**
- GitHub Secret `GCP_SA_KEY`: Service Account Key für Google Cloud
- GitHub Secret `GOOGLE_GENERATIVE_AI_API_KEY`: Google Gemini API Key
- **Cloud Storage Bucket**: Muss vor dem ersten Deployment erstellt werden (siehe Cloud Storage Setup)

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

## Voraussetzungen: Cloud Storage Setup

**Wichtig**: Vor dem ersten Deployment muss Cloud Storage konfiguriert werden:

1. **Cloud Storage Bucket erstellen**:
   ```bash
   # Projekt-ID setzen
   export PROJECT_ID="gen-lang-client-0764998759"
   export PROJECT_NUMBER="411832844870"
   gcloud config set project $PROJECT_ID
   
   # Bucket erstellen
   gcloud storage buckets create gs://$PROJECT_NUMBER-anschreiben-data \
     --location=europe-west1 \
     --project=$PROJECT_ID
   ```

2. **Service Account Berechtigungen prüfen**:
   ```bash
   # Berechtigungen werden automatisch gesetzt, aber prüfen Sie:
   gcloud projects get-iam-policy $PROJECT_ID \
     --flatten="bindings[].members" \
     --filter="bindings.members:serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com"
   ```

3. **Automatisches Setup (empfohlen)**:
   ```bash
   ./scripts/fix-cloud-storage.sh
   ```

Die Pipeline setzt automatisch `GCS_BUCKET_NAME=${PROJECT_ID}-anschreiben-data` beim Deployment. Der tatsächliche Bucket-Name verwendet die Projekt-Nummer: `${PROJECT_NUMBER}-anschreiben-data`.

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

### Cloud Storage Rollback:

Falls die Datenbank nach dem Deployment beschädigt ist:

```bash
# 1. Prüfen Sie die Datenbank-Integrität
./scripts/fix-corrupted-database.sh

# 2. Manuell von Cloud Storage herunterladen (falls nötig)
curl -X POST "https://anschreiben-app-411832844870.europe-west1.run.app/api/admin/database/sync?action=download"

# 3. Backup wiederherstellen (falls verfügbar)
# Das Backup wird automatisch in Cloud Storage gespeichert: anschreiben_backup.db
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

### Cloud Storage Probleme

**Problem: "Cloud Storage not configured"**

- Prüfen Sie, ob `GCS_BUCKET_NAME` in Cloud Run gesetzt ist:
  ```bash
  gcloud run services describe anschreiben-app \
    --region=europe-west1 \
    --format='value(spec.template.spec.containers[0].env)'
  ```

- Falls nicht gesetzt, führen Sie aus:
  ```bash
  ./scripts/fix-cloud-storage.sh
  ```

**Problem: "database disk image is malformed"**

- Die Datenbank wurde beim Download beschädigt
- Führen Sie das Reparatur-Script aus:
  ```bash
  ./scripts/fix-corrupted-database.sh
  ```

- Oder manuell von Cloud Storage herunterladen:
  ```bash
  curl -X POST "https://anschreiben-app-411832844870.europe-west1.run.app/api/admin/database/sync?action=download"
  ```

**Problem: Daten gehen nach Deployment verloren**

- Prüfen Sie, ob Cloud Storage Synchronisation aktiv ist:
  ```bash
  curl "https://anschreiben-app-411832844870.europe-west1.run.app/api/admin/database/sync"
  ```

- Prüfen Sie die Logs auf Synchronisations-Fehler:
  ```bash
  gcloud run services logs read anschreiben-app \
    --region=europe-west1 \
    --filter="textPayload=~'sync|upload|download'"
  ```

## Best Practices

1. **Vor jedem Deployment**: Tests lokal ausführen
2. **Bei Fehlern**: Logs prüfen und Probleme beheben
3. **Regelmäßig**: Test-Suites aktualisieren bei neuen Features
4. **Monitoring**: Cloud Build Notifications aktivieren
5. **Cloud Storage**: Prüfen Sie regelmäßig die Datenbank-Synchronisation über `/admin/database`
6. **Backups**: Cloud Storage erstellt automatisch Backups bei jedem Upload
7. **Datenbank-Integrität**: Bei Problemen das Reparatur-Script ausführen

## Datenbank-Synchronisation

### Automatische Synchronisation

Die Pipeline konfiguriert automatisch Cloud Storage Synchronisation:

1. **Beim Container-Start**: 
   - Lädt die neueste Datenbank von Cloud Storage
   - Falls Cloud neuer ist, wird sie heruntergeladen
   - Falls lokal neuer ist, wird sie hochgeladen

2. **Nach Schreiboperationen**:
   - Automatischer Upload nach CREATE/UPDATE/DELETE
   - Integritätsprüfung vor dem Upload
   - Automatisches Backup-Erstellen

3. **Environment-Variablen**:
   - `GCS_BUCKET_NAME`: Wird automatisch von der Pipeline gesetzt
   - Format: `${PROJECT_NUMBER}-anschreiben-data` (verwendet Projektnummer, nicht Projekt-ID)
   - Aktueller Wert: `411832844870-anschreiben-data`
   - **Wichtig**: Der Bucket-Name ist in `cloudbuild.yaml` hardcodiert. Bei Projektwechsel muss dieser angepasst werden.

### Manuelle Synchronisation

Nach dem Deployment können Sie die Synchronisation manuell prüfen:

```bash
# Status prüfen
curl "https://anschreiben-app-411832844870.europe-west1.run.app/api/admin/database/sync"

# Manuell hochladen
curl -X POST "https://anschreiben-app-411832844870.europe-west1.run.app/api/admin/database/sync?action=upload"

# Manuell herunterladen
curl -X POST "https://anschreiben-app-411832844870.europe-west1.run.app/api/admin/database/sync?action=download"
```

### Backup-Strategie

- **Automatisches Backup**: Bei jedem Upload wird `anschreiben_backup.db` erstellt
- **Pre-Deployment Backup**: Pipeline erstellt Backup vor jedem Deployment
- **Cloud Storage Versionierung**: Optional aktivierbar für zusätzliche Sicherheit

## Nächste Schritte

- [ ] Staging-Umgebung einrichten für sicherere Tests
- [ ] Automatischer Rollback bei Post-Deploy-Test-Fehlern
- [ ] Erweiterte Test-Coverage für kritische Features
- [ ] Performance-Tests hinzufügen
- [ ] Test-Ergebnisse in externe Tools integrieren
- [x] Cloud Storage Integration für persistente Datenbank
- [x] Automatische Datenbank-Synchronisation
- [x] Integritätsprüfung für Datenbank-Uploads/Downloads

## Support

Bei Problemen:
- Cloud Build Logs prüfen
- Test-Logs in Cloud Storage ansehen
- GitHub Issues erstellen

