import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, getCachedStatement, syncDatabaseAfterWrite } from '@/lib/database/client';
import { syncDeadlineReminder } from '@/lib/reminders/deadline-sync';
import { existsSync, unlinkSync } from 'fs';

// Route segment config - force dynamic for real-time data
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid ID' },
        { status: 400 }
      );
    }
    
    const application = getCachedStatement('SELECT * FROM applications WHERE id = ?')
      .get(id) as any;
    
    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }
    
    const contacts = getCachedStatement('SELECT * FROM contact_persons WHERE application_id = ?')
      .all(id);
    
    return NextResponse.json(
      { application: { ...application, contacts: contacts as any } },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching application:', error);
    return NextResponse.json(
      { error: 'Failed to fetch application' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid ID' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { status, sent_at, company, position, cover_letter, match_result, match_score, deadline, extraction_data } = body;
    
    const db = getDatabase();
    const updates: string[] = [];
    const values: any[] = [];
    
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }
    if (sent_at !== undefined) {
      updates.push('sent_at = ?');
      values.push(sent_at);
    }
    if (company !== undefined) {
      updates.push('company = ?');
      values.push(company);
    }
    if (position !== undefined) {
      updates.push('position = ?');
      values.push(position);
    }
    if (cover_letter !== undefined) {
      updates.push('cover_letter = ?');
      values.push(cover_letter);
    }
    if (match_result !== undefined) {
      updates.push('match_result = ?');
      values.push(match_result);
    }
    if (match_score !== undefined) {
      updates.push('match_score = ?');
      values.push(match_score);
    }
    if (deadline !== undefined) {
      updates.push('deadline = ?');
      values.push(deadline);
    }
    if (extraction_data !== undefined) {
      updates.push('extraction_data = ?');
      values.push(typeof extraction_data === 'string' ? extraction_data : JSON.stringify(extraction_data));
    }
    
    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    const result = db
      .prepare(`UPDATE applications SET ${updates.join(', ')} WHERE id = ?`)
      .run(...values);
    
    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }
    
    const application = getCachedStatement('SELECT * FROM applications WHERE id = ?')
      .get(id) as any;
    
    const contacts = getCachedStatement('SELECT * FROM contact_persons WHERE application_id = ?')
      .all(id);
    
    // Sync deadline reminder if deadline was updated
    if (deadline !== undefined) {
      try {
        await syncDeadlineReminder(
          id,
          deadline,
          application.company,
          application.position
        );
      } catch (error) {
        console.error('Error syncing deadline reminder:', error);
        // Don't fail the request if reminder sync fails
      }
    }
    
    // Sync to cloud storage after write
    await syncDatabaseAfterWrite();
    
    return NextResponse.json(
      { application: { ...application, contacts: contacts as any } },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating application:', error);
    return NextResponse.json(
      { error: 'Failed to update application' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid ID' },
        { status: 400 }
      );
    }
    
    const db = getDatabase();
    
    // Get application to retrieve job_document_path before deletion
    const application = db
      .prepare('SELECT job_document_path FROM applications WHERE id = ?')
      .get(id) as any;
    
    // Delete job document file if it exists
    if (application && application.job_document_path) {
      try {
        if (application.job_document_path.startsWith('local:')) {
          // Delete local file
          const localPath = application.job_document_path.replace('local:', '');
          if (existsSync(localPath)) {
            unlinkSync(localPath);
          }
        } else {
          // Delete from cloud storage
          const { getBucket } = await import('@/lib/storage/sync');
          const bucket = getBucket();
          if (bucket) {
            try {
              const file = bucket.file(application.job_document_path);
              await file.delete();
            } catch (error: any) {
              console.warn('Failed to delete job document from cloud storage:', error);
              // Continue with database deletion even if file deletion fails
            }
          }
        }
      } catch (fileError: any) {
        console.warn('Error deleting job document file:', fileError.message);
        // Continue with database deletion even if file deletion fails
      }
    }
    
    // Delete application from database (cascade will handle related records)
    const result = db
      .prepare('DELETE FROM applications WHERE id = ?')
      .run(id);
    
    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }
    
    // Sync to cloud storage after delete
    await syncDatabaseAfterWrite();
    
    return NextResponse.json(
      { message: 'Application deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting application:', error);
    return NextResponse.json(
      { error: 'Failed to delete application' },
      { status: 500 }
    );
  }
}
