# Deployment Guide: Google Cloud Run

Diese Anleitung führt Sie durch das Deployment der Anschreiben Muckibude auf Google Cloud Run.

## Übersicht

**Ja, Sie benötigen ein Dockerfile für Cloud Run!** Cloud Run erfordert ein Container-Image, das über ein Dockerfile erstellt wird.

## Wichtige Überlegungen

### Datenbank-Persistenz Problem

Die App verwendet SQLite, die Daten in `/data/anschreiben.db` speichert. **Cloud Run Container sind ephemeral** - das bedeutet, dass das Dateisystem bei jedem Neustart gelöscht wird. Ohne persistente Speicherung gehen alle Daten verloren.

**Lösungsoptionen:**

1. **Cloud Storage Synchronisation (✅ Implementiert - Empfohlen)**
   - Automatische Synchronisation der SQLite-Datenbank zu/von Cloud Storage
   - Daten werden beim Start automatisch von Cloud Storage geladen
   - Nach jeder Schreiboperation wird die Datenbank automatisch zu Cloud Storage hochgeladen
   - Einfach zu konfigurieren: Nur `GCS_BUCKET_NAME` Environment-Variable setzen
   - Funktioniert zuverlässig mit SQLite, da die Datenbank lokal läuft und nur synchronisiert wird

2. **Cloud Filestore (Alternative)**
   - NFS-basiertes Dateisystem
   - Funktioniert besser mit SQLite als Cloud Storage FUSE
   - Unterstützt File Locking (wichtig für SQLite)
   - Erfordert VPC Connector Setup

3. **Cloud SQL (Langfristig empfohlen)**
   - Vollständig verwaltete Datenbank
   - Bessere Performance und Skalierbarkeit
   - Erfordert Migration von SQLite zu PostgreSQL/MySQL

4. **Cloud Storage FUSE (Nicht empfohlen für SQLite)**
   - Funktioniert, aber SQLite hat Probleme mit Network Storage
   - File Locking und Atomic Writes können problematisch sein

## Voraussetzungen

1. Google Cloud Account mit aktiviertem Billing
2. Google Cloud SDK (`gcloud`) installiert
3. Docker installiert (für lokales Testen)
4. Google Gemini API Key

## Schritt 1: Google Cloud Setup

### 1.1 Projekt erstellen und konfigurieren

```bash
# Projekt-ID setzen
export GCP_PROJECT_ID="ihr-projekt-id"
gcloud config set project $GCP_PROJECT_ID

# APIs aktivieren
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable storage.googleapis.com  # Für Cloud Storage
gcloud services enable file.googleapis.com  # Für Cloud Filestore (optional)
```

### 1.2 Cloud Storage Bucket erstellen (für persistente Datenbank - Empfohlen)

```bash
# Cloud Storage Bucket erstellen
gsutil mb -l europe-west1 gs://$GCP_PROJECT_ID-anschreiben-data

# Optional: Bucket-Versionierung aktivieren für zusätzliche Sicherheit
gsutil versioning set on gs://$GCP_PROJECT_ID-anschreiben-data
```

**Wichtig:**
- Der Bucket-Name wird als `GCS_BUCKET_NAME` Environment-Variable verwendet
- Die App synchronisiert automatisch beim Start und nach Schreiboperationen
- Keine zusätzliche Konfiguration erforderlich

### 1.3 Cloud Filestore Instance erstellen (Alternative - Optional)

```bash
# Filestore Instance erstellen
gcloud filestore instances create anschreiben-filestore \
  --zone=europe-west1-b \
  --tier=BASIC_HDD \
  --file-share=name="data",capacity=1TB \
  --network=name="default"
```

**Wichtig:** 
- Wählen Sie eine Zone nahe an Ihrer Cloud Run Region
- `BASIC_HDD` ist kostengünstiger, `BASIC_SSD` ist schneller
- 1TB ist das Minimum, Sie zahlen nur für genutzten Speicher

### 1.4 VPC Connector erstellen (nur für Filestore - Optional)

```bash
# VPC Connector für Cloud Run
gcloud compute networks vpc-access connectors create anschreiben-connector \
  --region=europe-west1 \
  --subnet-project=$GCP_PROJECT_ID \
  --subnet=default \
  --min-instances=2 \
  --max-instances=3
```

## Schritt 2: Docker Image bauen und pushen

### 2.1 Lokales Testen (optional)

```bash
# Image lokal bauen
docker build -t anschreiben-app:local .

# Lokal testen
docker run -p 8080:8080 \
  -e GOOGLE_GENERATIVE_AI_API_KEY="ihr-api-key" \
  -v $(pwd)/data:/app/data \
  anschreiben-app:local
```

### 2.2 Image zu Google Container Registry pushen

```bash
# Build und Push in einem Schritt
gcloud builds submit --tag gcr.io/$GCP_PROJECT_ID/anschreiben-app

# Oder mit dem bereitgestellten Script
./cloud-run-deploy.sh
```

## Schritt 3: Cloud Run Service deployen

### 3.1 Mit Cloud Storage Synchronisation (✅ Empfohlen)

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

**Vorteile:**
- ✅ Automatische Synchronisation beim Start und nach Schreiboperationen
- ✅ Einfache Konfiguration (nur Environment-Variable)
- ✅ Keine zusätzliche Infrastruktur erforderlich
- ✅ Daten bleiben auch nach Container-Neustarts erhalten
- ✅ Funktioniert zuverlässig mit SQLite

**Wie es funktioniert:**
1. Beim Start lädt die App die Datenbank von Cloud Storage (falls vorhanden)
2. Nach jeder Schreiboperation wird die Datenbank automatisch zu Cloud Storage hochgeladen
3. Bei mehreren Instanzen: Die neueste Version wird verwendet (basierend auf Timestamp)

