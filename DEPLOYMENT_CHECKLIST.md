# Deployment-Checkliste: Cloud Storage Integration

Diese Checkliste führt Sie Schritt für Schritt durch das Deployment mit persistenter Cloud Storage Integration.

## ✅ Vorbereitung

### 1. Google Cloud Projekt Setup
- [ ] Google Cloud Account erstellt
- [ ] Billing aktiviert
- [ ] Projekt-ID notiert: `_________________`
- [ ] Google Cloud SDK (`gcloud`) installiert
- [ ] Authentifizierung konfiguriert: `gcloud auth login`

### 2. APIs aktivieren
```bash
export GCP_PROJECT_ID="ihr-projekt-id"
gcloud config set project $GCP_PROJECT_ID

# APIs aktivieren
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable storage.googleapis.com
```

- [ ] Alle APIs aktiviert

### 3. Cloud Storage Bucket erstellen
```bash
# Bucket erstellen
gsutil mb -l europe-west1 gs://$GCP_PROJECT_ID-anschreiben-data

# Optional: Versionierung aktivieren
gsutil versioning set on gs://$GCP_PROJECT_ID-anschreiben-data

# Bucket-Name notieren: `_________________`
```

- [ ] Bucket erstellt
- [ ] Bucket-Name notiert: `_________________`

### 4. Service Account Berechtigungen (für Cloud Run)
```bash
# Service Account für Cloud Run benötigt Storage-Berechtigungen
# Diese werden normalerweise automatisch vergeben, aber prüfen Sie:
gcloud projects get-iam-policy $GCP_PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:*compute@developer.gserviceaccount.com"
```

- [ ] Berechtigungen geprüft (oder automatisch vergeben)

## 🚀 Deployment

### 5. Docker Image bauen und pushen
```bash
# Build und Push
gcloud builds submit --tag gcr.io/$GCP_PROJECT_ID/anschreiben-app

# Oder mit dem bereitgestellten Script
./cloud-run-deploy.sh
```

- [ ] Image erfolgreich gebaut
- [ ] Image zu Container Registry gepusht

### 6. Cloud Run Service deployen
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

**Wichtige Environment-Variablen:**
- [ ] `GOOGLE_GENERATIVE_AI_API_KEY` gesetzt
- [ ] `GCS_BUCKET_NAME` gesetzt (Bucket-Name von Schritt 3)

### 7. Service URL notieren
```bash
# Service URL abrufen
gcloud run services describe anschreiben-app \
  --region europe-west1 \
  --format="value(status.url)"
```

- [ ] Service URL notiert: `_________________`

## 🧪 Testing

### 8. Funktionalität testen
- [ ] App öffnen: `https://ihre-service-url`
- [ ] Admin-Panel öffnen: `/admin/database`
- [ ] Cloud Storage Status prüfen (sollte "Konfiguriert" anzeigen)
- [ ] Testdaten erstellen (z.B. neue Bewerbung)
- [ ] Synchronisation prüfen (sollte automatisch hochgeladen werden)

### 9. Cloud Storage prüfen
```bash
# Dateien im Bucket auflisten
gsutil ls gs://$GCP_PROJECT_ID-anschreiben-data/

# Erwartete Dateien:
# - anschreiben.db
# - anschreiben_backup.db
```

- [ ] Datenbank-Dateien im Bucket vorhanden
- [ ] Backup-Datei vorhanden

### 10. Neustart-Test
```bash
# Service neu starten (simuliert Container-Neustart)
gcloud run services update anschreiben-app \
  --region europe-west1 \
  --update-env-vars GCS_BUCKET_NAME="$GCP_PROJECT_ID-anschreiben-data"
```

- [ ] Service neu gestartet
- [ ] Daten nach Neustart noch vorhanden
- [ ] Synchronisation funktioniert weiterhin

## 📊 Monitoring

### 11. Logs prüfen
```bash
# Logs ansehen
gcloud run services logs read anschreiben-app --region europe-west1 --limit 50

# Erwartete Log-Meldungen:
# - "Cloud Storage is configured and ready for sync"
# - "Database downloaded successfully from Cloud Storage" (beim Start)
# - "Database uploaded successfully to Cloud Storage" (nach Schreiboperationen)
```

- [ ] Logs zeigen erfolgreiche Synchronisation
- [ ] Keine Fehler in den Logs

### 12. Admin-Panel prüfen
- [ ] Admin-Panel: `/admin/database`
- [ ] Cloud Storage Sektion zeigt Status
- [ ] Manuelle Synchronisation funktioniert (Upload/Download Buttons)

## 🔒 Sicherheit & Backup

### 13. Backup-Strategie
- [ ] Automatische Backups aktiv (wird bei jedem Upload erstellt)
- [ ] Optional: Cloud Storage Versionierung aktiviert
- [ ] Optional: Regelmäßige manuelle Backups geplant

### 14. Zugriffskontrolle
- [ ] Cloud Run Service Zugriff konfiguriert (authenticated/unauthenticated)
- [ ] Cloud Storage Bucket Zugriff beschränkt (nur Service Account)
- [ ] API Keys sicher gespeichert (nicht in Code)

## 📝 Dokumentation

### 15. Dokumentation aktualisiert
- [ ] Team-Mitglieder informiert über Cloud Storage Setup
- [ ] Bucket-Name und Projekt-ID dokumentiert
- [ ] Zugangsdaten sicher gespeichert

## 🎯 Erfolgskriterien

Die Deployment ist erfolgreich, wenn:
- ✅ App läuft auf Cloud Run
- ✅ Datenbank wird automatisch zu Cloud Storage synchronisiert
- ✅ Daten bleiben nach Container-Neustart erhalten
- ✅ Manuelle Synchronisation über Admin-Panel funktioniert
- ✅ Keine Fehler in den Logs

## 🆘 Troubleshooting

### Problem: "Cloud Storage not configured"
**Lösung:** Prüfen Sie, ob `GCS_BUCKET_NAME` als Environment-Variable gesetzt ist.

### Problem: "Permission denied"
**Lösung:** Prüfen Sie Service Account Berechtigungen:
```bash
gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"
```

### Problem: Daten gehen verloren nach Neustart
**Lösung:** 
1. Prüfen Sie Logs auf Synchronisations-Fehler
2. Prüfen Sie, ob Dateien im Bucket vorhanden sind: `gsutil ls gs://...`
3. Testen Sie manuelle Synchronisation über Admin-Panel

## 📞 Support

Bei Problemen:
1. Logs prüfen: `gcloud run services logs read anschreiben-app --region europe-west1`
2. Cloud Storage prüfen: `gsutil ls gs://$GCP_PROJECT_ID-anschreiben-data/`
3. Admin-Panel testen: `/admin/database`
4. Detaillierte Dokumentation: [CLOUD_STORAGE_SETUP.md](./CLOUD_STORAGE_SETUP.md)

