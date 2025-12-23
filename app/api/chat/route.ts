import { NextRequest } from 'next/server';
import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { getGoogleApiKey } from '@/lib/ai/api-key';
import { getDatabase } from '@/lib/database/client';
import { getSettings } from '@/lib/database/settings';
import { parseParagraphs } from '@/lib/paragraph-parser';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, coverLetter, matchResult, jobDescription, extraction } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response('Messages are required', { status: 400 });
    }

    if (!coverLetter || coverLetter.trim() === '') {
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

      // Parse paragraphs from current cover letter for context
      const paragraphs = parseParagraphs(coverLetter);
      const paragraphInfo = paragraphs.map((p, i) => `Absatz ${i + 1}: ${p.text.substring(0, 100)}${p.text.length > 100 ? '...' : ''}`).join('\n');

      // Build system prompt with context
      const systemPrompt = `Du bist ein Experte für Bewerbungsschreiben. Du hilfst dem Nutzer dabei, sein Anschreiben zu verbessern.

**Kontext:**
- Aktuelles Anschreiben (in Absätzen getrennt durch doppelte Zeilenschaltung):
${paragraphInfo}

- Vollständiges Anschreiben: ${coverLetter}
- Jobbeschreibung: ${jobDescription || 'Nicht verfügbar'}
- Matching-Ergebnis: ${matchResult || 'Nicht verfügbar'}
- Lebenslauf: ${resume.substring(0, 1000)}${resume.length > 1000 ? '...' : ''}
${extraction ? `- Extraktionsdaten: ${JSON.stringify(extraction).substring(0, 500)}` : ''}

**Deine Aufgabe:**
- Beantworte Fragen zum Anschreiben
- Gib konstruktives Feedback
- Vorschläge für Verbesserungen

**Wichtig für Änderungen:**
- Wenn der Nutzer Änderungen an spezifischen Absätzen wünscht, gib nur die geänderten Absätze zurück
- Absätze werden durch doppelte Zeilenschaltung (\\n\\n) getrennt
- Wenn du das gesamte Anschreiben änderst, gib das vollständige überarbeitete Anschreiben zurück
- Wenn du nur einzelne Absätze änderst, gib diese Absätze mit Kontext zurück (z.B. "Absatz 2: [neuer Text]")
- Wenn du das Anschreiben änderst, gib NUR das neue/geänderte Anschreiben zurück, ohne zusätzliche Erklärungen (außer der Nutzer fragt explizit danach)
- Antworte auf Deutsch`;

      // Convert messages to AI SDK format - handle both old and new message formats
      const aiMessages = messages.map((msg: any) => {
        // Handle different message formats from useChat
        let content = ''
        if (msg.parts && Array.isArray(msg.parts)) {
          // New format with parts array
          content = msg.parts
            .filter((part: any) => part.type === 'text')
            .map((part: any) => part.text)
            .join('')
        } else if (msg.text) {
          content = msg.text
        } else if (msg.content) {
          content = msg.content
        } else if (typeof msg === 'string') {
          content = msg
        }
        
        return {
          role: msg.role === 'user' ? ('user' as const) : ('assistant' as const),
          content: content || '',
        }
      }).filter((msg: any) => msg.content) as Array<{ role: 'user' | 'assistant'; content: string }>;

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
