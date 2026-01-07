import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/client';

// Route segment config - short cache for dashboard data
export const dynamic = 'force-dynamic'
export const revalidate = 30 // Revalidate every 30 seconds

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
      const excludeLast = parseInt(searchParams.get('excludeLast') || '0');
      
      if (isNaN(days) || days < 1) {
        return NextResponse.json(
          { error: 'Invalid days parameter' },
          { status: 400 }
        );
      }
      
      // Get applications sent in the last X days (not "X days ago", but "within the last X days")
      // If excludeLast is set, exclude the last N days (e.g., for "8-14 days ago", exclude last 7)
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - excludeLast); // Exclude the last N days
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days - excludeLast);
      
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
    
    const response = NextResponse.json({
      applications: applicationsWithContacts
    }, { status: 200 });
    
    // Cache-Control header for client-side caching
    response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    
    return response;
  } catch (error) {
    console.error('Error fetching recently sent applications:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch recently sent applications';
    
    // Check for database corruption or I/O errors
    const isDatabaseError = errorMessage.includes('disk I/O error') || 
                           errorMessage.includes('database disk image is malformed') ||
                           errorMessage.includes('database is locked') ||
                           errorMessage.includes('unable to open database file');
    
    return NextResponse.json(
      { 
        error: isDatabaseError 
          ? 'Database error: Please check database integrity and Cloud Storage sync' 
          : 'Failed to fetch recently sent applications',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

