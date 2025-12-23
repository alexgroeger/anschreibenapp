import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const applicationIdParam = searchParams.get('application_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const applicationId = applicationIdParam ? parseInt(applicationIdParam) : null;

    if (applicationIdParam && isNaN(applicationId || 0)) {
      return NextResponse.json(
        { error: 'Invalid application_id' },
        { status: 400 }
      );
    }

    // Build search query with FTS5
    // Escape special characters in query for FTS5
    const escapedQuery = query.trim().replace(/"/g, '""');
    
    let ftsQuery: string;
    let joinCondition: string;
    let whereCondition: string = '';
    const params: any[] = [];

    // Check if FTS5 table exists and is usable
    let hasFtsTable = false;
    let ftsTableUsable = false;
    
    try {
      const ftsTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='application_documents_fts'").all() as any[];
      hasFtsTable = ftsTables.length > 0;
      
      if (hasFtsTable) {
        // Test if FTS5 table is usable by trying a simple query
        try {
          db.prepare('SELECT COUNT(*) FROM application_documents_fts').get();
          ftsTableUsable = true;
        } catch (testError: any) {
          console.warn('FTS5 table exists but is not usable:', testError.message);
          // Try to fix the FTS5 table by recreating it
          try {
            console.log('Attempting to recreate FTS5 table...');
            db.exec('DROP TABLE IF EXISTS application_documents_fts');
            db.exec('DROP TABLE IF EXISTS application_documents_fts_config');
            db.exec('DROP TABLE IF EXISTS application_documents_fts_data');
            db.exec('DROP TABLE IF EXISTS application_documents_fts_docsize');
            db.exec('DROP TABLE IF EXISTS application_documents_fts_idx');
            db.exec('DROP TABLE IF EXISTS application_documents_fts_content');
            
            // Create new FTS5 table with correct structure
            db.exec(`
              CREATE VIRTUAL TABLE application_documents_fts USING fts5(
                document_id UNINDEXED,
                content
              );
            `);
            
            // Re-index existing documents (without text, they'll be indexed on next upload)
            console.log('FTS5 table recreated successfully');
            ftsTableUsable = true;
          } catch (fixError: any) {
            console.error('Failed to fix FTS5 table:', fixError.message);
            ftsTableUsable = false;
          }
        }
      }
    } catch (error: any) {
      console.warn('Error checking FTS5 table:', error.message);
      hasFtsTable = false;
      ftsTableUsable = false;
    }

    if (hasFtsTable && ftsTableUsable) {
      // Use FTS5 for full-text search
      // FTS5 requires the query to be in a specific format
      // For simple queries, we can use the term directly
      // For multiple words, we need to use AND/OR operators
      const searchTerms = escapedQuery.split(/\s+/).filter(term => term.length > 0);
      // FTS5 query format: use OR for multiple terms to find any match
      // Escape special FTS5 characters: ", ', \, and wrap in quotes for exact matching
      const fts5Query = searchTerms.length > 1 
        ? searchTerms.map(term => term.replace(/["'\\]/g, '')).join(' OR ')
        : escapedQuery.replace(/["'\\]/g, '');
      
      ftsQuery = `
        SELECT 
          ad.id,
          ad.application_id,
          ad.filename,
          ad.file_path,
          ad.file_type,
          ad.file_size,
          ad.uploaded_at,
          ad.created_at,
          a.company,
          a.position,
          bm25(application_documents_fts) as rank,
          snippet(application_documents_fts, 2, '<mark>', '</mark>', '...', 32) as snippet
        FROM application_documents_fts
        JOIN application_documents ad ON application_documents_fts.document_id = ad.id
        JOIN applications a ON ad.application_id = a.id
        WHERE application_documents_fts MATCH ?
      `;
      params.push(fts5Query);

      if (applicationId) {
        ftsQuery += ' AND ad.application_id = ?';
        params.push(applicationId);
      }

      ftsQuery += ' ORDER BY rank LIMIT ? OFFSET ?';
      params.push(limit, offset);

      let results: any[] = [];
      try {
        results = db.prepare(ftsQuery).all(...params) as any[];
      } catch (queryError: any) {
        console.error('FTS5 query error:', queryError.message);
        console.error('Query:', ftsQuery);
        console.error('Params:', params);
        // Fall back to simple search if FTS5 query fails
        throw queryError;
      }

      // If no results from FTS5, also search in filenames as fallback
      if (results.length === 0) {
        console.log('No FTS5 results, falling back to filename search');
        const filenameQuery = `
          SELECT 
            ad.id,
            ad.application_id,
            ad.filename,
            ad.file_path,
            ad.file_type,
            ad.file_size,
            ad.uploaded_at,
            ad.created_at,
            a.company,
            a.position,
            NULL as rank,
            NULL as snippet
          FROM application_documents ad
          JOIN applications a ON ad.application_id = a.id
          WHERE ad.filename LIKE ?
        `;
        const filenameParams: any[] = [`%${query}%`];
        
        if (applicationId) {
          const finalQuery = filenameQuery + ' AND ad.application_id = ? ORDER BY ad.uploaded_at DESC LIMIT ? OFFSET ?';
          filenameParams.push(applicationId, limit, offset);
          results = db.prepare(finalQuery).all(...filenameParams) as any[];
        } else {
          const finalQuery = filenameQuery + ' ORDER BY ad.uploaded_at DESC LIMIT ? OFFSET ?';
          filenameParams.push(limit, offset);
          results = db.prepare(finalQuery).all(...filenameParams) as any[];
        }
      }

      // Get total count
      let countQuery = `
        SELECT COUNT(*) as count
        FROM application_documents_fts
        JOIN application_documents ad ON application_documents_fts.document_id = ad.id
        WHERE application_documents_fts MATCH ?
      `;
      const countParams: any[] = [fts5Query];
      
      if (applicationId) {
        countQuery += ' AND ad.application_id = ?';
        countParams.push(applicationId);
      }

      let total = 0;
      try {
        const countResult = db.prepare(countQuery).get(...countParams) as any;
        total = countResult?.count || 0;
        
        // If FTS5 count is 0 but we have filename results, use that count
        if (total === 0 && results.length > 0) {
          const filenameCountQuery = applicationId
            ? 'SELECT COUNT(*) as count FROM application_documents ad WHERE ad.filename LIKE ? AND ad.application_id = ?'
            : 'SELECT COUNT(*) as count FROM application_documents ad WHERE ad.filename LIKE ?';
          const filenameCountParams = applicationId 
            ? [`%${query}%`, applicationId]
            : [`%${query}%`];
          const filenameCountResult = db.prepare(filenameCountQuery).get(...filenameCountParams) as any;
          total = filenameCountResult?.count || 0;
        }
      } catch (countError: any) {
        console.error('FTS5 count query error:', countError.message);
        // Use results length as fallback
        total = results.length;
      }

      return NextResponse.json(
        {
          results,
          total,
          limit,
          offset,
        },
        { status: 200 }
      );
    } else {
      // Fallback: simple LIKE search if FTS5 is not available
      const searchQuery = `
        SELECT 
          ad.id,
          ad.application_id,
          ad.filename,
          ad.file_path,
          ad.file_type,
          ad.file_size,
          ad.uploaded_at,
          ad.created_at,
          a.company,
          a.position,
          NULL as rank,
          NULL as snippet
        FROM application_documents ad
        JOIN applications a ON ad.application_id = a.id
        WHERE ad.filename LIKE ?
      `;
      params.push(`%${query}%`);

      if (applicationId) {
        const finalQuery = searchQuery + ' AND ad.application_id = ? ORDER BY ad.uploaded_at DESC LIMIT ? OFFSET ?';
        params.push(applicationId, limit, offset);
        const results = db.prepare(finalQuery).all(...params) as any[];

        // Get total count
        let countQuery = 'SELECT COUNT(*) as count FROM application_documents ad WHERE ad.filename LIKE ?';
        const countParams: any[] = [`%${query}%`];
        if (applicationId) {
          countQuery += ' AND ad.application_id = ?';
          countParams.push(applicationId);
        }
        const countResult = db.prepare(countQuery).get(...countParams) as any;
        const total = countResult?.count || 0;

        return NextResponse.json(
          {
            results,
            total,
            limit,
            offset,
          },
          { status: 200 }
        );
      } else {
        const finalQuery = searchQuery + ' ORDER BY ad.uploaded_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);
        const results = db.prepare(finalQuery).all(...params) as any[];

        // Get total count
        const countQuery = 'SELECT COUNT(*) as count FROM application_documents ad WHERE ad.filename LIKE ?';
        const countResult = db.prepare(countQuery).get(`%${query}%`) as any;
        const total = countResult?.count || 0;

        return NextResponse.json(
          {
            results,
            total,
            limit,
            offset,
          },
          { status: 200 }
        );
      }
    }
  } catch (error: any) {
    console.error('Error searching documents:', error);
    console.error('Error stack:', error.stack);
    
    // If FTS5 query failed, try fallback to filename search
    if (error.message && error.message.includes('fts')) {
      console.log('Falling back to filename search due to FTS5 error');
      try {
        const db = getDatabase();
        const searchQuery = `
          SELECT 
            ad.id,
            ad.application_id,
            ad.filename,
            ad.file_path,
            ad.file_type,
            ad.file_size,
            ad.uploaded_at,
            ad.created_at,
            a.company,
            a.position,
            NULL as rank,
            NULL as snippet
          FROM application_documents ad
          JOIN applications a ON ad.application_id = a.id
          WHERE ad.filename LIKE ?
          ORDER BY ad.uploaded_at DESC
          LIMIT ? OFFSET ?
        `;
        const results = db.prepare(searchQuery).all(`%${query}%`, limit, offset) as any[];
        const countQuery = 'SELECT COUNT(*) as count FROM application_documents ad WHERE ad.filename LIKE ?';
        const countResult = db.prepare(countQuery).get(`%${query}%`) as any;
        const total = countResult?.count || 0;
        
        return NextResponse.json(
          {
            results,
            total,
            limit,
            offset,
          },
          { status: 200 }
        );
      } catch (fallbackError: any) {
        console.error('Fallback search also failed:', fallbackError);
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to search documents', details: error.message },
      { status: 500 }
    );
  }
}

