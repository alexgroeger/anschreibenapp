import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, getCachedStatement } from '@/lib/database/client';
import { calculateNextOccurrence, shouldRecurrenceContinue } from '@/lib/reminders/recurrence';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('application_id');
    const status = searchParams.get('status');
    const upcoming = searchParams.get('upcoming') === 'true';
    
    const db = getDatabase();
    
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
      whereConditions.push('(due_date >= datetime("now") OR next_occurrence >= datetime("now"))');
      whereConditions.push('status = ?');
      params.push('pending');
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';
    
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
        CASE 
          WHEN status = 'pending' AND (due_date < datetime("now") OR next_occurrence < datetime("now")) THEN 0
          WHEN status = 'pending' AND (due_date = date("now") OR next_occurrence = date("now")) THEN 1
          WHEN status = 'pending' THEN 2
          ELSE 3
        END,
        COALESCE(next_occurrence, due_date) ASC
    `;
    
    const reminders = db.prepare(query).all(...params) as any[];
    
    return NextResponse.json({ reminders }, { status: 200 });
  } catch (error) {
    console.error('Error fetching reminders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reminders' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      application_id,
      title,
      description,
      due_date,
      reminder_type = 'custom',
      is_recurring,
      recurrence_pattern,
      recurrence_interval = 1,
      recurrence_end_date,
    } = body;
    
    if (!title || !due_date) {
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
      const dueDate = new Date(due_date);
      nextOccurrence = calculateNextOccurrence(
        dueDate,
        recurrence_pattern,
        recurrence_interval || 1
      ).toISOString();
    }
    
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
        application_id !== null && application_id !== undefined 
          ? (typeof application_id === 'string' ? parseInt(application_id) : application_id)
          : null,
        title,
        description || null,
        due_date,
        reminder_type,
        isRecurring ? 1 : 0,
        recurrence_pattern || null,
        recurrence_interval || 1,
        recurrence_end_date || null,
        nextOccurrence
      );
    
    const reminderId = Number(result.lastInsertRowid);
    const reminder = getCachedStatement('SELECT * FROM reminders WHERE id = ?')
      .get(reminderId) as any;
    
    return NextResponse.json({ reminder }, { status: 201 });
  } catch (error) {
    console.error('Error creating reminder:', error);
    return NextResponse.json(
      { error: 'Failed to create reminder' },
      { status: 500 }
    );
  }
}

