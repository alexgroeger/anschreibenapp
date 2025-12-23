// These modules are loaded at runtime using require() since they're CommonJS
// This file is only used in API routes with runtime = 'nodejs', so require() is available
// We use lazy loading to avoid issues when this file is imported in non-Node.js contexts
let pdfParseModule: any = null;
let mammothModule: any = null;

const getPdfParse = () => {
  if (!pdfParseModule) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      pdfParseModule = require('pdf-parse');
    } catch (error) {
      console.error('Failed to load pdf-parse:', error);
      throw new Error('pdf-parse module not available');
    }
  }
  return pdfParseModule;
};

const getMammoth = () => {
  if (!mammothModule) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      mammothModule = require('mammoth');
    } catch (error) {
      console.error('Failed to load mammoth:', error);
      throw new Error('mammoth module not available');
    }
  }
  return mammothModule;
};

/**
 * Parse a PDF file and extract text content
 */
export async function parsePDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  try {
    const pdfParse = getPdfParse();
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error: any) {
    console.error('PDF parsing error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    throw new Error(`Failed to parse PDF: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Parse a text file and extract content
 */
export async function parseTXT(file: File): Promise<string> {
  return await file.text();
}

/**
 * Parse a DOCX file and extract text content
 */
export async function parseDOCX(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  
  try {
    const mammoth = getMammoth();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error: any) {
    console.error('DOCX parsing error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    throw new Error(`Failed to parse DOCX: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Automatically detect file type and parse accordingly
 */
export async function parseFile(file: File): Promise<string> {
  const fileName = file.name.toLowerCase();
  const fileExtension = fileName.split('.').pop()?.toLowerCase();

  switch (fileExtension) {
    case 'pdf':
      return await parsePDF(file);
    case 'txt':
      return await parseTXT(file);
    case 'docx':
    case 'doc':
      return await parseDOCX(file);
    default:
      // Try to parse as text if unknown format
      try {
        return await parseTXT(file);
      } catch (error) {
        throw new Error(`Unsupported file format: ${fileExtension || 'unknown'}`);
      }
  }
}

// isSupportedFileType has been moved to lib/file-utils.ts
// to avoid importing this file (which contains require()) in client components
