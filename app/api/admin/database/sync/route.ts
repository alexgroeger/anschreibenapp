import { NextRequest, NextResponse } from 'next/server';
import { getBucket, downloadDatabaseFromCloud, uploadDatabaseToCloud } from '@/lib/storage/sync';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET: Cloud Storage Status prüfen
export async function GET(request: NextRequest) {
  try {
    const bucket = getBucket();
    const cloudStorageConfigured = bucket !== null;
    
    let bucketName: string | null = null;
    if (cloudStorageConfigured && bucket) {
      bucketName = bucket.name;
    }
    
    return NextResponse.json({
      cloudStorageConfigured,
      bucketName,
      message: cloudStorageConfigured 
        ? 'Cloud Storage is configured and ready for sync'
        : 'Cloud Storage is not configured. Please set GCS_BUCKET_NAME environment variable.'
    }, { status: 200 });
  } catch (error) {
    console.error('Error checking sync status:', error);
    return NextResponse.json(
      { 
        cloudStorageConfigured: false,
        error: 'Failed to check sync status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST: Manuelle Synchronisation (upload oder download)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body; // 'upload' oder 'download'
    
    if (!action || !['upload', 'download'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "upload" or "download"' },
        { status: 400 }
      );
    }
    
    if (action === 'upload') {
      const success = await uploadDatabaseToCloud();
      if (success) {
        return NextResponse.json(
          { 
            success: true,
            message: 'Database uploaded to Cloud Storage successfully'
          },
          { status: 200 }
        );
      } else {
        return NextResponse.json(
          { 
            success: false,
            error: 'Failed to upload database to Cloud Storage'
          },
          { status: 500 }
        );
      }
    } else if (action === 'download') {
      const success = await downloadDatabaseFromCloud();
      if (success) {
        return NextResponse.json(
          { 
            success: true,
            message: 'Database downloaded from Cloud Storage successfully'
          },
          { status: 200 }
        );
      } else {
        return NextResponse.json(
          { 
            success: false,
            error: 'Failed to download database from Cloud Storage'
          },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Unknown action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error syncing database:', error);
    return NextResponse.json(
      { 
        error: 'Failed to sync database',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
