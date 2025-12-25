# Testing Guide: Cloud Storage Integration

Diese Anleitung führt Sie durch das Testen der Cloud Storage Integration.

## Vorbereitung

### 1. Lokale Entwicklungsumgebung

```bash
# 1. Google Cloud SDK installiert?
gcloud --version

# 2. Authentifizierung für lokale Entwicklung
gcloud auth application-default login

# 3. Projekt setzen
gcloud config set project IHR-PROJEKT-ID
```

### 2. Cloud Storage Bucket erstellen

```bash
# Option A: Mit Setup-Script (empfohlen)
./scripts/setup-cloud-storage.sh

# Option B: Manuell
export GCP_PROJECT_ID="ihr-projekt-id"
gsutil mb -l europe-west1 gs://$GCP_PROJECT_ID-anschreiben-data
```

### 3. Environment-Variablen setzen

Erstellen Sie `.env.local`:
```bash
GOOGLE_GENERATIVE_AI_API_KEY=ihr-api-key
GCS_BUCKET_NAME=ihr-projekt-id-anschreiben-data
```

## Test-Szenarien

### Test 1: Lokale Entwicklung - Erste Synchronisation

**Ziel**: Prüfen, ob lokale Datenbank zu Cloud Storage hochgeladen wird.

**Schritte**:
1. App starten: `npm run dev`
2. Admin-Panel öffnen: `http://localhost:3000/admin/database`
3. Cloud Storage Status prüfen
4. Testdaten erstellen (z.B. neue Bewerbung)
5. Warten 2-3 Sekunden
6. Cloud Storage prüfen: `gsutil ls gs://ihr-bucket-name/`

**Erwartetes Ergebnis**:
- ✅ Status zeigt "Konfiguriert"
- ✅ Nach Daten-Erstellung: Dateien im Bucket (`anschreiben.db`, `anschreiben_backup.db`)
- ✅ Admin-Panel zeigt Dateigröße und letzte Aktualisierung

**Verifizierung**:
```bash
# Dateien im Bucket auflisten
gsutil ls gs://ihr-bucket-name/

# Dateigröße prüfen
gsutil du -h gs://ihr-bucket-name/
```

### Test 2: Automatische Synchronisation beim Start

**Ziel**: Prüfen, ob Datenbank beim Start von Cloud Storage geladen wird.

**Schritte**:
1. Lokale Datenbank löschen: `rm data/anschreiben.db*`
2. App neu starten: `npm run dev`
3. Logs prüfen (sollte "Downloading database from Cloud Storage..." zeigen)
4. Admin-Panel öffnen und prüfen, ob Daten vorhanden sind

**Erwartetes Ergebnis**:
- ✅ Datenbank wird automatisch von Cloud Storage geladen
- ✅ Alle vorherigen Daten sind wieder vorhanden
- ✅ Logs zeigen erfolgreichen Download

**Verifizierung**:
```bash
# Logs prüfen
npm run dev | grep -i "cloud storage"

# Datenbank-Datei prüfen
ls -lh data/anschreiben.db
```

### Test 3: Manuelle Synchronisation über Admin-Panel

**Ziel**: Prüfen der manuellen Upload/Download-Funktionen.

**Schritte**:
1. Admin-Panel öffnen: `/admin/database`
2. "Zu Cloud Storage hochladen" klicken
3. Erfolgsmeldung prüfen
4. Cloud Storage Status aktualisieren (Seite neu laden)
5. "Von Cloud Storage herunterladen" klicken
6. Erfolgsmeldung prüfen

**Erwartetes Ergebnis**:
- ✅ Upload zeigt Erfolgsmeldung
- ✅ Status aktualisiert sich (zeigt neue Zeitstempel)
- ✅ Download zeigt Erfolgsmeldung
- ✅ Keine Fehler in der Konsole

### Test 4: API-Endpoint Test

**Ziel**: Prüfen der API-Endpoints für Synchronisation.

**Schritte**:
```bash
# Status prüfen
curl http://localhost:3000/api/admin/database/sync

# Manuell hochladen
curl -X POST http://localhost:3000/api/admin/database/sync?action=upload

# Manuell herunterladen
curl -X POST http://localhost:3000/api/admin/database/sync?action=download
```

**Erwartetes Ergebnis**:
- ✅ GET gibt Status-Informationen zurück
- ✅ POST upload gibt Erfolgsmeldung zurück
- ✅ POST download gibt Erfolgsmeldung zurück

**Beispiel-Response (GET)**:
```json
{
  "cloudStorageConfigured": true,
  "bucketName": "projekt-id-anschreiben-data",
  "message": "Cloud Storage is configured and ready for sync",
  "cloudFile": {
    "exists": true,
    "size": "123456",
    "updated": "2024-01-15T10:30:00Z"
  },
  "localFile": {
    "exists": true,
    "size": 123456,
    "modified": "2024-01-15T10:30:00Z"
  }
}
```

### Test 5: Fehlerbehandlung - Cloud Storage nicht konfiguriert

**Ziel**: Prüfen, ob App ohne Cloud Storage funktioniert.

**Schritte**:
1. `.env.local` umbenennen (temporär)
2. App neu starten
3. Admin-Panel öffnen
4. Prüfen, ob App normal funktioniert
5. Cloud Storage Status prüfen (sollte "Nicht konfiguriert" zeigen)

