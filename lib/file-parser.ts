/**
 * Parse a PDF file and extract text content
 */
export async function parsePDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Dynamic import to avoid issues with native dependencies
  const pdfParseModule = await import('pdf-parse');
  // pdf-parse doesn't have a default export, use the module directly
  const pdfParse = 'default' in pdfParseModule ? pdfParseModule.default : pdfParseModule as any;
  const data = await pdfParse(buffer);
  return data.text;
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
  
  // Dynamic import to avoid issues with native dependencies
  const mammothModule = await import('mammoth');
  // mammoth has a default export
  const mammoth = 'default' in mammothModule ? mammothModule.default : mammothModule as any;
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
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

/**
 * Check if a file type is supported
 */
export function isSupportedFileType(file: File): boolean {
  const fileName = file.name.toLowerCase();
  const fileExtension = fileName.split('.').pop()?.toLowerCase();
  const supportedTypes = ['pdf', 'txt', 'docx', 'doc'];
  return supportedTypes.includes(fileExtension || '');
}
