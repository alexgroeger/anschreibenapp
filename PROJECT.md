# Projekt-Dokumentation: AI Cover Letter Architect

## Projektziel
Eine Web-App, die Bewerbungsschreiben basierend auf Jobanzeigen (URL/Datei) und dem Nutzer-Lebenslauf mittels KI erstellt. Die App ermöglicht es Nutzern, ihren Lebenslauf einmalig zu hinterlegen, historische Anschreiben hochzuladen, und alle Bewerbungen in einem Dashboard zu verwalten.

## Architektur & Tech-Stack
- **Frontend/Backend:** Next.js (App Router)
- **Styling:** Tailwind CSS + Shadcn UI (für schnelle UI-Komponenten)
- **API:** Next.js Route Handlers (API-First-Ansatz)
- **KI-Integration:** Vercel AI SDK mit Google Gemini 1.5 Pro
- **Datenbank:** SQLite mit better-sqlite3 (Single-User-App)
- **Deployment:** Docker-Container (Node.js Umgebung)

### Dependency-Management Richtlinie
**Wichtig:** Es dürfen nur aktuelle und unterstützte Frameworks und Bibliotheken verwendet werden. 
- Regelmäßige Überprüfung der Dependencies auf Aktualität (mindestens monatlich)
- Sicherheits-Updates müssen sofort eingespielt werden
- Major Version Updates erfordern einen Migrationsplan und umfassende Tests
- Vor jedem Update: Backup erstellen und in separatem Branch testen

## Kernfunktionen

### 1. CV-Verwaltung (Einmalig)
- Persistente Speicherung des Lebenslaufs in der Datenbank
- Automatische Verwendung bei jedem Matching- und Generierungsvorgang
- Upload-Komponente auf separater Route `/resume`
- CV kann jederzeit aktualisiert werden

### 2. Alte Anschreiben Upload
- Upload mehrerer historischer Anschreiben
- Automatische Tonalitätsanalyse für bessere Generierung
- Integration in den Generierungs-Workflow
- Verwaltung und Löschung alter Anschreiben

### 3. Erweiterte Extraktion
- Automatische Erkennung und Speicherung von Kontaktpersonen
- Strukturierte Extraktion von Key Requirements, Unternehmenskultur und Hard Skills
- Anzeige der Extraktionsdaten in der UI

### 4. Bewerbungs-Dashboard
- Übersicht aller Bewerbungen mit:
  - Unternehmen, Position, Versanddatum, Status
  - Extraktionsdaten und Kontaktpersonen
  - Filter- und Sortierfunktionen
- Status-Management (Gesendet, In Bearbeitung, Abgelehnt, Angenommen, Rückmeldung ausstehend)
- Detailansicht pro Bewerbung
- Speicherung von generierten Anschreiben

## Workflow & Logik

### Erweiterter Workflow

1. **CV-Upload (Einmalig):**
   - Nutzer lädt Lebenslauf auf `/resume` hoch
   - CV wird in Datenbank gespeichert
   - Wird automatisch bei jedem Matching/Generation verwendet

2. **Alte Anschreiben (Optional):**
   - Nutzer kann historische Anschreiben auf `/cover-letters` hochladen
   - Werden für Tonalitätsanalyse verwendet

3. **Ingestion:**
   - Input: Job-URL oder Text-Paste
   - CV wird automatisch aus Datenbank geladen

4. **Extraktion:**
   - KI analysiert die Jobbeschreibung auf:
     - Key-Requirements
     - Unternehmenskultur
     - Hard Skills
     - Kontaktpersonen (Name, Email, Telefon, Position)
   - Extraktionsdaten werden strukturiert gespeichert

5. **Matching (Erweitert):**
   - Vergleich der Job-Anforderungen mit:
     - Lebenslauf des Nutzers (aus DB)
     - Historischen Anschreiben (aus DB) - für Kontext über Erfahrungen
   - Bessere Personalisierung basierend auf historischen Daten

6. **Generation (Iterativer Editor):**
   - Parameter: Tonalität (Professionell, Modern, Enthusiastisch), Fokus (Skills, Motivation, Erfahrung)
   - Tonalitäts-Analyse aus historischen Anschreiben wird als Basis verwendet
   - Parameter modifizieren die Basis-Tonalität
   - Live-Edit: Der Nutzer kann Parameter ändern und das Anschreiben neu generieren lassen

