import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/client';

export async function GET() {
  try {
    const db = getDatabase();
    const coverLetters = db
      .prepare('SELECT * FROM old_cover_letters ORDER BY uploaded_at DESC')
      .all();
    
    return NextResponse.json({ coverLetters }, { status: 200 });
  } catch (error) {
    console.error('Error fetching cover letters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cover letters' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, company, position } = body;
    
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }
    
    const db = getDatabase();
    const result = db
      .prepare('INSERT INTO old_cover_letters (content, company, position) VALUES (?, ?, ?)')
      .run(content, company || null, position || null);
    
    return NextResponse.json(
      { message: 'Cover letter saved successfully', id: result.lastInsertRowid },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error saving cover letter:', error);
    return NextResponse.json(
      { error: 'Failed to save cover letter' },
      { status: 500 }
    );
  }
}
