import { NextRequest, NextResponse } from 'next/server';
import { extractPrompt } from '@/prompts/extract';
import { matchPrompt } from '@/prompts/match';
import { generatePrompt } from '@/prompts/generate';
import { toneAnalysisPrompt } from '@/prompts/tone-analysis';
import { getDatabase } from '@/lib/database/client';

const prompts: Record<string, string> = {
  extract: extractPrompt,
  match: matchPrompt,
  generate: generatePrompt,
  'tone-analysis': toneAnalysisPrompt,
};

// GET: Einzelnen Prompt abrufen
export async function GET(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const promptName = params.name;

    if (!prompts[promptName]) {
      return NextResponse.json(
        { error: `Unknown prompt: ${promptName}` },
        { status: 404 }
      );
    }

    // Get version history
    const db = getDatabase();
    const versions = db
      .prepare(`
        SELECT * FROM prompt_versions 
        WHERE prompt_name = ? 
        ORDER BY version DESC 
        LIMIT 10
      `)
      .all(promptName);

    return NextResponse.json(
      {
        name: promptName,
        content: prompts[promptName],
        versions: versions,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching prompt:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prompt' },
      { status: 500 }
    );
  }
}
