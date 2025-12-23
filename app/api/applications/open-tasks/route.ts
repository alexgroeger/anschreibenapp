import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/client';

export async function GET(request: NextRequest) {
  try {
    const db = getDatabase();
    
    // Get all open tasks (sent_at IS NULL)
    const openTasksQuery = `
      SELECT 
        a.id,
        a.company,
        a.position,
        a.status,
        a.sent_at,
        a.created_at,
        a.updated_at,
        a.deadline
      FROM applications a
      WHERE a.sent_at IS NULL
      ORDER BY 
        CASE WHEN a.deadline IS NOT NULL THEN 0 ELSE 1 END,
        a.deadline ASC,
        a.created_at DESC
      LIMIT 100
    `;
    
    const allOpenTasks = db.prepare(openTasksQuery).all() as any[];
    
    // Separate those with deadlines from those without
    const withDeadlines = allOpenTasks.filter((app: any) => app.deadline !== null);
    const withoutDeadlines = allOpenTasks.filter((app: any) => app.deadline === null);
    
    // Load contacts for all applications
    const allApplicationIds = allOpenTasks.map((app: any) => app.id);
    let contactsMap: Record<number, any[]> = {};
    
    if (allApplicationIds.length > 0) {
      const placeholders = allApplicationIds.map(() => '?').join(',');
      const contactsQuery = `
        SELECT 
          application_id,
          id,
          name,
          email,
          phone,
          position,
          created_at
        FROM contact_persons
        WHERE application_id IN (${placeholders})
        ORDER BY application_id, created_at DESC
      `;
      
      const allContacts = db.prepare(contactsQuery).all(...allApplicationIds) as any[];
      
      allContacts.forEach((contact: any) => {
        if (!contactsMap[contact.application_id]) {
          contactsMap[contact.application_id] = [];
        }
        contactsMap[contact.application_id].push({
          id: contact.id,
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          position: contact.position,
          created_at: contact.created_at
        });
      });
    }
    
    const addContacts = (apps: any[]) => apps.map((app: any) => ({
      ...app,
      contacts: contactsMap[app.id] || []
    }));
    
    return NextResponse.json({
      applications: addContacts(allOpenTasks),
      withDeadlines: addContacts(withDeadlines)
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching open tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch open tasks' },
      { status: 500 }
    );
  }
}

