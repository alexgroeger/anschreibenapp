# 🚀 Deployment-Anleitung: Update bestehende Applikation

Diese Anleitung führt Sie Schritt für Schritt durch das **Update** einer bestehenden Cloud Run Applikation.
**WICHTIG**: Diese Anleitung ist für **Updates** gedacht, nicht für das initiale Deployment!

## ✅ Voraussetzungen

- ✅ Cloud Run Service `anschreiben-app` existiert bereits
- ✅ Code kompiliert ohne Fehler
- ✅ Docker Image erfolgreich gebaut
- ✅ gcloud CLI installiert und im PATH
- ✅ Google Cloud Projekt konfiguriert
- ✅ Berechtigungen für Cloud Run und Container Registry vorhanden

## 📋 Schnellstart (3 Minuten)

### Schritt 0: Environment Setup

```bash
# 1. gcloud PATH setzen (falls nicht im PATH)
export PATH="$HOME/google-cloud-sdk/bin:/usr/local/bin:$PATH"

# 2. Projekt-Konfiguration (FESTE WERTE)
export GCP_PROJECT_ID="gen-lang-client-0764998759"
export PROJECT_NUMBER="411832844870"
export GCP_REGION="europe-west1"
export SERVICE_NAME="anschreiben-app"
export BUCKET_NAME="411832844870-anschreiben-data"
export GOOGLE_GENERATIVE_AI_API_KEY="AIzaSyDdkGOTSdz0q0Zd4SmZW5LnVThmDM0iHiI"

# 3. Image-Name (mit explizitem :latest Tag)
export IMAGE_NAME="gcr.io/$GCP_PROJECT_ID/$SERVICE_NAME:latest"
```

### Schritt 1: Docker Image bauen und pushen

```bash
echo "=== Schritt 1: Docker Image bauen und pushen ==="
echo "Image-Name: $IMAGE_NAME"
echo ""

# Projekt setzen
gcloud config set project $GCP_PROJECT_ID

# Image zu Google Container Registry pushen
cd "/Users/mac-join/Documents/Cursor/Repos/Anschreiben App"
gcloud builds submit --tag $IMAGE_NAME --project=$GCP_PROJECT_ID

# Prüfe ob Image erfolgreich erstellt wurde
echo ""
echo "=== Prüfe Image ==="
if gcloud container images describe $IMAGE_NAME --project=$GCP_PROJECT_ID &> /dev/null; then
  echo "✓ Image erfolgreich erstellt: $IMAGE_NAME"
  
  # Zeige Image-Tags
  echo "Verfügbare Tags:"
  gcloud container images list-tags gcr.io/$GCP_PROJECT_ID/$SERVICE_NAME --limit=3 --project=$GCP_PROJECT_ID
else
  echo "❌ FEHLER: Image konnte nicht erstellt werden!"
  echo "Bitte prüfen Sie die Build-Logs."
  exit 1
fi
```

### Schritt 2: Cloud Run Service Update

**WICHTIG**: Dieser Befehl aktualisiert den bestehenden Service mit allen erforderlichen Konfigurationen!

```bash
echo ""
echo "=== Schritt 2: Cloud Run Service Update ==="
echo "Service: $SERVICE_NAME"
echo "Region: $GCP_REGION"
echo "Image: $IMAGE_NAME"
echo "Bucket: $BUCKET_NAME"
echo ""

# Prüfe ob Service existiert
if ! gcloud run services describe $SERVICE_NAME --region=$GCP_REGION --project=$GCP_PROJECT_ID &> /dev/null; then
  echo "❌ FEHLER: Service $SERVICE_NAME existiert nicht!"
  echo "Bitte verwenden Sie DEPLOY_NOW2.md für das initiale Deployment."
  exit 1
fi

echo "✓ Service gefunden: $SERVICE_NAME"
echo ""

# Service Update mit allen erforderlichen Konfigurationen
gcloud run services update $SERVICE_NAME \
  --image="gcr.io/$GCP_PROJECT_ID/$SERVICE_NAME:latest" \
  --region=$GCP_REGION \
  --set-env-vars="GCS_BUCKET_NAME=$BUCKET_NAME,DATABASE_PATH=/anschreiben-app/database.sqlite,GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyDdkGOTSdz0q0Zd4SmZW5LnVThmDM0iHiI" \
  --add-volume="name=gcs-1,type=cloud-storage,bucket=$BUCKET_NAME" \
  --add-volume-mount="volume=gcs-1,mount-path=/anschreiben-app" \
  --project=$GCP_PROJECT_ID

echo ""
echo "✓ Service Update abgeschlossen"
```

