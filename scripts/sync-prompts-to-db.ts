import { readFileSync } from 'fs';
import { join } from 'path';
import Database from 'better-sqlite3';
import { extractPrompt } from '../prompts/extract';
import { matchPrompt } from '../prompts/match';
import { generatePrompt } from '../prompts/generate';
import { toneAnalysisPrompt } from '../prompts/tone-analysis';

const dbPath = join(process.cwd(), 'data', 'anschreiben.db');

// Prompt definitions from files
const promptFiles: Record<string, string> = {
  extract: extractPrompt,
  match: matchPrompt,
  generate: generatePrompt,
  'tone-analysis': toneAnalysisPrompt,
};

function syncPromptsToDatabase() {
  let db: Database.Database;
  try {
    db = new Database(dbPath);
    console.log('✅ Datenbank geöffnet\n');
  } catch (error) {
    console.error('❌ Fehler beim Öffnen der Datenbank:', error);
    return;
  }

  try {
    for (const [promptName, fileContent] of Object.entries(promptFiles)) {
      console.log(`📝 Synchronisiere Prompt: ${promptName}...`);

      // Hole aktuellen Inhalt aus der Datenbank für Versionshistorie
      const getCurrentPrompt = db.prepare(`
        SELECT content FROM prompts WHERE prompt_name = ?
      `);
      const currentPrompt = getCurrentPrompt.get(promptName) as { content: string } | undefined;
      const oldContent = currentPrompt?.content || null;

      // Prüfe, ob sich der Inhalt geändert hat
      if (oldContent === fileContent) {
        console.log(`   ✓ Keine Änderungen (bereits synchronisiert)`);
        continue;
      }

      // Speichere alte Version in Versionshistorie (nur wenn es eine alte Version gibt)
      if (oldContent) {
        const getLatestVersion = db.prepare(`
          SELECT MAX(version) as maxVersion FROM prompt_versions WHERE prompt_name = ?
        `);
        const result = getLatestVersion.get(promptName) as { maxVersion: number } | undefined;
        const nextVersion = (result?.maxVersion || 0) + 1;

        const insertVersion = db.prepare(`
          INSERT INTO prompt_versions (prompt_name, content, version, created_by)
          VALUES (?, ?, ?, ?)
        `);
        insertVersion.run(promptName, oldContent, nextVersion, 'system-sync');
        console.log(`   📦 Alte Version ${nextVersion} in Historie gespeichert`);
      }

      // Speichere neuen Prompt in Datenbank (UPSERT)
      const upsertPrompt = db.prepare(`
        INSERT INTO prompts (prompt_name, content, updated_at, updated_by)
        VALUES (?, ?, CURRENT_TIMESTAMP, ?)
        ON CONFLICT(prompt_name) DO UPDATE SET
          content = excluded.content,
          updated_at = CURRENT_TIMESTAMP,
          updated_by = excluded.updated_by
      `);
      upsertPrompt.run(promptName, fileContent, 'system-sync');
      console.log(`   ✅ Prompt in Datenbank aktualisiert`);
    }

    console.log('\n✅ Alle Prompts wurden erfolgreich synchronisiert!');
  } catch (error) {
    console.error('❌ Fehler beim Synchronisieren:', error);
  } finally {
    db.close();
  }
}

// Main execution
console.log('🔄 Synchronisiere Prompts von Dateien zur Datenbank...\n');
syncPromptsToDatabase();


