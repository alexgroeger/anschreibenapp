# AI Cover Letter Architect

Eine Web-App, die Bewerbungsschreiben basierend auf Jobanzeigen (URL/Datei) und dem Nutzer-Lebenslauf mittels KI erstellt.

## Tech-Stack

- **Frontend/Backend:** Next.js (App Router)
- **Styling:** Tailwind CSS + Shadcn UI
- **API:** Next.js Route Handlers
- **KI-Integration:** Vercel AI SDK
- **Deployment:** Docker-Container

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000) im Browser.

### API Test

Teste die Hello World API-Route:
```bash
curl http://localhost:3000/api/hello
```

## Projektstruktur

- `/app`: Next.js App Router (Pages & UI)
- `/app/api`: API-Endpunkte für Extraktion und Generierung
- `/components`: Wiederverwendbare UI-Elemente (Editor, Formulare)
- `/lib`: Hilfsfunktionen für Parsing (Cheerio für URLs, PDF-Parser)
- `/prompts`: Definition der System-Prompts für die KI

