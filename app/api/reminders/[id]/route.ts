import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, getCachedStatement } from '@/lib/database/client';
import { calculateNextOccurrence } from '@/lib/reminders/recurrence';

export async function GET(
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
    
    const reminder = getCachedStatement('SELECT * FROM reminders WHERE id = ?')
      .get(id) as any;
    
    if (!reminder) {
      return NextResponse.json(
        { error: 'Reminder not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ reminder }, { status: 200 });
  } catch (error) {
    console.error('Error fetching reminder:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reminder' },
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
    
    const body = await request.json();
    const {
      title,
      description,
      due_date,
      reminder_type,
      status,
      is_recurring,
      recurrence_pattern,
      recurrence_interval,
      recurrence_end_date,
    } = body;
    
    const db = getDatabase();
    const updates: string[] = [];
    const values: any[] = [];
    
    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (due_date !== undefined) {
      updates.push('due_date = ?');
      values.push(due_date);
    }
    if (reminder_type !== undefined) {
      updates.push('reminder_type = ?');
      values.push(reminder_type);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
      if (status === 'completed') {
        updates.push('completed_at = CURRENT_TIMESTAMP');
      } else if (status === 'pending' && body.status === 'completed') {
        updates.push('completed_at = NULL');
      }
    }
    if (is_recurring !== undefined) {
      updates.push('is_recurring = ?');
      values.push(is_recurring ? 1 : 0);
    }
    if (recurrence_pattern !== undefined) {
      updates.push('recurrence_pattern = ?');
      values.push(recurrence_pattern);
    }
    if (recurrence_interval !== undefined) {
      updates.push('recurrence_interval = ?');
      values.push(recurrence_interval);
    }
    if (recurrence_end_date !== undefined) {
      updates.push('recurrence_end_date = ?');
      values.push(recurrence_end_date);
    }
    
    // Recalculate next_occurrence if recurrence settings changed
    if (is_recurring && recurrence_pattern && due_date) {
      const dueDate = new Date(due_date);
      const nextOccurrence = calculateNextOccurrence(
        dueDate,
        recurrence_pattern,
        recurrence_interval || 1
      ).toISOString();
      updates.push('next_occurrence = ?');
      values.push(nextOccurrence);
    } else if (is_recurring === false) {
      updates.push('next_occurrence = NULL');
    }
    
    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    const result = db
      .prepare(`UPDATE reminders SET ${updates.join(', ')} WHERE id = ?`)
      .run(...values);
    
    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Reminder not found' },
        { status: 404 }
      );
    }
    
    const reminder = getCachedStatement('SELECT * FROM reminders WHERE id = ?')
      .get(id) as any;
    
    return NextResponse.json({ reminder }, { status: 200 });
  } catch (error) {
    console.error('Error updating reminder:', error);
    return NextResponse.json(
      { error: 'Failed to update reminder' },
      { status: 500 }
    );
  }
}

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
      .prepare('DELETE FROM reminders WHERE id = ?')
      .run(id);
    
    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Reminder not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { message: 'Reminder deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting reminder:', error);
    return NextResponse.json(
      { error: 'Failed to delete reminder' },
      { status: 500 }
    );
  }
}

