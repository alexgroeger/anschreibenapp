import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { extractPrompt } from '@/prompts/extract';
import { matchPrompt } from '@/prompts/match';
import { generatePrompt } from '@/prompts/generate';
import { toneAnalysisPrompt } from '@/prompts/tone-analysis';
import { getDatabase, syncDatabaseAfterWrite } from '@/lib/database/client';
import { uploadFileToCloud, getBucket } from '@/lib/storage/sync';

const promptsDir = join(process.cwd(), 'prompts');

// Prompt definitions (Fallback zu Dateien)
const promptFiles: Record<string, { file: string; content: string }> = {
  extract: { file: 'extract.ts', content: extractPrompt },
  match: { file: 'match.ts', content: matchPrompt },
  generate: { file: 'generate.ts', content: generatePrompt },
  'tone-analysis': { file: 'tone-analysis.ts', content: toneAnalysisPrompt },
};

// GET: Alle Prompts abrufen (aus Datenbank, falls vorhanden, sonst aus Dateien)
export async function GET(request: NextRequest) {
  try {
    const db = getDatabase();
    const prompts: Record<string, any> = {};

    for (const [name, promptDef] of Object.entries(promptFiles)) {
      // Versuche zuerst aus der Datenbank zu laden
      const getPrompt = db.prepare(`
        SELECT content, updated_at FROM prompts WHERE prompt_name = ?
      `);
      const dbPrompt = getPrompt.get(name) as any;

      if (dbPrompt) {
        // Verwende Prompt aus Datenbank
        prompts[name] = {
          name,
          content: dbPrompt.content,
          file: promptDef.file,
          updated_at: dbPrompt.updated_at,
        };
      } else {
        // Fallback zu Datei
        prompts[name] = {
          name,
          content: promptDef.content,
          file: promptDef.file,
        };
      }
    }

    return NextResponse.json({ prompts }, { status: 200 });
  } catch (error) {
    console.error('Error fetching prompts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prompts' },
      { status: 500 }
    );
  }
}

// POST: Prompt aktualisieren
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { promptName, content } = body;

    if (!promptName || !content) {
      return NextResponse.json(
        { error: 'promptName and content are required' },
        { status: 400 }
      );
    }

    if (!promptFiles[promptName]) {
      return NextResponse.json(
        { error: `Unknown prompt: ${promptName}` },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // Hole aktuellen Inhalt für Versionshistorie
    const getCurrentPrompt = db.prepare(`
      SELECT content FROM prompts WHERE prompt_name = ?
    `);
    const currentPrompt = getCurrentPrompt.get(promptName) as any;
    const oldContent = currentPrompt?.content || promptFiles[promptName].content;

    // Speichere Version in Versionshistorie
    const getLatestVersion = db.prepare(`
      SELECT MAX(version) as maxVersion FROM prompt_versions WHERE prompt_name = ?
    `);
    const result = getLatestVersion.get(promptName) as any;
    const nextVersion = (result?.maxVersion || 0) + 1;

    const insertVersion = db.prepare(`
      INSERT INTO prompt_versions (prompt_name, content, version, created_by)
      VALUES (?, ?, ?, ?)
    `);
    insertVersion.run(promptName, oldContent, nextVersion, 'admin');

    // Speichere aktuellen Prompt in Datenbank (UPSERT)
    const upsertPrompt = db.prepare(`
      INSERT INTO prompts (prompt_name, content, updated_at, updated_by)
      VALUES (?, ?, CURRENT_TIMESTAMP, ?)
      ON CONFLICT(prompt_name) DO UPDATE SET
        content = excluded.content,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = excluded.updated_by
    `);
    upsertPrompt.run(promptName, content, 'admin');

    // Optional: Speichere auch in Cloud Storage (falls konfiguriert)
    const bucket = getBucket();
    if (bucket) {
      try {
        const promptDef = promptFiles[promptName];
        const fileContent = `export const ${promptName === 'tone-analysis' ? 'toneAnalysisPrompt' : promptName + 'Prompt'} = \`${content}\``;
        const cloudPath = `prompts/${promptDef.file}`;
        const cloudFile = bucket.file(cloudPath);
        await cloudFile.save(Buffer.from(fileContent, 'utf-8'), {
          metadata: {
            contentType: 'text/typescript',
            cacheControl: 'no-cache',
          },
        });
        console.log(`Prompt saved to Cloud Storage: ${cloudPath}`);
      } catch (cloudError) {
        console.warn('Failed to save prompt to Cloud Storage:', cloudError);
        // Nicht kritisch, Datenbank ist die Hauptquelle
      }
    }

    // Versuche auch lokal zu speichern (für lokale Entwicklung)
    try {
      const promptDef = promptFiles[promptName];
      const filePath = join(promptsDir, promptDef.file);
      const fileContent = `export const ${promptName === 'tone-analysis' ? 'toneAnalysisPrompt' : promptName + 'Prompt'} = \`${content}\``;
      writeFileSync(filePath, fileContent, 'utf-8');
    } catch (fileError) {
      // In Cloud Run ist das Dateisystem möglicherweise schreibgeschützt
      // Das ist nicht kritisch, da die Datenbank die Hauptquelle ist
      console.warn('Failed to save prompt to local file system:', fileError);
    }

    // Sync database to Cloud Storage after write
    await syncDatabaseAfterWrite();

    return NextResponse.json(
      { success: true, version: nextVersion },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating prompt:', error);
    return NextResponse.json(
      { error: 'Failed to update prompt' },
      { status: 500 }
    );
  }
}

