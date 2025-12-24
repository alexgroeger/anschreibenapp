# 🚀 Deployment Quick Guide

## Voraussetzungen

**Wichtig**: Dieses Script verwendet die bereits vorhandene gcloud Installation unter `~/google-cloud-sdk/bin/gcloud`

```bash
# 1. Authentifizieren (falls noch nicht geschehen)
~/google-cloud-sdk/bin/gcloud auth login

# 2. Projekt setzen (wird auch automatisch vom Script gemacht)
~/google-cloud-sdk/bin/gcloud config set project gen-lang-client-0764998759
```

## Quick Deploy (Ohne Tests)

Das Quick-Deploy-Script führt ein direktes Deployment ohne Tests durch:

```bash
# Script ausführbar machen (einmalig)
chmod +x quick-deploy.sh

# Deployment ausführen
./quick-deploy.sh
```

Das Script führt automatisch aus:
- ✅ Projekt setzen
- ✅ API-Key aus .env.local oder bestehendem Service holen
- ✅ Cloud Storage Bucket prüfen/erstellen
- ✅ Docker Image bauen (mit Statusanzeige)
- ✅ Deployment zu Cloud Run
- ✅ Service URL anzeigen

**Statusanzeige**: Das Script zeigt während des Deployments:
- Vergangene Zeit (Format: MM:SS)
- Aktueller Schritt
- Fehler sofort bei Auftreten

## Verifikation nach Deployment

### Service-URLs prüfen

```bash
# Production-URL abrufen
~/google-cloud-sdk/bin/gcloud run services describe anschreiben-app \
  --region=europe-west1 \
  --format="value(status.url)" \
  --project=gen-lang-client-0764998759
```

**Erwartete URLs:**
- Production: `https://anschreiben-app-411832844870.europe-west1.run.app`
- Alternative: `https://anschreiben-app-7dglnuwm5q-ew.a.run.app`
- Admin-Panel: `https://anschreiben-app-411832844870.europe-west1.run.app/admin/database`

### Health Checks

```bash
# Homepage testen
curl https://anschreiben-app-411832844870.europe-west1.run.app

# API Endpoint testen
curl https://anschreiben-app-411832844870.europe-west1.run.app/api/admin/database/sync

# Admin Panel testen
curl https://anschreiben-app-411832844870.europe-west1.run.app/admin/database
```

### Environment-Variablen prüfen

```bash
~/google-cloud-sdk/bin/gcloud run services describe anschreiben-app \
  --region=europe-west1 \
  --format="value(spec.template.spec.containers[0].env)" \
  --project=gen-lang-client-0764998759
```

**Erwartete Variablen:**
- `GOOGLE_GENERATIVE_AI_API_KEY`: gesetzt
- `GCS_BUCKET_NAME`: `411832844870-anschreiben-data`

### Cloud Storage Status prüfen

```bash
# Bucket-Status
~/google-cloud-sdk/bin/gcloud storage buckets describe gs://411832844870-anschreiben-data \
  --project=gen-lang-client-0764998759

# Datenbank-Datei prüfen
~/google-cloud-sdk/bin/gcloud storage ls gs://411832844870-anschreiben-data/anschreiben.db \
  --project=gen-lang-client-0764998759
```

### Revision & Builds prüfen

```bash
# Aktive Revision
~/google-cloud-sdk/bin/gcloud run services describe anschreiben-app \
  --region=europe-west1 \
  --format="value(status.latestReadyRevisionName)" \
  --project=gen-lang-client-0764998759

# Letzte Builds
~/google-cloud-sdk/bin/gcloud builds list \
  --limit=3 \
  --project=gen-lang-client-0764998759
```

### Logs prüfen

```bash
# Service Logs
~/google-cloud-sdk/bin/gcloud run services logs read anschreiben-app \
  --region=europe-west1 \
  --project=gen-lang-client-0764998759 \
  --limit=50
```

## Erwartetes Ergebnis

Nach erfolgreichem Deployment sollten folgende Komponenten funktionieren:

| Komponente | Status | Details |
|------------|--------|---------|
| Deployment | ✅ Erfolgreich | Neueste Revision aktiv |
| Cloud Storage | ✅ Konfiguriert | Bucket synchronisiert |
| Datenbank | ✅ Synchronisiert | Lokal und Cloud aktuell |
| Environment-Vars | ✅ Gesetzt | Alle Variablen korrekt |
| Service Health | ✅ OK | Alle Endpunkte erreichbar |
| Synchronisation | ✅ Aktiv | Upload/Download funktioniert |
| Builds | ✅ Erfolgreich | Letzte Builds: SUCCESS |

## Troubleshooting

### Falls Deployment fehlschlägt

1. **Projekt-ID prüfen:**
   ```bash
   ~/google-cloud-sdk/bin/gcloud config get-value project
   # Sollte sein: gen-lang-client-0764998759
   ```

2. **APIs aktivieren:**
   ```bash
   ~/google-cloud-sdk/bin/gcloud services enable cloudbuild.googleapis.com --project=gen-lang-client-0764998759
   ~/google-cloud-sdk/bin/gcloud services enable run.googleapis.com --project=gen-lang-client-0764998759
   ~/google-cloud-sdk/bin/gcloud services enable containerregistry.googleapis.com --project=gen-lang-client-0764998759
   ~/google-cloud-sdk/bin/gcloud services enable storage.googleapis.com --project=gen-lang-client-0764998759
   ```

3. **Berechtigungen prüfen:**
   ```bash
   ~/google-cloud-sdk/bin/gcloud projects get-iam-policy gen-lang-client-0764998759
   ```

4. **Build-Logs prüfen:**
   ```bash
   ~/google-cloud-sdk/bin/gcloud builds list --limit=1 --project=gen-lang-client-0764998759
   ~/google-cloud-sdk/bin/gcloud builds log <BUILD_ID> --project=gen-lang-client-0764998759
   ```

## Projekt-Konfiguration

- **Projekt-ID**: `gen-lang-client-0764998759`
- **Projektnummer**: `411832844870`
- **Region**: `europe-west1`
- **Service-Name**: `anschreiben-app`
- **Bucket-Name**: `411832844870-anschreiben-data`

