import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/client';
import { downloadFileFromCloud, getFileUrl } from '@/lib/storage/sync';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const applicationId = parseInt(id);

    if (isNaN(applicationId)) {
      return NextResponse.json(
        { error: 'Invalid application ID' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const application = db
      .prepare('SELECT job_document_filename, job_document_path, job_document_type FROM applications WHERE id = ?')
      .get(applicationId) as any;

    if (!application || !application.job_document_path) {
      return NextResponse.json(
        { error: 'Document not found for this application' },
        { status: 404 }
      );
    }

    // Check if request wants to view in browser (via query param) or download
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') === 'true';

    // If viewing in browser and it's a cloud storage file, try to get a signed URL
    if (view && !application.job_document_path.startsWith('local:')) {
      const url = await getFileUrl(application.job_document_path);
      if (url && !url.startsWith('/api/')) {
        // Redirect to the signed URL for cloud storage files
        return NextResponse.redirect(url);
      }
    }

    // Download the file (works for both local and cloud storage)
    const fileBuffer = await downloadFileFromCloud(application.job_document_path);
    
    if (!fileBuffer) {
      return NextResponse.json(
        { error: 'Failed to retrieve document' },
        { status: 500 }
      );
    }

    // Determine content type
    const contentType = application.job_document_type || 'application/octet-stream';
    const filename = application.job_document_filename || 'document';

    // Return the file (Buffer is compatible with NextResponse body)
    return new NextResponse(fileBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': view 
          ? `inline; filename="${filename}"` 
          : `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error retrieving document:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve document' },
      { status: 500 }
    );
  }
}

