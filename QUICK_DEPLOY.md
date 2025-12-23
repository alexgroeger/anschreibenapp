# Schnell-Deployment Anleitung

## Aktueller Status
- ✅ gcloud installiert (Version 550.0.0)
- ✅ Projekt gesetzt: gen-lang-client-0764998759
- ⏳ APIs müssen aktiviert werden
- ⏳ Authentifizierung erforderlich

## Nächste Schritte (in dieser Reihenfolge)

### 1. Authentifizierung
```bash
export PATH="$HOME/google-cloud-sdk/bin:$PATH"
gcloud auth login
```

### 2. APIs aktivieren
```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

### 3. API Key setzen
```bash
export GOOGLE_GENERATIVE_AI_API_KEY="ihr-google-gemini-api-key"
```

### 4. Deployment ausführen
```bash
cd "/Users/mac-join/Documents/Cursor/Repos/Anschreiben App"
./deploy-to-cloud-run.sh
```

## Oder manuell Schritt für Schritt:

### Schritt 1: Image bauen und pushen
```bash
export PATH="$HOME/google-cloud-sdk/bin:$PATH"
gcloud builds submit --tag gcr.io/gen-lang-client-0764998759/anschreiben-app
```

### Schritt 2: Service deployen
```bash
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

1. **Authentifizierung**: Beim ersten `gcloud auth login` öffnet sich ein Browser-Fenster
2. **API Key**: Sie benötigen einen Google Gemini API Key
3. **Datenbank**: Ohne zusätzliche Konfiguration gehen Daten bei Neustarts verloren (siehe DEPLOYMENT.md für persistente Lösung)
