# 🚀 Deployment ausführen

## Status

**Problem**: Google Cloud SDK (`gcloud`) ist nicht installiert.

## Lösung: gcloud installieren

### macOS Installation:

```bash
# Homebrew verwenden (empfohlen)
brew install --cask google-cloud-sdk

# Oder manuell:
# https://cloud.google.com/sdk/docs/install
```

Nach der Installation:
```bash
gcloud init
gcloud auth login
```

## Deployment-Optionen

### Option 1: Cloud Build (Empfohlen)

Die Pipeline führt automatisch Tests durch und deployed dann:

```bash
# Projekt setzen
export GCP_PROJECT_ID="411832844870"
gcloud config set project $GCP_PROJECT_ID

# API-Key aus .env.local holen
export GOOGLE_GENERATIVE_AI_API_KEY="$(grep GOOGLE_GENERATIVE_AI_API_KEY .env.local | cut -d'=' -f2)"

# Pipeline ausführen
gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions=_GOOGLE_GENERATIVE_AI_API_KEY=$GOOGLE_GENERATIVE_AI_API_KEY
```

### Option 2: Direktes Deployment (ohne Tests)

```bash
# Mit dem bereitgestellten Script
export GCP_PROJECT_ID="411832844870"
export GOOGLE_GENERATIVE_AI_API_KEY="ihr-api-key"
export GCS_BUCKET_NAME="411832844870-anschreiben-data"

./cloud-run-deploy.sh
```

### Option 3: Manuelles Deployment

```bash
# 1. Image bauen und pushen
gcloud builds submit --tag gcr.io/411832844870/anschreiben-app

# 2. Deployen
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
  --set-env-vars GOOGLE_GENERATIVE_AI_API_KEY="ihr-api-key" \
  --set-env-vars GCS_BUCKET_NAME="411832844870-anschreiben-data"
```

## Cloud Storage Setup (wenn noch nicht vorhanden)

```bash
# Bucket erstellen
gsutil mb -l europe-west1 gs://411832844870-anschreiben-data

# Oder mit Script
./scripts/setup-cloud-storage.sh
```

## Nach dem Deployment

1. Service URL abrufen:
```bash
gcloud run services describe anschreiben-app \
  --region europe-west1 \
  --format="value(status.url)"
```

2. Testen:
```bash
# Status prüfen
curl https://anschreiben-app-411832844870.europe-west1.run.app/api/admin/database/sync

# Admin-Panel öffnen
open https://anschreiben-app-411832844870.europe-west1.run.app/admin/database
```

3. Logs prüfen:
```bash
gcloud run services logs read anschreiben-app --region europe-west1
```

## Aktuelle Production-URL

**URL**: https://anschreiben-app-411832844870.europe-west1.run.app

## Nächste Schritte

1. ✅ gcloud installieren
2. ✅ Authentifizieren: `gcloud auth login`
3. ✅ Projekt setzen: `gcloud config set project 411832844870`
4. ✅ Deployment ausführen (eine der Optionen oben)

