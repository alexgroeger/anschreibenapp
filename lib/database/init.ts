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
      match_result TEXT,
      cover_letter TEXT,
      status TEXT DEFAULT 'rueckmeldung_ausstehend',
      sent_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Add match_result column if it doesn't exist (for existing databases)
    PRAGMA table_info(applications);
    -- Check if match_result column exists, if not add it
    -- Note: SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN
    -- So we'll handle this in a try-catch or check first

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

    CREATE TABLE IF NOT EXISTS prompts (
      prompt_name TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_by TEXT
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

    CREATE TABLE IF NOT EXISTS cover_letter_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      version_number INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT DEFAULT 'user',
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cover_letter_suggestions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL,
      version_id INTEGER,
      paragraph_index INTEGER,
      original_text TEXT,
      suggested_text TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
      FOREIGN KEY (version_id) REFERENCES cover_letter_versions(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      due_date DATETIME NOT NULL,
      reminder_type TEXT NOT NULL DEFAULT 'custom',
      status TEXT DEFAULT 'pending',
      is_recurring INTEGER DEFAULT 0,
      recurrence_pattern TEXT,
      recurrence_interval INTEGER DEFAULT 1,
      recurrence_end_date DATETIME,
      next_occurrence DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS application_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_type TEXT,
      file_size INTEGER,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS application_documents_fts USING fts5(
      document_id UNINDEXED,
      content
    );
  `);
  
    // Add match_result column to applications table if it doesn't exist
    try {
      const tableInfo = db.prepare("PRAGMA table_info(applications)").all() as any[];
      const hasMatchResult = tableInfo.some((col: any) => col.name === 'match_result');
      if (!hasMatchResult) {
        db.exec(`ALTER TABLE applications ADD COLUMN match_result TEXT;`);
      }
      
      // Add deadline column to applications table if it doesn't exist
      const hasDeadline = tableInfo.some((col: any) => col.name === 'deadline');
      if (!hasDeadline) {
        db.exec(`ALTER TABLE applications ADD COLUMN deadline DATE;`);
      }
      
      // Add match_score column to applications table if it doesn't exist
      const hasMatchScore = tableInfo.some((col: any) => col.name === 'match_score');
      if (!hasMatchScore) {
        db.exec(`ALTER TABLE applications ADD COLUMN match_score TEXT;`);
      }
      
      // Add job document columns to applications table if they don't exist
      const hasJobDocumentFilename = tableInfo.some((col: any) => col.name === 'job_document_filename');
      if (!hasJobDocumentFilename) {
        db.exec(`ALTER TABLE applications ADD COLUMN job_document_filename TEXT;`);
      }
      
      const hasJobDocumentPath = tableInfo.some((col: any) => col.name === 'job_document_path');
      if (!hasJobDocumentPath) {
        db.exec(`ALTER TABLE applications ADD COLUMN job_document_path TEXT;`);
      }
      
      const hasJobDocumentType = tableInfo.some((col: any) => col.name === 'job_document_type');
      if (!hasJobDocumentType) {
        db.exec(`ALTER TABLE applications ADD COLUMN job_document_type TEXT;`);
      }

      // Add description column to cover_letter_versions table if it doesn't exist
      const versionsTableInfo = db.prepare("PRAGMA table_info(cover_letter_versions)").all() as any[];
      const hasDescription = versionsTableInfo.some((col: any) => col.name === 'description');
      if (!hasDescription) {
        db.exec(`ALTER TABLE cover_letter_versions ADD COLUMN description TEXT;`);
      }

      // Check if application_documents table exists
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='application_documents'").all() as any[];
      const hasApplicationDocuments = tables.length > 0;
      if (!hasApplicationDocuments) {
        db.exec(`
          CREATE TABLE application_documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            application_id INTEGER NOT NULL,
            filename TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_type TEXT,
            file_size INTEGER,
            uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
          );
        `);
      }

      // Check if FTS5 table exists
      const ftsTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='application_documents_fts'").all() as any[];
      const hasFtsTable = ftsTables.length > 0;
      if (!hasFtsTable) {
        try {
          db.exec(`
            CREATE VIRTUAL TABLE application_documents_fts USING fts5(
              document_id UNINDEXED,
              content
            );
          `);
        } catch (ftsError: any) {
          // FTS5 might not be available, log but don't fail
          console.warn('Could not create FTS5 table:', ftsError.message);
        }
      }
    } catch (error) {
      // Column might already exist, ignore error
      console.log('Column check:', error);
    }
  
  // Initialize default settings
  const defaultSettings = [
    { key: 'ai_model', value: 'gemini-1.5-pro', category: 'ai', description: 'KI-Modell für alle Operationen' },
    { key: 'temperature_extract', value: '0.3', category: 'ai', description: 'Temperature für Extraktion' },
    { key: 'temperature_generate', value: '0.7', category: 'ai', description: 'Temperature für Generierung' },
    { key: 'temperature_match', value: '0.5', category: 'ai', description: 'Temperature für Matching' },
    { key: 'temperature_tone', value: '0.3', category: 'ai', description: 'Temperature für Tonalitäts-Analyse' },
    { key: 'google_api_key', value: 'AIzaSyCMnSz6BrDDPU0qTNoLXVooVDo335A6P5o', category: 'api', description: 'Google Gemini API-Key (leer lassen, um .env.local zu verwenden)' },
    { key: 'cover_letter_max_words', value: '400', category: 'generation', description: 'Maximale Anschreiben-Länge (Wörter)' },
    { key: 'cover_letter_min_words', value: '300', category: 'generation', description: 'Minimale Anschreiben-Länge (Wörter)' },
    { key: 'default_emphasis', value: 'kombiniert', category: 'generation', description: 'Standard-Betonung' },
    { key: 'default_focus', value: 'skills', category: 'generation', description: 'Standard-Fokus' },
    { key: 'default_formality', value: 'formal', category: 'generation', description: 'Standard-Formalität' },
    { key: 'default_text_length', value: 'mittel', category: 'generation', description: 'Standard-Textlänge' },
    { key: 'default_tone', value: 'professionell', category: 'generation', description: 'Standard-Tonalität' },
    { key: 'excluded_formulations', value: 'mit großem Interesse habe ich Ihre Stellenausschreibung für die Position XYZ gelesen', category: 'generation', description: 'Ausgeschlossene Formulierungen (eine pro Zeile)' },
    { key: 'favorite_formulations', value: '', category: 'generation', description: 'Favorisierte Formulierungen (eine pro Zeile)' },
  ];

  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value, category, description)
    VALUES (?, ?, ?, ?)
  `);

  for (const setting of defaultSettings) {
    insertSetting.run(setting.key, setting.value, setting.category, setting.description);
  }
  
  // Create indexes for performance optimization
  db.exec(`
    -- Applications table indexes
    CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
    CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_applications_sent_at ON applications(sent_at);
    CREATE INDEX IF NOT EXISTS idx_applications_deadline ON applications(deadline);
    CREATE INDEX IF NOT EXISTS idx_applications_company ON applications(company);
    CREATE INDEX IF NOT EXISTS idx_applications_position ON applications(position);
    CREATE INDEX IF NOT EXISTS idx_applications_status_created_at ON applications(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_applications_sent_at_null ON applications(sent_at) WHERE sent_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_applications_deadline_asc ON applications(deadline ASC) WHERE deadline IS NOT NULL;
    
    -- Contact persons indexes
    CREATE INDEX IF NOT EXISTS idx_contact_persons_application_id ON contact_persons(application_id);
    CREATE INDEX IF NOT EXISTS idx_contact_persons_name ON contact_persons(name);
    
    -- Old cover letters indexes
    CREATE INDEX IF NOT EXISTS idx_old_cover_letters_uploaded_at ON old_cover_letters(uploaded_at DESC);
    CREATE INDEX IF NOT EXISTS idx_old_cover_letters_company ON old_cover_letters(company);
    
    -- Cover letter versions indexes
    CREATE INDEX IF NOT EXISTS idx_cover_letter_versions_application_id ON cover_letter_versions(application_id);
    CREATE INDEX IF NOT EXISTS idx_cover_letter_versions_created_at ON cover_letter_versions(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_cover_letter_versions_application_created ON cover_letter_versions(application_id, created_at DESC);
    
    -- Cover letter suggestions indexes
    CREATE INDEX IF NOT EXISTS idx_cover_letter_suggestions_application_id ON cover_letter_suggestions(application_id);
    CREATE INDEX IF NOT EXISTS idx_cover_letter_suggestions_status ON cover_letter_suggestions(status);
    CREATE INDEX IF NOT EXISTS idx_cover_letter_suggestions_version_id ON cover_letter_suggestions(version_id);
    
    -- Reminders indexes
    CREATE INDEX IF NOT EXISTS idx_reminders_application_id ON reminders(application_id);
    CREATE INDEX IF NOT EXISTS idx_reminders_due_date ON reminders(due_date);
    CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status);
    CREATE INDEX IF NOT EXISTS idx_reminders_next_occurrence ON reminders(next_occurrence);
    CREATE INDEX IF NOT EXISTS idx_reminders_status_due_date ON reminders(status, due_date);
    CREATE INDEX IF NOT EXISTS idx_reminders_pending_next_occurrence ON reminders(next_occurrence) WHERE status = 'pending' AND next_occurrence IS NOT NULL;
    
    -- Application documents indexes
    CREATE INDEX IF NOT EXISTS idx_application_documents_application_id ON application_documents(application_id);
    CREATE INDEX IF NOT EXISTS idx_application_documents_uploaded_at ON application_documents(uploaded_at DESC);
    CREATE INDEX IF NOT EXISTS idx_application_documents_file_type ON application_documents(file_type);
    
    -- Resume indexes
    CREATE INDEX IF NOT EXISTS idx_resume_updated_at ON resume(updated_at DESC);
    
    -- Settings indexes (for faster lookups)
    CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
    CREATE INDEX IF NOT EXISTS idx_settings_category ON settings(category);
  `);
  
  return db;
}
