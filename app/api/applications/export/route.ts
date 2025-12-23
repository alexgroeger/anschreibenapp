import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const company = searchParams.get('company');
    const position = searchParams.get('position');
    const sentAtFrom = searchParams.get('sent_at_from');
    const sentAtTo = searchParams.get('sent_at_to');
    
    const db = getDatabase();
    
    // Build WHERE clause (same logic as main route)
    const whereConditions: string[] = [];
    const params: any[] = [];
    
    if (status) {
      whereConditions.push('a.status = ?');
      params.push(status);
    }
    
    if (company) {
      whereConditions.push('a.company LIKE ?');
      params.push(`%${company}%`);
    }
    
    if (position) {
      whereConditions.push('a.position LIKE ?');
      params.push(`%${position}%`);
    }
    
    if (sentAtFrom) {
      whereConditions.push("DATE(a.sent_at) >= DATE(?)");
      params.push(sentAtFrom);
    }
    
    if (sentAtTo) {
      whereConditions.push("DATE(a.sent_at) <= DATE(?)");
      params.push(sentAtTo);
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';
    
    // Get all applications matching the filters (no pagination)
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
      ${whereClause}
      ORDER BY 
        CASE a.status
          WHEN 'in_bearbeitung' THEN 1
          WHEN 'rueckmeldung_ausstehend' THEN 2
          WHEN 'gesendet' THEN 3
          WHEN 'angenommen' THEN 4
          WHEN 'abgelehnt' THEN 5
          ELSE 6
        END,
        a.created_at DESC
    `;
    
    const applications = db.prepare(query).all(...params) as any[];
    
    // Load contacts for all applications
    const applicationIds = applications.map((app: any) => app.id);
    let contactsMap: Record<number, any[]> = {};
    
    if (applicationIds.length > 0) {
      const placeholders = applicationIds.map(() => '?').join(',');
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
      
      const allContacts = db.prepare(contactsQuery).all(...applicationIds) as any[];
      
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
    
    // Combine applications with their contacts
    const applicationsWithContacts = applications.map((app: any) => ({
      ...app,
      contacts: contactsMap[app.id] || []
    }));
    
    return NextResponse.json({ 
      applications: applicationsWithContacts
    }, { status: 200 });
  } catch (error) {
    console.error('Error exporting applications:', error);
    return NextResponse.json(
      { error: 'Failed to export applications' },
      { status: 500 }
    );
  }
}

