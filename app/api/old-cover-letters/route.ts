import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/client';
import { parseFile } from '@/lib/file-parser';

// Force Node.js runtime for file parsing (pdf-parse and mammoth require Node.js)
export const runtime = 'nodejs';

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
    const contentType = request.headers.get('content-type') || '';
    let content: string;
    let company: string | null = null;
    let position: string | null = null;

    // Check if request contains FormData (file upload)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      const companyForm = formData.get('company');
      const positionForm = formData.get('position');
      
      if (!file) {
        return NextResponse.json(
          { error: 'File is required' },
          { status: 400 }
        );
      }

      if (companyForm && typeof companyForm === 'string') {
        company = companyForm.trim() || null;
      }
      if (positionForm && typeof positionForm === 'string') {
        position = positionForm.trim() || null;
      }

      try {
        // Use the centralized file parser
        content = await parseFile(file);
      } catch (parseError: any) {
        console.error('File parsing error:', parseError);
        return NextResponse.json(
          { error: `Failed to parse file: ${parseError.message}` },
          { status: 400 }
        );
      }
    } else {
      // Handle JSON request (text input)
      const body = await request.json();
      content = body.content;
      company = body.company || null;
      position = body.position || null;
      
      if (!content || typeof content !== 'string') {
        return NextResponse.json(
          { error: 'Content is required' },
          { status: 400 }
        );
      }
    }
    
    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Content cannot be empty' },
        { status: 400 }
      );
    }
    
    const db = getDatabase();
    const result = db
      .prepare('INSERT INTO old_cover_letters (content, company, position) VALUES (?, ?, ?)')
      .run(content.trim(), company, position);
    
    return NextResponse.json(
      { message: 'Cover letter saved successfully', id: result.lastInsertRowid },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error saving cover letter:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save cover letter' },
      { status: 500 }
    );
  }
}
