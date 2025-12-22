import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/client';

// POST: Daten exportieren
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type } = body; // 'all', 'applications', 'resume', 'cover-letters'

    const db = getDatabase();
    let exportData: any = {};

    if (type === 'all' || type === 'applications') {
      const applications = db
        .prepare('SELECT * FROM applications ORDER BY created_at DESC')
        .all();
      
      // Load contact persons for each application
      const applicationsWithContacts = applications.map((app: any) => {
        const contacts = db
          .prepare('SELECT * FROM contact_persons WHERE application_id = ?')
          .all(app.id);
        return { ...app, contacts };
      });

      exportData.applications = applicationsWithContacts;
    }

    if (type === 'all' || type === 'resume') {
      const resume = db
        .prepare('SELECT * FROM resume ORDER BY updated_at DESC LIMIT 1')
        .get();
      exportData.resume = resume;
    }

    if (type === 'all' || type === 'cover-letters') {
      const coverLetters = db
        .prepare('SELECT * FROM old_cover_letters ORDER BY uploaded_at DESC')
        .all();
      exportData.coverLetters = coverLetters;
    }

    if (type === 'all') {
      const settings = db.prepare('SELECT * FROM settings').all();
      exportData.settings = settings;
    }

    return NextResponse.json(
      {
        success: true,
        data: exportData,
        exportedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}