**Manuelle Synchronisation:**
```bash
# Status prüfen
curl https://ihre-app-url/api/admin/database/sync

# Manuell hochladen
curl -X POST https://ihre-app-url/api/admin/database/sync?action=upload

# Manuell herunterladen
curl -X POST https://ihre-app-url/api/admin/database/sync?action=download
```

### 3.2 Ohne persistente Speicherung (Nur für Tests)

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
  --set-env-vars GOOGLE_GENERATIVE_AI_API_KEY="ihr-api-key"
```

**Warnung:** Daten gehen bei jedem Neustart verloren!

### 3.3 Mit Cloud Filestore (Alternative)

```bash
# Filestore Instance Details abrufen
FILESTORE_IP=$(gcloud filestore instances describe anschreiben-filestore \
  --zone=europe-west1-b \
  --format="value(networks[0].ipAddresses[0])")

# Service mit Filestore Mount deployen
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
  --vpc-connector anschreiben-connector \
  --add-volume name=data,type=cloud-storage,bucket=anschreiben-data \
  --add-volume-mount volume=data,mount-path=/app/data \
  --set-env-vars GOOGLE_GENERATIVE_AI_API_KEY="ihr-api-key"
```

**Hinweis:** Cloud Run unterstützt aktuell noch keine direkten Filestore Mounts. Die obige Lösung verwendet Cloud Storage als Workaround. Für echte Filestore-Integration siehe Alternative unten.

### 3.4 Alternative: Cloud Storage FUSE (Nicht empfohlen)

Erstellen Sie ein Startup-Script, das die Datenbank zu/von Cloud Storage synchronisiert:

```bash
# Cloud Storage Bucket erstellen
gsutil mb -l europe-west1 gs://$GCP_PROJECT_ID-anschreiben-data

# Service deployen mit Cloud Storage Mount
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
  --set-env-vars GCS_BUCKET="$GCP_PROJECT_ID-anschreiben-data"
```

**Warnung:** SQLite funktioniert nicht optimal mit Cloud Storage FUSE. Erwägen Sie eine Migration zu Cloud SQL.

## Schritt 4: Domain konfigurieren

### 4.1 Domain zu Cloud Run Service mappen

```bash
gcloud run domain-mappings create \
  --service anschreiben-app \
  --domain ihre-domain.com \
  --region europe-west1
```

### 4.2 DNS-Einträge konfigurieren

Folgen Sie den Anweisungen, die `gcloud` nach dem Domain-Mapping ausgibt, um die DNS-Einträge bei Ihrem Domain-Provider zu setzen.

## Schritt 5: Environment-Variablen verwalten

### 5.1 Secrets verwenden (Empfohlen)

```bash
# Secret erstellen
echo -n "ihr-api-key" | gcloud secrets create google-api-key --data-file=-

# Secret zu Service hinzufügen
gcloud run services update anschreiben-app \
  --update-secrets GOOGLE_GENERATIVE_AI_API_KEY=google-api-key:latest \
  --region europe-west1
```

### 5.2 Environment-Variablen aktualisieren

```bash
gcloud run services update anschreiben-app \
  --update-env-vars GOOGLE_GENERATIVE_AI_API_KEY="neuer-key" \
  --region europe-west1
```

## Schritt 6: Monitoring und Logs

### 6.1 Logs ansehen

```bash
gcloud run services logs read anschreiben-app --region europe-west1
```

### 6.2 Cloud Console

Besuchen Sie die [Cloud Run Console](https://console.cloud.google.com/run) für:
- Metriken (Requests, Latency, Errors)
- Logs
- Service-Konfiguration

## Kostenoptimierung

1. **Min/Max Instances:** Setzen Sie `--min-instances=0` für kostenlose Tier-Nutzung
2. **Memory:** Starten Sie mit 512Mi und erhöhen Sie bei Bedarf
3. **CPU:** Nur während Requests zugewiesen (kostenlos wenn idle)
4. **Filestore:** Wählen Sie `BASIC_HDD` für niedrigere Kosten

## Bekannte Probleme und Lösungen

### Problem: Datenbank-Daten gehen verloren

**Ursache:** Container ist ephemeral, keine persistente Speicherung konfiguriert.

**Lösung:** 
- Cloud Filestore verwenden (siehe Schritt 3.2)
- Oder Migration zu Cloud SQL (empfohlen für Production)

### Problem: SQLite "database is locked" Fehler

**Ursache:** SQLite auf Network Storage hat Probleme mit File Locking.

**Lösung:** 
- Migration zu Cloud SQL (PostgreSQL/MySQL)
- Oder nur eine Instanz erlauben (`--max-instances=1`)

### Problem: Langsame Datenbank-Zugriffe

**Ursache:** Network Storage Latency.

**Lösung:** 
- Cloud SQL verwenden (optimiert für Network-Zugriff)
- Oder Filestore SSD Tier verwenden

## Nächste Schritte

1. **Backup-Strategie:** Implementieren Sie regelmäßige Backups der Datenbank
2. **Monitoring:** Richten Sie Alerts für Fehler und Performance ein
3. **Migration zu Cloud SQL:** Planen Sie die Migration für bessere Skalierbarkeit
4. **CI/CD:** Automatisieren Sie Deployments mit Cloud Build

## Support

Bei Problemen:
- Prüfen Sie die [Cloud Run Dokumentation](https://cloud.google.com/run/docs)
- Sehen Sie sich die Logs an: `gcloud run services logs read anschreiben-app`
- Prüfen Sie die Service-Metriken in der Cloud Console
