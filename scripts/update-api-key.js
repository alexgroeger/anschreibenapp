const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(process.cwd(), 'data', 'anschreiben.db');

if (!fs.existsSync(dbPath)) {
  console.error('Datenbank nicht gefunden. Bitte starte die App zuerst, um die Datenbank zu initialisieren.');
  process.exit(1);
}

const db = new Database(dbPath);
const apiKey = 'AIzaSyCMnSz6BrDDPU0qTNoLXVooVDo335A6P5o';

try {
  // Prüfe ob Setting existiert
  const existing = db.prepare('SELECT * FROM settings WHERE key = ?').get('google_api_key');
  
  if (existing) {
    // Update existing
    db.prepare('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?')
      .run(apiKey, 'google_api_key');
    console.log('✅ API-Key erfolgreich aktualisiert!');
  } else {
    // Insert new
    db.prepare('INSERT INTO settings (key, value, category, description) VALUES (?, ?, ?, ?)')
      .run('google_api_key', apiKey, 'api', 'Google Gemini API-Key (leer lassen, um .env.local zu verwenden)');
    console.log('✅ API-Key erfolgreich hinzugefügt!');
  }
  
  // Verifiziere
  const result = db.prepare('SELECT value FROM settings WHERE key = ?').get('google_api_key');
  console.log(`✅ Verifiziert: API-Key ist gesetzt (${result.value.length} Zeichen)`);
  
} catch (error) {
  console.error('❌ Fehler beim Aktualisieren des API-Keys:', error);
  process.exit(1);
} finally {
  db.close();
}
