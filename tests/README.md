# Test-Dokumentation

Diese Dokumentation beschreibt die automatisierten Tests für die Anschreiben Muckibude.

## Test-Struktur

```
tests/
├── e2e/              # End-to-End Tests (Pre-Deployment)
│   ├── homepage.spec.ts
│   ├── api-health.spec.ts
│   ├── extraction.spec.ts
│   ├── application-flow.spec.ts
│   └── dashboard.spec.ts
├── smoke/            # Smoke Tests (Post-Deployment)
│   └── post-deploy.spec.ts
└── fixtures/         # Test-Daten
    └── job-descriptions.json
```

## Test-Ausführung

### Lokal

```bash
# Alle E2E Tests
npm run test:e2e

# Tests mit UI
npm run test:e2e:ui

# Tests im headed Modus (Browser sichtbar)
npm run test:e2e:headed

# Nur Smoke Tests
npm run test:smoke
```

### In CI/CD Pipeline

Tests werden automatisch in der Cloud Build Pipeline ausgeführt:
- **Pre-Deployment**: E2E Tests gegen aktuelle Production
- **Post-Deployment**: Smoke Tests gegen neue Version

## Test-Konfiguration

### Umgebungsvariablen

- `TEST_BASE_URL`: URL der zu testenden Umgebung
  - Standard: `https://anschreiben-app-411832844870.europe-west1.run.app`
  - Lokal: `http://localhost:3000`
- `CI`: Aktiviert CI-Modus (Headless, Retries)

### Playwright-Konfiguration

Siehe `playwright.config.ts` für:
- Timeout-Einstellungen
- Browser-Konfiguration
- Reporter-Einstellungen

## Test-Isolation

**Wichtig**: Alle Tests sind **read-only** und erstellen keine echten Daten in Production:

- ✅ Lesen von Daten (GET-Requests)
- ✅ UI-Struktur-Tests
- ✅ API-Verfügbarkeit-Tests
- ❌ Keine POST/PUT/DELETE-Operationen
- ❌ Keine Daten-Erstellung/Löschung

## Test-Suites

### E2E Tests

#### homepage.spec.ts
- Homepage lädt korrekt
- Navigation funktioniert
- Keine kritischen Console-Errors

#### api-health.spec.ts
- API-Endpunkte sind erreichbar
- Korrekte HTTP-Status-Codes
- API-Struktur ist korrekt

#### extraction.spec.ts
- Job-Extraktion-UI ist vorhanden
- Text-Input funktioniert
- File-Upload-Komponente existiert
- API-Endpunkt ist erreichbar

#### application-flow.spec.ts
- Workflow-UI ist vorhanden
- Schritt-Indikatoren werden angezeigt
- Navigation zwischen Schritten funktioniert

#### dashboard.spec.ts
- Dashboard lädt korrekt
- API-Endpunkte sind erreichbar
- Dashboard-Struktur ist vorhanden

### Smoke Tests

#### post-deploy.spec.ts
- Homepage lädt nach Deployment
- Kritische API-Endpunkte sind erreichbar
- Keine kritischen Console-Errors

## Test-Daten

Test-Daten befinden sich in `tests/fixtures/`:

- `job-descriptions.json`: Beispiel-Job-Beschreibungen für Tests

## Troubleshooting

### Tests schlagen fehl wegen Timeout

Erhöhen Sie den Timeout in `playwright.config.ts`:

```typescript
timeout: 60000, // 60 Sekunden
```

### Tests schlagen fehl wegen Netzwerk

- Prüfen Sie die Verbindung zur Test-URL
- Prüfen Sie Firewall-Einstellungen
- Prüfen Sie, ob die App erreichbar ist

### Tests schlagen fehl wegen fehlender Elemente

- UI-Struktur könnte sich geändert haben
- Selektoren müssen möglicherweise aktualisiert werden
- Prüfen Sie die aktuelle UI-Struktur

## Best Practices

1. **Tests regelmäßig aktualisieren** bei neuen Features
2. **Selektoren robust gestalten** (data-testid verwenden)
3. **Tests isoliert halten** (keine Abhängigkeiten zwischen Tests)
4. **Klare Fehlermeldungen** für besseres Debugging

## Erweiterte Tests

Für vollständige Funktionalitätstests mit echten Daten:
- Separate Staging-Umgebung einrichten
- Test-Datenbank verwenden
- Cleanup-Mechanismus implementieren

