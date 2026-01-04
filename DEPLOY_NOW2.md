# 🚀 Deployment-Anleitung: Jetzt deployen (Verbesserte Version)

Diese Anleitung führt Sie Schritt für Schritt durch das Deployment auf Google Cloud Run.
**WICHTIG**: Diese Version sucht automatisch nach dem Bucket mit vorhandenen Daten, um Datenverlust zu vermeiden!

## ✅ Voraussetzungen erfüllt

- ✅ Code kompiliert ohne Fehler
- ✅ Docker Image erfolgreich gebaut
- ✅ API-Endpoints getestet
- ✅ Dokumentation vollständig
- ✅ gcloud CLI installiert und im PATH
- ✅ Google Cloud Projekt konfiguriert
- ✅ API Key für Google Generative AI (optional, kann später gesetzt werden)

## 📋 Schnellstart (5 Minuten)

### Schritt 0: Environment Setup

```bash
# 1. gcloud PATH setzen (falls nicht im PATH)
export PATH="$HOME/google-cloud-sdk/bin:/usr/local/bin:$PATH"

# 2. Projekt-Konfiguration
export GCP_PROJECT_ID="gen-lang-client-0764998759"
export PROJECT_NUMBER="411832844870"
export GCP_REGION="europe-west1"
export SERVICE_NAME="anschreiben-app"

# 3. API Key setzen (falls vorhanden)
export GOOGLE_GENERATIVE_AI_API_KEY="ihr-api-key-hier"

# 4. Datenbankpfad setzen (optional - nur wenn Volume gemountet)
export DATABASE_PATH="/anschreiben-app/database.sqlite"  # Für Cloud Run mit Volume
# export DATABASE_PATH="./data/anschreiben.db"  # Für lokale Entwicklung
```

### Schritt 1: Google Cloud Setup

```bash
# 1. Projekt setzen
gcloud config set project $GCP_PROJECT_ID

# 2. APIs aktivieren
gcloud services enable cloudbuild.googleapis.com \
  run.googleapis.com \
  containerregistry.googleapis.com \
  storage.googleapis.com \
  --project=$GCP_PROJECT_ID
```

### Schritt 2: Cloud Storage Bucket prüfen und verwenden

**WICHTIG**: Wir verwenden IMMER den festen Bucket-Namen `411832844870-anschreiben-data`. Es wird KEIN neuer Bucket erstellt!

```bash
# FESTER Bucket-Name (wird immer verwendet - dieser Bucket enthält bereits alle Daten)
BUCKET_NAME="411832844870-anschreiben-data"

echo "=== Schritt 2: Prüfe Cloud Storage Bucket ==="
echo "Fester Bucket-Name: $BUCKET_NAME"
echo ""

# Prüfe ob Bucket existiert
if gcloud storage buckets describe "gs://$BUCKET_NAME" --project="$GCP_PROJECT_ID" &> /dev/null; then
  echo "✓ Bucket existiert: $BUCKET_NAME"
  
  # Prüfe auf Datenbank
  if gcloud storage ls "gs://$BUCKET_NAME/anschreiben.db" --project="$GCP_PROJECT_ID" &> /dev/null; then
    echo "✓ Datenbank gefunden: anschreiben.db"
  else
    echo "⚠ Datenbank nicht gefunden (wird beim ersten Start erstellt)"
  fi
  
  # Prüfe auf Backup
  if gcloud storage ls "gs://$BUCKET_NAME/anschreiben_backup.db" --project="$GCP_PROJECT_ID" &> /dev/null; then
    echo "✓ Backup gefunden: anschreiben_backup.db"
  fi
  
  # Prüfe auf Dokumente
  DOC_COUNT=$(gcloud storage ls "gs://$BUCKET_NAME/application-documents/**" --project="$GCP_PROJECT_ID" 2>/dev/null | wc -l | tr -d ' ')
  if [ "$DOC_COUNT" -gt 0 ]; then
    echo "✓ Dokumente gefunden: $DOC_COUNT Dateien in application-documents/"
  else
    echo "ℹ Keine Dokumente gefunden (normal bei erstem Start)"
  fi
  
  JOB_DOC_COUNT=$(gcloud storage ls "gs://$BUCKET_NAME/job-documents/**" --project="$GCP_PROJECT_ID" 2>/dev/null | wc -l | tr -d ' ')
  if [ "$JOB_DOC_COUNT" -gt 0 ]; then
    echo "✓ Job-Dokumente gefunden: $JOB_DOC_COUNT Dateien in job-documents/"
  fi
  
  # Prüfe auf Prompts-Verzeichnis
  if gcloud storage ls "gs://$BUCKET_NAME/prompts/" --project="$GCP_PROJECT_ID" &> /dev/null; then
    echo "✓ Prompts-Verzeichnis gefunden"
  fi

  echo ""
  echo "=== Bucket-Konfiguration ==="
  echo "Verwendeter Bucket: $BUCKET_NAME"
  echo ""
  echo "📋 Was wird in diesem Bucket gespeichert:"
  echo "  ✓ Datenbank (anschreiben.db) - enthält ALLE Daten:"
  echo "    - Bewerbungen (applications)"
  echo "    - Admin-Einstellungen (settings)"
  echo "    - Prompts (prompts, prompt_versions)"
  echo "    - Anschreiben-Versionen (cover_letter_versions)"
  echo "    - Dokument-Metadaten (application_documents)"
  echo "    - Erinnerungen (reminders)"
  echo "    - Kontaktpersonen (contact_persons)"
  echo "    - Lebenslauf (resume, resume_versions)"
  echo "    - Alte Anschreiben (old_cover_letters)"
  echo "  ✓ Dokumente (application-documents/{id}/{filename})"
  echo "  ✓ Job-Dokumente (job-documents/{filename})"
  echo ""
  echo "⚠ WICHTIG: Dieser Bucket wird IMMER verwendet - kein neuer wird erstellt!"
  echo "BUCKET_NAME=$BUCKET_NAME"
else
  echo "❌ FEHLER: Bucket $BUCKET_NAME existiert nicht!"
  echo ""
  echo "Dieser Bucket sollte bereits existieren und alle Daten enthalten."
  echo "Bitte prüfen Sie, ob der Bucket-Name korrekt ist oder kontaktieren Sie den Administrator."
  echo ""
  exit 1
fi
```

