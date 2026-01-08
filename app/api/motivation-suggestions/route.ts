import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/client';
import { getSettings } from '@/lib/database/settings';
import { generateTextWithFallback } from '@/lib/ai/model-helper';
import { formatUserProfile } from '@/lib/utils';
import { scrapeWebsiteContent } from '@/lib/website-utils';

/**
 * POST: Generate AI suggestions for motivation questions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      questionType, // 'position' or 'company'
      applicationId,
      companyWebsite,
      jobDescription,
      matchResult 
    } = body;

    if (!questionType || !['position', 'company'].includes(questionType)) {
      return NextResponse.json(
        { error: 'Invalid questionType. Must be "position" or "company"' },
        { status: 400 }
      );
    }

    if (!applicationId) {
      return NextResponse.json(
        { error: 'applicationId is required' },
        { status: 400 }
      );
    }

    // Load settings
    const settings = getSettings();
    const preferredModel = settings.ai_model || 'gemini-1.5-pro';
    const temperature = parseFloat(settings.temperature_generate || '0.7');

    const db = getDatabase();

    // Load application data
    const application = db
      .prepare('SELECT * FROM applications WHERE id = ?')
      .get(applicationId) as any;

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Load CV from database
    const resumeData = db.prepare('SELECT * FROM resume ORDER BY updated_at DESC LIMIT 1').get() as any;
    const resume = resumeData?.content || 'Kein Lebenslauf hinterlegt.';

    // Load user profile from database
    const userProfileData = db.prepare('SELECT * FROM user_profile ORDER BY updated_at DESC LIMIT 1').get() as any;
    const userProfile = formatUserProfile(userProfileData);

    // Load match result if not provided
    const matchResultText = matchResult || application.match_result || 'Kein Matching-Ergebnis verfügbar.';

    // Load job description if not provided
    const jobDescriptionText = jobDescription || application.job_description || 'Keine Jobbeschreibung verfügbar.';

    // Scrape website content if URL is provided
    let websiteContent = '';
    let websiteInfo = '';
    const websiteUrl = companyWebsite || application.company_website;
    if (websiteUrl) {
      try {
        console.log(`Scraping website: ${websiteUrl}`);
        const scraped = await scrapeWebsiteContent(websiteUrl);
        if (scraped) {
          websiteContent = scraped;
          websiteInfo = `\n\n**WICHTIG - Unternehmenswebsite analysiert:**
Die folgenden Informationen wurden von der Unternehmenswebsite (${websiteUrl}) extrahiert:
${websiteContent}

Nutze diese Informationen aktiv, um die Antwort authentischer und spezifischer zu gestalten. Beziehe konkrete Details aus der Website ein (z.B. Unternehmenswerte, Kultur, Mission, Vision, besondere Projekte oder Initiativen).`;
        } else {
          console.warn('Website scraping returned no content');
        }
      } catch (error: any) {
        console.warn('Failed to scrape website:', error.message);
        // Continue without website content
      }
    }

    // Build prompt based on question type
    let prompt = '';
    
    if (questionType === 'position') {
      prompt = `Du bist ein Experte für Bewerbungsschreiben. Erstelle eine überzeugende Antwort auf die Frage: "Warum begeistert dich die ausgeschrieben Stelle?"

**Kontext:**
- Position: ${application.position}
- Unternehmen: ${application.company}
- Jobbeschreibung: ${jobDescriptionText.substring(0, 2000)}${jobDescriptionText.length > 2000 ? '...' : ''}
- Matching-Ergebnis: ${matchResultText.substring(0, 1000)}${matchResultText.length > 1000 ? '...' : ''}
- Lebenslauf: ${resume.substring(0, 1500)}${resume.length > 1500 ? '...' : ''}
${userProfile ? `- Zusätzliche Nutzerinformationen: ${userProfile.substring(0, 500)}${userProfile.length > 500 ? '...' : ''}` : ''}
${websiteContent ? `- Unternehmenswebsite-Inhalte: ${websiteContent.substring(0, 1000)}${websiteContent.length > 1000 ? '...' : ''}` : ''}

**Deine Aufgabe:**
Erstelle eine authentische, überzeugende Antwort (2-4 Sätze), die erklärt, warum der Nutzer sich für diese spezifische Position begeistert. Die Antwort sollte:
1. Konkret auf die Position eingehen (nicht generisch)
2. Bezug zu den Anforderungen aus der Jobbeschreibung nehmen
3. Relevante Erfahrungen oder Fähigkeiten aus dem Lebenslauf einbeziehen
4. ${websiteContent ? 'Konkrete Bezüge zu Informationen aus der Unternehmenswebsite herstellen (z.B. Unternehmenswerte, Kultur, Projekte)' : 'Authentisch und persönlich klingen (nicht übertrieben)'}
5. Authentisch und persönlich klingen (nicht übertrieben)
6. Zeigen, dass der Nutzer die Position verstanden hat${websiteContent ? ' und sich mit dem Unternehmen auseinandergesetzt hat' : ''}

${websiteContent ? '**WICHTIG:** Nutze die Informationen aus der Unternehmenswebsite aktiv, um die Antwort spezifischer und überzeugender zu gestalten. Beziehe konkrete Details ein, die zeigen, dass der Nutzer sich mit dem Unternehmen beschäftigt hat.' : ''}

Antworte direkt mit der Antwort, ohne zusätzliche Erklärungen.`;
    } else {
      prompt = `Du bist ein Experte für Bewerbungsschreiben. Erstelle eine überzeugende Antwort auf die Frage: "Was begeistert dich an dem Unternehmen oder warum möchtest du speziell in dem Themenfeld arbeiten?"

**Kontext:**
- Position: ${application.position}
- Unternehmen: ${application.company}
- Jobbeschreibung: ${jobDescriptionText.substring(0, 2000)}${jobDescriptionText.length > 2000 ? '...' : ''}
- Matching-Ergebnis: ${matchResultText.substring(0, 1000)}${matchResultText.length > 1000 ? '...' : ''}
- Lebenslauf: ${resume.substring(0, 1500)}${resume.length > 1500 ? '...' : ''}
${userProfile ? `- Zusätzliche Nutzerinformationen: ${userProfile.substring(0, 500)}${userProfile.length > 500 ? '...' : ''}` : ''}
${websiteInfo || (websiteContent ? `- Unternehmenswebsite-Inhalte: ${websiteContent.substring(0, 2000)}${websiteContent.length > 2000 ? '...' : ''}` : '')}

**Deine Aufgabe:**
Erstelle eine authentische, überzeugende Antwort (2-4 Sätze), die erklärt, warum der Nutzer sich für das Unternehmen oder das Themenfeld begeistert. Die Antwort sollte:
1. Konkret auf das Unternehmen oder Themenfeld eingehen (nicht generisch)
2. ${websiteContent ? '**SEHR WICHTIG:** Relevante Informationen aus der Unternehmenswebsite aktiv einbeziehen - nutze konkrete Details wie Unternehmenswerte, Kultur, Mission, Vision, Projekte oder Initiativen' : 'Bezug zu den Werten, der Kultur oder dem Themenfeld aus der Jobbeschreibung nehmen'}
3. Bezug zu den Werten, der Kultur oder dem Themenfeld aus der Jobbeschreibung nehmen
4. Relevante Erfahrungen oder Interessen aus dem Lebenslauf einbeziehen
5. Authentisch und persönlich klingen (nicht übertrieben)
6. Zeigen, dass der Nutzer sich mit dem Unternehmen/Themenfeld auseinandergesetzt hat

${websiteContent ? '**WICHTIG:** Die Unternehmenswebsite-Informationen sind besonders wertvoll für diese Frage. Nutze sie aktiv, um zu zeigen, dass der Nutzer sich mit dem Unternehmen beschäftigt hat. Beziehe konkrete Details ein (z.B. "Das Unternehmen steht für X, wie auf der Website zu sehen", "Die Mission des Unternehmens, Y zu erreichen, spricht mich besonders an").' : ''}

Antworte direkt mit der Antwort, ohne zusätzliche Erklärungen.`;
    }

    const { text } = await generateTextWithFallback(
      prompt,
      preferredModel,
      temperature
    );

    return NextResponse.json({ suggestion: text.trim() }, { status: 200 });
  } catch (error: any) {
    console.error('Error generating motivation suggestion:', error);
    
    const errorResponse: any = {
      error: error.message || 'Failed to generate motivation suggestion',
      type: error.type || 'UNKNOWN_ERROR',
    };
    
    if (error.type === 'QUOTA_ERROR') {
      errorResponse.type = 'QUOTA_ERROR';
      errorResponse.model = error.model;
      errorResponse.helpUrl = 'https://ai.dev/usage?tab=rate-limit';
      errorResponse.message = 'API-Quota überschritten';
    } else if (error.type === 'API_KEY_ERROR') {
      errorResponse.type = 'API_KEY_ERROR';
      errorResponse.message = 'API-Key Problem';
    } else if (error.type === 'MODEL_ERROR') {
      errorResponse.type = 'MODEL_ERROR';
      errorResponse.testedModels = error.testedModels;
      errorResponse.message = 'Kein funktionierendes Modell gefunden';
    }
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
