/**
 * Prompt-Funktionen für die KI-gestützte Analyse und Generierung von Anschreiben
 */

/**
 * Erstellt einen Prompt für die Analyse der Jobbeschreibung
 * Extrahiert Key-Requirements, Unternehmenskultur und Hard Skills als JSON
 * 
 * @param jobDescription - Die Jobbeschreibung (aus URL oder Text)
 * @returns System-Prompt für die Job-Analyse
 */
export function getAnalysisPrompt(jobDescription: string): string {
  return `Du bist ein Experte für Job-Analysen und Recruiting. Analysiere die folgende Jobbeschreibung und extrahiere die wichtigsten Informationen.

Jobbeschreibung:
${jobDescription}

Bitte analysiere die Jobbeschreibung und gib eine strukturierte JSON-Antwort zurück mit folgenden Feldern:

{
  "keyRequirements": [
    "Liste der wichtigsten Anforderungen (Hard Skills, Soft Skills, Qualifikationen)"
  ],
  "hardSkills": [
    "Liste der technischen Fähigkeiten und Tools"
  ],
  "softSkills": [
    "Liste der persönlichen Fähigkeiten und Eigenschaften"
  ],
  "companyCulture": "Beschreibung der Unternehmenskultur und Werte basierend auf der Jobbeschreibung",
  "tone": "Die Tonalität der Jobbeschreibung (professionell, modern, enthusiastisch, etc.)",
  "summary": "Kurze Zusammenfassung der wichtigsten Punkte der Stelle"
}

Wichtig:
- Sei präzise und fokussiere dich auf die wesentlichen Anforderungen
- Identifiziere sowohl explizit genannte als auch implizite Anforderungen
- Analysiere die Sprache und den Stil der Jobbeschreibung für die Tonalität
- Die Antwort muss valides JSON sein`
}

/**
 * Erstellt einen Prompt für die Generierung des Anschreibens
 * Kombiniert Lebenslauf, Job-Analyse, Tonalität und Fokus zu einem individuellen Anschreiben
 * 
 * @param cv - Der Lebenslauf des Nutzers
 * @param jobData - Die analysierten Job-Daten (JSON-String oder Objekt)
 * @param tone - Die gewählte Tonalität (professionell, modern, enthusiastisch)
 * @param focus - Der gewählte Fokus (skills, motivation, erfahrung)
 * @returns System-Prompt für die Anschreiben-Generierung
 */
export function getCoverLetterPrompt(
  cv: string,
  jobData: string,
  tone: string,
  focus: string
): string {
  const toneInstructions = {
    professionell: "Verwende einen professionellen, formellen Ton. Sei respektvoll und sachlich.",
    modern: "Verwende einen modernen, zeitgemäßen Ton. Sei freundlich, aber dennoch professionell.",
    enthusiastisch: "Verwende einen enthusiastischen, energiegeladenen Ton. Zeige Begeisterung und Motivation."
  }

  const focusInstructions = {
    skills: "Fokussiere dich auf die relevanten Fähigkeiten und Kompetenzen, die zum Job passen. Zeige, wie deine Skills den Anforderungen entsprechen.",
    motivation: "Fokussiere dich auf deine Motivation und dein Interesse an der Position und dem Unternehmen. Erkläre, warum du dich für diese Stelle interessierst.",
    erfahrung: "Fokussiere dich auf deine relevanten Erfahrungen und bisherigen Projekte. Zeige konkrete Beispiele aus deinem Werdegang."
  }

  return `Du bist ein Experte für Bewerbungsschreiben. Erstelle ein überzeugendes, individuelles Anschreiben basierend auf den folgenden Informationen.

Lebenslauf des Bewerbers:
${cv}

Analysierte Job-Daten:
${jobData}

Anforderungen:
- Tonalität: ${tone}
  ${toneInstructions[tone as keyof typeof toneInstructions] || toneInstructions.professionell}

- Fokus: ${focus}
  ${focusInstructions[focus as keyof typeof focusInstructions] || focusInstructions.skills}

Erstelle ein Anschreiben, das:
1. Persönlich adressiert ist (wenn Firmenname verfügbar)
2. Die relevanten Punkte aus dem Lebenslauf mit den Job-Anforderungen verknüpft
3. Den gewählten Fokus (${focus}) prominent behandelt
4. Den gewählten Ton (${tone}) durchgehend verwendet
5. Konkrete Beispiele und Erfolge aus dem Lebenslauf einbindet
6. Zeigt, warum der Bewerber perfekt für die Stelle geeignet ist
7. Professionell formatiert ist (Anrede, Absätze, Grußformel)

Das Anschreiben sollte:
- Zwischen 250-400 Wörtern lang sein
- Strukturiert sein (Einleitung, Hauptteil, Schluss)
- Keine Platzhalter oder generische Phrasen enthalten
- Spezifisch auf die Jobbeschreibung eingehen
- Authentisch und überzeugend wirken

Gib nur das Anschreiben zurück, ohne zusätzliche Erklärungen oder Formatierungen.`
}

