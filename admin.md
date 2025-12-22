# Administrationsdokumentation: AI Cover Letter Architect

## Übersicht

Diese Dokumentation beschreibt alle Administrationsmöglichkeiten für die Verwaltung der Anschreiben-App. Die Admin-Funktionen ermöglichen es, Prompts, Konfigurationen, Daten und Systemeinstellungen zu verwalten.

## Admin-Bereiche

### 1. Prompt-Verwaltung

#### 1.1 Extraktions-Prompt (`/prompts/extract.ts`)

**Zweck:** Analysiert Jobbeschreibungen und extrahiert strukturierte Informationen.

**Verwaltbare Parameter:**
- Prompt-Text (vollständig anpassbar)
- JSON-Schema für Extraktionsergebnisse
- Anweisungen zur Kontaktpersonen-Extraktion

**Aktuelle Struktur:**
- Extrahiert: Key Requirements, Unternehmenskultur, Hard Skills, Kontaktpersonen
- Ausgabeformat: JSON mit definiertem Schema

**Anpassungsmöglichkeiten:**
- Erweiterung der Extraktionsfelder
- Anpassung der Analyse-Tiefe
- Modifikation der JSON-Struktur

#### 1.2 Matching-Prompt (`/prompts/match.ts`)

**Zweck:** Vergleicht Jobbeschreibung mit Nutzerprofil (CV + historische Anschreiben).

**Verwaltbare Parameter:**
- Prompt-Text
- Analyse-Kategorien (Passung, Stärken, Lücken, Empfehlungen)
- Gewichtung von CV vs. historischen Anschreiben

**Aktuelle Struktur:**
- Nutzt: Jobbeschreibung, Lebenslauf, historische Anschreiben
- Analysiert: Passung, Stärken, Lücken, Empfehlungen

**Anpassungsmöglichkeiten:**
- Zusätzliche Analyse-Kategorien
- Gewichtung verschiedener Datenquellen
- Format der Ausgabe (strukturiert vs. frei)

#### 1.3 Generierungs-Prompt (`/prompts/generate.ts`)

**Zweck:** Generiert das finale Anschreiben basierend auf allen gesammelten Daten.

**Verwaltbare Parameter:**
- Prompt-Text
- Anschreiben-Länge (aktuell: 300-400 Wörter)
- Struktur-Anforderungen
- Tonalitäts- und Fokus-Integration

**Aktuelle Struktur:**
- Nutzt: Matching-Ergebnis, Lebenslauf, Tonalitäts-Analyse, Parameter (Tonalität, Fokus), Jobbeschreibung
- Anforderungen: Professionell, überzeugend, zugeschnitten, angemessene Länge

**Anpassungsmöglichkeiten:**
- Längen-Limits (min/max Wörter)
- Struktur-Vorgaben (Absätze, Formatierung)
- Zusätzliche Qualitätskriterien
- Integration weiterer Parameter

#### 1.4 Tonalitäts-Analyse-Prompt (`/prompts/tone-analysis.ts`)

**Zweck:** Analysiert den Schreibstil aus historischen Anschreiben.

**Verwaltbare Parameter:**
- Prompt-Text
- Analyse-Aspekte (Tonalität, Struktur, Sprachstil, Stärken)
- Ausgabeformat (kurz/prägnant vs. detailliert)

**Aktuelle Struktur:**
- Analysiert: Tonalität, Struktur, Sprachstil, Stärken
- Ausgabe: Kurze, prägnante Analyse

**Anpassungsmöglichkeiten:**
- Erweiterte Analyse-Dimensionen
- Detaillierungsgrad
- Format der Ausgabe

### 2. KI-Modell-Konfiguration

#### 2.1 Modell-Auswahl

**Aktuelle Einstellung:**
- Modell: `google('gemini-1.5-pro')`
- Definiert in: `/app/api/extract/route.ts`, `/app/api/match/route.ts`, `/app/api/generate/route.ts`

**Verwaltbare Parameter:**
- Modell-Typ (gemini-1.5-pro, gemini-1.5-flash, etc.)
- Modell-Version
- API-Endpoint (falls anpassbar)

**Anpassungsmöglichkeiten:**
- Wechsel zu anderen Modellen (z.B. GPT-4, Claude)
- Modell-spezifische Optimierungen
- Fallback-Modelle bei Fehlern

#### 2.2 Temperature-Parameter

