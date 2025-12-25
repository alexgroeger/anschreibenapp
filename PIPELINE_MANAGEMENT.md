# Pipeline Management in Cursor

Diese Anleitung zeigt, wie Sie Ihre Deployment-Pipelines bequem in Cursor verwalten können.

## Schnellstart

### Über npm Scripts

```bash
# Interaktives Pipeline-Menü
npm run pipeline

# Direkte Befehle
npm run pipeline:test        # Tests ausführen
npm run pipeline:trigger     # Deployment auslösen
npm run pipeline:status      # Pipeline Status prüfen
npm run pipeline:service     # Service Status prüfen
npm run pipeline:logs        # Logs ansehen
npm run pipeline:rollback    # Rollback durchführen
```

### Über Cursor Tasks

1. **Cmd+Shift+P** (Mac) oder **Ctrl+Shift+P** (Windows/Linux)
2. Tippen Sie "Tasks: Run Task"
3. Wählen Sie eine der verfügbaren Tasks:
   - `Pipeline: Tests ausführen`
   - `Pipeline: Deployment auslösen`
   - `Pipeline: Status prüfen`
   - `Pipeline: Service Status`
   - `Pipeline: Logs ansehen`
   - `Pipeline: Rollback`
   - `Tests: Alle E2E Tests`
   - `Tests: Mit UI`
   - `Tests: Smoke Tests`

## Verfügbare Befehle

### Tests

#### Alle E2E Tests ausführen
```bash
npm run test:e2e
# oder
npm run pipeline:test
```

#### Tests mit UI (empfohlen für Debugging)
```bash
npm run test:e2e:ui
```

#### Nur Smoke Tests
```bash
npm run test:smoke
```

### Pipeline Management

#### Pipeline manuell auslösen
```bash
npm run pipeline:trigger
```

**Voraussetzungen:**
- `GOOGLE_GENERATIVE_AI_API_KEY` Environment-Variable gesetzt
- Oder API Key wird interaktiv abgefragt

#### Pipeline Status prüfen
```bash
npm run pipeline:status
```

Zeigt die letzten 5 Builds mit Status und Zeitstempel.

#### Service Status prüfen
```bash
npm run pipeline:service
```

Zeigt aktuelle Service-Informationen:
- Service URL
- Aktuelle Revision
- Status

#### Logs ansehen
```bash
npm run pipeline:logs
```

Zeigt die letzten 50 Log-Einträge des Cloud Run Services.

#### Rollback durchführen
```bash
npm run pipeline:rollback
```

Führt einen interaktiven Rollback zu einer vorherigen Revision durch.

## Interaktives Menü

Das Pipeline-Script bietet ein interaktives Menü für alle Funktionen:

```bash
npm run pipeline
```

Menü-Optionen:
1. Tests lokal ausführen
2. Pipeline manuell auslösen
3. Pipeline Status prüfen
4. Service Status prüfen
5. Logs ansehen
6. Rollback durchführen
7. Beenden

## Cursor Integration

### Tasks in Cursor

Die Tasks sind in `.vscode/tasks.json` definiert und können über das Command Palette aufgerufen werden:

1. **Cmd+Shift+P** → "Tasks: Run Task"
2. Wählen Sie den gewünschten Task

### Keyboard Shortcuts (optional)

Sie können in Cursor Keyboard Shortcuts für häufig verwendete Tasks einrichten:

1. **Cmd+K Cmd+S** (Mac) oder **Ctrl+K Ctrl+S** (Windows/Linux)
2. Suchen Sie nach "workbench.action.tasks.runTask"
3. Fügen Sie einen Shortcut hinzu (z.B. Cmd+Shift+T für Tests)

## Workflow-Beispiele

### Vor jedem Deployment

```bash
# 1. Tests lokal ausführen
npm run test:e2e

# 2. Pipeline Status prüfen
npm run pipeline:status

# 3. Deployment auslösen
npm run pipeline:trigger
```

### Nach einem Deployment

```bash
# 1. Service Status prüfen
npm run pipeline:service

# 2. Logs ansehen
npm run pipeline:logs

# 3. Smoke Tests ausführen
npm run test:smoke
```

### Bei Problemen

```bash
# 1. Logs ansehen
npm run pipeline:logs

# 2. Service Status prüfen
npm run pipeline:service

# 3. Falls nötig: Rollback
npm run pipeline:rollback
```

## Konfiguration

### Environment-Variablen

Für die Pipeline benötigen Sie:

```bash
export GOOGLE_GENERATIVE_AI_API_KEY="your-api-key"
```

Oder in einer `.env.local` Datei (wird nicht committed):
```
GOOGLE_GENERATIVE_AI_API_KEY=your-api-key
```

### Projekt-Konfiguration

Die Pipeline-Konfiguration befindet sich in:
- `cloudbuild.yaml` - Cloud Build Konfiguration
- `scripts/pipeline.sh` - Pipeline Management Script

## Troubleshooting

### "gcloud nicht gefunden"

```bash
# Installieren Sie gcloud (siehe SETUP_GCLOUD.md)
# Oder fügen Sie gcloud zum PATH hinzu:
export PATH="$HOME/google-cloud-sdk/bin:$PATH"
```

### "Nicht authentifiziert"

```bash
gcloud auth login
```

### "API Key fehlt"

```bash
export GOOGLE_GENERATIVE_AI_API_KEY="your-api-key"
```

Oder verwenden Sie das interaktive Menü, das den API Key abfragt.

## Erweiterte Nutzung

### Direkte Script-Nutzung

```bash
# Tests ausführen
./scripts/pipeline.sh test

# Pipeline auslösen
./scripts/pipeline.sh trigger

# Status prüfen
./scripts/pipeline.sh status
```

### In CI/CD integrieren

Die Scripts können auch in CI/CD-Pipelines verwendet werden:

```yaml
- name: Run tests
  run: npm run test:e2e

- name: Check pipeline status
  run: npm run pipeline:status
```

## Nützliche Links

- [DEPLOYMENT_PIPELINE.md](./DEPLOYMENT_PIPELINE.md) - Vollständige Pipeline-Dokumentation
- [QUICK_START_TESTS.md](./QUICK_START_TESTS.md) - Quick Start für Tests
- [tests/README.md](./tests/README.md) - Test-Dokumentation


