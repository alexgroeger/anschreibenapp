import { NextResponse } from 'next/server';

export async function GET() {
  // Einfacher Test ohne API-Call - prüft nur ob der Server läuft
  return NextResponse.json(
    { 
      success: true, 
      message: 'Server läuft! API-Key Konfiguration muss manuell getestet werden.',
      hint: 'Bitte teste die API-Verbindung über die Hauptseite der App.',
      timestamp: new Date().toISOString()
    },
    { status: 200 }
  );
}
