import { NextRequest, NextResponse } from 'next/server';
import { extractPrompt } from '@/prompts/extract';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
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
    const temperature = parseFloat(settings.temperature_extract || '0.3');

    const prompt = extractPrompt.replace('{jobDescription}', jobDescription);

    const { text } = await generateText({
      model: google(model),
      prompt,
      temperature,
    });

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
  } catch (error) {
    console.error('Error extracting job data:', error);
    return NextResponse.json(
      { error: 'Failed to extract job data' },
      { status: 500 }
    );
  }
}
