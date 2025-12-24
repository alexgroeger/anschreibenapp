# ✅ Deployment-Checkliste

## Übersicht: Was wird beim Deployment gesichert?

### ✅ Automatisch gesichert (in Datenbank)

Die SQLite-Datenbank enthält **alle wichtigen Daten** und wird automatisch zu Cloud Storage synchronisiert:

1. **Admin-Konfigurationen** (`settings` Tabelle):
   - ✅ API-Key Konfiguration
   - ✅ KI-Modell-Einstellungen (Temperature, Model, etc.)
   - ✅ Generierungs-Einstellungen (Standardwerte, Formulierungen)
   - ✅ Alle System-Einstellungen

2. **Prompts** (`prompts` Tabelle):
   - ✅ Alle angepassten Prompts
   - ✅ Prompt-Versionen (`prompt_versions` Tabelle)

3. **Resume/Lebenslauf** (`resume` Tabelle):
   - ✅ Hochgeladener Lebenslauf
   - ✅ Resume-Versionen (`resume_versions` Tabelle)

4. **Bewerbungen** (`applications` Tabelle):
   - ✅ Alle Bewerbungen mit Status
   - ✅ Job-Beschreibungen
   - ✅ Extraktionsdaten
   - ✅ Generierte Anschreiben
   - ✅ Match-Ergebnisse

5. **Kontaktpersonen** (`contact_persons` Tabelle):
   - ✅ Alle Kontaktpersonen

6. **Alte Anschreiben** (`old_cover_letters` Tabelle):
   - ✅ Alle hochgeladenen alten Anschreiben

7. **Reminders** (`reminders` Tabelle):
   - ✅ Alle Erinnerungen und Termine

8. **Dokumente-Metadaten** (`application_documents` Tabelle):
   - ✅ Metadaten zu hochgeladenen Dokumenten

### ✅ Automatisch gesichert (in Cloud Storage)

1. **Job-Dokumente** (`job-documents/` in Cloud Storage):
   - ✅ Hochgeladene PDFs/Dokumente von Stellenausschreibungen
   - ✅ Werden automatisch zu Cloud Storage hochgeladen

2. **Datenbank-Backup** (`anschreiben_backup.db` in Cloud Storage):
   - ✅ Automatisches Backup bei jedem Upload

### ⚠️ Wichtige Hinweise

#### Environment-Variablen

Diese werden beim Deployment gesetzt und müssen korrekt sein:

```bash
GOOGLE_GENERATIVE_AI_API_KEY  # API-Key für Gemini
GCS_BUCKET_NAME              # Cloud Storage Bucket (411832844870-anschreiben-data)
```

**Prüfung nach Deployment:**
```bash
gcloud run services describe anschreiben-app \
  --region=europe-west1 \
  --format="value(spec.template.spec.containers[0].env)" \
  --project=gen-lang-client-0764998759
```

#### Prompt-Dateien

Die Prompt-Dateien im `/prompts` Verzeichnis werden im Dockerfile kopiert:
- ✅ `prompts/extract.ts`
- ✅ `prompts/generate.ts`
- ✅ `prompts/match.ts`
- ✅ `prompts/tone-analysis.ts`

**Wichtig**: Änderungen an diesen Dateien erfordern ein neues Deployment.

#### Datenbank-Synchronisation

Die Datenbank wird automatisch synchronisiert:
- ✅ **Beim Start**: Lädt Datenbank aus Cloud Storage (mit Retry-Mechanismus)
- ✅ **Nach Schreiboperationen**: Lädt automatisch zu Cloud Storage hoch
- ✅ **Manuell**: Über `/admin/database` oder `/api/admin/database/sync`

## Pre-Deployment Checkliste

### Vor dem Deployment

- [ ] **Code-Änderungen committed**
- [ ] **Tests lokal durchgeführt** (optional, da Quick-Deploy ohne Tests)
- [ ] **Environment-Variablen geprüft**:
  - [ ] `GOOGLE_GENERATIVE_AI_API_KEY` ist gesetzt
  - [ ] `GCS_BUCKET_NAME` ist korrekt (411832844870-anschreiben-data)
- [ ] **Cloud Storage Bucket existiert**:
  ```bash
  gcloud storage buckets describe gs://411832844870-anschreiben-data \
    --project=gen-lang-client-0764998759
  ```
- [ ] **Datenbank-Backup erstellt** (optional, aber empfohlen):
  ```bash
  # Über Admin-Panel: /admin/database
  # Oder API: POST /api/admin/database/backup
  ```

### Während des Deployments

