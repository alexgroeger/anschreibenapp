import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, getCachedStatement, syncDatabaseAfterWrite } from '@/lib/database/client';

// GET: Alle Vorschläge einer Bewerbung abrufen
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
    
    // Prüfe ob Bewerbung existiert
    const application = getCachedStatement('SELECT id FROM applications WHERE id = ?')
      .get(applicationId);
    
    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }
    
    const suggestions = getCachedStatement(
      'SELECT * FROM cover_letter_suggestions WHERE application_id = ? ORDER BY created_at DESC'
    ).all(applicationId) as any[];
    
    return NextResponse.json(
      { suggestions },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suggestions' },
      { status: 500 }
    );
  }
}

// POST: Neuen Vorschlag erstellen
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
    
    const body = await request.json();
    const { version_id, paragraph_index, original_text, suggested_text, status } = body;
    
    if (original_text === undefined || suggested_text === undefined) {
      return NextResponse.json(
        { error: 'original_text and suggested_text are required' },
        { status: 400 }
      );
    }
    
    // Prüfe ob Bewerbung existiert
    const application = getCachedStatement('SELECT id FROM applications WHERE id = ?')
      .get(applicationId);
    
    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }
    
    const db = getDatabase();
    
    const result = db
      .prepare(`
        INSERT INTO cover_letter_suggestions 
        (application_id, version_id, paragraph_index, original_text, suggested_text, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(
        applicationId,
        version_id || null,
        paragraph_index !== undefined ? paragraph_index : null,
        original_text,
        suggested_text,
        status || 'pending'
      );
    
    const suggestionId = Number(result.lastInsertRowid);
    
    // Hole den erstellten Vorschlag zurück
    const suggestion = db
      .prepare('SELECT * FROM cover_letter_suggestions WHERE id = ?')
      .get(suggestionId) as any;
    
    // Sync to cloud storage after write
    await syncDatabaseAfterWrite();
    
    return NextResponse.json(
      { suggestion },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating suggestion:', error);
    return NextResponse.json(
      { error: 'Failed to create suggestion' },
      { status: 500 }
    );
  }
}