**Kritisch**: 
- Es wird KEIN neuer Bucket erstellt
- Wenn der Bucket nicht existiert, wird das Script mit Fehler beendet
- Der Bucket `411832844870-anschreiben-data` ist fest definiert und enthält bereits alle Daten
- So wird garantiert immer der gleiche Bucket verwendet und keine Daten gehen verloren!

### Schritt 2.5: Volume Mount vs. Standard-Konfiguration

Die App unterstützt zwei Deployment-Modi:

#### Option A: Mit Cloud Storage Volume Mount (Empfohlen für direkten Zugriff)

**Vorteile:**
- ✅ Direkter Dateisystem-Zugriff auf Cloud Storage
- ✅ Datenbank wird direkt im gemounteten Volume gespeichert
- ✅ Keine zusätzliche Synchronisation nötig (direkter Zugriff)
- ✅ Bessere Performance für häufige Schreiboperationen

**Konfiguration:**
- Setzen Sie `DATABASE_PATH=/anschreiben-app/database.sqlite`
- Verwenden Sie `--add-volume` und `--add-volume-mount` beim Deployment
- Das Volume wird unter `/anschreiben-app` gemountet

**Wann verwenden:**
- Wenn Sie direkten Dateisystem-Zugriff auf Cloud Storage benötigen
- Wenn die Datenbank häufig geschrieben wird
- Wenn Sie die Datenbank direkt im Bucket speichern möchten

#### Option B: Ohne Volume Mount (Standard - Synchronisation über API)

**Vorteile:**
- ✅ Einfacheres Setup (keine Volume Mount Konfiguration)
- ✅ Funktioniert zuverlässig mit SQLite
- ✅ Automatische Synchronisation zu/von Cloud Storage
- ✅ Datenbank läuft lokal, wird nur synchronisiert

**Konfiguration:**
- Lassen Sie `DATABASE_PATH` ungesetzt (Standardpfad: `/app/data/anschreiben.db`)
- Keine Volume Mount Parameter beim Deployment
- Die App synchronisiert automatisch mit Cloud Storage

**Wann verwenden:**
- Standard-Deployment ohne spezielle Anforderungen
- Wenn Sie die Flexibilität der API-basierten Synchronisation bevorzugen
- Für einfacheres Setup und Wartung

**Empfehlung:** Verwenden Sie Option A (Volume Mount), wenn Sie bereits ein Volume gemountet haben. Die App prüft beim Start automatisch, ob das Verzeichnis existiert und beschreibbar ist.

