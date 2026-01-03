import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, syncDatabaseAfterWrite } from '@/lib/database/client';
import { uploadFileToCloud } from '@/lib/storage/sync';
import { parseFile } from '@/lib/file-parser';
import { isSupportedFileType } from '@/lib/file-utils';

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const applicationId = parseInt(idParam);

    if (isNaN(applicationId)) {
      return NextResponse.json(
        { error: 'Invalid application ID' },
        { status: 400 }
      );
    }

    // Verify application exists
    const db = getDatabase();
    const application = db
      .prepare('SELECT id FROM applications WHERE id = ?')
      .get(applicationId) as any;

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Parse form data
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (formError: any) {
      console.error('Error parsing form data:', formError);
      return NextResponse.json(
        { error: 'Failed to parse form data', details: formError.message },
        { status: 400 }
      );
    }

    const file = formData.get('file') as File | null;

    if (!file) {
      console.error('No file found in form data');
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    // Validate that it's actually a File-like object
    if (!isFileLike(file)) {
      console.error('File is not a File-like object:', typeof file, file);
      return NextResponse.json(
        { error: 'Invalid file object' },
        { status: 400 }
      );
    }

    // Log file information for debugging
    console.log('File upload request:', {
      fileName: (file as any).name,
      fileSize: (file as any).size,
      fileType: (file as any).type,
      isFileLike: isFileLike(file),
      applicationId,
    });

    // Type-safe access to file properties (after isFileLike check)
    const fileObj = file as any;
    const fileName = fileObj.name;
    const fileSize = fileObj.size;
    const fileType = fileObj.type;

    // Validate file type
    if (!isSupportedFileType(file)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Supported formats: PDF, TXT, DOCX, DOC' },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (fileSize > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // Extract text content from file
    // Note: We do this before converting to buffer to ensure the File object is still usable
    let extractedText: string | null = null;
    try {
      console.log('Attempting to extract text from file:', fileName);
      extractedText = await parseFile(file, fileName);
      // Normalize text: remove excessive whitespace
      if (extractedText) {
        extractedText = extractedText.replace(/\s+/g, ' ').trim();
        console.log('Text extracted successfully, length:', extractedText.length);
      } else {
        console.warn('parseFile returned null or empty string');
      }
    } catch (parseError: any) {
      console.warn('Failed to extract text from document:', parseError.message);
      console.warn('Parse error details:', {
        message: parseError.message,
        stack: parseError.stack,
        fileName: fileName,
      });
      // Continue without text extraction - document will be saved but not searchable
      extractedText = null;
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFileName = `${timestamp}_${sanitizedFileName}`;
    const fullPath = `application-documents/${applicationId}/${uniqueFileName}`;

    // Convert File to Buffer for upload
    let fileBuffer: Buffer;
    try {
      const arrayBuffer = await fileObj.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
      console.log('File converted to buffer, size:', fileBuffer.length, 'bytes');
    } catch (bufferError: any) {
      console.error('Error converting file to buffer:', bufferError);
      return NextResponse.json(
        { error: 'Failed to process file', details: bufferError.message || 'Unknown error' },
        { status: 500 }
      );
    }

    // Upload file to cloud storage or local filesystem
    let filePath: string | null;
    try {
      // Pass Buffer instead of File to avoid potential issues with File object in Next.js
      console.log('Calling uploadFileToCloud with:', {
        bufferSize: fileBuffer.length,
        fullPath,
        contentType: fileType,
      });
      filePath = await uploadFileToCloud(fileBuffer, fullPath, fileType);
      
      if (!filePath) {
        console.error('uploadFileToCloud returned null for path:', fullPath);
        return NextResponse.json(
          { error: 'Failed to upload file', details: 'Upload function returned null - check server logs for details' },
          { status: 500 }
        );
      }
      
      console.log('File uploaded successfully, path:', filePath);
    } catch (uploadError: any) {
      console.error('Error in uploadFileToCloud:', uploadError);
      console.error('Upload error stack:', uploadError.stack);
      return NextResponse.json(
        { 
          error: 'Failed to upload file', 
          details: uploadError.message || 'Unknown error',
          // Include more details in development
          ...(process.env.NODE_ENV === 'development' && {
            stack: uploadError.stack,
            code: uploadError.code,
          }),
        },
        { status: 500 }
      );
    }

    // Save document metadata to database
    const result = db
      .prepare(`
        INSERT INTO application_documents (application_id, filename, file_path, file_type, file_size, uploaded_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `)
      .run(
        applicationId,
        fileName,
        filePath,
        fileType || 'application/octet-stream',
        fileSize
      );

    const documentId = Number(result.lastInsertRowid);

    // Save extracted text to FTS5 table if available
    // Always try to index, even if text extraction failed (at least index filename)
    const textToIndex = extractedText && extractedText.trim().length > 0 
      ? extractedText 
      : fileName; // Fallback to filename if text extraction failed
    
    try {
      // Check if FTS5 table exists and is usable
      const ftsTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='application_documents_fts'").all() as any[];
      if (ftsTables.length > 0) {
        try {
          // Test if table is usable
          db.prepare('SELECT COUNT(*) FROM application_documents_fts').get();
          // Insert the text (or filename as fallback)
          db.prepare(`
            INSERT INTO application_documents_fts (document_id, content)
            VALUES (?, ?)
          `).run(documentId, textToIndex);
          console.log(`Indexed document ${documentId} for search (${extractedText ? 'with extracted text' : 'with filename only'})`);
        } catch (ftsError: any) {
          console.error('FTS5 table exists but insert failed:', ftsError.message);
          console.error('Error details:', {
            documentId,
            textLength: textToIndex.length,
            error: ftsError.message,
            stack: ftsError.stack
          });
          // Continue - document is saved but not searchable
        }
      } else {
        console.warn('FTS5 table does not exist, document will not be searchable');
      }
    } catch (checkError: any) {
      console.error('Failed to check/index document for search:', checkError.message);
      console.error('Error stack:', checkError.stack);
      // Continue - document is saved but not searchable
    }

    // Sync database to cloud
    await syncDatabaseAfterWrite();

    return NextResponse.json(
      {
        document: {
          id: documentId,
          application_id: applicationId,
          filename: fileName,
          file_path: filePath,
          file_type: fileType || 'application/octet-stream',
          file_size: fileSize,
          uploaded_at: new Date().toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { error: 'Failed to upload document', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const applicationId = parseInt(idParam);

    if (isNaN(applicationId)) {
      return NextResponse.json(
        { error: 'Invalid application ID' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const documents = db
      .prepare(`
        SELECT id, application_id, filename, file_path, file_type, file_size, uploaded_at, created_at
        FROM application_documents
        WHERE application_id = ?
        ORDER BY uploaded_at DESC
      `)
      .all(applicationId) as any[];

    return NextResponse.json(
      { documents },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

