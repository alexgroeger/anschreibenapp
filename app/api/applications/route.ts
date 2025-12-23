import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, getCachedStatement, syncDatabaseAfterWrite } from '@/lib/database/client';
import { syncDeadlineReminder } from '@/lib/reminders/deadline-sync';

// Route segment config - force dynamic for real-time data
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const company = searchParams.get('company');
    const position = searchParams.get('position');
    const sentAtFrom = searchParams.get('sent_at_from');
    const sentAtTo = searchParams.get('sent_at_to');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const page = parseInt(searchParams.get('page') || '1');
    
    const db = getDatabase();
    
    // Build WHERE clause
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
    
    // Calculate offset from page if provided
    const finalOffset = page > 1 ? (page - 1) * limit : offset;
    
    // Only select fields needed for the dashboard list (exclude large TEXT fields)
    // This dramatically reduces data transfer and memory usage
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
      LIMIT ? OFFSET ?
    `;
    
    params.push(limit, finalOffset);
    
    const applications = db.prepare(query).all(...params) as any[];
    
    // Load contacts separately but efficiently (only for the applications we're returning)
    const applicationIds = applications.map((app: any) => app.id);
    let contactsMap: Record<number, any[]> = {};
    
    if (applicationIds.length > 0) {
      // Use IN clause to load all contacts in one query
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
      
      // Group contacts by application_id
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
    
    // Get total count for pagination (optimized with same WHERE clause)
    const countQuery = `SELECT COUNT(*) as total FROM applications a ${whereClause}`;
    const countParams = params.slice(0, -2); // Remove limit and offset
    const totalResult = getCachedStatement(countQuery).get(...countParams) as { total: number };
    const total = totalResult.total;
    
    const response = NextResponse.json({ 
      applications: applicationsWithContacts,
      pagination: {
        total,
        limit,
        offset: finalOffset,
        page: page || Math.floor(finalOffset / limit) + 1,
        totalPages: Math.ceil(total / limit)
      }
    }, { status: 200 });
    
    // Cache-Control header - no cache for filtered/paginated results
    response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    
    return response;
  } catch (error) {
    console.error('Error fetching applications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      company,
      position,
      job_description,
      extraction_data,
      match_result,
      match_score,
      cover_letter,
      status,
      sent_at,
      contacts,
      deadline,
      document_info
    } = body;
    
    if (!company || !position) {
      return NextResponse.json(
        { error: 'Company and position are required' },
        { status: 400 }
      );
    }
    
    const db = getDatabase();
    const transaction = db.transaction(() => {
      // Insert application
      const result = db
        .prepare(`
          INSERT INTO applications (company, position, job_description, extraction_data, match_result, match_score, cover_letter, status, sent_at, deadline, job_document_filename, job_document_path, job_document_type)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          company,
          position,
          job_description || null,
          extraction_data ? JSON.stringify(extraction_data) : null,
          match_result || null,
          match_score || null,
          cover_letter || null,
          status || 'in_bearbeitung',
          sent_at || null,
          deadline || null,
          document_info?.filename || null,
          document_info?.path || null,
          document_info?.type || null
        );
      
      const applicationId = Number(result.lastInsertRowid);
      
      // Insert contact persons if provided
      if (contacts && Array.isArray(contacts)) {
        const insertContact = db.prepare(`
          INSERT INTO contact_persons (application_id, name, email, phone, position)
          VALUES (?, ?, ?, ?, ?)
        `);
        
        for (const contact of contacts) {
          if (contact.name) {
            insertContact.run(
              applicationId,
              contact.name,
              contact.email || null,
              contact.phone || null,
              contact.position || null
            );
          }
        }
      }
      
      return applicationId;
    });
    
    const applicationId = transaction();
    
    // Fetch the created application with contacts
    const application = db
      .prepare('SELECT * FROM applications WHERE id = ?')
      .get(applicationId) as any;
    
    if (!application) {
      return NextResponse.json(
        { error: 'Failed to retrieve created application' },
        { status: 500 }
      );
    }
    
    const applicationContacts = db
      .prepare('SELECT * FROM contact_persons WHERE application_id = ?')
      .all(applicationId);
    
    // Extract deadline from extraction_data if not explicitly provided
    let finalDeadline = deadline;
    if (!finalDeadline && extraction_data) {
      try {
        const extraction = typeof extraction_data === 'string' 
          ? JSON.parse(extraction_data) 
          : extraction_data;
        if (extraction?.deadline) {
          finalDeadline = extraction.deadline;
        }
      } catch (error) {
        console.error('Error parsing extraction_data for deadline:', error);
      }
    }
    
    // Create deadline reminder if deadline exists (from explicit deadline or extraction_data)
    if (finalDeadline) {
      try {
        await syncDeadlineReminder(applicationId, finalDeadline, company, position);
      } catch (error) {
        console.error('Error syncing deadline reminder:', error);
        // Don't fail the request if reminder creation fails
      }
    }
    
    // Sync to cloud storage after write
    await syncDatabaseAfterWrite();
    
    return NextResponse.json(
      { application: { ...application, contacts: applicationContacts } },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating application:', error);
    return NextResponse.json(
      { error: 'Failed to create application' },
      { status: 500 }
    );
  }
}