### Schritt 3: Docker Image bauen und pushen

```bash
# Image zu Google Container Registry pushen
cd "/Users/mac-join/Documents/Cursor/Repos/Anschreiben App"
gcloud builds submit --tag gcr.io/$GCP_PROJECT_ID/$SERVICE_NAME --project=$GCP_PROJECT_ID

# Oder mit bereitgestelltem Script
./cloud-run-deploy.sh
```

### Schritt 4: Cloud Run Service deployen

**WICHTIG**: Verwenden Sie den Bucket-Namen aus Schritt 2!

```bash
# WICHTIG: Verwenden Sie den Bucket, der in Schritt 2 gefunden wurde!
# Falls Sie in Schritt 2 einen anderen Bucket gefunden haben, verwenden Sie diesen!

# Environment-Variablen vorbereiten
# Verwende den Bucket, der in Schritt 2 gefunden wurde
ENV_VARS="GCS_BUCKET_NAME=$BUCKET_NAME"

# DATABASE_PATH hinzufügen (wenn Volume gemountet wird)
if [ -n "$DATABASE_PATH" ]; then
  ENV_VARS="$ENV_VARS,DATABASE_PATH=$DATABASE_PATH"
  echo "ℹ DATABASE_PATH gesetzt: $DATABASE_PATH (Volume Mount wird verwendet)"
else
  # Standardpfad verwenden (kein Volume Mount)
  echo "ℹ DATABASE_PATH nicht gesetzt - verwende Standardpfad /app/data/anschreiben.db"
fi

# API Key hinzufügen (falls gesetzt)
if [ -n "$GOOGLE_GENERATIVE_AI_API_KEY" ]; then
  ENV_VARS="$ENV_VARS,GOOGLE_GENERATIVE_AI_API_KEY=$GOOGLE_GENERATIVE_AI_API_KEY"
fi

echo "Deploye mit Bucket: $BUCKET_NAME"
echo "Environment-Variablen: $ENV_VARS"

# Service deployen mit Volume Mount (wenn DATABASE_PATH gesetzt)
if [ -n "$DATABASE_PATH" ]; then
  echo "Deploye mit Volume Mount..."
  gcloud run deploy $SERVICE_NAME \
    --image gcr.io/$GCP_PROJECT_ID/$SERVICE_NAME \
    --region $GCP_REGION \
    --platform managed \
    --allow-unauthenticated \
    --port 8080 \
    --memory 2Gi \
    --cpu 2 \
    --timeout 300 \
    --max-instances 10 \
    --set-env-vars $ENV_VARS \
    --add-volume name=gcs-1,type=cloud-storage,bucket=$BUCKET_NAME \
    --add-volume-mount volume=gcs-1,mount-path=/anschreiben-app \
    --project=$GCP_PROJECT_ID
else
  # Deployment ohne Volume Mount
  echo "Deploye ohne Volume Mount (Standard-Konfiguration)..."
  gcloud run deploy $SERVICE_NAME \
    --image gcr.io/$GCP_PROJECT_ID/$SERVICE_NAME \
    --region $GCP_REGION \
    --platform managed \
    --allow-unauthenticated \
    --port 8080 \
    --memory 2Gi \
    --cpu 2 \
    --timeout 300 \
    --max-instances 10 \
    --set-env-vars $ENV_VARS \
    --project=$GCP_PROJECT_ID
fi

# Nach dem Deployment: Prüfen Sie die Logs
echo ""
echo "Warte 15 Sekunden, dann prüfe Logs auf Datenbank-Download..."
sleep 15
gcloud run services logs read $SERVICE_NAME \
  --region $GCP_REGION \
  --limit 30 \
  --project=$GCP_PROJECT_ID | grep -E "(Database|Cloud Storage|anschreiben.db|download|upload|sync)"
```

**Erwartete Logs bei erfolgreichem Start:**
- `SQLite database path: /anschreiben-app/database.sqlite` (oder Standardpfad, falls kein Volume Mount)
- `Using Cloud Storage bucket: 411832844870-anschreiben-data`
- `Mount directory /anschreiben-app: exists=true, writable=true` (falls Volume Mount verwendet)
- `Database downloaded successfully from Cloud Storage` (falls Datenbank im Bucket vorhanden)
- `Cloud Storage is configured and ready for sync`

