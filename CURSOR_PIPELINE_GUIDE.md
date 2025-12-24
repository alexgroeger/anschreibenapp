# Pipeline in Cursor ausführen

Diese Anleitung zeigt Ihnen, wie Sie die Deployment-Pipeline direkt in Cursor ausführen können.

## 🚀 Schnellstart

### Methode 1: Über Cursor Tasks (Empfohlen)

1. **Command Palette öffnen**:
   - **Mac**: `Cmd+Shift+P`
   - **Windows/Linux**: `Ctrl+Shift+P`

2. **"Tasks: Run Task" eingeben** und auswählen

3. **Pipeline-Task auswählen**:
   - `Pipeline: Interaktives Menü` - Zeigt alle Optionen
   - `Pipeline: Deployment auslösen` - Startet direkt das Deployment
   - `Pipeline: Tests ausführen` - Führt Tests aus
   - `Pipeline: Status prüfen` - Zeigt Pipeline-Status
   - `Pipeline: Service Status` - Zeigt Service-Status
   - `Pipeline: Logs ansehen` - Zeigt Service-Logs
   - `Pipeline: Rollback durchführen` - Führt Rollback durch

### Methode 2: Über das Terminal in Cursor

Öffnen Sie das integrierte Terminal in Cursor (`Ctrl+`` oder `Cmd+``) und führen Sie aus:

```bash
# Interaktives Menü
npm run pipeline

# Direkte Befehle
npm run pipeline:trigger     # Deployment auslösen
npm run pipeline:test        # Tests ausführen
npm run pipeline:status      # Status prüfen
npm run pipeline:service     # Service Status
npm run pipeline:logs        # Logs ansehen
npm run pipeline:rollback    # Rollback
```

### Methode 3: Über die Task-Leiste

1. Öffnen Sie die **Task-Leiste** in Cursor (View → Terminal → Run Task)
2. Wählen Sie einen Pipeline-Task aus der Liste

## 📋 Verfügbare Tasks

### Pipeline-Management

| Task | Beschreibung | npm Befehl |
|------|-------------|------------|
| **Pipeline: Interaktives Menü** | Zeigt alle Pipeline-Optionen | `npm run pipeline` |
| **Pipeline: Deployment auslösen** | Startet die vollständige Pipeline | `npm run pipeline:trigger` |
| **Pipeline: Tests ausführen** | Führt E2E Tests aus | `npm run pipeline:test` |
| **Pipeline: Status prüfen** | Zeigt letzten Pipeline-Status | `npm run pipeline:status` |
| **Pipeline: Service Status** | Zeigt Cloud Run Service-Status | `npm run pipeline:service` |
| **Pipeline: Logs ansehen** | Zeigt Service-Logs | `npm run pipeline:logs` |
| **Pipeline: Rollback** | Führt Rollback durch | `npm run pipeline:rollback` |

### Tests

| Task | Beschreibung | npm Befehl |
|------|-------------|------------|
| **Tests: Alle E2E Tests** | Führt alle E2E Tests aus | `npm run test:e2e` |
| **Tests: Mit UI** | Tests mit Playwright UI | `npm run test:e2e:ui` |
| **Tests: Smoke Tests** | Nur Smoke Tests | `npm run test:smoke` |

## 🔧 Voraussetzungen

### 1. Google Cloud SDK installiert

```bash
# Prüfen ob gcloud installiert ist
gcloud --version

# Falls nicht installiert (macOS):
brew install --cask google-cloud-sdk
```

### 2. Authentifizierung

```bash
# Bei Google Cloud einloggen
gcloud auth login

# Projekt setzen
gcloud config set project gen-lang-client-0764998759
```

### 3. API Key setzen (optional)

Der API Key kann auf verschiedene Weise bereitgestellt werden:

**Option A: Environment-Variable**
```bash
export GOOGLE_GENERATIVE_AI_API_KEY="ihr-api-key"
```

**Option B: In .env.local**
```bash
echo "GOOGLE_GENERATIVE_AI_API_KEY=ihr-api-key" >> .env.local
```

**Option C: Interaktiv beim Ausführen**
Das Pipeline-Script fragt interaktiv nach dem API Key, falls er nicht gesetzt ist.

## 📝 Workflow-Beispiele

### Vor einem Deployment

1. **Tests lokal ausführen**:
   - Task: `Tests: Alle E2E Tests`
   - Oder: `npm run test:e2e`

2. **Pipeline Status prüfen**:
   - Task: `Pipeline: Status prüfen`
   - Oder: `npm run pipeline:status`

3. **Deployment starten**:
   - Task: `Pipeline: Deployment auslösen`
   - Oder: `npm run pipeline:trigger`

### Nach einem Deployment

1. **Service Status prüfen**:
   - Task: `Pipeline: Service Status`
   - Oder: `npm run pipeline:service`

2. **Logs ansehen**:
   - Task: `Pipeline: Logs ansehen`
   - Oder: `npm run pipeline:logs`

3. **Smoke Tests ausführen**:
   - Task: `Tests: Smoke Tests`
   - Oder: `npm run test:smoke`

### Bei Problemen

1. **Logs prüfen**:
   - Task: `Pipeline: Logs ansehen`

2. **Service Status prüfen**:
   - Task: `Pipeline: Service Status`

3. **Rollback durchführen** (falls nötig):
   - Task: `Pipeline: Rollback durchführen`

## 🎯 Keyboard Shortcuts (Optional)

Sie können in Cursor Keyboard Shortcuts für häufig verwendete Tasks einrichten:

1. **Cmd+K Cmd+S** (Mac) oder **Ctrl+K Ctrl+S** (Windows/Linux)
2. Suchen Sie nach "workbench.action.tasks.runTask"
3. Fügen Sie einen Shortcut hinzu, z.B.:
   - `Cmd+Shift+D` für "Pipeline: Deployment auslösen"
   - `Cmd+Shift+T` für "Tests: Alle E2E Tests"

## 📚 Weitere Informationen

- **Vollständige Pipeline-Dokumentation**: Siehe [DEPLOYMENT_PIPELINE.md](./DEPLOYMENT_PIPELINE.md)
- **Pipeline-Management**: Siehe [PIPELINE_MANAGEMENT.md](./PIPELINE_MANAGEMENT.md)
- **Deployment-Anleitung**: Siehe [DEPLOYMENT_EXECUTE.md](./DEPLOYMENT_EXECUTE.md)

## ⚠️ Wichtige Hinweise

1. **Tests blockieren Deployment**: E2E Tests müssen erfolgreich sein, bevor das Deployment startet
2. **API Key erforderlich**: Für das Deployment wird ein Google Generative AI API Key benötigt
3. **Cloud Storage**: Der Cloud Storage Bucket wird automatisch erstellt, falls er nicht existiert
4. **Projekt-ID**: Die Pipeline verwendet automatisch `gen-lang-client-0764998759`

## 🐛 Troubleshooting

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

Das Pipeline-Script fragt interaktiv nach dem API Key. Alternativ können Sie ihn als Environment-Variable setzen.

### Task wird nicht angezeigt

1. Stellen Sie sicher, dass `.vscode/tasks.json` existiert
2. Laden Sie Cursor neu (`Cmd+R` oder `Ctrl+R`)
3. Prüfen Sie, ob die Datei korrekt formatiert ist (JSON)

