/**
 * Server-side utility functions for website content summarization
 * These functions use Node.js modules and should only be imported on the server
 */

import { generateTextWithFallback } from '@/lib/ai/model-helper';
import { getSettings } from '@/lib/database/settings';

/**
 * Summarizes website content using AI, focusing on relevant information for job applications
 * Extracts: Mission, Values, About Us, Company Culture
 * @param rawContent The raw scraped website content
 * @returns Summarized and focused company information
 */
export async function summarizeWebsiteContentWithAI(rawContent: string): Promise<string | null> {
  try {
    const settings = getSettings();
    const preferredModel = settings.ai_model || 'gemini-1.5-pro';
    const temperature = parseFloat(settings.temperature_generate || '0.7');
    
    const prompt = `Du bist ein Experte für die Analyse von Unternehmenswebsites. Analysiere den folgenden Text, der von einer Unternehmenswebsite extrahiert wurde, und erstelle eine präzise, strukturierte Zusammenfassung.

**Extrahiere und fokussiere dich NUR auf folgende Informationen:**
1. **Mission** - Die Mission, Vision oder das Hauptziel des Unternehmens
2. **Werte** - Die Unternehmenswerte, Grundsätze oder Prinzipien
3. **Über uns** - Wichtige Informationen über das Unternehmen (Geschichte, Größe, Standorte, Branche, etc.)
4. **Unternehmenskultur** - Die Arbeitskultur, Team-Atmosphäre, Arbeitsweise, Philosophie

**WICHTIG:**
- Ignoriere alle anderen Informationen (Kontakt, Jobs, Produkte, Services, News, Blog, Shop, etc.)
- Strukturiere die Zusammenfassung klar nach den 4 Kategorien mit Überschriften
- Verwende präzise, aussagekräftige Sätze
- Behalte nur die wichtigsten und relevantesten Informationen
- Wenn eine Kategorie nicht gefunden wird, lasse sie aus
- Die Zusammenfassung soll für Bewerbungsschreiben nützlich sein
- Formatiere die Ausgabe so:
  ## Mission
  [Text zur Mission]
  
  ## Werte
  [Text zu den Werten]
  
  ## Über uns
  [Text über das Unternehmen]
  
  ## Unternehmenskultur
  [Text zur Kultur]

**Extrahierter Website-Text:**
${rawContent.substring(0, 8000)}${rawContent.length > 8000 ? '...' : ''}

**Erstelle jetzt eine strukturierte Zusammenfassung:**`;

    const result = await generateTextWithFallback(prompt, preferredModel, temperature);
    
    if (!result.text || result.text.trim().length < 50) {
      console.warn('AI summary too short or empty, returning null');
      return null;
    }
    
    return result.text.trim();
  } catch (error: any) {
    console.error('Error summarizing website content with AI:', error.message);
    // Return null on error - the raw content can still be used
    return null;
  }
}
