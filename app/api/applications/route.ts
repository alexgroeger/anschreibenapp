import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    const db = getDatabase();
    let query = 'SELECT * FROM applications';
    const params: any[] = [];
    
    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const applications = db.prepare(query).all(...params);
    
    // Load contact persons for each application
    const applicationsWithContacts = applications.map((app: any) => {
      const contacts = db
        .prepare('SELECT * FROM contact_persons WHERE application_id = ?')
        .all(app.id);
      return { ...app, contacts };
    });
    
    return NextResponse.json({ applications: applicationsWithContacts }, { status: 200 });
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
      cover_letter,
      status,
      sent_at,
      contacts,
      deadline
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
          INSERT INTO applications (company, position, job_description, extraction_data, match_result, cover_letter, status, sent_at, deadline)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          company,
          position,
          job_description || null,
          extraction_data ? JSON.stringify(extraction_data) : null,
          match_result || null,
          cover_letter || null,
          status || 'in_bearbeitung',
          sent_at || null,
          deadline || null
        );
      
      const applicationId = result.lastInsertRowid;
      
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
    
    const applicationContacts = db
      .prepare('SELECT * FROM contact_persons WHERE application_id = ?')
      .all(applicationId);
    
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
