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
      .prepare('DELETE FROM contact_persons WHERE id = ?')
      .run(id);
    
    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Contact person not found' },
        { status: 404 }
      );
    }
    
    // Sync to cloud storage after write
    await syncDatabaseAfterWrite();
    
    return NextResponse.json(
      { message: 'Contact person deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting contact person:', error);
    return NextResponse.json(
      { error: 'Failed to delete contact person' },
      { status: 500 }
    );
  }
}


