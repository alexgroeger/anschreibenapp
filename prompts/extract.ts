export const extractPrompt = `Du bist ein Experte für die Analyse von Jobanzeigen. Analysiere die folgende Jobbeschreibung und extrahiere strukturierte Informationen.

Analysiere die Jobbeschreibung und extrahiere:

1. **Key Requirements**: Die wichtigsten Anforderungen (Hard Skills, Qualifikationen, Erfahrungen)
2. **Unternehmenskultur**: Werte, Arbeitsweise, Team-Dynamik, die aus der Beschreibung hervorgehen
3. **Hard Skills**: Technische Fähigkeiten und Tools, die explizit erwähnt werden
4. **Kontaktpersonen**: Extrahiere alle Kontaktinformationen (Name, E-Mail, Telefon, Position) falls vorhanden

Antworte im JSON-Format:
{
  "keyRequirements": "string",
  "culture": "string",
  "skills": "string",
  "contacts": [
    {
      "name": "string",
      "email": "string oder null",
      "phone": "string oder null",
      "position": "string oder null"
    }
  ]
}

Jobbeschreibung:
{jobDescription}`