**Aktuelle Einstellungen:**
- Extraktion: `0.3` (präzise, deterministisch)
- Matching: `0.5` (ausgewogen)
- Generierung: `0.7` (kreativ, variabel)
- Tonalitäts-Analyse: `0.3` (präzise)

**Verwaltbare Parameter:**
- Temperature-Wert pro Endpunkt (0.0 - 2.0)
- Anpassung basierend auf Anwendungsfall

**Anpassungsmöglichkeiten:**
- Feinabstimmung für bessere Ergebnisse
- Dynamische Anpassung basierend auf Input
- A/B-Testing verschiedener Werte

#### 2.3 Token-Limits

**Aktuelle Einstellung:**
- Nicht explizit gesetzt (verwendet Modell-Defaults)

**Verwaltbare Parameter:**
- Max Tokens (maximale Ausgabe-Länge)
- Max Input Tokens (maximale Eingabe-Länge)

**Anpassungsmöglichkeiten:**
- Setzen von Limits für Kostenkontrolle
- Anpassung für sehr lange CVs/Jobbeschreibungen
- Truncation-Strategien

#### 2.4 Weitere Modell-Parameter

**Verwaltbare Parameter:**
- Top P (Nucleus Sampling)
- Top K (Top-K Sampling)
- Frequency Penalty
- Presence Penalty
- Stop Sequences

### 3. Lebenslauf-Verwaltung

#### 3.1 CV-Inhalt

**Speicherort:** Datenbank-Tabelle `resume`

**Verwaltbare Aspekte:**
- CV-Text (vollständiger Inhalt)
- Upload-Datum
- Letzte Aktualisierung
- Versionshistorie (falls implementiert)

**Admin-Funktionen:**
- CV anzeigen und bearbeiten
- CV-Versionen verwalten (falls Historie implementiert)
- CV exportieren/importieren
- CV-Validierung (Format, Vollständigkeit)

#### 3.2 CV-Integration in Workflows

**Aktuelle Nutzung:**
- Automatisches Laden bei Matching und Generierung
- Verwendung als Kontext für alle KI-Operationen

**Verwaltbare Parameter:**
- CV-Truncation (falls zu lang)
- CV-Vorverarbeitung (Formatierung, Bereinigung)
- CV-Segmentierung (für bessere Kontext-Nutzung)

### 4. Alte Anschreiben-Verwaltung

#### 4.1 Anschreiben-Datenbank

**Speicherort:** Datenbank-Tabelle `old_cover_letters`

**Verwaltbare Aspekte:**
- Anschreiben-Inhalt
- Metadaten: Firma, Position, Upload-Datum
- Anzahl der gespeicherten Anschreiben

**Admin-Funktionen:**
- Alle Anschreiben anzeigen
- Einzelnes Anschreiben bearbeiten
- Anschreiben löschen
- Metadaten aktualisieren (Firma, Position)
- Anschreiben exportieren/importieren
- Bulk-Operationen (Massenlöschung, -bearbeitung)

#### 4.2 Tonalitäts-Analyse

**Verwaltbare Parameter:**
- Anzahl der zu analysierenden Anschreiben (aktuell: alle)
- Gewichtung neuerer vs. älterer Anschreiben
- Mindestanzahl für Analyse (aktuell: 1)

**Anpassungsmöglichkeiten:**
- Zeitbasierte Filterung (nur Anschreiben der letzten X Monate)
- Relevanz-basierte Auswahl
- Manuelle Auswahl für Analyse

### 5. Anschreiben-Generierung

#### 5.1 Tonalitäts-Optionen

**Aktuelle Optionen:**
- `professionell` (formell, sachlich)
- `modern` (zeitgemäß, freundlich)
- `enthusiastisch` (energiegeladen, motiviert)

**Verwaltbare Parameter:**
- Verfügbare Tonalitäts-Optionen
- Beschreibungen pro Option
- Standard-Tonalität (aktuell: 'professionell')

**Anpassungsmöglichkeiten:**
- Neue Tonalitäts-Optionen hinzufügen
- Anpassung der Tonalitäts-Beschreibungen
- Kombination mehrerer Tonalitäten

#### 5.2 Fokus-Optionen

**Aktuelle Optionen:**
- `skills` (Fähigkeiten und Kompetenzen)
- `motivation` (Motivation und Interesse)
- `erfahrung` (Erfahrungen und Erfolge)

**Verwaltbare Parameter:**
- Verfügbare Fokus-Optionen
- Beschreibungen pro Option
- Standard-Fokus (aktuell: 'skills')

