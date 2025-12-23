# Migrationsplan: Framework- und Bibliotheks-Updates

**Stand:** Dezember 2024  
**Ziel:** Alle Dependencies auf aktuelle Versionen aktualisieren

## Übersicht

Dieser Plan beschreibt die schrittweise Aktualisierung aller verwendeten Frameworks und Bibliotheken. Die Migration ist in drei Phasen unterteilt, beginnend mit kritischen Sicherheits-Updates.

---

## Phase 1: Kritische Sicherheits-Updates (SOFORT)

**Priorität:** 🔴 HOCH - Sicherheitslücken beheben

### 1.1 ESLint & Next.js ESLint Config

- **Aktuell:** `eslint-config-next@14.2.35`, `eslint@8.57.1`
- **Ziel:** `eslint-config-next@16.1.0`, `eslint@9.39.2`
- **Grund:** Behebt High-Severity Command Injection Lücke in `glob` Dependency

**Schritte:**
1. Backup des aktuellen `package.json` und `package-lock.json`
2. Branch erstellen: `git checkout -b fix/security-updates`
3. Update durchführen: `npm install eslint-config-next@latest eslint@latest`
4. ESLint-Konfiguration prüfen und ggf. anpassen (ESLint 9 hat neue Config-Format)
5. `npm run lint` ausführen und Fehler beheben
6. Alle Tests durchführen
7. Manuelle Funktionsprüfung aller Features

**Risiken:** 
- ESLint 9 erfordert möglicherweise Konfigurationsänderungen
- Neue Regeln könnten bestehenden Code als fehlerhaft markieren

**Tests:**
- [ ] Linter läuft ohne Fehler
- [ ] Build-Prozess funktioniert
- [ ] Alle API-Endpunkte funktionieren
- [ ] UI-Komponenten rendern korrekt

**Status:** ⏳ Ausstehend

---

## Phase 2: Minor/Patch Updates (Niedriges Risiko)

**Priorität:** 🟡 MITTEL - Verbesserungen und Bugfixes

### 2.1 TypeScript & Type Definitions

- **Aktuell:** `typescript@5.5.4`, `@types/node@20.14.12`, `@types/react@18.3.3`, `@types/react-dom@18.3.0`
- **Ziel:** Neueste Patch-Versionen innerhalb der Major-Version

**Schritte:**
1. `npm update typescript @types/node @types/react @types/react-dom`
2. TypeScript-Kompilierung prüfen: `npm run build`
3. Type-Errors beheben falls vorhanden

**Status:** ⏳ Ausstehend

### 2.2 Weitere Dependencies (Patch-Updates)

- `autoprefixer`, `postcss`, `tailwindcss` (innerhalb v3)
- `@radix-ui/*` Komponenten
- `class-variance-authority`, `clsx`, `tailwind-merge`
- `date-fns`, `lucide-react`, `mammoth`, `pdfjs-dist`, `react-markdown`, `remark-gfm`
- `better-sqlite3`, `@types/better-sqlite3`

**Schritte:**
1. `npm update` für alle Patch-Updates
2. Build und Tests durchführen
3. UI-Komponenten visuell prüfen

**Status:** ⏳ Ausstehend

---

## Phase 3: Major Version Updates (Breaking Changes)

**Priorität:** 🟢 NIEDRIG - Planung erforderlich, umfangreiche Tests

### 3.1 Next.js 14 → 16 (oder 15 als Zwischenschritt)

**Aktuell:** `next@14.2.35`  
**Ziel:** `next@16.1.0` (oder `next@15.x` als Zwischenschritt)

**Breaking Changes zu beachten:**
- React 19 ist erforderlich (siehe 3.2)
- Neue App Router Features und Änderungen
- Änderungen bei Route Handlers
- Mögliche Änderungen bei Server Components
- Neue Caching-Strategien

