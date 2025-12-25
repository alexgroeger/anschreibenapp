import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, syncDatabaseAfterWrite } from '@/lib/database/client';

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
    const result = db
      .prepare('DELETE FROM old_cover_letters WHERE id = ?')
      .run(id);
    
    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Cover letter not found' },
        { status: 404 }
      );
    }
    
    // Sync to cloud storage after write
    await syncDatabaseAfterWrite();
    
    return NextResponse.json(
      { message: 'Cover letter deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting cover letter:', error);
    return NextResponse.json(
      { error: 'Failed to delete cover letter' },
      { status: 500 }
    );
  }
}
