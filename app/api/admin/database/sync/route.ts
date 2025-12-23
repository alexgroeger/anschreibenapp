import { NextRequest, NextResponse } from 'next/server';
import { 
  uploadDatabaseToCloud, 
  downloadDatabaseFromCloud, 
  isCloudStorageConfigured 
} from '@/lib/storage/sync';

/**
 * GET: Check sync status and cloud storage configuration
 */
export async function GET() {
  try {
    const isConfigured = isCloudStorageConfigured();
    const bucketName = process.env.GCS_BUCKET_NAME || null;
    
    let cloudFileInfo = null;
    if (isConfigured && bucketName) {
      try {
        const { Storage } = await import('@google-cloud/storage');
        const storage = new Storage();
        const bucket = storage.bucket(bucketName);
        const file = bucket.file('anschreiben.db');
        const [exists] = await file.exists();
        
        if (exists) {
          const [metadata] = await file.getMetadata();
          cloudFileInfo = {
            exists: true,
            size: metadata.size,
            updated: metadata.updated,
            contentType: metadata.contentType,
          };
        } else {
          cloudFileInfo = {
            exists: false,
          };
        }
      } catch (error) {
        console.warn('Could not fetch cloud file info:', error);
        // Continue without cloud file info
      }
    }
    
    // Get local database info
    let localFileInfo = null;
    try {
      const fs = await import('fs');
      const path = await import('path');
      const dbPath = path.join(process.cwd(), 'data', 'anschreiben.db');
      
      if (fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath);
        localFileInfo = {
          exists: true,
          size: stats.size,
          modified: stats.mtime.toISOString(),
        };
      } else {
        localFileInfo = {
          exists: false,
        };
      }
    } catch (error) {
      console.warn('Could not fetch local file info:', error);
    }
    
    return NextResponse.json(
      {
        cloudStorageConfigured: isConfigured,
        bucketName: bucketName,
        message: isConfigured 
          ? 'Cloud Storage is configured and ready for sync'
          : 'Cloud Storage is not configured. Set GCS_BUCKET_NAME environment variable to enable sync.',
        cloudFile: cloudFileInfo,
        localFile: localFileInfo,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error checking sync status:', error);
    return NextResponse.json(
      { error: 'Failed to check sync status', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST: Manually sync database to Cloud Storage
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'upload'; // 'upload' or 'download'
    
    if (!isCloudStorageConfigured()) {
      return NextResponse.json(
        { 
          error: 'Cloud Storage is not configured',
          message: 'Please set GCS_BUCKET_NAME environment variable to enable sync'
        },
        { status: 400 }
      );
    }
    
    if (action === 'upload') {
      const success = await uploadDatabaseToCloud();
      if (success) {
        return NextResponse.json(
          { 
            success: true,
            message: 'Database successfully uploaded to Cloud Storage',
            action: 'upload'
          },
          { status: 200 }
        );
      } else {
        return NextResponse.json(
          { 
            success: false,
            error: 'Failed to upload database to Cloud Storage',
            action: 'upload'
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
            message: 'Database successfully downloaded from Cloud Storage',
            action: 'download'
          },
          { status: 200 }
        );
      } else {
        return NextResponse.json(
          { 
            success: false,
            error: 'Failed to download database from Cloud Storage or database does not exist in cloud',
            action: 'download'
          },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use ?action=upload or ?action=download' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error syncing database:', error);
    return NextResponse.json(
      { error: 'Failed to sync database', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

