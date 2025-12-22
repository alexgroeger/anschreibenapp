import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('application_id');
    
    if (!applicationId) {
      return NextResponse.json(
        { error: 'application_id is required' },
        { status: 400 }
      );
    }
    
    const db = getDatabase();
    const contacts = db
      .prepare('SELECT * FROM contact_persons WHERE application_id = ? ORDER BY created_at DESC')
      .all(parseInt(applicationId));
    
    return NextResponse.json({ contacts }, { status: 200 });
  } catch (error) {
    console.error('Error fetching contact persons:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contact persons' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { application_id, name, email, phone, position } = body;
    
    if (!application_id || !name) {
      return NextResponse.json(
        { error: 'application_id and name are required' },
        { status: 400 }
      );
    }
    
    const db = getDatabase();
    const result = db
      .prepare('INSERT INTO contact_persons (application_id, name, email, phone, position) VALUES (?, ?, ?, ?, ?)')
      .run(application_id, name, email || null, phone || null, position || null);
    
    const contact = db
      .prepare('SELECT * FROM contact_persons WHERE id = ?')
      .get(result.lastInsertRowid);
    
    return NextResponse.json(
      { contact },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating contact person:', error);
    return NextResponse.json(
      { error: 'Failed to create contact person' },
      { status: 500 }
    );
  }
}