### Schritt 5: Service URL abrufen

```bash
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
  --region $GCP_REGION \
  --format="value(status.url)" \
  --project=$GCP_PROJECT_ID)

echo "Service URL: $SERVICE_URL"
# Erwartete URL: https://anschreiben-app-411832844870.europe-west1.run.app
```

## 🧪 Nach Deployment testen

### 1. App öffnen
Öffnen Sie die Service-URL im Browser.

### 2. Admin-Panel prüfen
- Gehen Sie zu: `https://ihre-url/admin/database`
- Prüfen Sie Cloud Storage Status
- Sollte "Konfiguriert" anzeigen
- **WICHTIG**: Prüfen Sie, ob die Datenbank-Datei im Bucket vorhanden ist

### 3. API-Endpoint testen
```bash
# Status prüfen
curl https://ihre-url/api/admin/database/sync

# Sollte zurückgeben:
# {
#   "cloudStorageConfigured": true,
#   "bucketName": "411832844870-anschreiben-data",
#   ...
# }
```

### 4. Testdaten erstellen
- Erstellen Sie eine Test-Bewerbung
- Warten Sie 2-3 Sekunden
- Prüfen Sie Cloud Storage: `gcloud storage ls gs://$BUCKET_NAME/ --project=$GCP_PROJECT_ID`

### 5. Neustart-Test
```bash
# Service neu starten
gcloud run services update $SERVICE_NAME \
  --region $GCP_REGION \
  --project=$GCP_PROJECT_ID

# Prüfen Sie, ob Daten noch vorhanden sind
```

## 📊 Erwartete Logs

Nach dem Deployment sollten Sie folgende Logs sehen:

```bash
gcloud run services logs read $SERVICE_NAME \
  --region $GCP_REGION \
  --limit 20 \
  --project=$GCP_PROJECT_ID
```

**Erwartete Meldungen beim Start:**
- `SQLite database path: <konfigurierter-pfad>` - Bestätigt den verwendeten Datenbankpfad
- `Using Cloud Storage bucket: 411832844870-anschreiben-data` - Bestätigt den verwendeten Bucket
- `Mount directory /anschreiben-app: exists=true, writable=true` - Bestätigt, dass Volume Mount funktioniert (falls verwendet)
- `Cloud Storage is configured and ready for sync` - Cloud Storage ist bereit
- `Database downloaded successfully from Cloud Storage` - Datenbank wurde erfolgreich geladen (falls vorhanden)

**Erwartete Meldungen nach Schreiboperationen:**
- `Database uploaded successfully to Cloud Storage` - Datenbank wurde erfolgreich synchronisiert

## 🔄 Datenwiederherstellung nach Deployment

Falls nach dem Deployment Daten fehlen:

### 1. Prüfen Sie, welcher Bucket die Daten enthält

```bash
# Liste alle Buckets
gcloud storage buckets list --project=$GCP_PROJECT_ID

# Prüfe jeden Bucket auf Datenbank-Datei
for BUCKET in $(gcloud storage buckets list --project=$GCP_PROJECT_ID --format="value(name)"); do
  echo "Prüfe Bucket: $BUCKET"
  if gcloud storage ls "gs://$BUCKET/anschreiben.db" --project="$GCP_PROJECT_ID" &> /dev/null; then
    echo "  ✓ Datenbank gefunden in: $BUCKET"
    echo "  Verwenden Sie diesen Bucket-Name für GCS_BUCKET_NAME"
  fi
done
```

### 2. Setzen Sie den korrekten Bucket-Namen

```bash
# Setze den Bucket-Namen, der die Daten enthält
CORRECT_BUCKET="name-des-buckets-mit-daten"

gcloud run services update $SERVICE_NAME \
  --update-env-vars GCS_BUCKET_NAME=$CORRECT_BUCKET \
  --region $GCP_REGION \
  --project=$GCP_PROJECT_ID
```

### 3. Service neu starten

```bash
# Service neu starten, damit Datenbank geladen wird
gcloud run services update $SERVICE_NAME \
  --region $GCP_REGION \
  --project=$GCP_PROJECT_ID
```

### 4. Prüfen Sie die Logs

```bash
gcloud run services logs read $SERVICE_NAME \
  --region $GCP_REGION \
  --limit 50 \
  --project=$GCP_PROJECT_ID | grep -E "(Database|Cloud Storage|download|upload)"
```

