import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, getCachedStatement } from '@/lib/database/client';

// PATCH: Vorschlag aktualisieren (akzeptieren/ablehnen)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; suggestionId: string }> }
) {
  try {
    const { id: idParam, suggestionId: suggestionIdParam } = await params;
    const applicationId = parseInt(idParam);
    const suggestionId = parseInt(suggestionIdParam);
    
    if (isNaN(applicationId) || isNaN(suggestionId)) {
      return NextResponse.json(
        { error: 'Invalid ID' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { status } = body;
    
    if (!status || !['pending', 'accepted', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Valid status (pending, accepted, rejected) is required' },
        { status: 400 }
      );
    }
    
    const db = getDatabase();
    
    // Prüfe ob Vorschlag existiert und zur Bewerbung gehört
    const suggestion = db
      .prepare('SELECT * FROM cover_letter_suggestions WHERE id = ? AND application_id = ?')
      .get(suggestionId, applicationId) as any;
    
    if (!suggestion) {
      return NextResponse.json(
        { error: 'Suggestion not found' },
        { status: 404 }
      );
    }
    
    // Aktualisiere Status
    db.prepare('UPDATE cover_letter_suggestions SET status = ? WHERE id = ?')
      .run(status, suggestionId);
    
    // Hole aktualisierten Vorschlag zurück
    const updatedSuggestion = db
      .prepare('SELECT * FROM cover_letter_suggestions WHERE id = ?')
      .get(suggestionId) as any;
    
    return NextResponse.json(
      { suggestion: updatedSuggestion },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating suggestion:', error);
    return NextResponse.json(
      { error: 'Failed to update suggestion' },
      { status: 500 }
    );
  }
}

// DELETE: Vorschlag löschen
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; suggestionId: string }> }
) {
  try {
    const { id: idParam, suggestionId: suggestionIdParam } = await params;
    const applicationId = parseInt(idParam);
    const suggestionId = parseInt(suggestionIdParam);
    
    if (isNaN(applicationId) || isNaN(suggestionId)) {
      return NextResponse.json(
        { error: 'Invalid ID' },
        { status: 400 }
      );
    }
    
    const db = getDatabase();
    
    // Prüfe ob Vorschlag existiert und zur Bewerbung gehört
    const suggestion = db
      .prepare('SELECT id FROM cover_letter_suggestions WHERE id = ? AND application_id = ?')
      .get(suggestionId, applicationId);
    
    if (!suggestion) {
      return NextResponse.json(
        { error: 'Suggestion not found' },
        { status: 404 }
      );
    }
    
    // Lösche Vorschlag
    db.prepare('DELETE FROM cover_letter_suggestions WHERE id = ?')
      .run(suggestionId);
    
    return NextResponse.json(
      { message: 'Suggestion deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting suggestion:', error);
    return NextResponse.json(
      { error: 'Failed to delete suggestion' },
      { status: 500 }
    );
  }
}
