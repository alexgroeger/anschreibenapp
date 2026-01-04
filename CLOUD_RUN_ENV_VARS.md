# Cloud Run Environment-Variablen

Diese Dokumentation beschreibt alle Environment-Variablen, die für das Deployment auf Google Cloud Run konfiguriert werden können.

## Übersicht

Die Anschreiben App verwendet mehrere Environment-Variablen für die Konfiguration in Cloud Run. Diese können beim Deployment oder über `gcloud run services update` gesetzt werden.

## Erforderliche Environment-Variablen

### `GCS_BUCKET_NAME`

**Beschreibung**: Name des Google Cloud Storage Buckets für persistente Datenbank-Speicherung.

**Wert**: `411832844870-anschreiben-data`

**Beispiel**:
```bash
GCS_BUCKET_NAME=411832844870-anschreiben-data
```

**Hinweis**: Dieser Bucket wird automatisch beim ersten Deployment erstellt (siehe `cloudbuild.yaml`). Der Bucket-Name verwendet die Projektnummer, nicht die Projekt-ID.

**Logging**: Beim Start wird geloggt: `Using Cloud Storage bucket: 411832844870-anschreiben-data`

### `GOOGLE_GENERATIVE_AI_API_KEY`

**Beschreibung**: API-Key für Google Generative AI (Gemini) für KI-Funktionen.

**Wert**: Ihr Google Gemini API-Key

**Beispiel**:
```bash
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyCMnSz6BrDDPU0qTNoLXVooVDo335A6P5o
```

**Hinweis**: Dieser Key kann auch über die Admin-Oberfläche gesetzt werden (wird in der Datenbank gespeichert).

## Optionale Environment-Variablen

### `DATABASE_PATH`

**Beschreibung**: Vollständiger Pfad zur SQLite-Datenbankdatei.

**Standardwert**: `/app/data/anschreiben.db` (wenn nicht gesetzt)

**Beispiel für Cloud Run mit gemountetem Volume**:
```bash
DATABASE_PATH=/anschreiben-app/database.sqlite
```

**Beispiel für lokale Entwicklung**:
```bash
DATABASE_PATH=./data/anschreiben.db
```

**Hinweis**: 
- Wenn Sie ein Cloud Storage Volume unter `/anschreiben-app` gemountet haben, setzen Sie `DATABASE_PATH=/anschreiben-app/database.sqlite`
- Der Pfad muss beschreibbar sein
- Das übergeordnete Verzeichnis wird automatisch erstellt, falls es nicht existiert

**Logging**: Beim Start wird geloggt: `SQLite database path: <konfigurierter-pfad>`

## Cloud Run Konfiguration

### Environment-Variablen beim Deployment setzen

```bash
gcloud run deploy anschreiben-app \
  --image gcr.io/$PROJECT_ID/anschreiben-app:latest \
  --region europe-west1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --max-instances 10 \
  --set-env-vars \
    "GCS_BUCKET_NAME=411832844870-anschreiben-data,\
     DATABASE_PATH=/anschreiben-app/database.sqlite,\
     GOOGLE_GENERATIVE_AI_API_KEY=<ihr-api-key>" \
  --add-volume name=gcs-1,type=cloud-storage,bucket=411832844870-anschreiben-data \
  --add-volume-mount volume=gcs-1,mount-path=/anschreiben-app \
  --project $PROJECT_ID
```

### Environment-Variablen nachträglich aktualisieren

```bash
gcloud run services update anschreiben-app \
  --set-env-vars \
    "GCS_BUCKET_NAME=411832844870-anschreiben-data,\
     DATABASE_PATH=/anschreiben-app/database.sqlite,\
     GOOGLE_GENERATIVE_AI_API_KEY=<ihr-api-key>" \
  --region europe-west1
```

### Einzelne Variable aktualisieren

```bash
# Nur DATABASE_PATH aktualisieren
gcloud run services update anschreiben-app \
  --update-env-vars DATABASE_PATH=/anschreiben-app/database.sqlite \
  --region europe-west1
```

## Startup-Logging

Beim Start der App werden folgende Informationen geloggt:

1. **Datenbankpfad**:
   ```
   SQLite database path: /anschreiben-app/database.sqlite
   ```

2. **Cloud Storage Bucket**:
   ```
   Using Cloud Storage bucket: 411832844870-anschreiben-data
   ```

3. **Mount-Verzeichnis Status**:
   ```
   Mount directory /anschreiben-app: exists=true, writable=true
   ```

Diese Logs helfen bei der Fehlersuche und Bestätigen, dass die Konfiguration korrekt ist.

## Verwendung mit Cloud Storage Volume Mount

Wenn Sie ein Cloud Storage Volume gemountet haben:

```yaml
volumeMounts:
  - name: gcs-1
    mountPath: /anschreiben-app
```

Setzen Sie dann:

```bash
DATABASE_PATH=/anschreiben-app/database.sqlite
```

Die App prüft beim Start automatisch:
- Ob das Verzeichnis `/anschreiben-app` existiert
- Ob es beschreibbar ist
- Loggt Warnungen/Fehler falls nicht

## Hinweis zu DATABASE_URL

**Aktuell wird `DATABASE_URL` nicht verwendet**, da die App direkt mit SQLite arbeitet.

Falls Sie später zu PostgreSQL oder MySQL migrieren möchten, können Sie `DATABASE_URL` hinzufügen:

```bash
DATABASE_URL=postgresql://user:password@host:5432/database
```

Die aktuelle Implementierung verwendet SQLite und benötigt `DATABASE_URL` nicht.

## Lokale Entwicklung

Für lokale Entwicklung erstellen Sie eine `.env.local` Datei:

```bash
GCS_BUCKET_NAME=411832844870-anschreiben-data
GOOGLE_GENERATIVE_AI_API_KEY=ihr-api-key
DATABASE_PATH=./data/anschreiben.db
```

**Hinweis**: Für lokale Entwicklung ist `DATABASE_PATH` optional - der Standardpfad (`./data/anschreiben.db`) funktioniert auch ohne diese Variable.

## Troubleshooting

### Problem: "Cloud Storage not configured: GCS_BUCKET_NAME environment variable is not set"

**Lösung**: Setzen Sie `GCS_BUCKET_NAME` als Environment-Variable in Cloud Run.

### Problem: "Mount directory /anschreiben-app does not exist"

**Lösung**: 
1. Stellen Sie sicher, dass das Volume korrekt gemountet ist
2. Prüfen Sie die Cloud Run Service-Konfiguration
3. Falls kein Volume gemountet ist, verwenden Sie den Standardpfad (keine `DATABASE_PATH` setzen)

### Problem: "Mount directory /anschreiben-app exists but is not writable"

**Lösung**: 
1. Prüfen Sie die Berechtigungen des gemounteten Volumes
2. Stellen Sie sicher, dass der Service Account Schreibrechte hat
3. Prüfen Sie die Cloud Storage Bucket-Berechtigungen

### Problem: Datenbankpfad wird nicht korrekt verwendet

**Lösung**: 
1. Prüfen Sie die Logs: `gcloud run services logs read anschreiben-app --region europe-west1`
2. Suchen Sie nach: `SQLite database path:`
3. Stellen Sie sicher, dass `DATABASE_PATH` korrekt gesetzt ist (ohne Leerzeichen, vollständiger Pfad)

## Weitere Informationen

- Siehe `CLOUD_STORAGE_SETUP.md` für Details zur Cloud Storage Integration
- Siehe `DEPLOYMENT.md` für allgemeine Deployment-Anleitung
- Siehe `cloudbuild.yaml` für die automatische Pipeline-Konfiguration

