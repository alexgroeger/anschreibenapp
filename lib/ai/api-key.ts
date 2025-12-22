import { getSetting } from '@/lib/database/settings';

/**
 * Lädt den Google Gemini API-Key
 * Priorität: 1. Datenbank-Setting, 2. Environment-Variable
 */
export function getGoogleApiKey(): string | undefined {
  // Zuerst aus Datenbank prüfen
  const dbApiKey = getSetting('google_api_key', '');
  
  if (dbApiKey && dbApiKey.trim() !== '') {
    return dbApiKey.trim();
  }
  
  // Fallback auf Environment-Variable
  return process.env.GOOGLE_GENERATIVE_AI_API_KEY;
}

/**
 * Prüft ob ein API-Key konfiguriert ist
 */
export function hasApiKey(): boolean {
  return !!getGoogleApiKey();
}
