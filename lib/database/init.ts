import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'data', 'anschreiben.db');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export function initDatabase(): Database.Database {
  const db = new Database(dbPath);
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  
  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS resume (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS old_cover_letters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      company TEXT,
      position TEXT,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company TEXT NOT NULL,
      position TEXT NOT NULL,
      job_description TEXT,
      extraction_data TEXT,
      cover_letter TEXT,
      status TEXT DEFAULT 'rueckmeldung_ausstehend',
      sent_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS contact_persons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      position TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      category TEXT,
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS prompt_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prompt_name TEXT NOT NULL,
      content TEXT NOT NULL,
      version INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT
    );

    CREATE TABLE IF NOT EXISTS resume_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resume_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (resume_id) REFERENCES resume(id) ON DELETE CASCADE
    );
  `);
  
  // Initialize default settings
  const defaultSettings = [
    { key: 'google_api_key', value: '', category: 'api', description: 'Google Gemini API-Key (leer lassen, um .env.local zu verwenden)' },
    { key: 'ai_model', value: 'gemini-pro', category: 'ai', description: 'KI-Modell für alle Operationen' },
    { key: 'temperature_extract', value: '0.3', category: 'ai', description: 'Temperature für Extraktion' },
    { key: 'temperature_match', value: '0.5', category: 'ai', description: 'Temperature für Matching' },
    { key: 'temperature_generate', value: '0.7', category: 'ai', description: 'Temperature für Generierung' },
    { key: 'temperature_tone', value: '0.3', category: 'ai', description: 'Temperature für Tonalitäts-Analyse' },
    { key: 'default_tone', value: 'professionell', category: 'generation', description: 'Standard-Tonalität' },
    { key: 'default_focus', value: 'skills', category: 'generation', description: 'Standard-Fokus' },
    { key: 'cover_letter_min_words', value: '300', category: 'generation', description: 'Minimale Anschreiben-Länge (Wörter)' },
    { key: 'cover_letter_max_words', value: '400', category: 'generation', description: 'Maximale Anschreiben-Länge (Wörter)' },
  ];

  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value, category, description)
    VALUES (?, ?, ?, ?)
  `);

  for (const setting of defaultSettings) {
    insertSetting.run(setting.key, setting.value, setting.category, setting.description);
  }
  
  return db;
}
