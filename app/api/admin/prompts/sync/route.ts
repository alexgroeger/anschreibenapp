import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/client';
import { extractPrompt } from '@/prompts/extract';
import { matchPrompt } from '@/prompts/match';
import { generatePrompt } from '@/prompts/generate';
import { toneAnalysisPrompt } from '@/prompts/tone-analysis';

// Prompt definitions from files
const promptFiles: Record<string, string> = {
  extract: extractPrompt,
  match: matchPrompt,
  generate: generatePrompt,
  'tone-analysis': toneAnalysisPrompt,
};

// POST: Synchronisiere Prompts von Dateien zur Datenbank
export async function POST(request: NextRequest) {
  try {
    const db = getDatabase();
    const results: Record<string, { updated: boolean; message: string }> = {};

    for (const [promptName, fileContent] of Object.entries(promptFiles)) {
      // Hole aktuellen Inhalt aus der Datenbank für Versionshistorie
      const getCurrentPrompt = db.prepare(`
        SELECT content FROM prompts WHERE prompt_name = ?
      `);
      const currentPrompt = getCurrentPrompt.get(promptName) as { content: string } | undefined;
      const oldContent = currentPrompt?.content || null;

      // Prüfe, ob sich der Inhalt geändert hat
      if (oldContent === fileContent) {
        results[promptName] = {
          updated: false,
          message: 'Keine Änderungen (bereits synchronisiert)',
        };
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

      results[promptName] = {
        updated: true,
        message: oldContent ? 'Prompt aktualisiert (alte Version in Historie gespeichert)' : 'Prompt erstellt',
      };
    }

    const updatedCount = Object.values(results).filter(r => r.updated).length;

    return NextResponse.json(
      {
        success: true,
        message: `${updatedCount} Prompt(s) synchronisiert`,
        results,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error syncing prompts:', error);
    return NextResponse.json(
      { error: 'Failed to sync prompts', details: error.message },
      { status: 500 }
    );
  }
}