**Erwartete Logs bei erfolgreicher Wiederherstellung:**
- `Database downloaded successfully from Cloud Storage`
- `Cloud Storage is configured and ready for sync`

## 🔧 Troubleshooting

### Problem: "Cloud Storage not configured"
**Lösung**: Prüfen Sie Environment-Variable:
```bash
gcloud run services describe $SERVICE_NAME \
  --region $GCP_REGION \
  --format="value(spec.template.spec.containers[0].env)" \
  --project=$GCP_PROJECT_ID
```

### Problem: "Permission denied"
**Lösung**: Service Account Berechtigungen prüfen:
```bash
# Berechtigungen setzen
gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/storage.objectAdmin" \
  --project=$GCP_PROJECT_ID
```

### Problem: Daten gehen verloren
**Lösung**: 
1. Prüfen Sie, welcher Bucket die Daten enthält (siehe Sektion "Datenwiederherstellung")
2. Setzen Sie den korrekten Bucket-Namen in Cloud Run
3. Logs prüfen auf Sync-Fehler
4. Bucket prüfen: `gcloud storage ls gs://$BUCKET_NAME/ --project=$GCP_PROJECT_ID`
5. Manuelle Synchronisation testen über Admin-Panel

### Problem: "Mount directory /anschreiben-app does not exist"
**Lösung**: 
1. Stellen Sie sicher, dass das Volume korrekt gemountet ist:
   ```bash
   gcloud run services describe $SERVICE_NAME \
     --region $GCP_REGION \
     --format="yaml(spec.template.spec.volumes,spec.template.spec.containers[0].volumeMounts)" \
     --project=$GCP_PROJECT_ID
   ```
2. Prüfen Sie, ob `--add-volume` und `--add-volume-mount` im Deployment-Befehl enthalten sind
3. Falls kein Volume Mount verwendet wird, entfernen Sie `DATABASE_PATH` oder setzen Sie es auf den Standardpfad
4. Service neu deployen mit korrekter Volume Mount Konfiguration

### Problem: "Mount directory /anschreiben-app exists but is not writable"
**Lösung**: 
1. Prüfen Sie die Berechtigungen des gemounteten Volumes:
   ```bash
   gcloud run services describe $SERVICE_NAME \
     --region $GCP_REGION \
     --format="value(spec.template.spec.volumes[0].csi.driver)" \
     --project=$GCP_PROJECT_ID
   ```
2. Stellen Sie sicher, dass der Service Account Schreibrechte hat:
   ```bash
   gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
     --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
     --role="roles/storage.objectAdmin" \
     --project=$GCP_PROJECT_ID
   ```
3. Prüfen Sie die Cloud Storage Bucket-Berechtigungen
4. Service neu starten nach Berechtigungsänderungen

### Problem: "SQLite database path" Log zeigt falschen Pfad
**Lösung**: 
1. Prüfen Sie die Logs: `gcloud run services logs read $SERVICE_NAME --region $GCP_REGION | grep "SQLite database path"`
2. Stellen Sie sicher, dass `DATABASE_PATH` korrekt gesetzt ist (ohne Leerzeichen, vollständiger Pfad):
   ```bash
   gcloud run services describe $SERVICE_NAME \
     --region $GCP_REGION \
     --format="value(spec.template.spec.containers[0].env[?(@.name=='DATABASE_PATH')].value)" \
     --project=$GCP_PROJECT_ID
   ```
3. Falls der Pfad falsch ist, aktualisieren Sie die Environment-Variable:
   ```bash
   gcloud run services update $SERVICE_NAME \
     --update-env-vars DATABASE_PATH=/anschreiben-app/database.sqlite \
     --region $GCP_REGION \
     --project=$GCP_PROJECT_ID
   ```
4. Service neu starten

## 📝 Checkliste

