export const matchPrompt = `Du bist ein Experte für die Analyse von Bewerbungen. Vergleiche die Jobbeschreibung mit dem Profil des Nutzers.

**Jobbeschreibung:**
{jobDescription}

**Lebenslauf des Nutzers:**
{resume}

**Zusätzliche Nutzerinformationen:**
{userProfile}

**Historische Anschreiben des Nutzers (für Kontext über Erfahrungen und Stärken):**
{oldCoverLetters}

**WICHTIG:** Beginne deine Antwort mit einem JSON-Objekt im folgenden Format:
\`\`\`json
{
  "score": "nicht_passend" | "mittel" | "gut" | "sehr_gut",
  "score_explanation": "Kurze Begründung für den Score (1-2 Sätze)"
}
\`\`\`

Bewerte die Passung nach folgenden Kriterien:
- **sehr_gut**: Der Nutzer erfüllt alle oder fast alle Anforderungen optimal, hat relevante Erfahrungen und Qualifikationen
- **gut**: Der Nutzer erfüllt die meisten wichtigen Anforderungen, hat relevante Erfahrungen, einige Lücken sind vorhanden
- **mittel**: Der Nutzer erfüllt einige Anforderungen, hat teilweise relevante Erfahrungen, aber es gibt signifikante Lücken
- **nicht_passend**: Der Nutzer erfüllt nur wenige oder keine wichtigen Anforderungen, wenig relevante Erfahrungen

**WICHTIG:** Nutze die zusätzlichen Nutzerinformationen (Werte, Soft Skills, Arbeitsweise, Entwicklungsrichtung) für eine bessere und umfassendere Passungsbewertung. Diese Informationen können besonders bei der Bewertung der kulturellen Passung und langfristigen Entwicklungspotenzials hilfreich sein.

Nach dem JSON-Objekt folgt die detaillierte Analyse:
1. **Passung**: Wie gut passt der Nutzer zu den Anforderungen?
2. **Stärken**: Welche Qualifikationen und Erfahrungen sind besonders relevant?
3. **Lücken**: Welche Anforderungen werden möglicherweise nicht vollständig erfüllt?
4. **Empfehlungen**: Welche Aspekte sollten im Anschreiben besonders hervorgehoben werden?

Antworte strukturiert und detailliert.`
