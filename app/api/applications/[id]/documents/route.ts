import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, syncDatabaseAfterWrite } from '@/lib/database/client';
import { uploadFileToCloud } from '@/lib/storage/sync';
import { parseFile } from '@/lib/file-parser';
import { isSupportedFileType } from '@/lib/file-utils';

export const runtime = 'nodejs';

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
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!isSupportedFileType(file)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Supported formats: PDF, TXT, DOCX, DOC' },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // Extract text content from file
    let extractedText: string | null = null;
    try {
      extractedText = await parseFile(file);
      // Normalize text: remove excessive whitespace
      if (extractedText) {
        extractedText = extractedText.replace(/\s+/g, ' ').trim();
      }
    } catch (parseError: any) {
      console.warn('Failed to extract text from document:', parseError.message);
      // Continue without text extraction - document will be saved but not searchable
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}_${sanitizedFileName}`;
    const fullPath = `application-documents/${applicationId}/${fileName}`;

    // Upload file to cloud storage or local filesystem
    const filePath = await uploadFileToCloud(file, fullPath, file.type);

    if (!filePath) {
      return NextResponse.json(
        { error: 'Failed to upload file' },
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
        file.name,
        filePath,
        file.type || 'application/octet-stream',
        file.size
      );

    const documentId = Number(result.lastInsertRowid);

    // Save extracted text to FTS5 table if available
    // Always try to index, even if text extraction failed (at least index filename)
    const textToIndex = extractedText && extractedText.trim().length > 0 
      ? extractedText 
      : file.name; // Fallback to filename if text extraction failed
    
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
          filename: file.name,
          file_path: filePath,
          file_type: file.type || 'application/octet-stream',
          file_size: file.size,
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

