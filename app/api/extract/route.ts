import { NextRequest, NextResponse } from 'next/server';
import { getPrompt } from '@/lib/prompts';
import { getSettings } from '@/lib/database/settings';
import { generateTextWithFallback } from '@/lib/ai/model-helper';
import { parseFile } from '@/lib/file-parser';
import { uploadFileToCloud } from '@/lib/storage/sync';

// Force Node.js runtime for file parsing (pdfjs-dist and mammoth require Node.js)
export const runtime = 'nodejs';

/**
 * Helper function to check if an object is a File-like object
 * Works in both browser and Node.js environments
 */
function isFileLike(obj: any): boolean {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.arrayBuffer === 'function' &&
    typeof obj.name === 'string' &&
    typeof obj.size === 'number' &&
    typeof obj.type === 'string'
  );
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let jobDescription: string;

    // Check if request contains FormData (file upload)
    // Note: multipart/form-data includes boundary, so we check for the prefix
    let uploadedFile: File | null = null;
    let documentInfo: { filename: string; path: string; type: string } | null = null;
    
    if (contentType.includes('multipart/form-data')) {
      let formData: FormData;
      try {
        formData = await request.formData();
      } catch (formError: any) {
        console.error('Error parsing form data:', formError);
        return NextResponse.json(
          { error: `Failed to parse form data: ${formError.message}` },
          { status: 400 }
        );
      }
      
      const file = formData.get('file') as File | null;
      
      if (!file) {
        return NextResponse.json(
          { error: 'File is required' },
          { status: 400 }
        );
      }

      // Validate that it's a File-like object
      if (!isFileLike(file)) {
        console.error('File is not a File-like object:', typeof file, file);
        return NextResponse.json(
          { error: 'Invalid file object' },
          { status: 400 }
        );
      }

      uploadedFile = file as File;

      // Type-safe access to file properties (after isFileLike check)
      const fileObj = file as any;
      const fileName = fileObj.name;
      const fileType = fileObj.type;

      try {
        // Use the centralized file parser
        jobDescription = await parseFile(file, fileName);
        
        if (!jobDescription || jobDescription.trim().length === 0) {
          return NextResponse.json(
            { error: 'File appears to be empty or could not be parsed' },
            { status: 400 }
          );
        }
        
        // Save the file to Cloud Storage or local filesystem
        const timestamp = Date.now();
        const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const uniqueFileName = `${timestamp}_${sanitizedFileName}`;
        const filePath = await uploadFileToCloud(file, uniqueFileName, fileType);
        
        if (filePath) {
          documentInfo = {
            filename: fileName,
            path: filePath,
            type: fileType || 'application/octet-stream',
          };
        }
      } catch (parseError: any) {
        console.error('File parsing error:', parseError);
        console.error('Error stack:', parseError.stack);
        return NextResponse.json(
          { error: `Failed to parse file: ${parseError.message || 'Unknown error'}` },
          { status: 400 }
        );
      }
    } else {
      // Handle JSON request (text input)
      const body = await request.json();
      jobDescription = body.jobDescription;

      if (!jobDescription || typeof jobDescription !== 'string') {
        return NextResponse.json(
          { error: 'Job description is required' },
          { status: 400 }
        );
      }
    }

    // Load settings from database
    const settings = getSettings();
    const preferredModel = settings.ai_model;
    const temperature = parseFloat(settings.temperature_extract || '0.3');

    const prompt = getPrompt('extract').replace('{jobDescription}', jobDescription);

    const { text } = await generateTextWithFallback(
      prompt,
      preferredModel,
      temperature
    );

    // Try to parse JSON from the response
    let extractionData;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
      let jsonText = jsonMatch ? jsonMatch[1] : text;
      
      // Clean up the JSON text - remove any leading/trailing whitespace
      jsonText = jsonText.trim();
      
      // Try to find JSON object in the text if it's not at the start
      const jsonObjectMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        jsonText = jsonObjectMatch[0];
      }
      
      extractionData = JSON.parse(jsonText);
      
      // Ensure contacts is always an array
      if (!extractionData.contacts || !Array.isArray(extractionData.contacts)) {
        extractionData.contacts = [];
      }
      
      // Validate and clean contact objects
      if (extractionData.contacts && Array.isArray(extractionData.contacts)) {
        extractionData.contacts = extractionData.contacts.map((contact: any) => {
          // Handle different contact formats
          const name = contact.name || contact.Name || '';
          const email = contact.email || contact.Email || contact.eMail || null;
          const phone = contact.phone || contact.Phone || contact.telefon || null;
          const position = contact.position || contact.Position || contact.title || null;
          
          return {
            name: name.trim(),
            email: email ? String(email).trim() : null,
            phone: phone ? String(phone).trim() : null,
            position: position ? String(position).trim() : null,
          };
        }).filter((contact: any) => {
          // Keep contacts that have at least a name, email, or phone
          return contact.name && contact.name.trim() !== '' && contact.name !== 'Unbekannt';
        });
      } else {
        extractionData.contacts = [];
      }
      
      // Fallback: Try to extract contacts from text if contacts array is empty
      if (extractionData.contacts.length === 0) {
        const emailRegex = /[\w\.-]+@[\w\.-]+\.\w+/g;
        const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g;
        
        const emails = jobDescription.match(emailRegex);
        if (emails && emails.length > 0) {
          extractionData.contacts = emails.map((email) => ({
            name: 'Unbekannt',
            email: email,
            phone: null,
            position: null,
          }));
        }
      }
      
      // Log for debugging
      console.log('Extracted contacts:', extractionData.contacts);
      console.log('Total contacts found:', extractionData.contacts.length);
      
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.error('Response text:', text);
      // If JSON parsing fails, return structured text
      extractionData = {
        company: null,
        position: null,
        keyRequirements: text,
        culture: '',
        skills: '',
        softSkills: '',
        contacts: [],
      };
    }
    
    // Ensure softSkills field exists
    if (!extractionData.softSkills) {
      extractionData.softSkills = '';
    }
    
    // Ensure company and position fields exist
    if (!extractionData.company) {
      extractionData.company = null;
    }
    if (!extractionData.position) {
      extractionData.position = null;
    }
    
    // Ensure deadline field exists
    if (!extractionData.deadline) {
      extractionData.deadline = null;
    }
    
    // Ensure new metadata fields exist
    if (!extractionData.salary) {
      extractionData.salary = null;
    }
    if (!extractionData.contractType) {
      extractionData.contractType = null;
    }
    if (!extractionData.workplace) {
      extractionData.workplace = null;
    }
    if (!extractionData.startDate) {
      extractionData.startDate = null;
    }

    // Include the job description in the response if it was from a file
    // This allows the client to use it for matching
    const response: any = { extraction: extractionData };
    if (contentType.includes('multipart/form-data')) {
      response.jobDescription = jobDescription;
      // Include document info if file was uploaded
      if (documentInfo) {
        response.documentInfo = documentInfo;
      }
    }
    
    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('Error extracting job data:', error);
    console.error('Error stack:', error.stack);
    
    // Strukturierte Fehlerantwort
    const errorResponse: any = {
      error: error.message || 'Failed to extract job data',
      type: error.type || 'UNKNOWN_ERROR',
    };
    
    // Zusätzliche Informationen je nach Fehlertyp
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
    } else if (error.message?.includes('quota') || error.message?.includes('Quota exceeded')) {
      errorResponse.type = 'QUOTA_ERROR';
      errorResponse.message = 'API-Quota überschritten';
      errorResponse.helpUrl = 'https://ai.dev/usage?tab=rate-limit';
    } else if (error.message?.includes('API key')) {
      errorResponse.type = 'API_KEY_ERROR';
      errorResponse.message = 'API-Key Problem';
    }
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