**Migrationsschritte:**
1. **Vorbereitung:**
   - Vollständiges Backup erstellen
   - Feature-Branch: `git checkout -b migrate/next-16`
   - Dokumentation der Next.js 15/16 Breaking Changes lesen

2. **Zwischenschritt Next.js 15 (empfohlen):**
   - `npm install next@15 react@19 react-dom@19`
   - Alle Deprecation-Warnings beheben
   - Tests durchführen

3. **Update auf Next.js 16:**
   - `npm install next@16`
   - Route Handlers prüfen und anpassen
   - Server Components Verhalten testen
   - Caching-Verhalten validieren

4. **Anpassungen:**
   - API Routes auf neue Next.js 16 API prüfen
   - Middleware ggf. anpassen
   - Build-Konfiguration aktualisieren

**Tests:**
- [ ] Alle Routes funktionieren (`/`, `/resume`, `/cover-letters`, `/dashboard`)
- [ ] Alle API-Endpunkte funktionieren
- [ ] Server Components rendern korrekt
- [ ] Client Components funktionieren
- [ ] Datenbank-Operationen funktionieren
- [ ] AI SDK Integration funktioniert
- [ ] Build-Prozess erfolgreich
- [ ] Production Build getestet

**Status:** ⏳ Ausstehend

---

### 3.2 React 18 → 19

**Aktuell:** `react@18.3.1`, `react-dom@18.3.1`  
**Ziel:** `react@19.2.3`, `react-dom@19.2.3`

**Breaking Changes zu beachten:**
- Neue React Compiler (optional, aber empfohlen)
- Änderungen bei `ref` als Prop
- Strict Mode Verhalten
- Änderungen bei Event Handlers
- Neue Hooks und Features

**Migrationsschritte:**
1. **Gemeinsam mit Next.js Update:**
   - React 19 ist Voraussetzung für Next.js 15/16
   - Update zusammen durchführen

2. **Code-Anpassungen:**
   - `ref` Props prüfen (nicht mehr automatisch als DOM-Ref)
   - Event Handler auf neue Signatures prüfen
   - Strict Mode Warnings beheben
   - Shadcn UI Komponenten auf React 19 Kompatibilität prüfen

3. **Testing:**
   - Alle Client Components testen
   - Interaktive Features prüfen (Forms, Buttons, Dialogs)
   - State Management validieren

**Tests:**
- [ ] Alle UI-Komponenten funktionieren
- [ ] Formulare funktionieren (CV Upload, Cover Letter Upload)
- [ ] Dialoge öffnen/schließen korrekt
- [ ] State Updates funktionieren
- [ ] Keine React Warnings in Console

**Status:** ⏳ Ausstehend

---

### 3.3 AI SDK 2/5 → 3/6

**Aktuell:** `@ai-sdk/google@2.0.51`, `@ai-sdk/react@2.0.118`, `ai@5.0.116`  
**Ziel:** `@ai-sdk/google@3.0.0`, `@ai-sdk/react@3.0.0`, `ai@6.0.0`

**Breaking Changes zu beachten:**
- Mögliche API-Änderungen bei Stream-Handling
- Änderungen bei Prompt-Struktur
- Neue Features und Optimierungen

**Migrationsschritte:**
1. **Dokumentation prüfen:**
   - Vercel AI SDK Migration Guide lesen
   - Breaking Changes dokumentieren

2. **Code-Anpassungen:**
   - API Routes prüfen (`/api/extract`, `/api/match`, `/api/generate`)
   - Prompt-Strukturen validieren
   - Stream-Handling testen
   - Error Handling anpassen

3. **Testing:**
   - Job-Extraktion testen
   - Matching-Funktion testen
   - Anschreiben-Generierung testen
   - Tonalitäts-Analyse testen

**Tests:**
- [ ] `/api/extract` funktioniert korrekt
- [ ] `/api/match` liefert erwartete Ergebnisse
- [ ] `/api/generate` generiert Anschreiben
- [ ] Streaming funktioniert (falls verwendet)
- [ ] Error Handling funktioniert