7. **Speicherung:**
   - Generiertes Anschreiben kann im Dashboard gespeichert werden
   - Alle relevanten Daten (Jobbeschreibung, Extraktion, Kontaktpersonen, Anschreiben) werden gespeichert

8. **Dashboard:**
   - Übersicht aller Bewerbungen
   - Status-Verwaltung
   - Detailansicht mit allen Informationen

## Datenbank-Schema

### SQLite Datenbank

**Tabelle: `resume`**
- `id` (INTEGER PRIMARY KEY)
- `content` (TEXT) - Lebenslauf-Inhalt
- `uploaded_at` (DATETIME)
- `updated_at` (DATETIME)

**Tabelle: `old_cover_letters`**
- `id` (INTEGER PRIMARY KEY)
- `content` (TEXT) - Anschreiben-Text
- `company` (TEXT, optional)
- `position` (TEXT, optional)
- `uploaded_at` (DATETIME)

**Tabelle: `applications`**
- `id` (INTEGER PRIMARY KEY)
- `company` (TEXT)
- `position` (TEXT)
- `job_description` (TEXT) - Original Jobbeschreibung
- `extraction_data` (TEXT/JSON) - Extraktionsergebnis (Key-Requirements, Kultur, Skills)
- `cover_letter` (TEXT) - Generiertes Anschreiben
- `status` (TEXT) - 'gesendet', 'in_bearbeitung', 'abgelehnt', 'angenommen', 'rueckmeldung_ausstehend'
- `sent_at` (DATETIME, optional)
- `created_at` (DATETIME)
- `updated_at` (DATETIME)

**Tabelle: `contact_persons`**
- `id` (INTEGER PRIMARY KEY)
- `application_id` (INTEGER, FOREIGN KEY zu applications)
- `name` (TEXT)
- `email` (TEXT, optional)
- `phone` (TEXT, optional)
- `position` (TEXT, optional)
- `created_at` (DATETIME)

## Dateistruktur

```
/app
  /api
    /resume
      route.ts              # GET (CV abrufen), POST (CV hochladen/aktualisieren)
    /old-cover-letters
      route.ts              # GET (alle abrufen), POST (neues Anschreiben hochladen)
      /[id]
        route.ts            # DELETE (Anschreiben löschen)
    /extract
      route.ts              # Job-Extraktion (erweitert um Kontaktpersonen-Erkennung)
    /match
      route.ts              # Matching (nutzt CV + alte Anschreiben aus DB)
    /generate
      route.ts              # Anschreiben-Generierung (nutzt CV + alte Anschreiben für Tonalität)
    /applications
      route.ts              # GET (alle), POST (neue Bewerbung)
      /[id]
        route.ts            # GET, PATCH (Status aktualisieren), DELETE
    /contact-persons
      route.ts              # POST (neue Kontaktperson), GET (nach application_id)
  /resume
    page.tsx                # CV-Verwaltungsseite
  /cover-letters
    page.tsx                # Alte Anschreiben-Verwaltungsseite
  /dashboard
    page.tsx                # Bewerbungs-Dashboard
    /[id]
      page.tsx              # Detailansicht einer Bewerbung
  page.tsx                  # Hauptseite (Anschreiben-Generierung)
  layout.tsx                # Root Layout mit Navigation
/components
  /resume
    ResumeUpload.tsx        # CV-Upload-Komponente
  /cover-letters
    OldCoverLetterUpload.tsx # Upload alter Anschreiben
    OldCoverLetterList.tsx   # Liste alter Anschreiben
  /applications
    ApplicationDashboard.tsx # Haupt-Dashboard
    ApplicationCard.tsx      # Einzelne Bewerbung
    ApplicationDetail.tsx    # Detailansicht einer Bewerbung
  /ui                        # Shadcn UI Komponenten
  Navigation.tsx             # Navigation-Komponente
/lib
  /database
    init.ts                  # Datenbank-Initialisierung
    client.ts               # Datenbank-Client
  utils.ts                  # Hilfsfunktionen
/prompts
  extract.ts                 # Prompt für Extraktion
  match.ts                   # Prompt für Matching (erweitert um CV + alte Anschreiben)
  generate.ts                # Prompt für Generierung (erweitert um Tonalitäts-Analyse)
  tone-analysis.ts           # Prompt für Tonalitäts-Analyse
/data
  anschreiben.db             # SQLite Datenbank (wird automatisch erstellt)
```

