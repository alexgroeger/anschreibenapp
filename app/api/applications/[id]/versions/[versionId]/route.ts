import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, getCachedStatement } from '@/lib/database/client';

// GET: Spezifische Version abrufen
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const { id: idParam, versionId: versionIdParam } = await params;
    const applicationId = parseInt(idParam);
    const versionId = parseInt(versionIdParam);
    
    if (isNaN(applicationId) || isNaN(versionId)) {
      return NextResponse.json(
        { error: 'Invalid ID' },
        { status: 400 }
      );
    }
    
    const version = getCachedStatement(
      'SELECT * FROM cover_letter_versions WHERE id = ? AND application_id = ?'
    ).get(versionId, applicationId) as any;
    
    if (!version) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { version },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching version:', error);
    return NextResponse.json(
      { error: 'Failed to fetch version' },
      { status: 500 }
    );
  }
}

// POST: Zu dieser Version zurückkehren (erstellt neue Version mit diesem Inhalt)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const { id: idParam, versionId: versionIdParam } = await params;
    const applicationId = parseInt(idParam);
    const versionId = parseInt(versionIdParam);
    
    if (isNaN(applicationId) || isNaN(versionId)) {
      return NextResponse.json(
        { error: 'Invalid ID' },
        { status: 400 }
      );
    }
    
    const db = getDatabase();
    
    // Hole die Version
    const version = db
      .prepare('SELECT * FROM cover_letter_versions WHERE id = ? AND application_id = ?')
      .get(versionId, applicationId) as any;
    
    if (!version) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      );
    }
    
    // Hole die höchste Versionsnummer für diese Bewerbung
    const maxVersion = db
      .prepare('SELECT MAX(version_number) as max_version FROM cover_letter_versions WHERE application_id = ?')
      .get(applicationId) as any;
    
    const nextVersionNumber = (maxVersion?.max_version || 0) + 1;
    
    // Erstelle neue Version mit dem Inhalt der ausgewählten Version
    const result = db
      .prepare(`
        INSERT INTO cover_letter_versions (application_id, content, version_number, created_by)
        VALUES (?, ?, ?, ?)
      `)
      .run(applicationId, version.content, nextVersionNumber, 'user');
    
    const newVersionId = Number(result.lastInsertRowid);
    
    // Aktualisiere auch das cover_letter Feld in applications
    db.prepare('UPDATE applications SET cover_letter = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(version.content, applicationId);
    
    // Hole die erstellte Version zurück
    const newVersion = db
      .prepare('SELECT * FROM cover_letter_versions WHERE id = ?')
      .get(newVersionId) as any;
    
    return NextResponse.json(
      { version: newVersion },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error restoring version:', error);
    return NextResponse.json(
      { error: 'Failed to restore version' },
      { status: 500 }
    );
  }
}
