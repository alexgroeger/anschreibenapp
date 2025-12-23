// These modules are loaded at runtime using require() since they're CommonJS
// This file is only used in API routes with runtime = 'nodejs', so require() is available
// We use lazy loading to avoid issues when this file is imported in non-Node.js contexts
let pdfjsModule: any = null;
let mammothModule: any = null;

const getPdfjs = async () => {
  if (!pdfjsModule) {
    try {
      // pdfjs-dist v4 uses ESM, so we need to use dynamic import
      // Next.js supports dynamic imports in API routes
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
      // The module exports named exports, not default
      pdfjsModule = pdfjsLib;
      
      // Disable worker for Node.js server environment
      // In Node.js, we don't need workers - we can parse directly in the main thread
      // Set workerSrc to an empty string or disable it completely
      if (pdfjsModule.GlobalWorkerOptions) {
        // Try to completely disable the worker
        // Setting it to empty string or null should prevent worker initialization
        pdfjsModule.GlobalWorkerOptions.workerSrc = '';
        
        // Also try to set it to a non-existent path to force main thread execution
        // This is a workaround for the worker initialization issue
        try {
          // Override the worker setup to prevent it from trying to load
          const originalWorkerSrc = pdfjsModule.GlobalWorkerOptions.workerSrc;
          Object.defineProperty(pdfjsModule.GlobalWorkerOptions, 'workerSrc', {
            get: () => '',
            set: () => {}, // Ignore any attempts to set it
            configurable: true,
          });
        } catch (e) {
          // If that doesn't work, just leave it as empty string
          pdfjsModule.GlobalWorkerOptions.workerSrc = '';
        }
      }
      
      console.log('pdfjs-dist loaded successfully (worker disabled for server)');
      
      if (!pdfjsModule) {
        throw new Error('pdfjs-dist module returned undefined or null');
      }
    } catch (error: any) {
      console.error('Failed to load pdfjs-dist:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
      });
      const errorMessage = error.message || 'Unknown error';
      const errorWithContext = new Error(`pdfjs-dist module not available: ${errorMessage}`);
      (errorWithContext as any).originalError = error;
      throw errorWithContext;
    }
  }
  return pdfjsModule;
};

const getMammoth = () => {
  if (!mammothModule) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const required = require('mammoth');
      mammothModule = required.default || required;
    } catch (error) {
      console.error('Failed to load mammoth:', error);
      throw new Error('mammoth module not available');
    }
  }
  return mammothModule;
};

/**
 * Parse a PDF file and extract text content using pdfjs-dist
 */
export async function parsePDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  
  try {
    const pdfjs = await getPdfjs();
    
    // Get the getDocument function from pdfjs-dist
    // The module exports getDocument as a named export
    const getDocument = pdfjs.getDocument;
    
    if (!getDocument || typeof getDocument !== 'function') {
      // Log the structure for debugging
      console.error('pdfjs-dist structure:', {
        hasGetDocument: !!pdfjs.getDocument,
        keys: Object.keys(pdfjs).slice(0, 10),
        type: typeof pdfjs,
      });
      throw new Error('getDocument function not found in pdfjs-dist');
    }
    
    // Load the PDF document
    // Disable worker explicitly for Node.js server environment
    // In Node.js, we parse directly without workers
    const loadingTask = getDocument({
      data: uint8Array,
      useSystemFonts: true,
      verbosity: 0, // Suppress warnings
      // Disable all worker-related features for Node.js
      useWorkerFetch: false,
      isEvalSupported: false,
      // Force main thread execution
      disableAutoFetch: false,
      disableStream: false,
    });
    
    const pdfDocument = await loadingTask.promise;
    const numPages = pdfDocument.numPages;
    
    // Extract text from all pages
    const textParts: string[] = [];
    
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Combine all text items from the page
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      textParts.push(pageText);
    }
    
    const fullText = textParts.join('\n\n');
    
    if (!fullText || fullText.trim().length === 0) {
      throw new Error('PDF appears to be empty or contains no extractable text');
    }
    
    return fullText;
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

