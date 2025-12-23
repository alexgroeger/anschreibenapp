import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, syncDatabaseAfterWrite } from '@/lib/database/client';
import { downloadFileFromCloud, getFileUrl } from '@/lib/storage/sync';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id: idParam, docId: docIdParam } = await params;
    const applicationId = parseInt(idParam);
    const documentId = parseInt(docIdParam);

    if (isNaN(applicationId) || isNaN(documentId)) {
      return NextResponse.json(
        { error: 'Invalid ID' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const document = db
      .prepare(`
        SELECT id, application_id, filename, file_path, file_type
        FROM application_documents
        WHERE id = ? AND application_id = ?
      `)
      .get(documentId, applicationId) as any;

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check if request wants to view in browser (via query param) or download
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') === 'true';

    // If viewing in browser and it's a cloud storage file, try to get a signed URL
    if (view && !document.file_path.startsWith('local:')) {
      const url = await getFileUrl(document.file_path);
      if (url && !url.startsWith('/api/')) {
        // Redirect to the signed URL for cloud storage files
        return NextResponse.redirect(url);
      }
    }

    // Download the file (works for both local and cloud storage)
    const fileBuffer = await downloadFileFromCloud(document.file_path);

    if (!fileBuffer) {
      return NextResponse.json(
        { error: 'Failed to retrieve document' },
        { status: 500 }
      );
    }

    // Determine content type
    const contentType = document.file_type || 'application/octet-stream';
    const filename = document.filename || 'document';

    // Return the file (Buffer is compatible with NextResponse body)
    return new NextResponse(fileBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': view
          ? `inline; filename="${filename}"`
          : `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Error retrieving document:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve document' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id: idParam, docId: docIdParam } = await params;
    const applicationId = parseInt(idParam);
    const documentId = parseInt(docIdParam);

    if (isNaN(applicationId) || isNaN(documentId)) {
      return NextResponse.json(
        { error: 'Invalid ID' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const document = db
      .prepare(`
        SELECT id, application_id, file_path
        FROM application_documents
        WHERE id = ? AND application_id = ?
      `)
      .get(documentId, applicationId) as any;

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Delete file from storage
    try {
      if (document.file_path.startsWith('local:')) {
        // Delete local file
        const localPath = document.file_path.replace('local:', '');
        if (existsSync(localPath)) {
          unlinkSync(localPath);
        }
      } else {
        // Delete from cloud storage
        const { getBucket } = await import('@/lib/storage/sync');
        const bucket = getBucket();
        if (bucket) {
          try {
            const file = bucket.file(document.file_path);
            await file.delete();
          } catch (error: any) {
            console.warn('Failed to delete file from cloud storage:', error);
            // Continue with database deletion even if file deletion fails
          }
        }
      }
    } catch (fileError: any) {
      console.warn('Error deleting file:', fileError.message);
      // Continue with database deletion even if file deletion fails
    }

    // Delete from FTS5 table
    try {
      db.prepare('DELETE FROM application_documents_fts WHERE document_id = ?').run(documentId);
    } catch (ftsError: any) {
      console.warn('Failed to delete from FTS5 table:', ftsError.message);
      // Continue with main table deletion
    }

    // Delete from database
    const result = db
      .prepare('DELETE FROM application_documents WHERE id = ? AND application_id = ?')
      .run(documentId, applicationId);

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Sync database to cloud
    await syncDatabaseAfterWrite();

    return NextResponse.json(
      { message: 'Document deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}

