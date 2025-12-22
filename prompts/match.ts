export const matchPrompt = `Du bist ein Experte für die Analyse von Bewerbungen. Vergleiche die Jobbeschreibung mit dem Profil des Nutzers.

**Jobbeschreibung:**
{jobDescription}

**Lebenslauf des Nutzers:**
{resume}

**Historische Anschreiben des Nutzers (für Kontext über Erfahrungen und Stärken):**
{oldCoverLetters}

Analysiere:
1. **Passung**: Wie gut passt der Nutzer zu den Anforderungen?
2. **Stärken**: Welche Qualifikationen und Erfahrungen sind besonders relevant?
3. **Lücken**: Welche Anforderungen werden möglicherweise nicht vollständig erfüllt?
4. **Empfehlungen**: Welche Aspekte sollten im Anschreiben besonders hervorgehoben werden?

Antworte strukturiert und detailliert.`
