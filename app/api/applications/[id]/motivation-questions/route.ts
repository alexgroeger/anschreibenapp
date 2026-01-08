import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, getCachedStatement, syncDatabaseAfterWrite } from '@/lib/database/client';

// Route segment config - force dynamic for real-time data
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET: Load motivation questions for an application
 */
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
    
    const db = getDatabase();
    const application = db
      .prepare('SELECT motivation_position, motivation_company, company_website, company_website_content FROM applications WHERE id = ?')
      .get(id) as any;
    
    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      motivation_position: application.motivation_position || null,
      motivation_company: application.motivation_company || null,
      company_website: application.company_website || null,
      company_website_content: application.company_website_content || null,
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching motivation questions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch motivation questions' },
      { status: 500 }
    );
  }
}

/**
 * PATCH: Update motivation questions for an application
 */
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
    const { motivation_position, motivation_company, company_website, company_website_content } = body;
    
    const db = getDatabase();
    const updates: string[] = [];
    const values: any[] = [];
    
    if (motivation_position !== undefined) {
      updates.push('motivation_position = ?');
      values.push(motivation_position || null);
    }
    if (motivation_company !== undefined) {
      updates.push('motivation_company = ?');
      values.push(motivation_company || null);
    }
    if (company_website !== undefined) {
      updates.push('company_website = ?');
      values.push(company_website || null);
    }
    if (company_website_content !== undefined) {
      updates.push('company_website_content = ?');
      values.push(company_website_content || null);
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
      .prepare(`UPDATE applications SET ${updates.join(', ')} WHERE id = ?`)
      .run(...values);
    
    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }
    
    const application = db
      .prepare('SELECT motivation_position, motivation_company, company_website, company_website_content FROM applications WHERE id = ?')
      .get(id) as any;
    
    // Sync to cloud storage after write
    await syncDatabaseAfterWrite();
    
    return NextResponse.json({
      motivation_position: application.motivation_position || null,
      motivation_company: application.motivation_company || null,
      company_website: application.company_website || null,
      company_website_content: application.company_website_content || null,
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating motivation questions:', error);
    return NextResponse.json(
      { error: 'Failed to update motivation questions' },
      { status: 500 }
    );
  }
}