**Erwartetes Ergebnis**:
- ✅ App funktioniert normal (lokale Datenbank)
- ✅ Keine Fehler
- ✅ Status zeigt "Nicht konfiguriert" mit hilfreicher Meldung

### Test 6: Fehlerbehandlung - Ungültiger Bucket

**Ziel**: Prüfen der Fehlerbehandlung bei ungültigem Bucket-Namen.

**Schritte**:
1. `.env.local` mit ungültigem Bucket-Namen: `GCS_BUCKET_NAME=ungueltiger-bucket`
2. App starten
3. Logs prüfen
4. Versuchen, Daten zu erstellen

**Erwartetes Ergebnis**:
- ✅ App funktioniert weiterhin (lokale Datenbank)
- ✅ Fehler werden in Logs protokolliert
- ✅ Keine App-Crashes

### Test 7: Konfliktlösung - Cloud vs. Lokal

**Ziel**: Prüfen, welche Version bei Konflikten verwendet wird.

**Schritte**:
1. Lokale Datenbank mit Testdaten erstellen
2. Zu Cloud Storage hochladen
3. Lokale Datenbank löschen
4. Neue lokale Datenbank mit anderen Testdaten erstellen
5. App neu starten
6. Prüfen, welche Daten vorhanden sind

**Erwartetes Ergebnis**:
- ✅ Neueste Version wird verwendet (basierend auf Timestamp)
- ✅ Logs zeigen, welche Version geladen wurde

### Test 8: Performance - Mehrere Schreiboperationen

**Ziel**: Prüfen der Performance bei vielen Schreiboperationen.

**Schritte**:
1. Mehrere Bewerbungen schnell hintereinander erstellen
2. Logs prüfen auf Synchronisations-Meldungen
3. Cloud Storage prüfen

**Erwartetes Ergebnis**:
- ✅ Alle Operationen werden synchronisiert
- ✅ Keine Performance-Probleme
- ✅ Keine Race Conditions

## Cloud Run Testing

### Test 9: Deployment und Neustart

**Ziel**: Prüfen, ob Daten nach Container-Neustart erhalten bleiben.

**Schritte**:
1. App auf Cloud Run deployen
2. Testdaten erstellen
3. Container neu starten (z.B. durch Deployment)
4. Prüfen, ob Daten noch vorhanden sind

**Schritte**:
```bash
# Deployen
gcloud run deploy anschreiben-app \
  --image gcr.io/PROJEKT-ID/anschreiben-app \
  --region europe-west1 \
  --set-env-vars GCS_BUCKET_NAME=PROJEKT-ID-anschreiben-data

# Testdaten erstellen (über UI)

# Service neu starten
gcloud run services update anschreiben-app \
  --region europe-west1

# Daten prüfen (über UI)
```

**Erwartetes Ergebnis**:
- ✅ Daten bleiben nach Neustart erhalten
- ✅ Logs zeigen erfolgreiche Synchronisation beim Start

### Test 10: Logs prüfen

**Ziel**: Prüfen der Logs auf Synchronisations-Meldungen.

**Schritte**:
```bash
# Logs ansehen
gcloud run services logs read anschreiben-app \
  --region europe-west1 \
  --limit 100

# Nach Cloud Storage Meldungen suchen
gcloud run services logs read anschreiben-app \
  --region europe-west1 \
  --limit 100 | grep -i "cloud storage"
```

**Erwartete Log-Meldungen**:
- `Cloud Storage is configured and ready for sync`
- `Database downloaded successfully from Cloud Storage` (beim Start)
- `Database uploaded successfully to Cloud Storage` (nach Schreiboperationen)

## Troubleshooting

### Problem: "Cloud Storage not configured"
**Lösung**: Prüfen Sie `.env.local` oder Cloud Run Environment-Variablen

### Problem: "Permission denied"
**Lösung**: 
```bash
gcloud auth application-default login  # Lokal
# Oder Service Account Berechtigungen prüfen (Cloud Run)
```

### Problem: Daten werden nicht synchronisiert
**Lösung**:
1. Logs prüfen
2. Bucket-Name prüfen: `gsutil ls gs://...`
3. Manuelle Synchronisation testen

### Problem: App startet nicht
**Lösung**: 
1. Prüfen Sie, ob `GCS_BUCKET_NAME` korrekt ist
2. Prüfen Sie Authentifizierung
3. Prüfen Sie Logs für detaillierte Fehlermeldungen

## Checkliste

- [ ] Test 1: Erste Synchronisation erfolgreich
- [ ] Test 2: Automatischer Download beim Start funktioniert
- [ ] Test 3: Manuelle Synchronisation über UI funktioniert
- [ ] Test 4: API-Endpoints funktionieren
- [ ] Test 5: App funktioniert ohne Cloud Storage
- [ ] Test 6: Fehlerbehandlung bei ungültigem Bucket
- [ ] Test 7: Konfliktlösung funktioniert
- [ ] Test 8: Performance bei vielen Operationen
- [ ] Test 9: Cloud Run Deployment erfolgreich
- [ ] Test 10: Logs zeigen korrekte Meldungen

## Erfolgskriterien

Alle Tests sind erfolgreich, wenn:
- ✅ Daten werden automatisch synchronisiert
- ✅ Daten bleiben nach Neustart erhalten
- ✅ Manuelle Synchronisation funktioniert
- ✅ Fehlerbehandlung funktioniert korrekt
- ✅ Keine Performance-Probleme
- [ ] Logs zeigen keine Fehler


