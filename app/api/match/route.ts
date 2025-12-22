import { NextRequest, NextResponse } from 'next/server';
import { matchPrompt } from '@/prompts/match';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { getDatabase } from '@/lib/database/client';
import { getSettings } from '@/lib/database/settings';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobDescription } = body;

    if (!jobDescription || typeof jobDescription !== 'string') {
      return NextResponse.json(
        { error: 'Job description is required' },
        { status: 400 }
      );
    }

    // Load settings from database
    const settings = getSettings();
    const model = settings.ai_model || 'gemini-1.5-pro';
    const temperature = parseFloat(settings.temperature_match || '0.5');

    const db = getDatabase();

    // Load CV from database
    const resumeData = db.prepare('SELECT * FROM resume ORDER BY updated_at DESC LIMIT 1').get() as any;
    const resume = resumeData?.content || 'Kein Lebenslauf hinterlegt.';

    // Load old cover letters from database
    const oldCoverLettersData = db
      .prepare('SELECT * FROM old_cover_letters ORDER BY uploaded_at DESC')
      .all() as any[];
    
    const oldCoverLetters = oldCoverLettersData.length > 0
      ? oldCoverLettersData.map(letter => `---\n${letter.company || 'Unbekannt'} - ${letter.position || 'Unbekannt'}\n${letter.content}`).join('\n\n')
      : 'Keine historischen Anschreiben vorhanden.';

    const prompt = matchPrompt
      .replace('{jobDescription}', jobDescription)
      .replace('{resume}', resume)
      .replace('{oldCoverLetters}', oldCoverLetters);

    const { text } = await generateText({
      model: google(model),
      prompt,
      temperature,
    });

    return NextResponse.json({ matchResult: text }, { status: 200 });
  } catch (error) {
    console.error('Error matching:', error);
    return NextResponse.json(
      { error: 'Failed to perform matching' },
      { status: 500 }
    );
  }
}
