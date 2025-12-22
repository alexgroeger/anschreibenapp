import { getDatabase } from './client';

export interface Settings {
  [key: string]: string;
}

/**
 * Lädt alle Einstellungen aus der Datenbank
 */
export function getSettings(): Settings {
  const db = getDatabase();
  const settingsRows = db.prepare('SELECT key, value FROM settings').all() as Array<{
    key: string;
    value: string;
  }>;

  const settings: Settings = {};
  settingsRows.forEach((row) => {
    settings[row.key] = row.value;
  });

  return settings;
}

/**
 * Lädt eine spezifische Einstellung
 */
export function getSetting(key: string, defaultValue: string = ''): string {
  const db = getDatabase();
  const setting = db
    .prepare('SELECT value FROM settings WHERE key = ?')
    .get(key) as { value: string } | undefined;

  return setting?.value || defaultValue;
}

/**
 * Setzt eine Einstellung
 */
export function setSetting(key: string, value: string): void {
  const db = getDatabase();
  db.prepare(
    'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)'
  ).run(key, value);
  
  // Invalidate cache when settings are updated
  settingsCache = null;
}

/**
 * Invalidiert den Settings-Cache (für manuelle Cache-Invalidierung)
 */
export function invalidateSettingsCache(): void {
  settingsCache = null;
}
