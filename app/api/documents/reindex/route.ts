import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/client';
import { downloadFileFromCloud } from '@/lib/storage/sync';
import { parseFile } from '@/lib/file-parser';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const db = getDatabase();
    
    // Get all documents that are not indexed or need re-indexing
    const documents = db.prepare(`
      SELECT ad.id, ad.filename, ad.file_path, ad.file_type
      FROM application_documents ad
      LEFT JOIN application_documents_fts fts ON ad.id = fts.document_id
      WHERE fts.document_id IS NULL
    `).all() as any[];
    
    console.log(`Found ${documents.length} documents to index`);
    
    let indexed = 0;
    let failed = 0;
    const errors: string[] = [];
    
    for (const doc of documents) {
      try {
        // Download file
        const fileBuffer = await downloadFileFromCloud(doc.file_path);
        if (!fileBuffer) {
          errors.push(`Could not download file for document ${doc.id}: ${doc.filename}`);
          failed++;
          continue;
        }
        
        // Create File object from buffer
        const file = new File([fileBuffer], doc.filename, { type: doc.file_type || 'application/octet-stream' });
        
        // Extract text
        let extractedText: string | null = null;
        try {
          extractedText = await parseFile(file);
          if (extractedText) {
            extractedText = extractedText.replace(/\s+/g, ' ').trim();
          }
        } catch (parseError: any) {
          console.warn(`Failed to extract text from ${doc.filename}:`, parseError.message);
          // Use filename as fallback
          extractedText = doc.filename;
        }
        
        // Index in FTS5
        const textToIndex = extractedText && extractedText.trim().length > 0 
          ? extractedText 
          : doc.filename;
        
        try {
          db.prepare(`
            INSERT INTO application_documents_fts (document_id, content)
            VALUES (?, ?)
          `).run(doc.id, textToIndex);
          indexed++;
          console.log(`Indexed document ${doc.id}: ${doc.filename}`);
        } catch (insertError: any) {
          errors.push(`Failed to insert into FTS5 for document ${doc.id}: ${insertError.message}`);
          failed++;
        }
      } catch (error: any) {
        errors.push(`Error processing document ${doc.id} (${doc.filename}): ${error.message}`);
        failed++;
      }
    }
    
    return NextResponse.json(
      {
        message: 'Re-indexing completed',
        total: documents.length,
        indexed,
        failed,
        errors: errors.slice(0, 10) // Limit error messages
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error re-indexing documents:', error);
    return NextResponse.json(
      { error: 'Failed to re-index documents', details: error.message },
      { status: 500 }
    );
  }
}

