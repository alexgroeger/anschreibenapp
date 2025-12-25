# Quick Start: Tests ausführen

## Installation (einmalig)

```bash
# Dependencies installieren
npm install

# Playwright Browser installieren
npx playwright install --with-deps chromium
```

## Tests ausführen

### Alle E2E Tests
```bash
npm run test:e2e
```

### Tests mit UI (empfohlen für Debugging)
```bash
npm run test:e2e:ui
```

### Tests im headed Modus (Browser sichtbar)
```bash
npm run test:e2e:headed
```

### Nur Smoke Tests
```bash
npm run test:smoke
```

### Einzelne Test-Suite
```bash
npm run test:e2e -- tests/e2e/api-health.spec.ts
```

## Test-Status

✅ **API Health Tests**: Alle 6 Tests bestehen
- Health Check Endpoints
- API Endpoint Verfügbarkeit
- Extract API Struktur
- Applications API
- Resume API
- Old Cover Letters API

## Nächste Schritte

1. **Weitere Tests lokal ausführen**:
   ```bash
   npm run test:e2e
   ```

2. **Pipeline testen** (optional):
   ```bash
   gcloud builds submit --config=cloudbuild.yaml
   ```

3. **Pipeline in Cloud Console einrichten**:
   - Siehe `DEPLOYMENT_PIPELINE.md` für Details

## Troubleshooting

### Tests schlagen fehl wegen Timeout
- Erhöhen Sie `timeout` in `playwright.config.ts`

### Tests schlagen fehl wegen Netzwerk
- Prüfen Sie die Verbindung zur Production-URL
- Prüfen Sie Firewall-Einstellungen

### Playwright nicht gefunden
```bash
npm install
npx playwright install --with-deps chromium
```


