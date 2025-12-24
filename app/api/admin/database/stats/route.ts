import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/client';

// GET: Datenbank-Statistiken
export async function GET() {
  try {
    const db = getDatabase();

    // Get counts - ensure we extract the count value correctly
    const resumeCountResult = db.prepare('SELECT COUNT(*) as count FROM resume').get() as { count: number } | undefined;
    const oldCoverLettersCountResult = db.prepare('SELECT COUNT(*) as count FROM old_cover_letters').get() as { count: number } | undefined;
    const applicationsCountResult = db.prepare('SELECT COUNT(*) as count FROM applications').get() as { count: number } | undefined;
    const contactPersonsCountResult = db.prepare('SELECT COUNT(*) as count FROM contact_persons').get() as { count: number } | undefined;
    const settingsCountResult = db.prepare('SELECT COUNT(*) as count FROM settings').get() as { count: number } | undefined;
    const promptVersionsCountResult = db.prepare('SELECT COUNT(*) as count FROM prompt_versions').get() as { count: number } | undefined;

    const stats = {
      resume: {
        count: { count: resumeCountResult?.count ?? 0 },
        totalSize: 0,
      },
      old_cover_letters: {
        count: { count: oldCoverLettersCountResult?.count ?? 0 },
        totalSize: 0,
      },
      applications: {
        count: { count: applicationsCountResult?.count ?? 0 },
        byStatus: db
          .prepare('SELECT status, COUNT(*) as count FROM applications GROUP BY status')
          .all(),
      },
      contact_persons: {
        count: { count: contactPersonsCountResult?.count ?? 0 },
      },
      settings: {
        count: { count: settingsCountResult?.count ?? 0 },
      },
      prompt_versions: {
        count: { count: promptVersionsCountResult?.count ?? 0 },
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

