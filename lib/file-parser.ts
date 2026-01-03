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
      
      // Configure worker for Node.js server environment
      // pdfjs-dist requires workerSrc to be set
      // In Node.js, we need to provide a valid worker path, but we can use a no-op worker
      // or set it to a path that will cause it to fall back to main thread
      if (pdfjsModule.GlobalWorkerOptions) {
        // Try to find the actual worker file path in node_modules
        // If that fails, we'll use a data URL as fallback
        const path = require('path');
        const fs = require('fs');
        
        // Try to find the worker file
        const possibleWorkerPaths = [
          path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.mjs'),
          path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.mjs'),
        ];
        
        let workerPath = null;
        for (const workerPathOption of possibleWorkerPaths) {
          if (fs.existsSync(workerPathOption)) {
            workerPath = workerPathOption;
            break;
          }
        }
        
        if (workerPath) {
          // Use the actual worker file path
          pdfjsModule.GlobalWorkerOptions.workerSrc = workerPath;
        } else {
          // Fallback: use a data URL that will fail gracefully
          // This satisfies the requirement but doesn't actually create a worker
          pdfjsModule.GlobalWorkerOptions.workerSrc = 'data:application/javascript,';
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
 * Helper function to get array buffer from File or Buffer
 */
async function getArrayBuffer(input: File | Buffer | ArrayBuffer): Promise<ArrayBuffer> {
  if (input instanceof ArrayBuffer) {
    return input;
  }
  if (input instanceof Buffer) {
    // Convert Buffer to ArrayBuffer by creating a new ArrayBuffer
    const uint8Array = new Uint8Array(input);
    return uint8Array.buffer;
  }
  // File object
  if (typeof (input as any).arrayBuffer === 'function') {
    return await (input as any).arrayBuffer();
  }
  throw new Error('Unsupported input type for file parsing');
}

/**
 * Helper function to check if an object is a File-like object
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

/**
 * Helper function to get file name from File or use provided name
 */
function getFileName(input: File | Buffer | ArrayBuffer, defaultName: string = 'file'): string {
  if (isFileLike(input)) {
    return (input as any).name;
  }
  return defaultName;
}

/**
 * Parse a PDF file and extract text content using pdfjs-dist
 */
export async function parsePDF(file: File | Buffer | ArrayBuffer, fileName?: string): Promise<string> {
  const arrayBuffer = await getArrayBuffer(file);
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
    // For Node.js, we need to ensure the worker is properly configured
    // The workerSrc is already set in getPdfjs(), so we just need to call getDocument
    const loadingTask = getDocument({
      data: uint8Array,
      useSystemFonts: true,
      verbosity: 0, // Suppress warnings
      // In Node.js, workers don't work the same way, so we rely on main thread
      // The workerSrc is set to a data URL which will fail gracefully
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
export async function parseTXT(file: File | Buffer | ArrayBuffer): Promise<string> {
  if (file instanceof Buffer) {
    return file.toString('utf-8');
  }
  const arrayBuffer = await getArrayBuffer(file);
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(arrayBuffer);
}

/**
 * Parse a DOCX file and extract text content
 */
export async function parseDOCX(file: File | Buffer | ArrayBuffer): Promise<string> {
  const arrayBuffer = await getArrayBuffer(file);
  
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
 * Supports File, Buffer, or ArrayBuffer
 */
export async function parseFile(file: File | Buffer | ArrayBuffer, fileName?: string): Promise<string> {
  // Get file name
  let actualFileName: string;
  if (isFileLike(file)) {
    actualFileName = (file as any).name;
  } else if (fileName) {
    actualFileName = fileName;
  } else {
    actualFileName = 'file';
  }
  
  const fileNameLower = actualFileName.toLowerCase();
  const fileExtension = fileNameLower.split('.').pop()?.toLowerCase();

  switch (fileExtension) {
    case 'pdf':
      return await parsePDF(file, actualFileName);
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