## API-Endpunkte

### CV-Management
- `GET /api/resume` - CV abrufen
- `POST /api/resume` - CV hochladen/aktualisieren

### Alte Anschreiben
- `GET /api/old-cover-letters` - Alle alten Anschreiben abrufen
- `POST /api/old-cover-letters` - Neues Anschreiben hochladen
- `DELETE /api/old-cover-letters/[id]` - Anschreiben löschen

### Extraktion
- `POST /api/extract` - Job extrahieren (gibt auch Kontaktpersonen zurück)

### Matching
- `POST /api/match` - Matching durchführen (nutzt CV + alte Anschreiben aus DB)

### Generierung
- `POST /api/generate` - Anschreiben generieren (nutzt CV + alte Anschreiben für Tonalität)

### Bewerbungen
- `GET /api/applications` - Alle Bewerbungen abrufen (mit Filter/Query-Params)
- `POST /api/applications` - Neue Bewerbung erstellen
- `GET /api/applications/[id]` - Einzelne Bewerbung abrufen
- `PATCH /api/applications/[id]` - Status/Details aktualisieren
- `DELETE /api/applications/[id]` - Bewerbung löschen

### Kontaktpersonen
- `GET /api/contact-persons?application_id=[id]` - Kontaktpersonen für Bewerbung
- `POST /api/contact-persons` - Neue Kontaktperson hinzufügen

## UI-Navigation

**Routes:**
- `/` - Hauptseite (Anschreiben-Generierung)
- `/resume` - CV-Verwaltung
- `/cover-letters` - Alte Anschreiben-Verwaltung
- `/dashboard` - Bewerbungs-Dashboard
- `/dashboard/[id]` - Detailansicht einer Bewerbung

**Navigation:**
- Header mit Navigation zu allen Bereichen
- Aktive Route-Hervorhebung

## Datenfluss

### Matching mit CV und alten Anschreiben
1. User gibt Job-URL/Text ein
2. Frontend ruft `/api/extract` auf
3. Backend extrahiert Job-Daten + Kontaktpersonen
4. Frontend ruft `/api/match` auf
5. Backend lädt CV aus DB
6. Backend lädt alle alten Anschreiben aus DB
7. Backend führt Matching durch (Job + CV + Kontext aus alten Anschreiben)
8. Ergebnis wird zurückgegeben

### Generierung mit Tonalitäts-Analyse
1. User wählt Parameter (Tonalität, Fokus)
2. Frontend ruft `/api/generate` auf
3. Backend lädt CV aus DB
4. Backend lädt alle alten Anschreiben aus DB
5. Backend analysiert Tonalität aus alten Anschreiben (KI)
6. Backend generiert Anschreiben (Basis-Tonalität + Parameter)
7. Anschreiben wird zurückgegeben
8. User kann Anschreiben speichern → Neue Bewerbung in DB

### Dashboard-Datenfluss
1. User öffnet Dashboard
2. Frontend ruft `/api/applications` auf
3. Backend lädt alle Bewerbungen aus DB
4. Für jede Bewerbung: Kontaktpersonen werden geladen
5. Daten werden aggregiert und angezeigt
6. User kann Status ändern → `PATCH /api/applications/[id]`

## Dependencies

- `better-sqlite3` - SQLite Datenbank
- `pdf-parse` - PDF-Parsing (für zukünftige PDF-Upload-Funktionalität)
- `date-fns` - Datums-Formatierung
- `@ai-sdk/google` - Google Gemini Integration
- `ai` - Vercel AI SDK
- Shadcn UI Komponenten

## Migrationsplan

Der detaillierte Migrationsplan für Framework- und Bibliotheks-Updates ist in der separaten Datei [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) dokumentiert.

**Aktueller Status:** Phase 1 (Kritische Sicherheits-Updates) ausstehend
