import { NextRequest, NextResponse } from 'next/server';
import { generatePrompt } from '@/prompts/generate';
import { toneAnalysisPrompt } from '@/prompts/tone-analysis';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { getDatabase } from '@/lib/database/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { matchResult, jobDescription, tone, focus } = body;

    if (!matchResult || !jobDescription) {
      return NextResponse.json(
        { error: 'Match result and job description are required' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // Load CV from database
    const resumeData = db.prepare('SELECT * FROM resume ORDER BY updated_at DESC LIMIT 1').get() as any;
    const resume = resumeData?.content || 'Kein Lebenslauf hinterlegt.';

    // Load old cover letters and analyze tone
    const oldCoverLettersData = db
      .prepare('SELECT * FROM old_cover_letters ORDER BY uploaded_at DESC')
      .all() as any[];
    
    let toneAnalysis = 'Keine historischen Anschreiben vorhanden. Verwende einen professionellen, modernen Ton.';
    
    if (oldCoverLettersData.length > 0) {
      const oldCoverLetters = oldCoverLettersData
        .map(letter => `---\n${letter.company || 'Unbekannt'} - ${letter.position || 'Unbekannt'}\n${letter.content}`)
        .join('\n\n');
      
      const tonePrompt = toneAnalysisPrompt.replace('{oldCoverLetters}', oldCoverLetters);
      
      try {
        const { text } = await generateText({
          model: google('gemini-1.5-pro'),
          prompt: tonePrompt,
          temperature: 0.3,
        });
        toneAnalysis = text;
      } catch (error) {
        console.error('Error analyzing tone:', error);
        toneAnalysis = 'Fehler bei der Tonalitäts-Analyse. Verwende einen professionellen Ton.';
      }
    }

    const prompt = generatePrompt
      .replace('{matchResult}', matchResult)
      .replace('{resume}', resume)
      .replace('{toneAnalysis}', toneAnalysis)
      .replace('{tone}', tone || 'professionell')
      .replace('{focus}', focus || 'skills')
      .replace('{jobDescription}', jobDescription);

    const { text } = await generateText({
      model: google('gemini-1.5-pro'),
      prompt,
      temperature: 0.7,
    });

    return NextResponse.json({ coverLetter: text }, { status: 200 });
  } catch (error) {
    console.error('Error generating cover letter:', error);
    return NextResponse.json(
      { error: 'Failed to generate cover letter' },
      { status: 500 }
    );
  }
}
