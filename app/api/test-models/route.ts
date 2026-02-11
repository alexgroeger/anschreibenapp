import { NextResponse } from 'next/server';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

export async function GET() {
  const modelsToTest = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.5-pro',
    'gemini-3-flash-preview',
    'gemini-3-pro-preview',
    'gemini-2.0-flash',
  ];

  const results: Array<{ model: string; success: boolean; error?: string }> = [];

  for (const modelName of modelsToTest) {
    try {
      const result = await generateText({
        model: google(modelName),
        prompt: 'Say OK',
        temperature: 0.1,
      });
      results.push({ model: modelName, success: true });
      // Wenn eines funktioniert, breche ab
      break;
    } catch (error: any) {
      results.push({
        model: modelName,
        success: false,
        error: error.message || 'Unknown error',
      });
    }
  }

  return NextResponse.json({ results }, { status: 200 });
}
