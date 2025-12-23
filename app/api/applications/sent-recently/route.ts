import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period'); // '7days', '14days', 'month'
    
    const db = getDatabase();
    
    let query = '';
    let params: any[] = [];
    
    if (period === 'month') {
      // Get applications sent in the current month
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const startDate = firstDayOfMonth.toISOString().split('T')[0];
      const endDate = lastDayOfMonth.toISOString().split('T')[0];
      
      query = `
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
        WHERE a.sent_at IS NOT NULL
          AND date(a.sent_at) >= ?
          AND date(a.sent_at) <= ?
        ORDER BY a.sent_at DESC
        LIMIT 100
      `;
      params = [startDate, endDate];
    } else {
      // Default: use days parameter for backward compatibility
      const days = parseInt(searchParams.get('days') || '7');
      
      if (isNaN(days) || days < 1) {
        return NextResponse.json(
          { error: 'Invalid days parameter' },
          { status: 400 }
        );
      }
      
      // Get applications sent approximately X days ago (within a range of ±1 day)
      // This makes it more likely to find results
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - days);
      const startDate = new Date(targetDate);
      startDate.setDate(startDate.getDate() - 1);
      const endDate = new Date(targetDate);
      endDate.setDate(endDate.getDate() + 1);
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      query = `
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
        WHERE a.sent_at IS NOT NULL
          AND date(a.sent_at) >= ?
          AND date(a.sent_at) <= ?
        ORDER BY a.sent_at DESC
        LIMIT 100
      `;
      params = [startDateStr, endDateStr];
    }
    
    const applications = db.prepare(query).all(...params) as any[];
    
    // Load contacts for these applications
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
    
    const applicationsWithContacts = applications.map((app: any) => ({
      ...app,
      contacts: contactsMap[app.id] || []
    }));
    
    return NextResponse.json({
      applications: applicationsWithContacts
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching recently sent applications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recently sent applications' },
      { status: 500 }
    );
  }
}

