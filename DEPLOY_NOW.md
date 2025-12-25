# 🚀 Deployment-Anleitung: Jetzt deployen

Diese Anleitung führt Sie Schritt für Schritt durch das Deployment auf Google Cloud Run.

## ✅ Voraussetzungen erfüllt

- ✅ Code kompiliert ohne Fehler
- ✅ Docker Image erfolgreich gebaut
- ✅ API-Endpoints getestet
- ✅ Dokumentation vollständig

## 📋 Schnellstart (5 Minuten)

### Schritt 1: Google Cloud Setup

```bash
# 1. Projekt setzen
export GCP_PROJECT_ID="ihr-projekt-id"
gcloud config set project $GCP_PROJECT_ID

# 2. APIs aktivieren
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable storage.googleapis.com
```

### Schritt 2: Cloud Storage Bucket erstellen

```bash
# Bucket erstellen
gsutil mb -l europe-west1 gs://$GCP_PROJECT_ID-anschreiben-data

# Optional: Versionierung aktivieren
gsutil versioning set on gs://$GCP_PROJECT_ID-anschreiben-data
```

**Oder mit Setup-Script:**
```bash
./scripts/setup-cloud-storage.sh
```

### Schritt 3: Docker Image bauen und pushen

```bash
# Image zu Google Container Registry pushen
gcloud builds submit --tag gcr.io/$GCP_PROJECT_ID/anschreiben-app

# Oder mit bereitgestelltem Script
./cloud-run-deploy.sh
```

### Schritt 4: Cloud Run Service deployen

```bash
gcloud run deploy anschreiben-app \
  --image gcr.io/$GCP_PROJECT_ID/anschreiben-app \
  --region europe-west1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --max-instances 10 \
  --set-env-vars GOOGLE_GENERATIVE_AI_API_KEY="ihr-api-key" \
  --set-env-vars GCS_BUCKET_NAME="$GCP_PROJECT_ID-anschreiben-data"
```

### Schritt 5: Service URL abrufen

```bash
gcloud run services describe anschreiben-app \
  --region europe-west1 \
  --format="value(status.url)"
```

## 🧪 Nach Deployment testen

### 1. App öffnen
Öffnen Sie die Service-URL im Browser.

### 2. Admin-Panel prüfen
- Gehen Sie zu: `https://ihre-url/admin/database`
- Prüfen Sie Cloud Storage Status
- Sollte "Konfiguriert" anzeigen

### 3. API-Endpoint testen
```bash
# Status prüfen
curl https://ihre-url/api/admin/database/sync

# Sollte zurückgeben:
# {
#   "cloudStorageConfigured": true,
#   "bucketName": "projekt-id-anschreiben-data",
#   ...
# }
```

### 4. Testdaten erstellen
- Erstellen Sie eine Test-Bewerbung
- Warten Sie 2-3 Sekunden
- Prüfen Sie Cloud Storage: `gsutil ls gs://$GCP_PROJECT_ID-anschreiben-data/`

### 5. Neustart-Test
```bash
# Service neu starten
gcloud run services update anschreiben-app \
  --region europe-west1

# Prüfen Sie, ob Daten noch vorhanden sind
```

## 📊 Erwartete Logs

Nach dem Deployment sollten Sie folgende Logs sehen:

```bash
gcloud run services logs read anschreiben-app --region europe-west1 --limit 20
```

**Erwartete Meldungen:**
- `Cloud Storage is configured and ready for sync`
- `Database downloaded successfully from Cloud Storage` (beim Start)
- `Database uploaded successfully to Cloud Storage` (nach Schreiboperationen)

## 🔧 Troubleshooting

### Problem: "Cloud Storage not configured"
**Lösung**: Prüfen Sie Environment-Variable:
```bash
gcloud run services describe anschreiben-app \
  --region europe-west1 \
  --format="value(spec.template.spec.containers[0].env)"
```

### Problem: "Permission denied"
**Lösung**: Service Account Berechtigungen prüfen:
```bash
PROJECT_NUMBER=$(gcloud projects describe $GCP_PROJECT_ID --format="value(projectNumber)")
gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"
```

### Problem: Daten gehen verloren
**Lösung**: 
1. Logs prüfen auf Sync-Fehler
2. Bucket prüfen: `gsutil ls gs://$GCP_PROJECT_ID-anschreiben-data/`
3. Manuelle Synchronisation testen über Admin-Panel

## 📝 Checkliste

- [ ] Google Cloud Projekt erstellt
- [ ] APIs aktiviert
- [ ] Cloud Storage Bucket erstellt
- [ ] Docker Image gebaut und gepusht
- [ ] Cloud Run Service deployed
- [ ] Environment-Variablen gesetzt
- [ ] Service URL notiert
- [ ] Admin-Panel getestet
- [ ] API-Endpoints getestet
- [ ] Testdaten erstellt
- [ ] Cloud Storage Synchronisation geprüft
- [ ] Neustart-Test durchgeführt

## 🎯 Erfolgskriterien

Deployment ist erfolgreich, wenn:
- ✅ App läuft auf Cloud Run
- ✅ Admin-Panel zeigt "Cloud Storage konfiguriert"
- ✅ API-Endpoint `/api/admin/database/sync` gibt `cloudStorageConfigured: true` zurück
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

**Viel Erfolg beim Deployment!** 🚀


