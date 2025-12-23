import { getDatabase } from '@/lib/database/client';

/**
 * Erstellt oder aktualisiert eine Deadline-Erinnerung für eine Bewerbung
 * @param applicationId Die ID der Bewerbung
 * @param deadline Das Deadline-Datum (ISO string oder null)
 * @param company Der Firmenname für den Titel
 * @param position Die Position für den Titel
 */
export async function syncDeadlineReminder(
  applicationId: number,
  deadline: string | null,
  company: string,
  position: string
): Promise<void> {
  const db = getDatabase();

  // Check if a deadline reminder already exists for this application
  const existingReminder = db
    .prepare('SELECT * FROM reminders WHERE application_id = ? AND reminder_type = ?')
    .get(applicationId, 'deadline') as any;

  if (deadline) {
    // Create or update deadline reminder
    // Titel ist immer "Bewerbungsfrist" (wie im Formular)
    const title = 'Bewerbungsfrist';
    const dueDate = new Date(deadline);
    
    // Set time to end of day (23:59:59) if only date is provided
    if (deadline.match(/^\d{4}-\d{2}-\d{2}$/)) {
      dueDate.setHours(23, 59, 59, 999);
    }

    if (existingReminder) {
      // Update existing reminder
      db.prepare(`
        UPDATE reminders 
        SET title = ?, 
            due_date = ?, 
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(title, dueDate.toISOString(), existingReminder.id);
    } else {
      // Create new reminder
      db.prepare(`
        INSERT INTO reminders (
          application_id,
          title,
          description,
          due_date,
          reminder_type,
          status
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        applicationId,
        title,
        `Bewerbungsfrist für die Position ${position} bei ${company}`,
        dueDate.toISOString(),
        'deadline',
        'pending'
      );
    }
  } else {
    // If deadline is removed, delete the deadline reminder if it exists
    if (existingReminder) {
      db.prepare('DELETE FROM reminders WHERE id = ?').run(existingReminder.id);
    }
  }
}

