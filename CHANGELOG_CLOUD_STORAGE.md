# Changelog: Cloud Storage Integration

## Übersicht

Diese Implementierung fügt persistente Online-Speicherung für die SQLite-Datenbank hinzu, sodass Nutzer ihre Akten auch nach Container-Neustarts wiederfinden können.

## Implementierte Features

### ✅ Automatische Synchronisation
- **Beim Start**: Lädt Datenbank automatisch von Cloud Storage (falls vorhanden)
- **Nach Schreiboperationen**: Lädt Datenbank automatisch zu Cloud Storage hoch
- **Intelligente Konfliktlösung**: Verwendet die neueste Version basierend auf Timestamp

### ✅ Manuelle Synchronisation
- **Admin-Panel**: UI für manuelle Upload/Download-Operationen
- **API-Endpoint**: `/api/admin/database/sync` für programmatischen Zugriff
- **Status-Anzeige**: Detaillierte Informationen über lokale und Cloud-Datenbank

### ✅ Fehlerbehandlung
- Graceful Degradation: App funktioniert weiterhin lokal, auch wenn Cloud Storage nicht verfügbar ist
- Detaillierte Logging für Troubleshooting
- Automatische WAL-Checkpoint vor Upload

### ✅ Backup-Strategie
- Automatisches Backup bei jedem Upload (`anschreiben_backup.db`)
- Optional: Cloud Storage Versionierung für zusätzliche Sicherheit

## Neue Dateien

### Code
- `lib/storage/sync.ts` - Cloud Storage Synchronisations-Logik
- `app/api/admin/database/sync/route.ts` - API-Endpoint für manuelle Synchronisation

### Dokumentation
- `CLOUD_STORAGE_SETUP.md` - Detaillierte Setup-Anleitung
- `DEPLOYMENT_CHECKLIST.md` - Schritt-für-Schritt Deployment-Checkliste
- `CHANGELOG_CLOUD_STORAGE.md` - Diese Datei

### Scripts
- `scripts/setup-cloud-storage.sh` - Interaktives Setup-Script

## Geänderte Dateien

### Backend
- `lib/database/client.ts` - Automatische Synchronisation beim Start und nach Schreiboperationen
- `app/api/applications/route.ts` - Sync nach CREATE
- `app/api/applications/[id]/route.ts` - Sync nach UPDATE/DELETE
- `app/api/resume/route.ts` - Sync nach CREATE/UPDATE
- `app/api/applications/[id]/versions/route.ts` - Sync nach Version-Erstellung
- `app/api/old-cover-letters/route.ts` - Sync nach Upload

### Frontend
- `app/admin/database/page.tsx` - Erweiterte UI mit Sync-Status und Details

### Konfiguration
- `package.json` - `@google-cloud/storage` Dependency hinzugefügt
- `README.md` - Cloud Storage Dokumentation hinzugefügt
- `DEPLOYMENT.md` - Cloud Storage als empfohlene Lösung dokumentiert

## API-Änderungen

### Neue Endpoints
- `GET /api/admin/database/sync` - Status und Konfiguration prüfen
- `POST /api/admin/database/sync?action=upload` - Manuell hochladen
- `POST /api/admin/database/sync?action=download` - Manuell herunterladen

## Environment-Variablen

### Neu
- `GCS_BUCKET_NAME` - Name des Cloud Storage Buckets (optional)

### Bestehend (unverändert)
- `GOOGLE_GENERATIVE_AI_API_KEY` - Google Gemini API Key

## Migration

### Von lokaler zu Cloud Storage
1. Cloud Storage Bucket erstellen
2. `GCS_BUCKET_NAME` Environment-Variable setzen
3. App starten - lokale Datenbank wird automatisch hochgeladen
4. Oder manuell: `POST /api/admin/database/sync?action=upload`

### Rückwärtskompatibilität
- ✅ Vollständig rückwärtskompatibel
- ✅ Funktioniert ohne Cloud Storage (lokale Datenbank)
- ✅ Keine Breaking Changes

## Performance

### Auswirkungen
- **Startup**: +100-500ms (nur wenn Cloud Storage konfiguriert)
- **Schreiboperationen**: +50-200ms (asynchron, blockiert nicht)
- **Speicher**: Minimal (nur wenn Cloud Storage konfiguriert)

### Optimierungen
- Asynchrone Synchronisation nach Schreiboperationen
- WAL-Checkpoint nur bei Upload
- Caching von Storage-Instanzen

## Sicherheit

### Berechtigungen
- Service Account benötigt `roles/storage.objectAdmin`
- Bucket-Zugriff beschränkt auf Service Account
- Keine öffentlichen Zugriffe

### Daten
- Datenbank wird verschlüsselt in Cloud Storage gespeichert
- Automatische Backups für zusätzliche Sicherheit

## Kosten

### Cloud Storage
- **Storage**: ~$0.020 pro GB/Monat
- **Operationen**: ~$0.05 pro 10.000 Class A Operationen
- **Typische Kosten**: < $1/Monat für tausende von Bewerbungen

## Bekannte Einschränkungen

### Mehrere Instanzen
- Bei mehreren Cloud Run Instanzen können Race Conditions auftreten
- Empfehlung: Für Production mit mehreren Instanzen Cloud SQL verwenden
- Für Single-Instance Deployments: Perfekt geeignet

### SQLite WAL
- WAL-Mode wird vor Upload in Hauptdatenbank geschrieben
- Bei sehr hoher Last können kurzzeitig Lock-Konflikte auftreten

## Testing

### Lokales Testen
1. `gcloud auth application-default login`
2. `GCS_BUCKET_NAME` in `.env.local` setzen
3. App starten und Admin-Panel prüfen

### Cloud Run Testing
1. Bucket erstellen
2. Environment-Variable setzen
3. Deployen und Logs prüfen
4. Neustart-Test durchführen

## Nächste Schritte (Optional)

### Mögliche Verbesserungen
- [ ] Retry-Logik bei fehlgeschlagener Synchronisation
- [ ] Scheduled Backups (Cloud Scheduler)
- [ ] Monitoring/Alerting für Sync-Fehler
- [ ] Migration zu Cloud SQL (langfristig)

## Support

Bei Fragen oder Problemen:
1. Dokumentation: [CLOUD_STORAGE_SETUP.md](./CLOUD_STORAGE_SETUP.md)
2. Checkliste: [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
3. Logs prüfen: `gcloud run services logs read anschreiben-app --region europe-west1`


