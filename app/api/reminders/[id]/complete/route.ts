import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, getCachedStatement, syncDatabaseAfterWrite } from '@/lib/database/client';
import { calculateNextOccurrence, shouldRecurrenceContinue } from '@/lib/reminders/recurrence';

export async function POST(
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
    const reminder = getCachedStatement('SELECT * FROM reminders WHERE id = ?')
      .get(id) as any;
    
    if (!reminder) {
      return NextResponse.json(
        { error: 'Reminder not found' },
        { status: 404 }
      );
    }
    
    // Mark as completed
    db.prepare(`
      UPDATE reminders 
      SET status = 'completed', 
          completed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id);
    
    // If recurring, create next occurrence
    if (reminder.is_recurring && reminder.recurrence_pattern) {
      const dueDate = new Date(reminder.due_date);
      const nextOccurrence = calculateNextOccurrence(
        dueDate,
        reminder.recurrence_pattern,
        reminder.recurrence_interval || 1
      );
      
      // Check if recurrence should continue
      const endDate = reminder.recurrence_end_date 
        ? new Date(reminder.recurrence_end_date) 
        : null;
      
      if (shouldRecurrenceContinue(nextOccurrence, endDate)) {
        // Create new reminder for next occurrence
        db.prepare(`
          INSERT INTO reminders (
            application_id,
            title,
            description,
            due_date,
            reminder_type,
            is_recurring,
            recurrence_pattern,
            recurrence_interval,
            recurrence_end_date,
            next_occurrence
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          reminder.application_id,
          reminder.title,
          reminder.description,
          nextOccurrence.toISOString(),
          reminder.reminder_type,
          reminder.is_recurring,
          reminder.recurrence_pattern,
          reminder.recurrence_interval,
          reminder.recurrence_end_date,
          null // Will be calculated when this one is completed
        );
      }
    }
    
    const updatedReminder = getCachedStatement('SELECT * FROM reminders WHERE id = ?')
      .get(id) as any;
    
    // Sync to cloud storage after write
    await syncDatabaseAfterWrite();
    
    return NextResponse.json({ reminder: updatedReminder }, { status: 200 });
  } catch (error) {
    console.error('Error completing reminder:', error);
    return NextResponse.json(
      { error: 'Failed to complete reminder' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const result = db.prepare(`
      UPDATE reminders 
      SET status = 'pending', 
          completed_at = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id);
    
    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Reminder not found' },
        { status: 404 }
      );
    }
    
    const reminder = getCachedStatement('SELECT * FROM reminders WHERE id = ?')
      .get(id) as any;
    
    // Sync to cloud storage after write
    await syncDatabaseAfterWrite();
    
    return NextResponse.json({ reminder }, { status: 200 });
  } catch (error) {
    console.error('Error uncompleting reminder:', error);
    return NextResponse.json(
      { error: 'Failed to uncomplete reminder' },
      { status: 500 }
    );
  }
}