**Anpassungsmöglichkeiten:**
- Neue Fokus-Optionen hinzufügen
- Anpassung der Fokus-Beschreibungen
- Kombination mehrerer Fokuspunkte

#### 5.3 Anschreiben-Länge

**Aktuelle Einstellung:**
- Ziel: 300-400 Wörter (im Prompt definiert)

**Verwaltbare Parameter:**
- Minimale Länge (Wörter)
- Maximale Länge (Wörter)
- Präferierte Länge (Wörter)

**Anpassungsmöglichkeiten:**
- Anpassung der Längen-Limits
- Längen-basierte Validierung
- Dynamische Anpassung basierend auf Position/Industrie

### 6. Bewerbungs-Dashboard

#### 6.1 Status-Management

**Aktuelle Status-Optionen:**
- `rueckmeldung_ausstehend` (Standard)
- `gesendet`
- `in_bearbeitung`
- `abgelehnt`
- `angenommen`

**Verwaltbare Parameter:**
- Verfügbare Status-Optionen
- Status-Farben/Badges
- Status-Übergänge (welche Status sind erlaubt)
- Standard-Status

**Anpassungsmöglichkeiten:**
- Neue Status hinzufügen
- Status-Hierarchie definieren
- Automatische Status-Übergänge

#### 6.2 Dashboard-Filter und Sortierung

**Verwaltbare Parameter:**
- Verfügbare Filter-Optionen
- Standard-Sortierung
- Anzeige-Optionen (Tabelle, Karten, Liste)

**Anpassungsmöglichkeiten:**
- Neue Filter hinzufügen
- Sortier-Optionen erweitern
- Persistente Filter-Präferenzen

### 7. Datenbank-Verwaltung

#### 7.1 Datenbank-Konfiguration

**Aktuelle Einstellung:**
- Datenbank: SQLite
- Pfad: `/data/anschreiben.db`
- Client: `better-sqlite3`

**Verwaltbare Parameter:**
- Datenbank-Pfad
- Backup-Strategie
- Datenbank-Optimierungen (VACUUM, ANALYZE)

**Admin-Funktionen:**
- Datenbank-Backup erstellen
- Datenbank wiederherstellen
- Datenbank-Optimierung
- Datenbank-Statistiken anzeigen
- Tabellen-Größen anzeigen

#### 7.2 Daten-Export/Import

**Export-Funktionen:**
- Alle Bewerbungen als JSON/CSV
- Lebenslauf exportieren
- Alte Anschreiben exportieren
- Vollständiger Datenbank-Export

**Import-Funktionen:**
- Bewerbungen importieren
- Lebenslauf importieren
- Alte Anschreiben importieren
- Datenbank-Import (mit Validierung)

#### 7.3 Datenbereinigung

**Verwaltbare Operationen:**
- Alte Bewerbungen löschen (älter als X Tage)
- Duplikate identifizieren und entfernen
- Ungültige Einträge bereinigen
- Datenbank-Integrität prüfen

### 8. System-Einstellungen

#### 8.1 API-Konfiguration

**Verwaltbare Parameter:**
- Google Gemini API-Key (Environment Variable)
- API-Endpoint (falls anpassbar)
- Request-Timeout
- Retry-Strategie

**Sicherheit:**
- API-Key Rotation
- Rate-Limiting
- Error-Handling

#### 8.2 Logging und Monitoring

**Verwaltbare Parameter:**
- Log-Level (DEBUG, INFO, WARN, ERROR)
- Log-Format
- Log-Retention
- Error-Tracking

**Admin-Funktionen:**
- Logs anzeigen
- Logs exportieren
- Error-Reports generieren
- Performance-Metriken anzeigen

#### 8.3 Performance-Einstellungen

**Verwaltbare Parameter:**
- Cache-Strategien
- Request-Batching
- Parallel-Processing
- Timeout-Werte

### 9. UI/UX-Einstellungen

#### 9.1 Standardwerte

**Verwaltbare Parameter:**
- Standard-Tonalität
- Standard-Fokus
- Standard-Status für neue Bewerbungen
- UI-Theme (falls implementiert)

#### 9.2 Validierungen

**Verwaltbare Parameter:**
- Jobbeschreibung-Minimum-Länge
- CV-Minimum-Länge
- Anschreiben-Validierungsregeln
- Kontaktpersonen-Validierung

## Implementierungsvorschlag

### Admin-Interface-Struktur

