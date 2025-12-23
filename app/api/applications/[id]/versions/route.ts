import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, getCachedStatement, syncDatabaseAfterWrite } from '@/lib/database/client';

// GET: Alle Versionen einer Bewerbung abrufen
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
    
    const versions = getCachedStatement(
      'SELECT * FROM cover_letter_versions WHERE application_id = ? ORDER BY created_at DESC'
    ).all(applicationId) as any[];
    
    return NextResponse.json(
      { versions },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching versions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch versions' },
      { status: 500 }
    );
  }
}

// POST: Neue Version erstellen
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
    const { content, created_by } = body;
    
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required' },
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
    
    // Hole die höchste Versionsnummer für diese Bewerbung
    const maxVersion = db
      .prepare('SELECT MAX(version_number) as max_version FROM cover_letter_versions WHERE application_id = ?')
      .get(applicationId) as any;
    
    const nextVersionNumber = (maxVersion?.max_version || 0) + 1;
    
    // Erstelle neue Version
    const result = db
      .prepare(`
        INSERT INTO cover_letter_versions (application_id, content, version_number, created_by)
        VALUES (?, ?, ?, ?)
      `)
      .run(applicationId, content, nextVersionNumber, created_by || 'user');
    
    const versionId = Number(result.lastInsertRowid);
    
    // Aktualisiere auch das cover_letter Feld in applications
    db.prepare('UPDATE applications SET cover_letter = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(content, applicationId);
    
    // Hole die erstellte Version zurück
    const version = db
      .prepare('SELECT * FROM cover_letter_versions WHERE id = ?')
      .get(versionId) as any;
    
    // Sync to cloud storage after write
    await syncDatabaseAfterWrite();
    
    return NextResponse.json(
      { version },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating version:', error);
    return NextResponse.json(
      { error: 'Failed to create version' },
      { status: 500 }
    );
  }
}

