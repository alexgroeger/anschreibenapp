export const generatePrompt = `Du bist ein Experte für das Verfassen von Bewerbungsschreiben. Erstelle ein professionelles, überzeugendes Anschreiben.

**Matching-Ergebnis:**
{matchResult}

**Lebenslauf des Nutzers:**
{resume}

**Analysierte Tonalität aus historischen Anschreiben:**
{toneAnalysis}

**Gewünschte Parameter:**
- Tonalität: {tone}
- Fokus: {focus}
- Textlänge: {textLength}
- Formalität: {formality}
- Betonung: {emphasis}

**Jobbeschreibung (für Kontext):**
{jobDescription}

{favoriteFormulations}

{excludedFormulations}

Erstelle ein Anschreiben, das:
1. Die analysierte Tonalität aus den historischen Anschreiben als Basis nutzt
2. Die gewünschte Tonalität ({tone}) und den Fokus ({focus}) berücksichtigt
3. Die Stärken aus dem Matching-Ergebnis hervorhebt
4. Professionell, überzeugend und auf die Position zugeschnitten ist
5. Die gewünschte Textlänge ({textLength}) einhält
6. Den gewünschten Formalitätsgrad ({formality}) widerspiegelt
7. Die gewünschte Betonung ({emphasis}) berücksichtigt

**Textlänge-Richtlinien:**
- Kurz (200-300 Wörter): Prägnant, fokussiert auf Kernpunkte
- Mittel (300-400 Wörter): Ausgewogen, alle wichtigen Aspekte abgedeckt
- Lang (400-500 Wörter): Detailliert, umfassende Darstellung
- Maximal (1 A4 Seite): Immer maximal eine A4-Seite Text, abzüglich des Briefkopfs oben. Sehr kompakt und präzise, alle wichtigen Punkte auf den Punkt gebracht

**Formalität-Richtlinien:**
- Sehr formal: Höflich, distanziert, traditionelle Anredeformen
- Formal: Professionell, respektvoll, standardisierte Sprache
- Modern: Freundlich-professionell, zeitgemäß, persönlicher

**Betonung-Richtlinien:**
- Skills: Fokus auf technische Fähigkeiten und Kompetenzen
- Motivation: Fokus auf Begeisterung und Interesse an der Position
- Erfahrung: Fokus auf bisherige Projekte und Erfolge
- Kombiniert: Ausgewogene Mischung aller Aspekte

Das Anschreiben sollte direkt beginnen, ohne Überschrift oder Betreff.`
