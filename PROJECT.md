# Projekt-Dokumentation: AI Cover Letter Architect

## Projektziel
Eine Web-App, die Bewerbungsschreiben basierend auf Jobanzeigen (URL/Datei) und dem Nutzer-Lebenslauf mittels KI erstellt.

## Architektur & Tech-Stack
- **Frontend/Backend:** Next.js (App Router)
- **Styling:** Tailwind CSS + Shadcn UI (für schnelle UI-Komponenten)
- **API:** Next.js Route Handlers (API-First-Ansatz)
- **KI-Integration:** Vercel AI SDK (Anbindung an GPT-4o oder Claude 3.5 Sonnet)
- **Deployment:** Docker-Container (Node.js Umgebung)

## Workflow & Logik
1. **Ingestion:** - Input A: Job-URL oder Text-Paste.
   - Input B: Lebenslauf (Text-Extraktion).
2. **Extraktion:** KI analysiert die Jobbeschreibung auf Key-Requirements, Unternehmenskultur und Hard Skills.
3. **Matching:** Vergleich der Job-Anforderungen mit dem Profil des Nutzers.
4. **Generation (Iterativer Editor):**
   - Parameter: Tonalität (Professionell, Modern, Enthusiastisch), Fokus (Skills, Motivation, Erfahrung).
   - Live-Edit: Der Nutzer kann Parameter ändern und das Anschreiben neu generieren lassen.
5. **Output:** Rein textuelle Darstellung zum Kopieren (kein Export nötig).

## Dateistruktur (geplant)
- `/app`: Next.js App Router (Pages & UI)
- `/app/api`: API-Endpunkte für Extraktion und Generierung
- `/components`: Wiederverwendbare UI-Elemente (Editor, Formulare)
- `/lib`: Hilfsfunktionen für Parsing (Cheerio für URLs, PDF-Parser)
- `/prompts`: Definition der System-Prompts für die KI

