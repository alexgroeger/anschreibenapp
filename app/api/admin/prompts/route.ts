import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { extractPrompt } from '@/prompts/extract';
import { matchPrompt } from '@/prompts/match';
import { generatePrompt } from '@/prompts/generate';
import { toneAnalysisPrompt } from '@/prompts/tone-analysis';
import { getDatabase } from '@/lib/database/client';

const promptsDir = join(process.cwd(), 'prompts');

// Prompt definitions
const promptFiles: Record<string, { file: string; content: string }> = {
  extract: { file: 'extract.ts', content: extractPrompt },
  match: { file: 'match.ts', content: matchPrompt },
  generate: { file: 'generate.ts', content: generatePrompt },
  'tone-analysis': { file: 'tone-analysis.ts', content: toneAnalysisPrompt },
};

// GET: Alle Prompts abrufen
export async function GET(request: NextRequest) {
  try {
    const prompts: Record<string, any> = {};

    for (const [name, promptDef] of Object.entries(promptFiles)) {
      prompts[name] = {
        name,
        content: promptDef.content,
        file: promptDef.file,
      };
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

    const promptDef = promptFiles[promptName];
    const filePath = join(promptsDir, promptDef.file);

    // Save version to database before updating
    const db = getDatabase();
    const getLatestVersion = db.prepare(`
      SELECT MAX(version) as maxVersion FROM prompt_versions WHERE prompt_name = ?
    `);
    const result = getLatestVersion.get(promptName) as any;
    const nextVersion = (result?.maxVersion || 0) + 1;

    const insertVersion = db.prepare(`
      INSERT INTO prompt_versions (prompt_name, content, version, created_by)
      VALUES (?, ?, ?, ?)
    `);
    insertVersion.run(promptName, promptDef.content, nextVersion, 'admin');

    // Update the prompt file
    const fileContent = `export const ${promptName === 'tone-analysis' ? 'toneAnalysisPrompt' : promptName + 'Prompt'} = \`${content}\``;
    writeFileSync(filePath, fileContent, 'utf-8');

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
