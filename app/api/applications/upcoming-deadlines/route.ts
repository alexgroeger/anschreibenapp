import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/client';

export async function GET(request: NextRequest) {
  try {
    const db = getDatabase();
    
    // Get applications with deadlines in the next 7 days
    const query = `
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
      WHERE a.deadline IS NOT NULL
        AND date(a.deadline) >= date('now')
        AND date(a.deadline) <= date('now', '+7 days')
      ORDER BY a.deadline ASC
      LIMIT 100
    `;
    
    const applications = db.prepare(query).all() as any[];
    
    // Separate urgent (next 3 days) from others
    const now = new Date();
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(now.getDate() + 3);
    
    const urgent: any[] = [];
    const others: any[] = [];
    
    applications.forEach((app: any) => {
      if (app.deadline) {
        const deadlineDate = new Date(app.deadline);
        if (deadlineDate <= threeDaysFromNow) {
          urgent.push(app);
        } else {
          others.push(app);
        }
      }
    });
    
    // Load contacts for all applications
    const allApplicationIds = applications.map((app: any) => app.id);
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
      applications: addContacts(applications),
      urgent: addContacts(urgent)
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching upcoming deadlines:', error);
    return NextResponse.json(
      { error: 'Failed to fetch upcoming deadlines' },
      { status: 500 }
    );
  }
}

