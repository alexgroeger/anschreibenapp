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

**Jobbeschreibung (für Kontext):**
{jobDescription}

Erstelle ein Anschreiben, das:
1. Die analysierte Tonalität aus den historischen Anschreiben als Basis nutzt
2. Die gewünschte Tonalität ({tone}) und den Fokus ({focus}) berücksichtigt
3. Die Stärken aus dem Matching-Ergebnis hervorhebt
4. Professionell, überzeugend und auf die Position zugeschnitten ist
5. Eine angemessene Länge hat (ca. 300-400 Wörter)

Das Anschreiben sollte direkt beginnen, ohne Überschrift oder Betreff.`
