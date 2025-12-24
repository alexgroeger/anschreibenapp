import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, syncDatabaseAfterWrite } from '@/lib/database/client';

export async function POST(request: NextRequest) {
  try {
    const db = getDatabase();
    
    // Check if FTS5 table exists with wrong structure
    const ftsTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='application_documents_fts'").all() as any[];
    
    if (ftsTables.length > 0) {
      // Drop the old FTS5 table and all related tables
      try {
        db.exec('DROP TABLE IF EXISTS application_documents_fts');
        db.exec('DROP TABLE IF EXISTS application_documents_fts_config');
        db.exec('DROP TABLE IF EXISTS application_documents_fts_data');
        db.exec('DROP TABLE IF EXISTS application_documents_fts_docsize');
        db.exec('DROP TABLE IF EXISTS application_documents_fts_idx');
        db.exec('DROP TABLE IF EXISTS application_documents_fts_content');
      } catch (error: any) {
        console.warn('Error dropping old FTS5 tables:', error.message);
      }
    }
    
    // Create new FTS5 table with correct structure
    db.exec(`
      CREATE VIRTUAL TABLE application_documents_fts USING fts5(
        document_id UNINDEXED,
        content
      );
    `);
    
    // Re-index all existing documents
    const documents = db.prepare('SELECT id, file_path FROM application_documents').all() as any[];
    
    // Note: We can't re-extract text from files here, so we'll just create empty entries
    // The text will be added when documents are uploaded again or we need to add a re-index endpoint
    for (const doc of documents) {
      try {
        db.prepare('INSERT INTO application_documents_fts (document_id, content) VALUES (?, ?)')
          .run(doc.id, '');
      } catch (error: any) {
        console.warn(`Failed to index document ${doc.id}:`, error.message);
      }
    }
    
    // Sync database to Cloud Storage after write
    await syncDatabaseAfterWrite();
    
    return NextResponse.json(
      { message: 'FTS5 table recreated successfully', documentsIndexed: documents.length },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fixing FTS5 table:', error);
    return NextResponse.json(
      { error: 'Failed to fix FTS5 table', details: error.message },
      { status: 500 }
    );
  }
}

