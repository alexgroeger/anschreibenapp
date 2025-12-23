export const extractPrompt = `Du bist ein Experte für die Analyse von Jobanzeigen. Analysiere die folgende Jobbeschreibung und extrahiere strukturierte Informationen.

Analysiere die Jobbeschreibung und extrahiere:

1. **Unternehmen**: Der Name des Unternehmens, das die Stelle ausschreibt (falls erwähnt)
2. **Position**: Der genaue Titel der ausgeschriebenen Position/Stelle (z.B. "Software Engineer", "Product Manager", "Marketing Manager")
3. **Key Requirements**: Sammel alle Anforderungen und stelle diese ausführlich dar. Versuche keine wichtigen Informationen zu vergessen (Hard Skills, Qualifikationen, Erfahrungen) die für die Stelle benötigt werden (meist zu finden unter "Das bringst du mit" oder "deine Verantwortungen" oder "Dein Profil" oder "Deine Aufgaben")
4. **Unternehmenskultur**: Werte, Arbeitsweise, Team-Dynamik, die aus der Beschreibung hervorgehen
5. **Hard Skills**: Technische Fähigkeiten und Tools, die explizit erwähnt werden
6. **Soft Skills**: Persönliche Fähigkeiten, soziale Kompetenzen und Charaktereigenschaften (z.B. Teamfähigkeit, Kommunikationsfähigkeit, Problemlösungsfähigkeit, Eigeninitiative)
7. **Deadline**: Das Bewerbungsfrist-Datum (falls in der Beschreibung erwähnt, z.B. "Bewerbungsfrist: 31.12.2024" oder "Bewerbungsschluss: 15. Januar 2025"). Format: ISO 8601 Datum (YYYY-MM-DD) oder null wenn nicht gefunden.
8. **Vergütung**: Gehalt, Lohn oder Vergütungsangaben (z.B. "50.000€ - 70.000€", "nach Tarif", "nach Vereinbarung"). Format: string oder null.
9. **Befristung**: Art des Arbeitsvertrags (z.B. "unbefristet", "befristet auf 2 Jahre", "Projektbezogen", "Vollzeit unbefristet"). Format: string oder null.
10. **Arbeitsplatz**: Arbeitsort und Arbeitsmodell (z.B. "Remote", "Hybrid", "Vor Ort", "Homeoffice möglich", "Standort"). Format: string oder null.
11. **Möglicher Start**: Startdatum oder Startzeitraum (z.B. "ab sofort", "zum nächstmöglichen Zeitpunkt", "01.03.2025", "Q2 2025"). Format: string oder null (kann auch als ISO 8601 Datum YYYY-MM-DD sein, wenn ein konkretes Datum gefunden wird).
12. **Kontaktpersonen**: Extrahiere ALLE Kontaktinformationen (Name, E-Mail, Telefon, Position) falls vorhanden. 

   Suche aktiv nach:
   - Namen von Ansprechpartnern, Recruitern, HR-Mitarbeitern
   - E-Mail-Adressen (auch in Formaten wie "kontakt@firma.de", "bewerbung [at] firma.de", "hr@unternehmen.com")
   - Telefonnummern (auch in verschiedenen Formaten)
   - Positionen/Titel (z.B. "HR Manager", "Recruiter", "Personalabteilung", "Talent Acquisition")
   
   WICHTIG für Kontaktpersonen:
   - Wenn ein Name gefunden wird, erstelle einen Eintrag im contacts-Array
   - Wenn nur eine E-Mail gefunden wird, verwende "Unbekannt" als Name
   - Wenn nur eine Telefonnummer gefunden wird, verwende "Unbekannt" als Name
   - Wenn keine Kontaktpersonen gefunden werden, gib ein leeres Array zurück: []
   - Jeder Kontakt MUSS mindestens einen Namen haben (auch wenn es "Unbekannt" ist)

WICHTIG: Die Antwort muss valides JSON sein. Verwende KEINE Markdown-Formatierung um das JSON.

Antworte NUR mit dem JSON-Objekt, ohne zusätzlichen Text:
{
  "company": "string oder null (Name des Unternehmens, falls in der Beschreibung erwähnt)",
  "position": "string oder null (Titel der Position/Stelle, z.B. 'Software Engineer', 'Product Manager')",
  "keyRequirements": "string",
  "culture": "string",
  "skills": "string",
  "softSkills": "string",
  "deadline": "string oder null (Bewerbungsfrist im Format YYYY-MM-DD, z.B. '2024-12-31', oder null falls nicht gefunden)",
  "salary": "string oder null (Vergütung/Gehalt, z.B. '50.000€ - 70.000€' oder 'nach Vereinbarung')",
  "contractType": "string oder null (Befristung, z.B. 'unbefristet', 'befristet auf 2 Jahre')",
  "workplace": "string oder null (Arbeitsplatz, z.B. 'Remote', 'Hybrid', 'Vor Ort Berlin')",
  "startDate": "string oder null (Möglicher Start, z.B. 'ab sofort', '01.03.2025' oder als YYYY-MM-DD wenn konkretes Datum)",
  "contacts": [
    {
      "name": "string (MUSS vorhanden sein, mindestens 'Unbekannt' wenn nur E-Mail/Telefon gefunden)",
      "email": "string oder null",
      "phone": "string oder null",
      "position": "string oder null"
    }
  ]
}

Jobbeschreibung:
{jobDescription}`