### Schritt 3: Validierung und Logs prüfen

```bash
echo ""
echo "=== Schritt 3: Validierung ==="

# Service URL abrufen
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
  --region=$GCP_REGION \
  --format="value(status.url)" \
  --project=$GCP_PROJECT_ID)

echo "Service URL: $SERVICE_URL"
echo ""

# Warte auf Service-Bereitschaft
echo "Warte 15 Sekunden auf Service-Bereitschaft..."
sleep 15

# Prüfe Logs
echo ""
echo "=== Prüfe Startup-Logs ==="
gcloud run services logs read $SERVICE_NAME \
  --region=$GCP_REGION \
  --limit=30 \
  --project=$GCP_PROJECT_ID | grep -E "(SQLite database path|Using Cloud Storage bucket|Mount directory|Database|Cloud Storage|anschreiben.db|download|upload|sync)" || echo "Keine relevanten Logs gefunden"
```

## 📊 Erwartete Logs nach Update

Nach dem Update sollten Sie folgende Logs sehen:

```bash
gcloud run services logs read $SERVICE_NAME \
  --region=$GCP_REGION \
  --limit=20 \
  --project=$GCP_PROJECT_ID
```

**Erwartete Meldungen beim Start:**
- `SQLite database path: /anschreiben-app/database.sqlite` - Bestätigt den verwendeten Datenbankpfad
- `Using Cloud Storage bucket: 411832844870-anschreiben-data` - Bestätigt den verwendeten Bucket
- `Mount directory /anschreiben-app: exists=true, writable=true` - Bestätigt, dass Volume Mount funktioniert
- `Cloud Storage is configured and ready for sync` - Cloud Storage ist bereit
- `Database downloaded successfully from Cloud Storage` - Datenbank wurde erfolgreich geladen (falls vorhanden)

**Erwartete Meldungen nach Schreiboperationen:**
- `Database uploaded successfully to Cloud Storage` - Datenbank wurde erfolgreich synchronisiert

## 🧪 Nach Update testen

### 1. App öffnen
Öffnen Sie die Service-URL im Browser.

### 2. Admin-Panel prüfen
- Gehen Sie zu: `https://ihre-url/admin/database`
- Prüfen Sie Cloud Storage Status
- Sollte "Konfiguriert" anzeigen

### 3. API-Endpoint testen
```bash
# Status prüfen
curl $SERVICE_URL/api/admin/database/sync

# Sollte zurückgeben:
# {
#   "cloudStorageConfigured": true,
#   "bucketName": "411832844870-anschreiben-data",
#   ...
# }
```

## 🔧 Troubleshooting

### Problem: "Service not found"
**Lösung**: 
- Prüfen Sie, ob der Service existiert:
  ```bash
  gcloud run services list --region=$GCP_REGION --project=$GCP_PROJECT_ID
  ```
- Falls der Service nicht existiert, verwenden Sie `DEPLOY_NOW2.md` für das initiale Deployment

### Problem: "Image not found" beim Update
**Lösung**: 
1. Prüfen Sie, ob das Image erfolgreich gebaut wurde:
   ```bash
   gcloud container images list-tags gcr.io/$GCP_PROJECT_ID/$SERVICE_NAME --project=$GCP_PROJECT_ID
   ```
2. Stellen Sie sicher, dass Sie Schritt 1 (Docker Image bauen) ausgeführt haben
3. Prüfen Sie den Image-Namen: `gcr.io/$GCP_PROJECT_ID/$SERVICE_NAME:latest`

### Problem: "Permission denied" beim Update
**Lösung**: 
- Prüfen Sie Ihre Berechtigungen:
  ```bash
  gcloud projects get-iam-policy $GCP_PROJECT_ID --flatten="bindings[].members" --filter="bindings.members:user:$(gcloud config get-value account)"
  ```
