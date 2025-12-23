import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/client';

// Route segment config - short cache for stats
export const dynamic = 'force-dynamic'
export const revalidate = 30 // Revalidate every 30 seconds

export async function GET(request: NextRequest) {
  try {
    const db = getDatabase();
    
    // Get total count
    const totalResult = db.prepare('SELECT COUNT(*) as total FROM applications').get() as { total: number };
    const total = totalResult.total;
    
    // Get count by status
    const statusCounts = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM applications
      GROUP BY status
    `).all() as Array<{ status: string; count: number }>;
    
    // Initialize all statuses with 0
    const byStatus = {
      in_bearbeitung: 0,
      rueckmeldung_ausstehend: 0,
      abgelehnt: 0,
      angenommen: 0
    };
    
    // Fill in actual counts
    statusCounts.forEach((row) => {
      if (row.status in byStatus) {
        byStatus[row.status as keyof typeof byStatus] = row.count;
      }
    });
    
    const response = NextResponse.json({
      total,
      byStatus
    }, { status: 200 });
    
    // Cache-Control header for client-side caching
    response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    
    return response;
  } catch (error) {
    console.error('Error fetching application stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch application stats' },
      { status: 500 }
    );
  }
}

