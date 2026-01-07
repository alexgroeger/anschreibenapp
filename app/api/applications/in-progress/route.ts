import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/client';

// Route segment config - short cache for dashboard data
export const dynamic = 'force-dynamic'
export const revalidate = 30 // Revalidate every 30 seconds

export async function GET(request: NextRequest) {
  try {
    const db = getDatabase();
    
    // Get applications with status "in_bearbeitung" (in progress)
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
      WHERE a.status = 'in_bearbeitung'
      ORDER BY a.created_at DESC
      LIMIT 100
    `;
    
    const applications = db.prepare(query).all() as any[];
    
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
    console.error('Error fetching in-progress applications:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch in-progress applications';
    
    // Check for database corruption or I/O errors
    const isDatabaseError = errorMessage.includes('disk I/O error') || 
                           errorMessage.includes('database disk image is malformed') ||
                           errorMessage.includes('database is locked') ||
                           errorMessage.includes('unable to open database file');
    
    return NextResponse.json(
      { 
        error: isDatabaseError 
          ? 'Database error: Please check database integrity and Cloud Storage sync' 
          : 'Failed to fetch in-progress applications',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

