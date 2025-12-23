import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, syncDatabaseAfterWrite } from '@/lib/database/client';

export async function GET() {
  try {
    const db = getDatabase();
    const resume = db.prepare('SELECT * FROM resume ORDER BY updated_at DESC LIMIT 1').get();
    
    if (!resume) {
      return NextResponse.json({ resume: null }, { status: 200 });
    }
    
    return NextResponse.json({ resume }, { status: 200 });
  } catch (error) {
    console.error('Error fetching resume:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resume' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content } = body;
    
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }
    
    const db = getDatabase();
    
    // Check if resume exists
    const existing = db.prepare('SELECT id FROM resume LIMIT 1').get();
    
    if (existing) {
      // Update existing resume
      const result = db
        .prepare('UPDATE resume SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(content, (existing as { id: number }).id);
      
      // Sync to cloud storage after write
      await syncDatabaseAfterWrite();
      
      return NextResponse.json(
        { message: 'Resume updated successfully', id: (existing as { id: number }).id },
        { status: 200 }
      );
    } else {
      // Insert new resume
      const result = db
        .prepare('INSERT INTO resume (content) VALUES (?)')
        .run(content);
      
      // Sync to cloud storage after write
      await syncDatabaseAfterWrite();
      
      return NextResponse.json(
        { message: 'Resume created successfully', id: result.lastInsertRowid },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error('Error saving resume:', error);
    return NextResponse.json(
      { error: 'Failed to save resume' },
      { status: 500 }
    );
  }
}
