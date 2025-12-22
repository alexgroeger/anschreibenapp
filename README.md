# AI Cover Letter Architect

Eine Web-App, die Bewerbungsschreiben basierend auf Jobanzeigen (URL/Datei) und dem Nutzer-Lebenslauf mittels KI erstellt. Die App ermöglicht es Nutzern, ihren Lebenslauf einmalig zu hinterlegen, historische Anschreiben hochzuladen, und alle Bewerbungen in einem Dashboard zu verwalten.

## Features

### Kernfunktionen

- **CV-Verwaltung**: Einmaliges Hochladen des Lebenslaufs, automatische Verwendung bei jedem Matching
- **Alte Anschreiben**: Upload historischer Anschreiben zur Tonalitätsanalyse
- **Intelligente Extraktion**: Automatische Erkennung von Key Requirements, Unternehmenskultur, Hard Skills und Kontaktpersonen
- **Erweitertes Matching**: Vergleich von Job-Anforderungen mit CV und historischen Anschreiben
- **KI-Generierung**: Erstellung personalisierter Anschreiben basierend auf analysierter Tonalität
- **Bewerbungs-Dashboard**: Übersicht aller Bewerbungen mit Status-Management
- **Admin-Panel**: Verwaltung von Einstellungen, Prompts und Datenbank

## Tech-Stack

- **Frontend/Backend:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS + Shadcn UI
- **API:** Next.js Route Handlers
- **KI-Integration:** Vercel AI SDK mit Google Gemini
- **Datenbank:** SQLite mit better-sqlite3
- **Deployment:** Docker-Container (geplant)

## Getting Started

### Voraussetzungen

- Node.js 18+ 
- npm oder yarn
- Google Gemini API-Key ([Hier erstellen](https://aistudio.google.com/app/apikey))

### Installation

1. **Repository klonen**
   ```bash
   git clone https://github.com/alexgroeger/anschreibenapp.git
   cd anschreibenapp
   ```

2. **Dependencies installieren**
   ```bash
   npm install
   ```

3. **Environment-Variablen konfigurieren**

   Erstelle eine `.env.local` Datei im Root-Verzeichnis:
   ```bash
   # Google Gemini API Key
   GOOGLE_GENERATIVE_AI_API_KEY=dein-api-key-hier
   ```

   **Wichtig:** Der Variablenname muss exakt `GOOGLE_GENERATIVE_AI_API_KEY` sein (nicht `GENERATION`).

4. **Development-Server starten**
   ```bash
   npm run dev
   ```

5. **App öffnen**
   
   Öffne [http://localhost:3000](http://localhost:3000) im Browser.

### Erste Schritte

1. **Lebenslauf hochladen** (`/resume`)
   - Gehe zu "Lebenslauf" in der Navigation
   - Füge deinen Lebenslauf ein und speichere ihn
   - Dieser wird automatisch bei jedem Matching verwendet

2. **Alte Anschreiben hochladen** (`/cover-letters`) - Optional
   - Lade historische Anschreiben hoch
   - Diese werden für die Tonalitätsanalyse verwendet

3. **Anschreiben erstellen** (`/`)
   - Gib eine Jobbeschreibung ein (Text oder URL)
   - Klicke auf "Job analysieren"
   - Führe ein Matching durch
   - Generiere das Anschreiben
   - Speichere es im Dashboard

4. **Dashboard** (`/dashboard`)
   - Verwalte alle deine Bewerbungen
   - Aktualisiere Status, sieh Details an
   - Filtere nach Status

## Projektstruktur

```
/app
  /api              # API-Endpunkte
    /resume         # CV-Verwaltung
    /old-cover-letters  # Alte Anschreiben
    /extract        # Job-Extraktion
    /match          # Matching
    /generate       # Anschreiben-Generierung
    /applications   # Bewerbungs-Management
    /admin          # Admin-Funktionen
  /resume           # CV-Verwaltungsseite
  /cover-letters    # Alte Anschreiben-Verwaltung
  /dashboard        # Bewerbungs-Dashboard
  /admin            # Admin-Panel
/components         # React-Komponenten
/lib
  /database         # Datenbank-Client und Initialisierung
/prompts            # KI-Prompts
/data               # SQLite Datenbank (wird automatisch erstellt)
```

## API-Endpunkte

### CV-Management
- `GET /api/resume` - CV abrufen
- `POST /api/resume` - CV hochladen/aktualisieren

### Alte Anschreiben
- `GET /api/old-cover-letters` - Alle abrufen
- `POST /api/old-cover-letters` - Neues hochladen
- `DELETE /api/old-cover-letters/[id]` - Löschen

### Job-Verarbeitung
- `POST /api/extract` - Job extrahieren
- `POST /api/match` - Matching durchführen
- `POST /api/generate` - Anschreiben generieren

### Bewerbungen
- `GET /api/applications` - Alle abrufen (mit Filter)
- `POST /api/applications` - Neue erstellen
- `GET /api/applications/[id]` - Einzelne abrufen
- `PATCH /api/applications/[id]` - Aktualisieren
- `DELETE /api/applications/[id]` - Löschen

## Datenbank

Die App verwendet SQLite für die lokale Datenspeicherung. Die Datenbank wird automatisch beim ersten Start in `/data/anschreiben.db` erstellt.

**Tabellen:**
- `resume` - Lebenslauf
- `old_cover_letters` - Historische Anschreiben
- `applications` - Bewerbungen
- `contact_persons` - Kontaktpersonen
- `settings` - System-Einstellungen
- `prompt_versions` - Prompt-Versionen

## Scripts

```bash
npm run dev      # Development-Server starten
npm run build    # Production-Build erstellen
npm run start    # Production-Server starten
npm run lint     # Code-Linting
```

## Deployment

### Vercel (empfohlen)

1. Verbinde dein GitHub-Repository mit Vercel
2. Füge die Environment-Variable `GOOGLE_GENERATIVE_AI_API_KEY` hinzu
3. Deploy!

### Docker (geplant)

```bash
docker build -t anschreiben-app .
docker run -p 3000:3000 -e GOOGLE_GENERATIVE_AI_API_KEY=your-key anschreiben-app
```

## Troubleshooting

### API-Key wird nicht erkannt
- Stelle sicher, dass die `.env.local` Datei im Root-Verzeichnis liegt
- Der Variablenname muss exakt `GOOGLE_GENERATIVE_AI_API_KEY` sein
- Starte den Development-Server neu nach Änderungen an `.env.local`

### Datenbank-Fehler
- Die Datenbank wird automatisch erstellt
- Falls Probleme auftreten, lösche `/data/anschreiben.db` und starte neu

### Modell-Fehler
- Falls Modell-Fehler auftreten, überprüfe die Einstellungen im Admin-Panel
- Standard-Modell kann dort angepasst werden

## Weitere Informationen

- Detaillierte Projekt-Dokumentation: [PROJECT.md](./PROJECT.md)
- Nächste Schritte: [NEXT_STEPS.md](./NEXT_STEPS.md)

## Lizenz

Private Projekt

## Support

Bei Fragen oder Problemen erstelle ein Issue auf GitHub.
