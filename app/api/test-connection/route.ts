import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

export async function GET() {
  try {
    // Teste die Verbindung mit einem einfachen Prompt
    // Versuche verschiedene Modellnamen basierend auf API-Version
    const modelsToTry = [
      'models/gemini-pro',
      'gemini-1.5-flash-latest', 
      'gemini-1.5-pro-latest',
      'gemini-pro'
    ];
    
    let text = '';
    let workingModel = '';
    let lastError: any = null;
    
    for (const modelName of modelsToTry) {
      try {
        const result = await generateText({
          model: google(modelName as any),
          prompt: 'Antworte nur mit "OK"',
          temperature: 0.1,
          maxTokens: 10,
        });
        text = result.text;
        workingModel = modelName;
        break;
      } catch (error: any) {
        lastError = error;
        continue;
      }
    }
    
    if (!text) {
      throw lastError || new Error('Kein Modell funktionierte');
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'API-Verbindung erfolgreich!',
        response: text,
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('API-Verbindungsfehler:', error);
    
    let errorMessage = 'Unbekannter Fehler';
    if (error.message?.includes('API key')) {
      errorMessage = 'API-Key fehlt oder ist ungültig. Bitte überprüfe deine .env.local Datei.';
    } else if (error.message?.includes('quota')) {
      errorMessage = 'API-Quota überschritten. Bitte überprüfe dein Google Cloud-Konto.';
    } else {
      errorMessage = error.message || 'Fehler bei der API-Verbindung';
    }

    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
