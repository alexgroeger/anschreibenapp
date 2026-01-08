import { NextRequest, NextResponse } from 'next/server';
import { getPrompt } from '@/lib/prompts';
import { getDatabase } from '@/lib/database/client';
import { getSettings } from '@/lib/database/settings';
import { generateTextWithFallback } from '@/lib/ai/model-helper';
import { formatUserProfile } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { matchResult, jobDescription, tone, focus, textLength, formality, emphasis, extraction, motivation_position, motivation_company } = body;

    if (!matchResult || !jobDescription) {
      return NextResponse.json(
        { error: 'Match result and job description are required' },
        { status: 400 }
      );
    }

    // Load settings from database
    const settings = getSettings();
    const preferredModel = settings.ai_model;
    const temperatureGenerate = parseFloat(settings.temperature_generate || '0.7');
    const temperatureTone = parseFloat(settings.temperature_tone || '0.3');
    const defaultTone = settings.default_tone || 'professionell';
    const defaultFocus = settings.default_focus || 'skills';
    const defaultTextLength = settings.default_text_length || 'mittel';
    const defaultFormality = settings.default_formality || 'formal';
    const defaultEmphasis = settings.default_emphasis || 'kombiniert';

    const db = getDatabase();

    // Load CV from database
    const resumeData = db.prepare('SELECT * FROM resume ORDER BY updated_at DESC LIMIT 1').get() as any;
    const resume = resumeData?.content || 'Kein Lebenslauf hinterlegt.';

    // Load user profile from database
    const userProfileData = db.prepare('SELECT * FROM user_profile ORDER BY updated_at DESC LIMIT 1').get() as any;
    const userProfile = formatUserProfile(userProfileData);

    // Load old cover letters and analyze tone (limit to last 20 for performance)
    const oldCoverLettersData = db
      .prepare('SELECT * FROM old_cover_letters ORDER BY uploaded_at DESC LIMIT 20')
      .all() as any[];
    
    let toneAnalysis = 'Keine historischen Anschreiben vorhanden. Verwende einen professionellen, modernen Ton.';
    
    if (oldCoverLettersData.length > 0) {
      const oldCoverLetters = oldCoverLettersData
        .map(letter => `---\n${letter.company || 'Unbekannt'} - ${letter.position || 'Unbekannt'}\n${letter.content}`)
        .join('\n\n');
      
      const tonePrompt = getPrompt('tone-analysis').replace('{oldCoverLetters}', oldCoverLetters);
      
      try {
        const { text } = await generateTextWithFallback(
          tonePrompt,
          preferredModel,
          temperatureTone
        );
        toneAnalysis = text;
      } catch (error) {
        console.error('Error analyzing tone:', error);
        toneAnalysis = 'Fehler bei der Tonalitäts-Analyse. Verwende einen professionellen Ton.';
      }
    }

    // Load and format favorite formulations
    const favoriteFormulationsText = settings.favorite_formulations || '';
    let favoriteFormulationsSection = '';
    if (favoriteFormulationsText.trim()) {
      const formulations = favoriteFormulationsText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      if (formulations.length > 0) {
        favoriteFormulationsSection = `**WICHTIG - Favorisierte Formulierungen:**
Die folgenden Formulierungen sollen BEVORZUGT im Anschreiben verwendet werden, wenn sie passend sind:
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
        excludedFormulationsSection = `**WICHTIG - Ausgeschlossene Formulierungen:**
Die folgenden Formulierungen dürfen NICHT im Anschreiben verwendet werden:
${formulations.map(f => `- "${f}"`).join('\n')}

Vermeide diese Formulierungen vollständig und verwende stattdessen alternative, passende Formulierungen.

`;
      }
    }

    // Format extraction data for prompt
    let extractionSection = '';
    if (extraction) {
      const extractionData = typeof extraction === 'string' ? JSON.parse(extraction) : extraction;
      
      const sections = [];
      
      if (extractionData.keyRequirements) {
        sections.push(`**Key Requirements:**
${extractionData.keyRequirements}`);
      }
      
      if (extractionData.skills) {
        sections.push(`**Hard Skills:**
${extractionData.skills}`);
      }
      
      if (extractionData.softSkills) {
        sections.push(`**Soft Skills:**
${extractionData.softSkills}`);
      }
      
      if (extractionData.culture) {
        sections.push(`**Unternehmenskultur:**
${extractionData.culture}`);
      }
      
      if (sections.length > 0) {
        extractionSection = `**Extraktionsdaten aus der Jobbeschreibung:**

${sections.join('\n\n')}

`;
      }
    }

    // Format motivation answers for prompt
    let motivationSection = '';
    if (motivation_position || motivation_company) {
      const motivationParts = [];
      
      if (motivation_position) {
        motivationParts.push(`**Warum begeistert dich die ausgeschrieben Stelle?**
${motivation_position}`);
      }
      
      if (motivation_company) {
        motivationParts.push(`**Was begeistert dich an dem Unternehmen oder warum möchtest du speziell in dem Themenfeld arbeiten?**
${motivation_company}`);
      }
      
      if (motivationParts.length > 0) {
        motivationSection = `**WICHTIG - Motivationsantworten des Nutzers:**

${motivationParts.join('\n\n')}

Diese Antworten spiegeln die persönliche Motivation des Nutzers wider. Integriere diese authentisch in das Anschreiben, ohne sie wortwörtlich zu kopieren. Nutze sie, um die Motivation und Begeisterung des Nutzers für die Position und das Unternehmen zu vermitteln.

`;
      }
    }

    const prompt = getPrompt('generate')
      .replace('{matchResult}', matchResult)
      .replace('{resume}', resume)
      .replace('{userProfile}', userProfile || 'Keine zusätzlichen Nutzerinformationen vorhanden.')
      .replace('{toneAnalysis}', toneAnalysis)
      .replace('{tone}', tone || defaultTone)
      .replace('{focus}', focus || defaultFocus)
      .replace('{textLength}', textLength || defaultTextLength)
      .replace('{formality}', formality || defaultFormality)
      .replace('{emphasis}', emphasis || defaultEmphasis)
      .replace('{jobDescription}', jobDescription)
      .replace('{extractionData}', extractionSection)
      .replace('{motivationAnswers}', motivationSection)
      .replace('{favoriteFormulations}', favoriteFormulationsSection)
      .replace('{excludedFormulations}', excludedFormulationsSection);

    const { text } = await generateTextWithFallback(
      prompt,
      preferredModel,
      temperatureGenerate
    );

    return NextResponse.json({ coverLetter: text }, { status: 200 });
  } catch (error: any) {
    console.error('Error generating cover letter:', error);
    
    const errorResponse: any = {
      error: error.message || 'Failed to generate cover letter',
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
