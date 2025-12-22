import { NextRequest, NextResponse } from 'next/server';
import { extractPrompt } from '@/prompts/extract';
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
    const temperature = parseFloat(settings.temperature_extract || '0.3');

    const prompt = extractPrompt.replace('{jobDescription}', jobDescription);

    const { text } = await generateTextWithFallback(
      prompt,
      preferredModel,
      temperature
    );

    // Try to parse JSON from the response
    let extractionData;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : text;
      extractionData = JSON.parse(jsonText);
    } catch (parseError) {
      // If JSON parsing fails, return structured text
      extractionData = {
        keyRequirements: text,
        culture: '',
        skills: '',
        contacts: [],
      };
    }

    return NextResponse.json({ extraction: extractionData }, { status: 200 });
  } catch (error: any) {
    console.error('Error extracting job data:', error);
    
    // Strukturierte Fehlerantwort
    const errorResponse: any = {
      error: error.message || 'Failed to extract job data',
      type: error.type || 'UNKNOWN_ERROR',
    };
    
    // Zusätzliche Informationen je nach Fehlertyp
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
    } else if (error.message?.includes('quota') || error.message?.includes('Quota exceeded')) {
      errorResponse.type = 'QUOTA_ERROR';
      errorResponse.message = 'API-Quota überschritten';
      errorResponse.helpUrl = 'https://ai.dev/usage?tab=rate-limit';
    } else if (error.message?.includes('API key')) {
      errorResponse.type = 'API_KEY_ERROR';
      errorResponse.message = 'API-Key Problem';
    }
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
