import { NextRequest, NextResponse } from 'next/server';
import { getPrompt } from '@/lib/prompts';
import { getDatabase } from '@/lib/database/client';
import { getSettings } from '@/lib/database/settings';
import { generateTextWithFallback } from '@/lib/ai/model-helper';

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
    const preferredModel = settings.ai_model;
    const temperature = parseFloat(settings.temperature_match || '0.5');

    const db = getDatabase();

    // Load CV from database
    const resumeData = db.prepare('SELECT * FROM resume ORDER BY updated_at DESC LIMIT 1').get() as any;
    const resume = resumeData?.content || 'Kein Lebenslauf hinterlegt.';

    // Load old cover letters from database (limit to last 20 for performance)
    const oldCoverLettersData = db
      .prepare('SELECT * FROM old_cover_letters ORDER BY uploaded_at DESC LIMIT 20')
      .all() as any[];
    
    const oldCoverLetters = oldCoverLettersData.length > 0
      ? oldCoverLettersData.map(letter => `---\n${letter.company || 'Unbekannt'} - ${letter.position || 'Unbekannt'}\n${letter.content}`).join('\n\n')
      : 'Keine historischen Anschreiben vorhanden.';

    const prompt = getPrompt('match')
      .replace('{jobDescription}', jobDescription)
      .replace('{resume}', resume)
      .replace('{oldCoverLetters}', oldCoverLetters);

    const { text } = await generateTextWithFallback(
      prompt,
      preferredModel,
      temperature
    );

    // Extract score from the response
    let matchScore: string | null = null;
    let scoreExplanation: string | null = null;
    let matchResultText = text;

    // Try multiple patterns to extract JSON score
    // Pattern 1: JSON in code block with ```json
    let jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    
    // Pattern 2: JSON in code block with ```
    if (!jsonMatch) {
      jsonMatch = text.match(/```\s*([\s\S]*?)\s*```/);
    }
    
    // Pattern 3: Raw JSON object at the beginning
    if (!jsonMatch) {
      const rawJsonMatch = text.match(/^\s*\{[\s\S]*?"score"[\s\S]*?\}\s*/);
      if (rawJsonMatch) {
        jsonMatch = [rawJsonMatch[0], rawJsonMatch[0]];
      }
    }

    if (jsonMatch) {
      try {
        // Clean the JSON string - remove markdown code block markers if present
        let jsonString = jsonMatch[1] || jsonMatch[0];
        jsonString = jsonString.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
        
        const scoreData = JSON.parse(jsonString);
        matchScore = scoreData.score || null;
        scoreExplanation = scoreData.score_explanation || null;
        
        // Remove the JSON block from the text - try multiple patterns
        matchResultText = text
          .replace(/```json\s*[\s\S]*?\s*```\s*/gi, '') // Remove ```json ... ```
          .replace(/```\s*\{[\s\S]*?"score"[\s\S]*?\}\s*```\s*/gi, '') // Remove ``` {...} ```
          .replace(/^\s*\{[\s\S]*?"score"[\s\S]*?\}\s*/m, '') // Remove raw JSON at start
          .trim();
      } catch (error) {
        console.error('Error parsing score JSON:', error);
        console.error('JSON string that failed:', jsonMatch[1] || jsonMatch[0]);
      }
    }

    return NextResponse.json({ 
      matchResult: matchResultText,
      matchScore: matchScore,
      scoreExplanation: scoreExplanation
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error matching:', error);
    
    const errorResponse: any = {
      error: error.message || 'Failed to perform matching',
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
