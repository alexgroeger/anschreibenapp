import { NextResponse } from 'next/server';
import { generateTextWithFallback } from '@/lib/ai/model-helper';

export async function GET() {
  try {
    // Teste die Verbindung mit einem einfachen Prompt
    const { text, model } = await generateTextWithFallback(
      'Antworte nur mit "OK"',
      undefined,
      0.1
    );

    return NextResponse.json(
      { 
        success: true, 
        message: 'API-Verbindung erfolgreich!',
        response: text,
        model: model,
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('API-Verbindungsfehler:', error);
    
    let errorMessage = 'Unbekannter Fehler';
    if (error.message?.includes('API key') || error.type === 'API_KEY_ERROR') {
      errorMessage = 'API-Key fehlt oder ist ungültig. Bitte überprüfe deine Admin-Einstellungen oder .env.local Datei.';
    } else if (error.message?.includes('quota') || error.type === 'QUOTA_ERROR') {
      errorMessage = 'API-Quota überschritten. Bitte überprüfe dein Google Cloud-Konto.';
    } else {
      errorMessage = error.message || 'Fehler bei der API-Verbindung';
    }

    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: error.message,
        type: error.type,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
