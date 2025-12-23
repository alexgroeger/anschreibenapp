# 🚀 Deployment-Status

## ✅ Aktueller Status

**Service läuft**: ✅ **AKTIV**

**Production URL**: https://anschreiben-app-411832844870.europe-west1.run.app

**Projekt-ID**: `411832844870`

**Region**: `europe-west1`

## 📋 Deployment ausführen

### Problem
Google Cloud SDK (`gcloud`) ist nicht installiert. Dies ist erforderlich für das Deployment.

### Lösung: gcloud installieren

#### Option 1: Manuelle Installation (macOS)

1. **Download**:
   ```bash
   curl https://sdk.cloud.google.com | bash
   exec -l $SHELL
   ```

2. **Initialisieren**:
   ```bash
   gcloud init
   gcloud auth login
   ```

3. **Projekt setzen**:
   ```bash
   gcloud config set project 411832844870
   ```

#### Option 2: Mit Homebrew (wenn installiert)

```bash
brew install --cask google-cloud-sdk
gcloud init
gcloud auth login
gcloud config set project 411832844870
```

### Nach Installation: Deployment ausführen

#### Option A: Mit Cloud Build Pipeline (Empfohlen)

Führt automatisch Tests durch:

```bash
# API-Key aus .env.local
export GOOGLE_GENERATIVE_AI_API_KEY="$(grep GOOGLE_GENERATIVE_AI_API_KEY .env.local | cut -d'=' -f2)"

# Pipeline ausführen
gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions=_GOOGLE_GENERATIVE_AI_API_KEY=$GOOGLE_GENERATIVE_AI_API_KEY
```

#### Option B: Direktes Deployment

```bash
# 1. Cloud Storage Bucket erstellen (falls noch nicht vorhanden)
gsutil mb -l europe-west1 gs://411832844870-anschreiben-data || echo "Bucket existiert bereits"

# 2. Image bauen und pushen
gcloud builds submit --tag gcr.io/411832844870/anschreiben-app

# 3. Deployen mit Cloud Storage
gcloud run deploy anschreiben-app \
  --image gcr.io/411832844870/anschreiben-app \
  --region europe-west1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --max-instances 10 \
  --set-env-vars GOOGLE_GENERATIVE_AI_API_KEY="$(grep GOOGLE_GENERATIVE_AI_API_KEY .env.local | cut -d'=' -f2)" \
  --set-env-vars GCS_BUCKET_NAME="411832844870-anschreiben-data"
```

#### Option C: Mit Deployment-Script

```bash
export GCP_PROJECT_ID="411832844870"
export GOOGLE_GENERATIVE_AI_API_KEY="$(grep GOOGLE_GENERATIVE_AI_API_KEY .env.local | cut -d'=' -f2)"
export GCS_BUCKET_NAME="411832844870-anschreiben-data"

./cloud-run-deploy.sh
```

## 🔍 Aktuellen Status prüfen

```bash
# Service-Status
gcloud run services describe anschreiben-app \
  --region europe-west1 \
  --format="yaml(status)"

# Logs ansehen
gcloud run services logs read anschreiben-app \
  --region europe-west1 \
  --limit 50

# Cloud Storage Status prüfen
curl https://anschreiben-app-411832844870.europe-west1.run.app/api/admin/database/sync
```

## 📝 Checkliste

- [ ] gcloud installiert
- [ ] Authentifiziert (`gcloud auth login`)
- [ ] Projekt gesetzt (`gcloud config set project 411832844870`)
- [ ] Cloud Storage Bucket erstellt (falls neu)
- [ ] API-Key aus .env.local kopiert
- [ ] Deployment ausgeführt
- [ ] Service-URL getestet
- [ ] Cloud Storage Status geprüft

## 🎯 Nächste Schritte

1. **gcloud installieren** (siehe oben)
2. **Authentifizieren**: `gcloud auth login`
3. **Projekt setzen**: `gcloud config set project 411832844870`
4. **Deployment ausführen** (eine der Optionen oben)

## 📚 Weitere Informationen

- **Deployment-Anleitung**: [DEPLOY_NOW.md](./DEPLOY_NOW.md)
- **Deployment-Checkliste**: [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
- **Cloud Storage Setup**: [CLOUD_STORAGE_SETUP.md](./CLOUD_STORAGE_SETUP.md)

