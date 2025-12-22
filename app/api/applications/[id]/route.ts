import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid ID' },
        { status: 400 }
      );
    }
    
    const db = getDatabase();
    const application = db
      .prepare('SELECT * FROM applications WHERE id = ?')
      .get(id);
    
    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }
    
    const contacts = db
      .prepare('SELECT * FROM contact_persons WHERE application_id = ?')
      .all(id);
    
    return NextResponse.json(
      { application: { ...application, contacts } },
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
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid ID' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { status, sent_at, company, position, cover_letter } = body;
    
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
    
    const application = db
      .prepare('SELECT * FROM applications WHERE id = ?')
      .get(id);
    
    const contacts = db
      .prepare('SELECT * FROM contact_persons WHERE application_id = ?')
      .all(id);
    
    return NextResponse.json(
      { application: { ...application, contacts } },
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
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid ID' },
        { status: 400 }
      );
    }
    
    const db = getDatabase();
    const result = db
      .prepare('DELETE FROM applications WHERE id = ?')
      .run(id);
    
    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }
    
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
