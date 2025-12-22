import { NextRequest, NextResponse } from 'next/server';
import { generatePrompt } from '@/prompts/generate';
import { toneAnalysisPrompt } from '@/prompts/tone-analysis';
import { getDatabase } from '@/lib/database/client';
import { getSettings } from '@/lib/database/settings';
import { generateTextWithFallback } from '@/lib/ai/model-helper';

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

    // Load settings from database
    const settings = getSettings();
    const preferredModel = settings.ai_model;
    const temperatureGenerate = parseFloat(settings.temperature_generate || '0.7');
    const temperatureTone = parseFloat(settings.temperature_tone || '0.3');
    const defaultTone = settings.default_tone || 'professionell';
    const defaultFocus = settings.default_focus || 'skills';

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
        const { text } = await generateTextWithFallback(
          tonePrompt,
          preferredModel,
          temperatureTone
        );
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
      .replace('{tone}', tone || defaultTone)
      .replace('{focus}', focus || defaultFocus)
      .replace('{jobDescription}', jobDescription);

    const { text } = await generateTextWithFallback(
      prompt,
      preferredModel,
      temperatureGenerate
    );

    return NextResponse.json({ coverLetter: text }, { status: 200 });
  } catch (error: any) {
    console.error('Error generating cover letter:', error);
    
    const errorResponse: any = {
      error: error.message || 'Failed to generate cover letter',
      type: error.type || 'UNKNOWN_ERROR',
    };
    
    if (error.type === 'QUOTA_ERROR') {
      errorResponse.type = 'QUOTA_ERROR';
      errorResponse.model = error.model;
      errorResponse.helpUrl = 'https://ai.dev/usage?tab=rate-limit';
      errorResponse.message = 'API-Quota überschritten';
    } else if (error.type === 'API_KEY_ERROR') {
      errorResponse.type = 'API_KEY_ERROR';
      errorResponse.message = 'API-Key Problem';
    } else if (error.type === 'MODEL_ERROR') {
      errorResponse.type = 'MODEL_ERROR';
      errorResponse.testedModels = error.testedModels;
      errorResponse.message = 'Kein funktionierendes Modell gefunden';
    }
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
