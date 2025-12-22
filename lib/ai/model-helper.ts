import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { getGoogleApiKey } from './api-key';

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

  // API-Key aus Datenbank oder Environment-Variable laden
  const apiKey = getGoogleApiKey();
  if (!apiKey) {
    const apiKeyError: any = new Error(
      'API-Key fehlt. Bitte konfiguriere den Google Gemini API-Key in den Admin-Einstellungen oder in der .env.local Datei.'
    );
    apiKeyError.type = 'API_KEY_ERROR';
    throw apiKeyError;
  }

  // Temporär die Environment-Variable setzen, falls der Key aus der DB kommt
  const originalApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const needsRestore = apiKey !== originalApiKey;
  
  if (needsRestore) {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKey;
  }

  try {
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
          const quotaError: any = new Error(
            `API-Quota überschritten. Bitte überprüfe dein Google Cloud-Konto und die Quota-Limits. ` +
            `Modell ${modelName} wurde erkannt, aber die Quota ist aufgebraucht. ` +
            `Besuche https://ai.dev/usage?tab=rate-limit für Details.`
          );
          quotaError.type = 'QUOTA_ERROR';
          quotaError.model = modelName;
          throw quotaError;
        }
        
        // API-Key Fehler
        if (errorMessage.includes('API key') || errorMessage.includes('apiKey')) {
          const apiKeyError: any = new Error(
            'API-Key fehlt oder ist ungültig. Bitte überprüfe deine Admin-Einstellungen oder .env.local Datei.'
          );
          apiKeyError.type = 'API_KEY_ERROR';
          throw apiKeyError;
        }
        
        // Bei anderen Fehlern (z.B. Netzwerk), werfe sofort
        throw error;
      }
    }

    // Alle Modelle haben fehlgeschlagen
    const modelError: any = new Error(
      `Kein funktionierendes Modell gefunden. Alle ${modelsToTry.length} Modellnamen wurden getestet, aber keines ist verfügbar. ` +
      `Letzter Fehler: ${lastError?.message || 'Unbekannt'}. ` +
      `Bitte überprüfe deine API-Konfiguration oder kontaktiere den Support.`
    );
    modelError.type = 'MODEL_ERROR';
    modelError.testedModels = modelsToTry;
    modelError.lastError = lastError?.message;
    throw modelError;
  } finally {
    // Environment-Variable wiederherstellen
    if (needsRestore) {
      if (originalApiKey !== undefined) {
        process.env.GOOGLE_GENERATIVE_AI_API_KEY = originalApiKey;
      } else {
        delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      }
    }
  }
}
