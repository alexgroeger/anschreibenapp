import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/client';

// GET: Datenbank-Statistiken
export async function GET() {
  try {
    const db = getDatabase();

    const stats = {
      resume: {
        count: db.prepare('SELECT COUNT(*) as count FROM resume').get() as any,
        totalSize: 0,
      },
      old_cover_letters: {
        count: db.prepare('SELECT COUNT(*) as count FROM old_cover_letters').get() as any,
        totalSize: 0,
      },
      applications: {
        count: db.prepare('SELECT COUNT(*) as count FROM applications').get() as any,
        byStatus: db
          .prepare('SELECT status, COUNT(*) as count FROM applications GROUP BY status')
          .all(),
      },
      contact_persons: {
        count: db.prepare('SELECT COUNT(*) as count FROM contact_persons').get() as any,
      },
      settings: {
        count: db.prepare('SELECT COUNT(*) as count FROM settings').get() as any,
      },
      prompt_versions: {
        count: db.prepare('SELECT COUNT(*) as count FROM prompt_versions').get() as any,
      },
      database: {
        path: db.name,
        size: 0, // Would need fs.statSync for file size
      },
    };

    // Calculate approximate sizes
    const resumeData = db.prepare('SELECT content FROM resume').all() as any[];
    stats.resume.totalSize = resumeData.reduce(
      (sum, r) => sum + (r.content?.length || 0),
      0
    );

    const coverLettersData = db
      .prepare('SELECT content FROM old_cover_letters')
      .all() as any[];
    stats.old_cover_letters.totalSize = coverLettersData.reduce(
      (sum, c) => sum + (c.content?.length || 0),
      0
    );

    return NextResponse.json({ stats }, { status: 200 });
  } catch (error) {
    console.error('Error fetching database stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch database stats' },
      { status: 500 }
    );
  }
}
