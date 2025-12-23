import { NextRequest, NextResponse } from 'next/server';
import { getGoogleApiKey } from '@/lib/ai/api-key';
import { getDatabase } from '@/lib/database/client';
import { getSettings } from '@/lib/database/settings';
import { generateTextWithFallback } from '@/lib/ai/model-helper';
import { parseParagraphs } from '@/lib/paragraph-parser';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { coverLetter, modificationRequest, matchResult, jobDescription, extraction } = body;

    if (!coverLetter || !modificationRequest) {
      return NextResponse.json(
        { error: 'Cover letter and modification request are required' },
        { status: 400 }
      );
    }

    // Load settings
    const settings = getSettings();
    const preferredModel = settings.ai_model || 'gemini-1.5-pro';
    const temperature = parseFloat(settings.temperature_generate || '0.7');

    // Get API key
    const apiKey = getGoogleApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    // Load CV and old cover letters for context
    const db = getDatabase();
    const resumeData = db.prepare('SELECT * FROM resume ORDER BY updated_at DESC LIMIT 1').get() as any;
    const resume = resumeData?.content || 'Kein Lebenslauf hinterlegt.';

    // Parse paragraphs from current cover letter for context
    const paragraphs = parseParagraphs(coverLetter);
    const paragraphInfo = paragraphs.map((p, i) => `Absatz ${i + 1}: ${p.text.substring(0, 100)}${p.text.length > 100 ? '...' : ''}`).join('\n');
    
    // Erkenne, ob es sich um eine kleine, lokale Änderung handelt
    const modificationLower = modificationRequest.toLowerCase();
    const isSmallChange = 
      modificationLower.includes('kürze') ||
      modificationLower.includes('kürzen') ||
      modificationLower.includes('längere') ||
      modificationLower.includes('länger') ||
      modificationLower.includes('formeller') ||
      modificationLower.includes('formell') ||
      modificationLower.includes('lockerer') ||
      modificationLower.includes('locker') ||
      modificationLower.includes('freundlicher') ||
      modificationLower.includes('freundlich') ||
      modificationLower.includes('betone') ||
      modificationLower.includes('betonen') ||
      modificationLower.includes('hervorhebe') ||
      modificationLower.includes('hervorheben') ||
      modificationLower.includes('absatz') ||
      modificationLower.includes('erste') ||
      modificationLower.includes('zweite') ||
      modificationLower.includes('dritte') ||
      modificationLower.includes('letzte') ||
      modificationLower.match(/^\d+\.?\s*(absatz|paragraph)/i) !== null;

    // Load and format favorite formulations
    const favoriteFormulationsText = settings.favorite_formulations || '';
    let favoriteFormulationsSection = '';
    if (favoriteFormulationsText.trim()) {
      const formulations = favoriteFormulationsText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      if (formulations.length > 0) {
        favoriteFormulationsSection = `\n**WICHTIG - Favorisierte Formulierungen:**
Die folgenden Formulierungen sollen BEVORZUGT im Anschreiben verwendet werden, wenn sie passend sind:
${formulations.map(f => `- "${f}"`).join('\n')}

Nutze diese Formulierungen aktiv und bevorzuge sie gegenüber anderen ähnlichen Formulierungen, wenn sie zum Kontext passen.

`;
      }
    }

    // Load and format excluded formulations
    const excludedFormulationsText = settings.excluded_formulations || '';
    let excludedFormulationsSection = '';
    if (excludedFormulationsText.trim()) {
      const formulations = excludedFormulationsText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      if (formulations.length > 0) {
        excludedFormulationsSection = `\n**WICHTIG - Ausgeschlossene Formulierungen:**
Die folgenden Formulierungen dürfen NICHT im Anschreiben verwendet werden:
${formulations.map(f => `- "${f}"`).join('\n')}

Vermeide diese Formulierungen vollständig und verwende stattdessen alternative, passende Formulierungen.

`;
      }
    }

    // Build system prompt - unterschiedlich je nach Art der Änderung
    let systemPrompt: string;
    
    if (isSmallChange) {
      // Bei kleinen Änderungen: Nur geänderte Absätze zurückgeben
      systemPrompt = `Du bist ein Experte für Bewerbungsschreiben. Der Nutzer möchte eine KLEINE, LOKALE Änderung am Anschreiben vornehmen.

**Aktuelles Anschreiben (in Absätzen getrennt durch doppelte Zeilenschaltung):**
${paragraphInfo}

**Vollständiges aktuelles Anschreiben:**
${coverLetter}

**Änderungswunsch des Nutzers:**
${modificationRequest}

**Kontext:**
- Jobbeschreibung: ${jobDescription || 'Nicht verfügbar'}
- Matching-Ergebnis: ${matchResult || 'Nicht verfügbar'}
- Lebenslauf: ${resume.substring(0, 1000)}${resume.length > 1000 ? '...' : ''}
${extraction ? `- Extraktionsdaten: ${JSON.stringify(extraction).substring(0, 500)}` : ''}

**KRITISCH - Formatierung EXAKT beibehalten:**
1. Identifiziere, welche Absätze geändert werden müssen (basierend auf dem Änderungswunsch)
2. Gib NUR die geänderten Absätze zurück, im Format: "ABSATZ_X: [neuer Text]"
3. Wenn mehrere Absätze geändert werden, gib jeden in separater Zeile: "ABSATZ_X: [Text]\\n\\nABSATZ_Y: [Text]"
4. Beginne jede Zeile mit "ABSATZ_" gefolgt von der Nummer (1, 2, 3, etc.) und einem Doppelpunkt
5. Lasse alle anderen Absätze UNVERÄNDERT - gib sie NICHT zurück
6. **WICHTIGSTE REGEL:** Behalte die EXAKTE Formatierung des Original-Absatzes bei:
   - Gleiche Anzahl von Leerzeichen zwischen Wörtern
   - Gleiche Zeilenumbrüche innerhalb des Absatzes (falls vorhanden)
   - Gleiche Satzzeichen-Platzierung
   - Gleiche Groß-/Kleinschreibung (außer bei expliziten Änderungen)
   - Gleiche Wortabstände
7. Ändere NUR die Wörter/Phrasen, die für den Änderungswunsch nötig sind - alles andere bleibt IDENTISCH
8. Wenn der Änderungswunsch auf das gesamte Anschreiben zutrifft (z.B. "mache den Ton formeller"), dann ändere alle Absätze entsprechend, aber gib sie alle im Format "ABSATZ_X: [Text]" zurück
9. **Beispiel:** Wenn der Original-Absatz "Ich habe Erfahrung mit React." ist und du ihn formeller machen sollst, ändere nur die nötigen Wörter, aber behalte die EXAKTE Formatierung: "Ich verfüge über Erfahrung mit React." (gleiche Leerzeichen, gleicher Punkt, gleiche Struktur)

**Beispiele für das Format:**
- Nur Absatz 2 ändern: "ABSATZ_2: [neuer Text für Absatz 2]"
- Absatz 1 und 3 ändern: "ABSATZ_1: [neuer Text]\\n\\nABSATZ_3: [neuer Text]"

Antworte auf Deutsch${favoriteFormulationsSection}${excludedFormulationsSection}`;
    } else {
      // Bei größeren Änderungen: Vollständiges Anschreiben zurückgeben
      systemPrompt = `Du bist ein Experte für Bewerbungsschreiben. Der Nutzer möchte sein Anschreiben überarbeiten.

**Aktuelles Anschreiben (in Absätzen getrennt durch doppelte Zeilenschaltung):**
${paragraphInfo}

**Vollständiges aktuelles Anschreiben:**
${coverLetter}

**Änderungswunsch des Nutzers:**
${modificationRequest}

**Kontext:**
- Jobbeschreibung: ${jobDescription || 'Nicht verfügbar'}
- Matching-Ergebnis: ${matchResult || 'Nicht verfügbar'}
- Lebenslauf: ${resume.substring(0, 1000)}${resume.length > 1000 ? '...' : ''}
${extraction ? `- Extraktionsdaten: ${JSON.stringify(extraction).substring(0, 500)}` : ''}

**Deine Aufgabe:**
Überarbeite das Anschreiben gemäß dem Änderungswunsch des Nutzers. Gib IMMER das VOLLSTÄNDIGE überarbeitete Anschreiben zurück.

**KRITISCH - Formatierung EXAKT beibehalten:**
1. Gib NUR das vollständige neue Anschreiben zurück, ohne zusätzliche Erklärungen
2. Beginne direkt mit dem Anschreiben
3. Absätze werden durch GENAU ZWEI Zeilenumbrüche (\\n\\n) getrennt - halte diese Formatierung exakt ein
4. **WICHTIGSTE REGEL:** Behalte die EXAKTE Formatierung des Originals bei:
   - Gleiche Anzahl von Leerzeichen zwischen Wörtern (wenn Original "Wort1  Wort2" hat, behalte die zwei Leerzeichen)
   - Gleiche Zeilenumbrüche innerhalb von Absätzen (falls vorhanden)
   - Gleiche Satzzeichen-Platzierung und -Anzahl
   - Gleiche Groß-/Kleinschreibung (außer bei expliziten Änderungen)
   - Gleiche Wortabstände und Formatierung
   - Gleiche Absatzstruktur (gleiche Anzahl Absätze, gleiche Trennungen)
5. Ändere NUR die Wörter/Phrasen, die für den Änderungswunsch nötig sind - alles andere bleibt IDENTISCH
6. Lasse alle anderen Teile UNVERÄNDERT - sowohl Inhalt als auch Formatierung
7. Wenn nur ein Absatz geändert werden soll, lasse alle anderen Absätze wortwörtlich unverändert (inkl. Formatierung)
8. Berücksichtige den Änderungswunsch des Nutzers genau, aber minimal - ändere nur das Nötigste
9. **Beispiel:** Wenn der Original-Text "Ich habe 5 Jahre Erfahrung." ist und du ihn formeller machen sollst, ändere nur die nötigen Wörter, aber behalte die EXAKTE Formatierung: "Ich verfüge über 5 Jahre Erfahrung." (gleiche Leerzeichen, gleiche Zahl, gleicher Punkt)

Antworte auf Deutsch${favoriteFormulationsSection}${excludedFormulationsSection}`;
    }

    const { text } = await generateTextWithFallback(
      systemPrompt,
      preferredModel,
      temperature
    );

    const responseText = text.trim();
    
    // Prüfe, ob die Antwort Teiländerungen enthält (Format: "ABSATZ_X: ...")
    const paragraphChangePattern = /^ABSATZ_\d+:/m;
    const isPartialChange = paragraphChangePattern.test(responseText);
    
    if (isPartialChange) {
      // Parse Teiländerungen
      const paragraphChanges: { index: number; text: string }[] = [];
      const lines = responseText.split(/\n+/);
      let currentParagraph: { index: number; text: string } | null = null;
      
      for (const line of lines) {
        const match = line.match(/^ABSATZ_(\d+):\s*(.*)$/);
        if (match) {
          // Speichere vorherigen Absatz
          if (currentParagraph) {
            paragraphChanges.push(currentParagraph);
          }
          // Starte neuen Absatz
          currentParagraph = {
            index: parseInt(match[1], 10) - 1, // 0-basiert
            text: match[2]
          };
        } else if (currentParagraph && line.trim()) {
          // Fortsetzung des aktuellen Absatzes
          currentParagraph.text += '\n' + line;
        }
      }
      
      // Füge letzten Absatz hinzu
      if (currentParagraph) {
        paragraphChanges.push(currentParagraph);
      }
      
      // Erstelle vollständiges Anschreiben mit geänderten Absätzen
      const modifiedParagraphs = [...paragraphs];
      for (const change of paragraphChanges) {
        if (change.index >= 0 && change.index < modifiedParagraphs.length) {
          modifiedParagraphs[change.index] = {
            ...modifiedParagraphs[change.index],
            text: change.text.trim()
          };
        }
      }
      
      // Kombiniere zu vollständigem Text
      const fullModifiedText = modifiedParagraphs.map(p => p.text).join('\n\n');
      
      return NextResponse.json({ 
        modifiedCoverLetter: fullModifiedText,
        isPartialChange: true,
        changedParagraphs: paragraphChanges.map(c => c.index)
      }, { status: 200 });
    } else {
      // Vollständige Änderung
      return NextResponse.json({ 
        modifiedCoverLetter: responseText,
        isPartialChange: false
      }, { status: 200 });
    }
  } catch (error: any) {
    console.error('Error modifying cover letter:', error);
    return NextResponse.json(
      { error: error.message || 'Fehler beim Überarbeiten des Anschreibens' },
      { status: 500 }
    );
  }
}

