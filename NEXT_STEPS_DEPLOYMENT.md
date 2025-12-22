# Nächste Schritte für Deployment

## Aktueller Status
- ✅ Dockerfile erstellt und konfiguriert
- ✅ Projekt-ID: `gen-lang-client-0764998759`
- ⏳ gcloud CLI muss installiert/repariert werden

## Schritt-für-Schritt Anleitung

### 1. gcloud CLI installieren/reparieren

**Option A: Manuelle Installation**
```bash
# Terminal öffnen und ausführen:
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Dann initialisieren:
gcloud init
gcloud auth login
```

**Option B: Falls bereits installiert, aber nicht funktioniert**
```bash
# Alte Installation entfernen:
rm -rf ~/google-cloud-sdk

# Neu installieren:
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

### 2. Projekt konfigurieren

```bash
# gcloud zum PATH hinzufügen (falls nötig):
export PATH="$HOME/google-cloud-sdk/bin:$PATH"

# Projekt setzen:
gcloud config set project gen-lang-client-0764998759

# Authentifizierung:
gcloud auth login
```

### 3. APIs aktivieren

```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

### 4. API Key setzen

```bash
export GOOGLE_GENERATIVE_AI_API_KEY="ihr-google-gemini-api-key"
```

### 5. Deployment ausführen

**Option A: Automatisches Script (empfohlen)**
```bash
./deploy-to-cloud-run.sh
```

**Option B: Manuell**
```bash
# Image bauen und pushen:
gcloud builds submit --tag gcr.io/gen-lang-client-0764998759/anschreiben-app

# Service deployen:
gcloud run deploy anschreiben-app \
  --image gcr.io/gen-lang-client-0764998759/anschreiben-app \
  --region europe-west1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --max-instances 10 \
  --set-env-vars GOOGLE_GENERATIVE_AI_API_KEY="ihr-api-key"
```

## Wichtige Hinweise

### Datenbank-Persistenz
⚠️ **WICHTIG:** Ohne zusätzliche Konfiguration gehen Daten bei jedem Neustart verloren!

Für persistente Datenbank:
- Siehe `DEPLOYMENT.md` Abschnitt "Cloud Filestore Setup"
- Oder später zu Cloud SQL migrieren

### Nach dem Deployment

1. **Service URL abrufen:**
```bash
gcloud run services describe anschreiben-app --region europe-west1 --format 'value(status.url)'
```

2. **Logs ansehen:**
```bash
gcloud run services logs read anschreiben-app --region europe-west1
```

3. **Environment-Variablen aktualisieren:**
```bash
gcloud run services update anschreiben-app \
  --update-env-vars GOOGLE_GENERATIVE_AI_API_KEY="neuer-key" \
  --region europe-west1
```

## Troubleshooting

### gcloud nicht gefunden
```bash
export PATH="$HOME/google-cloud-sdk/bin:$PATH"
```

### Authentifizierungsfehler
```bash
gcloud auth login
gcloud auth application-default login
```

### Build-Fehler
- Prüfen Sie, ob Docker läuft
- Prüfen Sie die Dockerfile-Syntax
- Sehen Sie sich die Build-Logs an: `gcloud builds list`

### Service startet nicht
- Prüfen Sie die Logs: `gcloud run services logs read anschreiben-app --region europe-west1`
- Prüfen Sie die Environment-Variablen
- Prüfen Sie die Memory/CPU Limits
