# Cloud Storage Setup für persistente Datenbank

Diese Anleitung erklärt, wie Sie die Cloud Storage Integration für persistente Datenbank-Speicherung einrichten.

## Übersicht

Die App synchronisiert automatisch die SQLite-Datenbank mit Google Cloud Storage:
- **Beim Start**: Lädt die Datenbank von Cloud Storage (falls vorhanden)
- **Nach Schreiboperationen**: Lädt die Datenbank automatisch zu Cloud Storage hoch
- **Manuelle Synchronisation**: Über API-Endpoint möglich

## Voraussetzungen

1. Google Cloud Account mit aktiviertem Billing
2. Google Cloud SDK (`gcloud`) installiert
3. Authentifizierung für Cloud Storage konfiguriert

## Schritt 1: Cloud Storage Bucket erstellen

```bash
# Projekt-ID setzen
export GCP_PROJECT_ID="ihr-projekt-id"
gcloud config set project $GCP_PROJECT_ID

# Storage API aktivieren
gcloud services enable storage.googleapis.com

# Bucket erstellen
gsutil mb -l europe-west1 gs://$GCP_PROJECT_ID-anschreiben-data

# Optional: Versionierung aktivieren für zusätzliche Sicherheit
gsutil versioning set on gs://$GCP_PROJECT_ID-anschreiben-data
```

## Schritt 2: Authentifizierung für lokale Entwicklung

Für lokale Entwicklung müssen Sie sich authentifizieren:

```bash
# Application Default Credentials einrichten
gcloud auth application-default login
```

Dies ermöglicht der App, auf Cloud Storage zuzugreifen, ohne explizite Credentials zu benötigen.

## Schritt 3: Environment-Variable setzen

### Lokale Entwicklung

Erstellen Sie eine `.env.local` Datei im Projekt-Root:

```bash
GCS_BUCKET_NAME=ihr-projekt-id-anschreiben-data
GOOGLE_GENERATIVE_AI_API_KEY=ihr-api-key
```

### Cloud Run Deployment

```bash
gcloud run services update anschreiben-app \
  --set-env-vars GCS_BUCKET_NAME="$GCP_PROJECT_ID-anschreiben-data" \
  --region europe-west1
```

## Schritt 4: Testen

### 1. App starten

```bash
npm run dev
```

Die App wird beim Start automatisch versuchen, die Datenbank von Cloud Storage zu laden (falls vorhanden).

### 2. Daten erstellen

Erstellen Sie einige Testdaten in der App (z.B. eine neue Bewerbung).

### 3. Synchronisation prüfen

```bash
# Status prüfen
curl http://localhost:3000/api/admin/database/sync

# Manuell hochladen
curl -X POST http://localhost:3000/api/admin/database/sync?action=upload

# Manuell herunterladen
curl -X POST http://localhost:3000/api/admin/database/sync?action=download
```

### 4. In Cloud Storage prüfen

```bash
# Dateien im Bucket auflisten
gsutil ls gs://$GCP_PROJECT_ID-anschreiben-data/

# Datenbank herunterladen (zum Prüfen)
gsutil cp gs://$GCP_PROJECT_ID-anschreiben-data/anschreiben.db ./anschreiben_backup.db
```

## Funktionsweise

### Automatische Synchronisation

1. **Beim Start (`syncDatabaseOnStartup`)**:
   - Prüft, ob lokale Datenbank existiert
   - Prüft, ob Cloud Storage Datenbank existiert
   - Lädt die neueste Version (basierend auf Timestamp)
   - Falls keine existiert, wird eine neue erstellt

2. **Nach Schreiboperationen (`syncDatabaseAfterWrite`)**:
   - Wird automatisch nach folgenden Operationen aufgerufen:
     - Neue Bewerbung erstellen
     - Bewerbung aktualisieren
     - Bewerbung löschen
     - Lebenslauf speichern/aktualisieren
     - Anschreiben-Version erstellen
     - Alte Anschreiben hochladen
   - Läuft asynchron, blockiert nicht die API-Antwort

### Manuelle Synchronisation

Verwenden Sie den API-Endpoint `/api/admin/database/sync`:

- **GET**: Prüft Status und Konfiguration
- **POST ?action=upload**: Lädt Datenbank zu Cloud Storage hoch
- **POST ?action=download**: Lädt Datenbank von Cloud Storage herunter

## Wichtige Hinweise

1. **SQLite WAL Mode**: Die App verwendet WAL (Write-Ahead Logging) für bessere Performance. Vor dem Upload wird automatisch ein Checkpoint durchgeführt, um sicherzustellen, dass alle Änderungen in der Hauptdatenbank sind.

2. **Mehrere Instanzen**: Bei mehreren Cloud Run Instanzen:
   - Jede Instanz lädt beim Start die neueste Version von Cloud Storage
   - Nach Schreiboperationen wird die Datenbank hochgeladen
   - Die neueste Version (basierend auf Timestamp) wird verwendet
   - **Hinweis**: Bei sehr hoher Last können Race Conditions auftreten. Für Production mit mehreren Instanzen wird Cloud SQL empfohlen.

3. **Backups**: Die App erstellt automatisch ein Backup (`anschreiben_backup.db`) in Cloud Storage bei jedem Upload.

4. **Fehlerbehandlung**: Falls die Synchronisation fehlschlägt:
   - Die App funktioniert weiterhin mit der lokalen Datenbank
   - Fehler werden in den Logs protokolliert
   - Manuelle Synchronisation ist jederzeit möglich

## Troubleshooting

### Problem: "Cloud Storage not configured"

**Lösung**: Stellen Sie sicher, dass `GCS_BUCKET_NAME` als Environment-Variable gesetzt ist.

### Problem: "Permission denied" oder Authentifizierungsfehler

**Lösung**: 
```bash
# Für lokale Entwicklung
gcloud auth application-default login

# Für Cloud Run: Stellen Sie sicher, dass der Service Account die richtigen Berechtigungen hat
gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"
```

### Problem: Datenbank wird nicht synchronisiert

**Lösung**: 
1. Prüfen Sie die Logs auf Fehler
2. Testen Sie die manuelle Synchronisation über den API-Endpoint
3. Prüfen Sie, ob der Bucket existiert und erreichbar ist: `gsutil ls gs://$GCP_PROJECT_ID-anschreiben-data/`

## Migration von lokaler zu Cloud Storage

Wenn Sie bereits eine lokale Datenbank haben:

1. Starten Sie die App mit `GCS_BUCKET_NAME` gesetzt
2. Die App lädt beim ersten Start automatisch die lokale Datenbank zu Cloud Storage hoch
3. Oder manuell: `curl -X POST http://localhost:3000/api/admin/database/sync?action=upload`

## Kosten

Cloud Storage ist sehr kostengünstig:
- **Storage**: ~$0.020 pro GB/Monat
- **Operationen**: ~$0.05 pro 10.000 Class A Operationen (Uploads)
- **Datenbank-Größe**: Typischerweise < 10 MB für tausende von Bewerbungen

Für eine typische Anwendung mit mehreren tausend Bewerbungen: **< $1/Monat**