```
/app
  /admin
    page.tsx                    # Admin-Dashboard (Übersicht)
    /prompts
      page.tsx                  # Prompt-Verwaltung
      /[promptName]
        page.tsx                # Einzelner Prompt bearbeiten
    /settings
      page.tsx                  # System-Einstellungen
      /ai
        page.tsx                # KI-Modell-Konfiguration
      /database
        page.tsx                # Datenbank-Verwaltung
    /data
      page.tsx                  # Daten-Verwaltung (CV, Anschreiben)
      /resume
        page.tsx                # CV-Verwaltung
      /cover-letters
        page.tsx                # Alte Anschreiben-Verwaltung
    /applications
      page.tsx                  # Erweiterte Bewerbungs-Verwaltung
```

### API-Endpunkte für Admin

```
GET    /api/admin/settings           # Alle Einstellungen abrufen
POST   /api/admin/settings           # Einstellungen aktualisieren
GET    /api/admin/prompts            # Alle Prompts abrufen
GET    /api/admin/prompts/[name]     # Einzelnen Prompt abrufen
POST   /api/admin/prompts/[name]     # Prompt aktualisieren
GET    /api/admin/database/stats     # Datenbank-Statistiken
POST   /api/admin/database/backup    # Backup erstellen
POST   /api/admin/database/restore   # Backup wiederherstellen
POST   /api/admin/database/optimize  # Datenbank optimieren
GET    /api/admin/logs               # Logs abrufen
POST   /api/admin/data/export        # Daten exportieren
POST   /api/admin/data/import        # Daten importieren
```

### Datenbank-Erweiterungen

**Neue Tabelle: `settings`**
```sql
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  category TEXT,
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Neue Tabelle: `prompt_versions`** (optional, für Versionshistorie)
```sql
CREATE TABLE IF NOT EXISTS prompt_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prompt_name TEXT NOT NULL,
  content TEXT NOT NULL,
  version INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT
);
```

**Neue Tabelle: `resume_versions`** (optional, für CV-Historie)
```sql
CREATE TABLE IF NOT EXISTS resume_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  resume_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (resume_id) REFERENCES resume(id)
);
```

## Sicherheitsüberlegungen

### Zugriffskontrolle

- Admin-Bereich sollte durch Authentifizierung geschützt sein
- Rollenbasierte Zugriffsrechte (falls Multi-User)
- Audit-Log für alle Admin-Operationen

### Datenvalidierung

- Validierung aller Admin-Eingaben
- Sanitization von Prompt-Änderungen
- Backup vor kritischen Operationen

### API-Sicherheit

- Rate-Limiting für Admin-APIs
- CSRF-Schutz
- Input-Validierung
- SQL-Injection-Prävention (bereits durch better-sqlite3 Parameterisierung)

## Wartung und Best Practices

### Regelmäßige Aufgaben

1. **Datenbank-Backup:** Täglich/Wöchentlich
2. **Datenbank-Optimierung:** Monatlich
3. **Prompt-Review:** Bei Änderungen der Anforderungen
4. **Log-Review:** Wöchentlich auf Fehler prüfen
5. **Performance-Monitoring:** Kontinuierlich

### Dokumentation

- Alle Prompt-Änderungen dokumentieren
- Einstellungsänderungen protokollieren
- Versionshistorie für Prompts führen

### Testing

- Testen von Prompt-Änderungen vor Produktion
- Validierung von Datenbank-Operationen
- Backup/Restore-Prozeduren testen

## Migration und Updates

### Prompt-Updates

1. Backup der aktuellen Prompts
2. Testen der neuen Prompts in isolierter Umgebung
3. Schrittweise Rollout
4. Monitoring der Ergebnisse

### Datenbank-Migrationen

1. Backup vor Migration
2. Testen der Migration auf Kopie
3. Durchführung der Migration
4. Validierung der Datenintegrität

## Troubleshooting

### Häufige Probleme

1. **KI-Antworten sind unzureichend:**
   - Temperature-Parameter anpassen
   - Prompt präzisieren
   - Modell wechseln

2. **Datenbank-Performance:**
   - VACUUM ausführen
   - Indizes prüfen
   - Alte Daten archivieren

3. **API-Fehler:**
   - API-Key prüfen
   - Rate-Limits überprüfen
   - Logs analysieren

## Zukünftige Erweiterungen

### Mögliche Features

- A/B-Testing für Prompts
- Automatische Prompt-Optimierung
- Multi-Modell-Support
- Erweiterte Analytics
- Benutzer-Feedback-Integration
- Template-System für Anschreiben
- Automatische Qualitätsbewertung
