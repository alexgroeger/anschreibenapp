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

    // Debug logging
    console.log('Chat API received:', {
      hasMessages: !!messages,
      messagesLength: messages?.length,
      hasCoverLetter: !!coverLetter,
      bodyKeys: Object.keys(body || {})
    });

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error('Invalid messages:', messages);
      return new Response(
        JSON.stringify({ error: 'Messages are required', received: body }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Cover letter is optional - use empty string if not provided
    const coverLetterText = coverLetter?.trim() || '';

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
      const paragraphs = parseParagraphs(coverLetterText);
      const paragraphInfo = paragraphs.map((p, i) => `Absatz ${i + 1}: ${p.text.substring(0, 100)}${p.text.length > 100 ? '...' : ''}`).join('\n');

      // Load and format favorite formulations
      const favoriteFormulationsText = settings.favorite_formulations || '';
      let favoriteFormulationsSection = '';
      if (favoriteFormulationsText.trim()) {
        const formulations = favoriteFormulationsText
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);
        
        if (formulations.length > 0) {
          favoriteFormulationsSection = `\n**WICHTIG - Favorisierte Formulierungen:**
Die folgenden Formulierungen sollen BEVORZUGT im Anschreiben oder in deinen Vorschlägen verwendet werden, wenn sie passend sind:
${formulations.map(f => `- "${f}"`).join('\n')}

Nutze diese Formulierungen aktiv und bevorzuge sie gegenüber anderen ähnlichen Formulierungen, wenn sie zum Kontext passen.

`;
        }
      }

      // Load and format excluded formulations
      const excludedFormulationsText = settings.excluded_formulations || '';
      let excludedFormulationsSection = '';
      if (excludedFormulationsText.trim()) {
        const formulations = excludedFormulationsText
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);
        
        if (formulations.length > 0) {
          excludedFormulationsSection = `\n**WICHTIG - Ausgeschlossene Formulierungen:**
Die folgenden Formulierungen dürfen NICHT im Anschreiben oder in deinen Vorschlägen verwendet werden:
${formulations.map(f => `- "${f}"`).join('\n')}

Vermeide diese Formulierungen vollständig und verwende stattdessen alternative, passende Formulierungen.

`;
        }
      }

      // Build system prompt with context
      const systemPrompt = `Du bist ein Experte für Bewerbungsschreiben. Du hilfst dem Nutzer dabei, sein Anschreiben zu verbessern.

**Kontext:**
- Aktuelles Anschreiben (in Absätzen getrennt durch doppelte Zeilenschaltung):
${paragraphInfo}

- Vollständiges Anschreiben: ${coverLetterText}
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
- Antworte auf Deutsch${favoriteFormulationsSection}${excludedFormulationsSection}`;

      // Log raw messages for debugging
      console.log('Raw messages received:', JSON.stringify(messages, null, 2));
      
      // Convert messages to AI SDK format - handle both old and new message formats
      const aiMessages = messages.map((msg: any, index: number) => {
        // Handle different message formats from useChat
        let content = ''
        
        // Log message structure for debugging
        console.log(`Processing message ${index}:`, {
          hasContent: !!msg.content,
          hasText: !!msg.text,
          hasParts: !!msg.parts,
          role: msg.role,
          keys: Object.keys(msg || {})
        });
        
        if (msg.parts && Array.isArray(msg.parts)) {
          // New format with parts array
          content = msg.parts
            .filter((part: any) => part.type === 'text')
            .map((part: any) => part.text)
            .join('')
        } else if (msg.text) {
          content = typeof msg.text === 'string' ? msg.text : String(msg.text)
        } else if (msg.content) {
          // Handle both string and array content
          if (typeof msg.content === 'string') {
            content = msg.content
          } else if (Array.isArray(msg.content)) {
            content = msg.content
              .filter((part: any) => part.type === 'text' || typeof part === 'string')
              .map((part: any) => typeof part === 'string' ? part : part.text)
              .join('')
          } else {
            content = String(msg.content)
          }
        } else if (typeof msg === 'string') {
          content = msg
        } else {
          // Fallback: try to stringify the whole message
          console.warn('Unknown message format, attempting fallback:', msg);
          content = JSON.stringify(msg);
        }
        
        const result = {
          role: (msg.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: content || '',
        };
        
        console.log(`Message ${index} processed:`, result);
        return result;
      }).filter((msg: any) => msg.content && msg.content.trim()) as Array<{ role: 'user' | 'assistant'; content: string }>;
      
      if (aiMessages.length === 0) {
        console.error('No valid messages after processing:', messages);
        return new Response(
          JSON.stringify({ error: 'No valid messages found after processing' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

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