- [ ] Google Cloud Projekt erstellt
- [ ] APIs aktiviert
- [ ] Cloud Storage Bucket mit Daten gefunden
- [ ] Korrekter Bucket-Name notiert
- [ ] Docker Image gebaut und gepusht
- [ ] Cloud Run Service deployed mit korrektem Bucket-Namen
- [ ] `DATABASE_PATH` Environment-Variable gesetzt (falls Volume gemountet)
- [ ] Volume Mount korrekt konfiguriert (`--add-volume` und `--add-volume-mount`, falls verwendet)
- [ ] Environment-Variablen gesetzt (GCS_BUCKET_NAME, GOOGLE_GENERATIVE_AI_API_KEY, DATABASE_PATH)
- [ ] Service URL notiert
- [ ] Logs geprüft auf "SQLite database path" (bestätigt korrekten Pfad)
- [ ] Logs geprüft auf "Using Cloud Storage bucket" (bestätigt Bucket-Name)
- [ ] Logs geprüft auf "Mount directory /anschreiben-app: exists=true, writable=true" (falls Volume Mount verwendet)
- [ ] Logs geprüft auf "Database downloaded successfully"
- [ ] Admin-Panel getestet
- [ ] API-Endpoints getestet
- [ ] Testdaten erstellt
- [ ] Cloud Storage Synchronisation geprüft
- [ ] Neustart-Test durchgeführt
- [ ] Daten bleiben nach Neustart erhalten

## 🎯 Erfolgskriterien

Deployment ist erfolgreich, wenn:
- ✅ App läuft auf Cloud Run
- ✅ Admin-Panel zeigt "Cloud Storage konfiguriert"
- ✅ API-Endpoint `/api/admin/database/sync` gibt `cloudStorageConfigured: true` zurück
- ✅ Logs zeigen korrekten "SQLite database path" (bestätigt verwendeten Pfad)
- ✅ Logs zeigen "Using Cloud Storage bucket: 411832844870-anschreiben-data" (bestätigt Bucket-Name)
- ✅ Logs zeigen "Mount directory /anschreiben-app: exists=true, writable=true" (falls Volume Mount verwendet)
- ✅ Logs zeigen "Database downloaded successfully from Cloud Storage" (falls Datenbank vorhanden)
- ✅ Mount-Verzeichnis ist beschreibbar (falls Volume Mount verwendet)
- ✅ Startup-Logging bestätigt alle Konfigurationen
- ✅ Testdaten werden zu Cloud Storage synchronisiert
- ✅ Daten bleiben nach Neustart erhalten

## 📚 Weitere Dokumentation

