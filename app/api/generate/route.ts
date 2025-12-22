import { google } from '@ai-sdk/google'
import { streamText } from 'ai'
import { getCoverLetterPrompt } from '@/lib/prompts'

export const runtime = 'edge'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { cvText, jobDescription, tone, focus } = body

    // Validierung der Eingaben
    if (!cvText || !jobDescription || !tone || !focus) {
      return new Response(
        JSON.stringify({ error: 'Fehlende erforderliche Parameter' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // API-Key prüfen
    const apiKey = process.env.GOOGLE_GENERATION_AI_API_KEY
    if (!apiKey || apiKey === 'your_api_key_here') {
      return new Response(
        JSON.stringify({ error: 'Google Gemini API-Key nicht konfiguriert' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Job-Daten für den Prompt vorbereiten (vereinfacht als String)
    // In einer echten Implementierung würde hier die Job-Analyse verwendet
    const jobData = JSON.stringify({
      description: jobDescription,
      note: 'Job-Analyse wird hier verwendet'
    })

    // Prompt generieren
    const prompt = getCoverLetterPrompt(cvText, jobData, tone, focus)

    // Streaming mit Google Gemini
    const result = await streamText({
      model: google('gemini-1.5-flash'),
      prompt: prompt,
      maxTokens: 2000,
      temperature: 0.7,
    })

    // Streaming-Response zurückgeben (kompatibel mit useCompletion)
    return result.toDataStreamResponse()
  } catch (error) {
    console.error('Fehler bei der Anschreiben-Generierung:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Fehler bei der Generierung des Anschreibens',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

