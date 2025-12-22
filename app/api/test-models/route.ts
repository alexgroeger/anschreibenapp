import { NextResponse } from 'next/server';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

export async function GET() {
  const modelsToTest = [
    'gemini-1.0-pro-001',
    'gemini-1.0-pro-002',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-pro',
    'gemini-2.0-flash-exp',
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