- Benötigte Rollen: `roles/run.admin`, `roles/storage.admin`

### Problem: "Mount directory /anschreiben-app does not exist" in Logs
**Lösung**: 
1. Prüfen Sie, ob Volume Mount korrekt gesetzt ist:
   ```bash
   gcloud run services describe $SERVICE_NAME \
     --region=$GCP_REGION \
     --format="yaml(spec.template.spec.volumes,spec.template.spec.containers[0].volumeMounts)" \
     --project=$GCP_PROJECT_ID
   ```
2. Führen Sie den Update-Befehl erneut aus (Volume Mount wird idempotent gesetzt)

### Problem: Environment-Variablen werden nicht aktualisiert
**Lösung**: 
- `--set-env-vars` überschreibt alle Environment-Variablen
- Prüfen Sie die aktuellen Variablen:
  ```bash
  gcloud run services describe $SERVICE_NAME \
    --region=$GCP_REGION \
    --format="value(spec.template.spec.containers[0].env)" \
    --project=$GCP_PROJECT_ID
  ```

### Problem: Update dauert sehr lange
**Lösung**: 
- Das ist normal, da eine neue Revision erstellt wird
- Prüfen Sie den Status:
  ```bash
  gcloud run services describe $SERVICE_NAME \
    --region=$GCP_REGION \
    --format="value(status.conditions[0].status)" \
    --project=$GCP_PROJECT_ID
  ```

## 📝 Checkliste

- [ ] Code kompiliert ohne Fehler
- [ ] Docker Image erfolgreich gebaut (Schritt 1)
- [ ] Image-Validierung erfolgreich
- [ ] Service existiert (für Update, nicht initiales Deployment)
- [ ] Service Update erfolgreich durchgeführt (Schritt 2)
- [ ] Service URL notiert
- [ ] Logs geprüft auf "SQLite database path" (bestätigt korrekten Pfad)
- [ ] Logs geprüft auf "Using Cloud Storage bucket" (bestätigt Bucket-Name)
- [ ] Logs geprüft auf "Mount directory /anschreiben-app: exists=true, writable=true"
- [ ] Admin-Panel getestet
- [ ] API-Endpoints getestet

## 🎯 Erfolgskriterien

Update ist erfolgreich, wenn:
- ✅ Service läuft auf Cloud Run
- ✅ Neue Revision ist aktiv
- ✅ Logs zeigen korrekten "SQLite database path: /anschreiben-app/database.sqlite"
- ✅ Logs zeigen "Using Cloud Storage bucket: 411832844870-anschreiben-data"
- ✅ Logs zeigen "Mount directory /anschreiben-app: exists=true, writable=true"
- ✅ Admin-Panel zeigt "Cloud Storage konfiguriert"
- ✅ API-Endpoint `/api/admin/database/sync` gibt `cloudStorageConfigured: true` zurück

## 🚀 Vollständiges Update-Script (Alles in einem)

Für ein schnelles Update können Sie alle Schritte in einem Script ausführen:

