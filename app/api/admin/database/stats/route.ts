import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const db = getDatabase();
    
    // Get statistics for each table
    const stats: any = {};
    
    // Resume
    try {
      stats.resume = {
        count: db.prepare('SELECT COUNT(*) as count FROM resume').get() as { count: number }
      };
    } catch (error) {
      stats.resume = { count: { count: 0 } };
    }
    
    // Old cover letters
    try {
      stats.old_cover_letters = {
        count: db.prepare('SELECT COUNT(*) as count FROM old_cover_letters').get() as { count: number }
      };
    } catch (error) {
      stats.old_cover_letters = { count: { count: 0 } };
    }
    
    // Applications
    try {
      stats.applications = {
        count: db.prepare('SELECT COUNT(*) as count FROM applications').get() as { count: number }
      };
    } catch (error) {
      stats.applications = { count: { count: 0 } };
    }
    
    // Contact persons
    try {
      stats.contact_persons = {
        count: db.prepare('SELECT COUNT(*) as count FROM contact_persons').get() as { count: number }
      };
    } catch (error) {
      stats.contact_persons = { count: { count: 0 } };
    }
    
    // Cover letter versions
    try {
      stats.cover_letter_versions = {
        count: db.prepare('SELECT COUNT(*) as count FROM cover_letter_versions').get() as { count: number }
      };
    } catch (error) {
      stats.cover_letter_versions = { count: { count: 0 } };
    }
    
    // Cover letter suggestions
    try {
      stats.cover_letter_suggestions = {
        count: db.prepare('SELECT COUNT(*) as count FROM cover_letter_suggestions').get() as { count: number }
      };
    } catch (error) {
      stats.cover_letter_suggestions = { count: { count: 0 } };
    }
    
    // Reminders
    try {
      stats.reminders = {
        count: db.prepare('SELECT COUNT(*) as count FROM reminders').get() as { count: number }
      };
    } catch (error) {
      stats.reminders = { count: { count: 0 } };
    }
    
    // Application documents
    try {
      stats.application_documents = {
        count: db.prepare('SELECT COUNT(*) as count FROM application_documents').get() as { count: number }
      };
    } catch (error) {
      stats.application_documents = { count: { count: 0 } };
    }
    
    // Settings
    try {
      stats.settings = {
        count: db.prepare('SELECT COUNT(*) as count FROM settings').get() as { count: number }
      };
    } catch (error) {
      stats.settings = { count: { count: 0 } };
    }
    
    return NextResponse.json({ stats }, { status: 200 });
  } catch (error) {
    console.error('Error fetching database stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch database stats' },
      { status: 500 }
    );
  }
}
