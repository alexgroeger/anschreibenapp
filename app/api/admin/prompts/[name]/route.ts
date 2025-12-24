import { NextRequest, NextResponse } from 'next/server';
import { getPrompt } from '@/lib/prompts';
import { getDatabase } from '@/lib/database/client';

// GET: Einzelnen Prompt abrufen
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name: promptName } = await params;

    // Validate prompt name
    const validPrompts = ['extract', 'match', 'generate', 'tone-analysis'];
    if (!validPrompts.includes(promptName)) {
      return NextResponse.json(
        { error: `Unknown prompt: ${promptName}` },
        { status: 404 }
      );
    }

    // Get prompt content (from database or fallback)
    let promptContent: string;
    try {
      promptContent = getPrompt(promptName);
    } catch (error) {
      return NextResponse.json(
        { error: `Failed to load prompt: ${promptName}` },
        { status: 500 }
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
        content: promptContent,
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
