import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

/**
 * Versucht verschiedene Gemini-Modellnamen, bis eines funktioniert
 * Die Modellnamen müssen mit der verwendeten API-Version kompatibel sein
 */
const FALLBACK_MODELS = [
  'gemini-2.0-flash-exp',  // Experimentelles Modell (funktioniert, aber möglicherweise Quota-Limit)
  'gemini-1.0-pro-001',   // Stabile Version
  'gemini-1.0-pro-002',   // Aktualisierte stabile Version
  'gemini-1.5-flash',     // Schnelles Modell
  'gemini-1.5-pro',       // Pro-Modell
  'gemini-pro',           // Legacy-Name
];

/**
 * Generiert Text mit automatischem Modell-Fallback
 */
export async function generateTextWithFallback(
  prompt: string,
  preferredModel?: string,
  temperature: number = 0.7
): Promise<{ text: string; model: string }> {
  const modelsToTry = preferredModel 
    ? [preferredModel, ...FALLBACK_MODELS.filter(m => m !== preferredModel)]
    : FALLBACK_MODELS;

  let lastError: any = null;

  for (const modelName of modelsToTry) {
    try {
      const result = await generateText({
        model: google(modelName),
        prompt,
        temperature,
      });

      return { text: result.text, model: modelName };
    } catch (error: any) {
      lastError = error;
      const errorMessage = error.message || '';
      
      // Wenn es ein Modell-Fehler ist, versuche nächstes Modell
      if (errorMessage.includes('not found') || errorMessage.includes('not supported')) {
        console.warn(`Modell ${modelName} nicht verfügbar, versuche nächstes...`);
        continue;
      }
      
      // Quota-Fehler - das Modell funktioniert, aber Quota ist überschritten
      if (errorMessage.includes('quota') || errorMessage.includes('Quota exceeded')) {
        throw new Error(
          `API-Quota überschritten. Bitte überprüfe dein Google Cloud-Konto und die Quota-Limits. ` +
          `Modell ${modelName} wurde erkannt, aber die Quota ist aufgebraucht. ` +
          `Besuche https://ai.dev/usage?tab=rate-limit für Details.`
        );
      }
      
      // Bei anderen Fehlern (z.B. API-Key), werfe sofort
      throw error;
    }
  }

  throw new Error(
    `Kein funktionierendes Modell gefunden. Letzter Fehler: ${lastError?.message || 'Unbekannt'}`
  );
}