```bash
#!/bin/bash
set -e

# Environment Setup
export PATH="$HOME/google-cloud-sdk/bin:/usr/local/bin:$PATH"
export GCP_PROJECT_ID="gen-lang-client-0764998759"
export PROJECT_NUMBER="411832844870"
export GCP_REGION="europe-west1"
export SERVICE_NAME="anschreiben-app"
export BUCKET_NAME="411832844870-anschreiben-data"
export GOOGLE_GENERATIVE_AI_API_KEY="AIzaSyDdkGOTSdz0q0Zd4SmZW5LnVThmDM0iHiI"
export IMAGE_NAME="gcr.io/$GCP_PROJECT_ID/$SERVICE_NAME:latest"

echo "=== Schritt 1: Projekt setzen ==="
gcloud config set project $GCP_PROJECT_ID

echo "=== Schritt 2: Docker Image bauen und pushen ==="
cd "/Users/mac-join/Documents/Cursor/Repos/Anschreiben App"
gcloud builds submit --tag $IMAGE_NAME --project=$GCP_PROJECT_ID

# Prüfe ob Image erfolgreich erstellt wurde
echo ""
echo "=== Prüfe Image ==="
if gcloud container images describe $IMAGE_NAME --project=$GCP_PROJECT_ID &> /dev/null; then
  echo "✓ Image erfolgreich erstellt: $IMAGE_NAME"
  gcloud container images list-tags gcr.io/$GCP_PROJECT_ID/$SERVICE_NAME --limit=3 --project=$GCP_PROJECT_ID
else
  echo "❌ FEHLER: Image konnte nicht erstellt werden!"
  exit 1
fi

echo ""
echo "=== Schritt 3: Prüfe Service ==="
if ! gcloud run services describe $SERVICE_NAME --region=$GCP_REGION --project=$GCP_PROJECT_ID &> /dev/null; then
  echo "❌ FEHLER: Service $SERVICE_NAME existiert nicht!"
  echo "Bitte verwenden Sie DEPLOY_NOW2.md für das initiale Deployment."
  exit 1
fi
echo "✓ Service gefunden: $SERVICE_NAME"

echo ""
echo "=== Schritt 4: Cloud Run Service Update ==="
gcloud run services update $SERVICE_NAME \
  --image="gcr.io/$GCP_PROJECT_ID/$SERVICE_NAME:latest" \
  --region=$GCP_REGION \
  --set-env-vars="GCS_BUCKET_NAME=$BUCKET_NAME,DATABASE_PATH=/anschreiben-app/database.sqlite,GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyDdkGOTSdz0q0Zd4SmZW5LnVThmDM0iHiI" \
  --add-volume="name=gcs-1,type=cloud-storage,bucket=$BUCKET_NAME" \
  --add-volume-mount="volume=gcs-1,mount-path=/anschreiben-app" \
  --project=$GCP_PROJECT_ID

echo ""
echo "=== Schritt 5: Service URL abrufen ==="
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
  --region=$GCP_REGION \
  --format="value(status.url)" \
  --project=$GCP_PROJECT_ID)

echo ""
echo "✅ Update erfolgreich!"
echo "Service URL: $SERVICE_URL"
echo "Verwendeter Bucket: $BUCKET_NAME"
echo "Verwendetes Image: $IMAGE_NAME"
echo ""

echo "Prüfe Logs auf Datenbank-Download..."
sleep 15
gcloud run services logs read $SERVICE_NAME \
  --region=$GCP_REGION \
  --limit=30 \
  --project=$GCP_PROJECT_ID | grep -E "(SQLite database path|Using Cloud Storage bucket|Mount directory|Database|Cloud Storage|anschreiben.db|download|upload|sync)" || echo "Keine relevanten Logs gefunden"
```

## 📚 Weitere Dokumentation

- **Initiales Deployment**: [DEPLOY_NOW2.md](./DEPLOY_NOW2.md)
- **Environment-Variablen**: [CLOUD_RUN_ENV_VARS.md](./CLOUD_RUN_ENV_VARS.md)
- **Setup-Anleitung**: [CLOUD_STORAGE_SETUP.md](./CLOUD_STORAGE_SETUP.md)
- **Testing-Guide**: [TESTING_GUIDE.md](./TESTING_GUIDE.md)

## 🎉 Fertig!

Nach erfolgreichem Update haben Sie:
- ✅ Neueste Code-Version deployed
- ✅ Alle Konfigurationen aktualisiert
- ✅ Volume Mounts korrekt gesetzt
- ✅ Environment-Variablen aktualisiert
- ✅ Service läuft mit neuer Revision

**Viel Erfolg beim Update!** 🚀

## ⚠️ Wichtige Hinweise

1. **Für initiales Deployment**: Verwenden Sie `DEPLOY_NOW2.md` statt dieser Anleitung
2. **Volume Mounts**: `--add-volume` und `--add-volume-mount` sind idempotent - sie können bei jedem Update erneut gesetzt werden
3. **Environment-Variablen**: `--set-env-vars` überschreibt alle vorhandenen Variablen - stellen Sie sicher, dass alle benötigten Variablen im Befehl enthalten sind
4. **Image-Tag**: Verwenden Sie immer `:latest` für konsistente Updates
5. **Service-Existenz**: Diese Anleitung setzt voraus, dass der Service bereits existiert

