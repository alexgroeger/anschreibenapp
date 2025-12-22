import { NextRequest } from 'next/server';
import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { getGoogleApiKey } from '@/lib/ai/api-key';
import { getDatabase } from '@/lib/database/client';
import { getSettings } from '@/lib/database/settings';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, coverLetter, matchResult, jobDescription, extraction } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response('Messages are required', { status: 400 });
    }

    if (!coverLetter) {
      return new Response('Cover letter is required', { status: 400 });
    }

    // Load settings
    const settings = getSettings();
    const preferredModel = settings.ai_model || 'gemini-1.5-pro';
    const temperature = parseFloat(settings.temperature_generate || '0.7');

    // Get API key
    const apiKey = getGoogleApiKey();
    if (!apiKey) {
      return new Response('API key not configured', { status: 500 });
    }

    // Temporarily set environment variable if key comes from DB
    const originalApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const needsRestore = apiKey !== originalApiKey;
    if (needsRestore) {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKey;
    }

    try {
      // Load CV and old cover letters for context
      const db = getDatabase();
      const resumeData = db.prepare('SELECT * FROM resume ORDER BY updated_at DESC LIMIT 1').get() as any;
      const resume = resumeData?.content || 'Kein Lebenslauf hinterlegt.';

      // Build system prompt with context
      const systemPrompt = `Du bist ein Experte für Bewerbungsschreiben. Du hilfst dem Nutzer dabei, sein Anschreiben zu verbessern.

**Kontext:**
- Aktuelles Anschreiben: ${coverLetter}
- Jobbeschreibung: ${jobDescription || 'Nicht verfügbar'}
- Matching-Ergebnis: ${matchResult || 'Nicht verfügbar'}
- Lebenslauf: ${resume.substring(0, 1000)}${resume.length > 1000 ? '...' : ''}
${extraction ? `- Extraktionsdaten: ${JSON.stringify(extraction).substring(0, 500)}` : ''}

**Deine Aufgabe:**
- Beantworte Fragen zum Anschreiben
- Gib konstruktives Feedback
- Vorschläge für Verbesserungen
- Wenn der Nutzer Änderungen wünscht, gib das vollständige überarbeitete Anschreiben zurück
- Wenn du das Anschreiben änderst, gib NUR das neue Anschreiben zurück, ohne zusätzliche Erklärungen (außer der Nutzer fragt explizit danach)
- Antworte auf Deutsch`;

      // Convert messages to AI SDK format - handle both old and new message formats
      const aiMessages = messages.map((msg: any) => {
        // Handle different message formats
        let content = ''
        if (msg.text) {
          content = msg.text
        } else if (msg.content) {
          content = msg.content
        } else if (msg.parts) {
          content = msg.parts
            .filter((part: any) => part.type === 'text')
            .map((part: any) => part.text)
            .join('')
        }
        
        return {
          role: msg.role === 'user' ? ('user' as const) : ('assistant' as const),
          content: content,
        }
      }) as Array<{ role: 'user' | 'assistant'; content: string }>;

      // Stream the response
      const result = await streamText({
        model: google(preferredModel),
        system: systemPrompt,
        messages: aiMessages,
        temperature,
      });

      return result.toTextStreamResponse();
    } finally {
      // Restore environment variable
      if (needsRestore) {
        if (originalApiKey !== undefined) {
          process.env.GOOGLE_GENERATIVE_AI_API_KEY = originalApiKey;
        } else {
          delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        }
      }
    }
  } catch (error: any) {
    console.error('Error in chat:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Chat error occurred' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
