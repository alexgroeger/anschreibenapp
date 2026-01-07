import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, getCachedStatement, syncDatabaseAfterWrite } from '@/lib/database/client';
import { calculateNextOccurrence, shouldRecurrenceContinue } from '@/lib/reminders/recurrence';

// Route segment config - force dynamic for real-time data
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('application_id');
    const status = searchParams.get('status');
    const upcoming = searchParams.get('upcoming') === 'true';
    
    const db = getDatabase();
    
    // Check if reminders table exists
    try {
      const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='reminders'").get();
      if (!tableCheck) {
        console.error('Reminders table does not exist!');
        return NextResponse.json(
          { error: 'Reminders table not found. Database may need to be initialized.' },
          { status: 500 }
        );
      }
    } catch (checkError) {
      console.error('Error checking table existence:', checkError);
    }
    
    // Build WHERE clause
    const whereConditions: string[] = [];
    const params: any[] = [];
    
    if (applicationId) {
      whereConditions.push('application_id = ?');
      params.push(parseInt(applicationId));
    }
    
    if (status) {
      whereConditions.push('status = ?');
      params.push(status);
    }
    
    if (upcoming) {
      // Filter for upcoming reminders: due_date in the future or next_occurrence in the future
      // Use CURRENT_TIMESTAMP which is more reliable in SQLite
      whereConditions.push("(due_date >= CURRENT_TIMESTAMP OR (next_occurrence IS NOT NULL AND next_occurrence >= CURRENT_TIMESTAMP))");
      whereConditions.push('status = ?');
      params.push('pending');
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';
    
    // Simplified query - avoid complex date comparisons that might fail
    const query = `
      SELECT 
        id,
        application_id,
        title,
        description,
        due_date,
        reminder_type,
        status,
        is_recurring,
        recurrence_pattern,
        recurrence_interval,
        recurrence_end_date,
        next_occurrence,
        created_at,
        updated_at,
        completed_at
      FROM reminders
      ${whereClause}
      ORDER BY 
        CASE WHEN status = 'pending' THEN 0 ELSE 1 END,
        created_at DESC
    `;
    
    console.log('Fetching reminders with query:', query);
    console.log('Params:', params);
    console.log('Where clause:', whereClause);
    
    let reminders: any[];
    try {
      const stmt = db.prepare(query);
      reminders = stmt.all(...params) as any[];
      console.log('Found reminders:', reminders.length);
    } catch (queryError) {
      console.error('Query execution error:', queryError);
      console.error('Query was:', query);
      console.error('Params were:', params);
      throw queryError;
    }
    
    return NextResponse.json({ reminders }, { status: 200 });
  } catch (error) {
    console.error('Error fetching reminders:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch reminders';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Check for database corruption or I/O errors
    const isDatabaseError = errorMessage.includes('disk I/O error') || 
                           errorMessage.includes('database disk image is malformed') ||
                           errorMessage.includes('database is locked') ||
                           errorMessage.includes('unable to open database file');
    
    console.error('Full error details:', {
      message: errorMessage,
      stack: errorStack,
      error: error,
      isDatabaseError
    });
    
    return NextResponse.json(
      { 
        error: isDatabaseError 
          ? 'Database error: Please check database integrity and Cloud Storage sync' 
          : errorMessage, 
        details: process.env.NODE_ENV === 'development' ? errorStack : undefined 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Creating reminder with data:', JSON.stringify(body, null, 2));
    
    const {
      application_id,
      title,
      description,
      due_date,
      reminder_type = 'custom',
      is_recurring,
      recurrence_pattern,
      recurrence_interval,
      recurrence_end_date,
    } = body;
    
    if (!title || !due_date) {
      console.error('Validation failed: missing title or due_date', { title, due_date });
      return NextResponse.json(
        { error: 'Title and due_date are required' },
        { status: 400 }
      );
    }
    
    // Validate application_id if provided
    if (application_id !== null && application_id !== undefined) {
      const applicationIdNum = typeof application_id === 'string' ? parseInt(application_id) : application_id;
      if (isNaN(applicationIdNum)) {
        return NextResponse.json(
          { error: 'Invalid application_id' },
          { status: 400 }
        );
      }
      const application = getCachedStatement('SELECT id FROM applications WHERE id = ?')
        .get(applicationIdNum);
      if (!application) {
        return NextResponse.json(
          { error: 'Application not found' },
          { status: 404 }
        );
      }
    }
    
    const db = getDatabase();
    
    // Normalize is_recurring: accept both boolean and number (0/1)
    const isRecurring = is_recurring === true || is_recurring === 1;
    
    // Calculate next_occurrence for recurring reminders
    let nextOccurrence = null;
    if (isRecurring && recurrence_pattern) {
      try {
        const dueDate = new Date(due_date);
        if (isNaN(dueDate.getTime())) {
          throw new Error('Invalid due_date format');
        }
        nextOccurrence = calculateNextOccurrence(
          dueDate,
          recurrence_pattern,
          recurrence_interval || 1
        ).toISOString();
      } catch (error) {
        console.error('Error calculating next occurrence:', error);
        // Don't fail if next occurrence calculation fails
      }
    }
    
    // Prepare application_id
    const applicationIdValue = application_id !== null && application_id !== undefined 
      ? (typeof application_id === 'string' ? parseInt(application_id) : application_id)
      : null;
    
    console.log('Inserting reminder with values:', {
      application_id: applicationIdValue,
      title,
      description: description || null,
      due_date,
      reminder_type: reminder_type,
      is_recurring: isRecurring ? 1 : 0,
      recurrence_pattern: recurrence_pattern || null,
      recurrence_interval: isRecurring ? (recurrence_interval || 1) : null,
      recurrence_end_date: recurrence_end_date || null,
      next_occurrence: nextOccurrence
    });
    
    const result = db
      .prepare(`
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
      `)
      .run(
        applicationIdValue,
        title,
        description || null,
        due_date,
        reminder_type,
        isRecurring ? 1 : 0,
        recurrence_pattern || null,
        isRecurring ? (recurrence_interval || 1) : null,
        recurrence_end_date || null,
        nextOccurrence
      );
    
    const reminderId = Number(result.lastInsertRowid);
    console.log('Reminder created with ID:', reminderId);
    
    const reminder = getCachedStatement('SELECT * FROM reminders WHERE id = ?')
      .get(reminderId) as any;
    
    if (!reminder) {
      console.error('Failed to retrieve created reminder');
      return NextResponse.json(
        { error: 'Failed to retrieve created reminder' },
        { status: 500 }
      );
    }
    
    console.log('Reminder retrieved successfully:', reminder.id);
    
    // Sync to cloud storage after write
    await syncDatabaseAfterWrite();
    
    return NextResponse.json({ reminder }, { status: 201 });
  } catch (error) {
    console.error('Error creating reminder:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create reminder';
    return NextResponse.json(
      { error: errorMessage, details: error instanceof Error ? error.stack : undefined },
      { status: 500 }
    );
  }
}

