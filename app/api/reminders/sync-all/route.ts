import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/client';
import { syncDeadlineReminder } from '@/lib/reminders/deadline-sync';

/**
 * Synchronisiert alle bestehenden Bewerbungen mit Deadlines und erstellt/aktualisiert Erinnerungen
 * Dies sollte einmalig aufgerufen werden, um Erinnerungen für alle bestehenden Bewerbungen zu erstellen
 */
export async function POST(request: NextRequest) {
  try {
    const db = getDatabase();
    
    // Get all applications with deadlines that don't have a deadline reminder yet
    const applicationsWithDeadlines = db.prepare(`
      SELECT 
        a.id,
        a.company,
        a.position,
        a.deadline
      FROM applications a
      WHERE a.deadline IS NOT NULL
        AND a.deadline != ''
    `).all() as Array<{ id: number; company: string; position: string; deadline: string }>;
    
    let created = 0;
    let updated = 0;
    let errors = 0;
    
    for (const app of applicationsWithDeadlines) {
      try {
        // Check if reminder already exists
        const existingReminder = db
          .prepare('SELECT id FROM reminders WHERE application_id = ? AND reminder_type = ?')
          .get(app.id, 'deadline') as any;
        
        if (existingReminder) {
          // Update existing reminder
          await syncDeadlineReminder(app.id, app.deadline, app.company, app.position);
          updated++;
        } else {
          // Create new reminder
          await syncDeadlineReminder(app.id, app.deadline, app.company, app.position);
          created++;
        }
      } catch (error) {
        console.error(`Error syncing reminder for application ${app.id}:`, error);
        errors++;
      }
    }
    
    return NextResponse.json({
      message: 'Reminders synchronized',
      total: applicationsWithDeadlines.length,
      created,
      updated,
      errors
    }, { status: 200 });
  } catch (error) {
    console.error('Error syncing all reminders:', error);
    return NextResponse.json(
      { error: 'Failed to sync reminders' },
      { status: 500 }
    );
  }
}