**Status:** ⏳ Ausstehend

---

### 3.4 Tailwind CSS 3 → 4

**Aktuell:** `tailwindcss@3.4.19`  
**Ziel:** `tailwindcss@4.1.18`

**Breaking Changes zu beachten:**
- Neue Konfigurationsdatei-Struktur
- Änderungen bei Custom Utilities
- Neue CSS-Syntax
- Shadcn UI Kompatibilität prüfen

**Migrationsschritte:**
1. **Vorbereitung:**
   - Tailwind CSS 4 Migration Guide lesen
   - Shadcn UI auf Tailwind 4 Kompatibilität prüfen

2. **Konfiguration:**
   - `tailwind.config.js` auf neue Struktur migrieren
   - Custom Utilities anpassen
   - PostCSS Konfiguration prüfen

3. **Testing:**
   - Alle Seiten visuell prüfen
   - Responsive Design testen
   - Dark Mode (falls vorhanden) testen
   - Shadcn UI Komponenten prüfen

**Tests:**
- [ ] Alle Seiten rendern korrekt
- [ ] Styling ist konsistent
- [ ] Shadcn UI Komponenten funktionieren
- [ ] Responsive Design funktioniert
- [ ] Build-Prozess erfolgreich

**Status:** ⏳ Ausstehend

---

## Migrations-Timeline (Empfohlen)

**Woche 1:**
- ✅ Phase 1: Sicherheits-Updates (kritisch)
- ✅ Phase 2: Minor/Patch Updates

**Woche 2-3:**
- Phase 3.1: Next.js 15 Update (Zwischenschritt)
- Phase 3.2: React 19 Update (gemeinsam mit Next.js)

**Woche 4-5:**
- Phase 3.1: Next.js 16 Update
- Umfassende Tests und Bugfixes

**Woche 6:**
- Phase 3.3: AI SDK Update
- Tests der KI-Funktionalität

**Woche 7:**
- Phase 3.4: Tailwind CSS 4 Update
- UI/UX Tests

**Woche 8:**
- Finale Tests aller Features
- Performance-Tests
- Production-Deployment

---

## Rollback-Strategie

Für jede Phase:
1. Git Branch für jeden Update-Schritt
2. Vollständiges Backup vor jedem Major Update
3. `package-lock.json` committen für Reproduzierbarkeit
4. Bei Problemen: Branch wechseln und `npm install` ausführen

---

## Testing-Checkliste (nach jedem Update)

- [ ] `npm install` erfolgreich
- [ ] `npm run build` erfolgreich
- [ ] `npm run lint` ohne Fehler
- [ ] `npm run dev` startet ohne Fehler
- [ ] Alle Routes erreichbar
- [ ] Alle API-Endpunkte funktionieren
- [ ] Datenbank-Operationen funktionieren
- [ ] KI-Funktionen (Extract, Match, Generate) funktionieren
- [ ] UI-Komponenten rendern korrekt
- [ ] Keine Console-Errors
- [ ] Keine TypeScript-Errors
- [ ] Performance akzeptabel

---

## Notizen

- **Letzte Überprüfung:** Dezember 2024
- **Nächste Überprüfung:** Januar 2025
- **Verantwortlich:** Entwicklungsteam
- **Status:** Phase 1 ausstehend (kritisch)

---

## Fortschritt

### Phase 1: Kritische Sicherheits-Updates
- [ ] 1.1 ESLint & Next.js ESLint Config

### Phase 2: Minor/Patch Updates
- [ ] 2.1 TypeScript & Type Definitions
- [ ] 2.2 Weitere Dependencies

### Phase 3: Major Version Updates
- [ ] 3.1 Next.js 14 → 16
- [ ] 3.2 React 18 → 19
- [ ] 3.3 AI SDK 2/5 → 3/6
- [ ] 3.4 Tailwind CSS 3 → 4
