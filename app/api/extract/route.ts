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
    
    let errorMessage = 'Failed to extract job data';
    if (error.message?.includes('quota') || error.message?.includes('Quota exceeded')) {
      errorMessage = 'API-Quota überschritten. Bitte überprüfe dein Google Cloud-Konto. Besuche https://ai.dev/usage?tab=rate-limit für Details.';
    } else if (error.message?.includes('API key')) {
      errorMessage = 'API-Key fehlt oder ist ungültig. Bitte überprüfe deine .env.local Datei.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