- [ ] **Deployment-Script ausführen**: `./quick-deploy.sh`
- [ ] **Logs beobachten** für:
  - [ ] "Database downloaded from Cloud Storage successfully"
  - [ ] "Build erfolgreich abgeschlossen"
  - [ ] "Deployment abgeschlossen"

### Nach dem Deployment

- [ ] **Service-URL prüfen**:
  ```bash
  curl https://anschreiben-app-411832844870.europe-west1.run.app
  ```

- [ ] **Datenbank-Inhalt prüfen**:
  - [ ] Admin-Panel öffnen: `/admin/database`
  - [ ] Prüfen ob Bewerbungen vorhanden sind
  - [ ] Prüfen ob Settings vorhanden sind
  - [ ] Prüfen ob Resume vorhanden ist

- [ ] **Admin-Konfigurationen prüfen**:
  - [ ] `/admin/settings` - API-Key und Einstellungen
  - [ ] `/admin/prompts` - Prompts sind vorhanden
  - [ ] `/admin/generierung` - Generierungs-Einstellungen

- [ ] **Resume prüfen**:
  - [ ] `/resume` - Lebenslauf ist vorhanden

- [ ] **Cloud Storage Synchronisation prüfen**:
  ```bash
  # Prüfen ob Datenbank im Bucket ist
  gcloud storage ls gs://411832844870-anschreiben-data/anschreiben.db
  
  # Prüfen ob Backup existiert
  gcloud storage ls gs://411832844870-anschreiben-data/anschreiben_backup.db
  ```

- [ ] **Service-Logs prüfen**:
  ```bash
  gcloud run services logs read anschreiben-app \
    --region=europe-west1 \
    --limit=50 \
    --project=gen-lang-client-0764998759
  ```

## Häufige Probleme und Lösungen

### Problem: Datenbank wurde zurückgesetzt

**Symptome:**
- Bewerbungen fehlen
- Settings sind auf Standardwerte
- Resume fehlt

**Lösung:**
1. Prüfen ob Datenbank in Cloud Storage existiert:
   ```bash
   gcloud storage ls gs://411832844870-anschreiben-data/anschreiben.db
   ```

2. Falls vorhanden, manuell synchronisieren:
   - Admin-Panel: `/admin/database` → "Von Cloud Storage laden"
   - Oder API: `POST /api/admin/database/sync`

3. Falls nicht vorhanden, aus Backup wiederherstellen:
   ```bash
   gcloud storage cp gs://411832844870-anschreiben-data/anschreiben_backup.db \
     ./anschreiben.db
   ```

### Problem: Environment-Variablen fehlen

**Symptome:**
- API-Calls schlagen fehl
- Cloud Storage funktioniert nicht

**Lösung:**
```bash
# Environment-Variablen setzen
gcloud run services update anschreiben-app \
  --region=europe-west1 \
  --update-env-vars GOOGLE_GENERATIVE_AI_API_KEY=your-key,GCS_BUCKET_NAME=411832844870-anschreiben-data \
  --project=gen-lang-client-0764998759
```

### Problem: Job-Dokumente fehlen

**Symptome:**
- Hochgeladene PDFs sind nicht mehr verfügbar

**Lösung:**
- Job-Dokumente werden in Cloud Storage gespeichert (`job-documents/`)
- Prüfen:
  ```bash
  gcloud storage ls gs://411832844870-anschreiben-data/job-documents/
  ```

## Best Practices

1. **Vor jedem Deployment:**
   - Backup erstellen (über Admin-Panel)
   - Prüfen ob Cloud Storage synchronisiert ist

2. **Nach jedem Deployment:**
   - Datenbank-Inhalt prüfen
   - Admin-Konfigurationen prüfen
   - Service-Logs prüfen

3. **Regelmäßig:**
   - Cloud Storage Synchronisation prüfen
   - Backups verifizieren
   - Environment-Variablen prüfen

4. **Bei Problemen:**
   - Service-Logs prüfen
   - Cloud Storage prüfen
   - Datenbank-Status prüfen (Admin-Panel)

## Zusammenfassung

✅ **Alles wird automatisch gesichert:**
- Datenbank (mit allen Tabellen) → Cloud Storage
- Job-Dokumente → Cloud Storage
- Environment-Variablen → Cloud Run Service Config

✅ **Beim Deployment:**
- Datenbank wird automatisch aus Cloud Storage geladen
- Mehrfache Retry-Versuche verhindern Datenverlust
- Automatische Synchronisation nach Schreiboperationen

✅ **Nach dem Deployment:**
- Prüfen ob Daten vorhanden sind
- Prüfen ob Synchronisation funktioniert
- Logs prüfen für Fehler
