import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, syncDatabaseAfterWrite } from '@/lib/database/client';

// POST: Datenbank optimieren
export async function POST() {
  try {
    const db = getDatabase();

    // Run VACUUM to optimize database
    db.exec('VACUUM');

    // Run ANALYZE to update statistics
    db.exec('ANALYZE');

    // Get database size before and after (approximate)
    const stats = db.prepare('PRAGMA page_count').get() as any;
    const pageSize = db.prepare('PRAGMA page_size').get() as any;

    // Sync database to Cloud Storage after optimization
    await syncDatabaseAfterWrite();

    return NextResponse.json(
      {
        success: true,
        message: 'Database optimized successfully',
        approximateSize: (stats.page_count || 0) * (pageSize.page_size || 0),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error optimizing database:', error);
    return NextResponse.json(
      { error: 'Failed to optimize database' },
      { status: 500 }
    );
  }
}