- **Detaillierte Checkliste**: [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
- **Setup-Anleitung**: [CLOUD_STORAGE_SETUP.md](./CLOUD_STORAGE_SETUP.md)
- **Testing-Guide**: [TESTING_GUIDE.md](./TESTING_GUIDE.md)
- **Deployment-Guide**: [DEPLOYMENT.md](./DEPLOYMENT.md)

## 🎉 Fertig!

Nach erfolgreichem Deployment haben Sie:
- ✅ Persistente Datenbank-Speicherung
- ✅ Automatische Synchronisation
- ✅ Backup-Strategie
- ✅ Skalierbare Lösung
- ✅ Keine Datenverluste mehr!

**Viel Erfolg beim Deployment!** 🚀

## 🚀 Vollständiges Deployment-Script (Alles in einem)

Für ein schnelles Deployment können Sie alle Schritte in einem Script ausführen:

```bash
#!/bin/bash
set -e

# Environment Setup
export PATH="$HOME/google-cloud-sdk/bin:/usr/local/bin:$PATH"
export GCP_PROJECT_ID="gen-lang-client-0764998759"
export PROJECT_NUMBER="411832844870"
export GCP_REGION="europe-west1"
export SERVICE_NAME="anschreiben-app"

# API Key setzen (optional - kann auch später gesetzt werden)
# export GOOGLE_GENERATIVE_AI_API_KEY="ihr-api-key-hier"

# Datenbankpfad setzen (optional - nur wenn Volume gemountet)
# export DATABASE_PATH="/anschreiben-app/database.sqlite"  # Für Cloud Run mit Volume

echo "=== Schritt 1: Projekt setzen ==="
gcloud config set project $GCP_PROJECT_ID

echo "=== Schritt 2: APIs aktivieren ==="
gcloud services enable cloudbuild.googleapis.com \
  run.googleapis.com \
  containerregistry.googleapis.com \
  storage.googleapis.com \
  --project=$GCP_PROJECT_ID

echo "=== Schritt 3: Cloud Storage Bucket prüfen ==="
# FESTER Bucket-Name (wird immer verwendet - dieser Bucket enthält bereits alle Daten)
BUCKET_NAME="411832844870-anschreiben-data"

echo "Fester Bucket-Name: $BUCKET_NAME"

# Prüfe ob Bucket existiert
if gcloud storage buckets describe "gs://$BUCKET_NAME" --project="$GCP_PROJECT_ID" &> /dev/null; then
  echo "✓ Bucket existiert: $BUCKET_NAME"
  if gcloud storage ls "gs://$BUCKET_NAME/anschreiben.db" --project="$GCP_PROJECT_ID" &> /dev/null; then
    echo "✓ Datenbank gefunden"
  fi
else
  echo "❌ FEHLER: Bucket $BUCKET_NAME existiert nicht!"
  echo "Dieser Bucket sollte bereits existieren und alle Daten enthalten."
  exit 1
fi

echo "=== Schritt 4: Docker Image bauen und pushen ==="
cd "$(dirname "$0")"
gcloud builds submit --tag gcr.io/$GCP_PROJECT_ID/$SERVICE_NAME --project=$GCP_PROJECT_ID

echo "=== Schritt 5: Cloud Run Service deployen ==="
ENV_VARS="GCS_BUCKET_NAME=$BUCKET_NAME"

# DATABASE_PATH hinzufügen (wenn Volume gemountet wird)
if [ -n "$DATABASE_PATH" ]; then
  ENV_VARS="$ENV_VARS,DATABASE_PATH=$DATABASE_PATH"
  echo "ℹ DATABASE_PATH gesetzt: $DATABASE_PATH (Volume Mount wird verwendet)"
else
  echo "ℹ DATABASE_PATH nicht gesetzt - verwende Standardpfad /app/data/anschreiben.db"
fi

# API Key hinzufügen (falls gesetzt)
if [ -n "$GOOGLE_GENERATIVE_AI_API_KEY" ]; then
  ENV_VARS="$ENV_VARS,GOOGLE_GENERATIVE_AI_API_KEY=$GOOGLE_GENERATIVE_AI_API_KEY"
fi

echo "Deploye mit Bucket: $BUCKET_NAME"
echo "Environment-Variablen: $ENV_VARS"

# Service deployen mit Volume Mount (wenn DATABASE_PATH gesetzt)
if [ -n "$DATABASE_PATH" ]; then
  echo "Deploye mit Volume Mount..."
  gcloud run deploy $SERVICE_NAME \
    --image gcr.io/$GCP_PROJECT_ID/$SERVICE_NAME \
    --region $GCP_REGION \
    --platform managed \
    --allow-unauthenticated \
    --port 8080 \
    --memory 2Gi \
    --cpu 2 \
    --timeout 300 \
    --max-instances 10 \
    --set-env-vars $ENV_VARS \
    --add-volume name=gcs-1,type=cloud-storage,bucket=$BUCKET_NAME \
    --add-volume-mount volume=gcs-1,mount-path=/anschreiben-app \
    --project=$GCP_PROJECT_ID
else
  # Deployment ohne Volume Mount
  echo "Deploye ohne Volume Mount (Standard-Konfiguration)..."
  gcloud run deploy $SERVICE_NAME \
    --image gcr.io/$GCP_PROJECT_ID/$SERVICE_NAME \
    --region $GCP_REGION \
    --platform managed \
    --allow-unauthenticated \
    --port 8080 \
    --memory 2Gi \
    --cpu 2 \
    --timeout 300 \
    --max-instances 10 \
    --set-env-vars $ENV_VARS \
    --project=$GCP_PROJECT_ID
fi

echo "=== Schritt 6: Service URL abrufen ==="
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
  --region $GCP_REGION \
  --format="value(status.url)" \
  --project=$GCP_PROJECT_ID)

echo ""
echo "✅ Deployment erfolgreich!"
echo "Service URL: $SERVICE_URL"
echo "Verwendeter Bucket: $BUCKET_NAME"
echo ""
echo "Prüfe Logs auf Datenbank-Download..."
sleep 15
gcloud run services logs read $SERVICE_NAME \
  --region $GCP_REGION \
  --limit 30 \
  --project=$GCP_PROJECT_ID | grep -E "(SQLite database path|Using Cloud Storage bucket|Mount directory|Database|Cloud Storage|anschreiben.db|download|upload|sync)" || echo "Keine relevanten Logs gefunden"
echo ""
echo "Falls der API Key noch nicht gesetzt wurde:"
echo "gcloud run services update $SERVICE_NAME \\"
echo "  --update-env-vars GOOGLE_GENERATIVE_AI_API_KEY=\"ihr-api-key\" \\"
echo "  --region $GCP_REGION \\"
echo "  --project=$GCP_PROJECT_ID"
```

