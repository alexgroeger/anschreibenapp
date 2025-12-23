import { Storage } from '@google-cloud/storage';
import { readFileSync, writeFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { getDatabase } from '@/lib/database/client';

// Cloud Storage Configuration
const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME || '';
const DB_FILE_NAME = 'anschreiben.db';
const DB_BACKUP_FILE_NAME = 'anschreiben_backup.db';

let storageInstance: Storage | null = null;
let bucketInstance: any = null;

/**
 * Initialize Cloud Storage client
 * Returns null if GCS is not configured (local development)
 */
function getStorage(): Storage | null {
  if (!GCS_BUCKET_NAME) {
    return null;
  }

  if (!storageInstance) {
    try {
      // Cloud Storage will use Application Default Credentials (ADC)
      // In Cloud Run, this is automatically configured
      // For local development, use: gcloud auth application-default login
      storageInstance = new Storage();
    } catch (error) {
      console.error('Failed to initialize Cloud Storage:', error);
      return null;
    }
  }

  return storageInstance;
}

/**
 * Get or create the Cloud Storage bucket
 */
function getBucket(): any | null {
  const storage = getStorage();
  if (!storage) {
    return null;
  }

  if (!bucketInstance) {
    try {
      bucketInstance = storage.bucket(GCS_BUCKET_NAME);
    } catch (error) {
      console.error('Failed to get bucket:', error);
      return null;
    }
  }

  return bucketInstance;
}

/**
 * Download database from Cloud Storage to local filesystem
 * Returns true if successful, false otherwise
 */
export async function downloadDatabaseFromCloud(): Promise<boolean> {
  const bucket = getBucket();
  if (!bucket) {
    console.log('Cloud Storage not configured, skipping download');
    return false;
  }

  try {
    const dbPath = join(process.cwd(), 'data', DB_FILE_NAME);
    const file = bucket.file(DB_FILE_NAME);

    // Check if file exists in Cloud Storage
    const [exists] = await file.exists();
    if (!exists) {
      console.log('No database found in Cloud Storage, starting fresh');
      return false;
    }

    // Download the database file
    console.log('Downloading database from Cloud Storage...');
    await file.download({ destination: dbPath });
    console.log('Database downloaded successfully from Cloud Storage');

    // Also download backup if it exists
    const backupFile = bucket.file(DB_BACKUP_FILE_NAME);
    const [backupExists] = await backupFile.exists();
    if (backupExists) {
      const backupPath = join(process.cwd(), 'data', DB_BACKUP_FILE_NAME);
      await backupFile.download({ destination: backupPath });
      console.log('Database backup downloaded from Cloud Storage');
    }

    return true;
  } catch (error) {
    console.error('Error downloading database from Cloud Storage:', error);
    return false;
  }
}

/**
 * Upload database from local filesystem to Cloud Storage
 * Returns true if successful, false otherwise
 */
export async function uploadDatabaseToCloud(): Promise<boolean> {
  const bucket = getBucket();
  if (!bucket) {
    console.log('Cloud Storage not configured, skipping upload');
    return false;
  }

  try {
    const dbPath = join(process.cwd(), 'data', DB_FILE_NAME);
    
    // Check if local database exists
    if (!existsSync(dbPath)) {
      console.log('Local database does not exist, skipping upload');
      return false;
    }

    // Close database connection before uploading to ensure all writes are flushed
    const db = getDatabase();
    if (db) {
      // Force checkpoint to ensure WAL is written to main database
      try {
        db.pragma('wal_checkpoint(TRUNCATE)');
      } catch (error) {
        console.warn('Could not checkpoint WAL:', error);
      }
    }

    const file = bucket.file(DB_FILE_NAME);
    
    // Upload the database file
    console.log('Uploading database to Cloud Storage...');
    await file.save(readFileSync(dbPath), {
      metadata: {
        contentType: 'application/x-sqlite3',
        cacheControl: 'no-cache',
      },
    });
    console.log('Database uploaded successfully to Cloud Storage');

    // Also create a backup
    const backupFile = bucket.file(DB_BACKUP_FILE_NAME);
    await backupFile.save(readFileSync(dbPath), {
      metadata: {
        contentType: 'application/x-sqlite3',
        cacheControl: 'no-cache',
      },
    });
    console.log('Database backup created in Cloud Storage');

    return true;
  } catch (error) {
    console.error('Error uploading database to Cloud Storage:', error);
    return false;
  }
}

/**
 * Sync database: download from cloud if available, otherwise upload local to cloud
 * This is called at application startup
 */
export async function syncDatabaseOnStartup(): Promise<void> {
  const bucket = getBucket();
  if (!bucket) {
    console.log('Cloud Storage not configured, using local database only');
    return;
  }

  try {
    const dbPath = join(process.cwd(), 'data', DB_FILE_NAME);
    const localExists = existsSync(dbPath);
    const file = bucket.file(DB_FILE_NAME);
    const [cloudExists] = await file.exists();

    if (cloudExists && !localExists) {
      // Cloud has database, local doesn't - download
      console.log('Local database not found, downloading from Cloud Storage...');
      await downloadDatabaseFromCloud();
    } else if (cloudExists && localExists) {
      // Both exist - use cloud version if it's newer
      const [metadata] = await file.getMetadata();
      const cloudModified = new Date(metadata.updated);
      const localStats = statSync(dbPath);
      const localModified = localStats.mtime;

      if (cloudModified > localModified) {
        console.log('Cloud database is newer, downloading...');
        await downloadDatabaseFromCloud();
      } else {
        console.log('Local database is newer or same, keeping local version');
      }
    } else if (!cloudExists && localExists) {
      // Local exists, cloud doesn't - upload
      console.log('Cloud database not found, uploading local database...');
      await uploadDatabaseToCloud();
    } else {
      // Neither exists - will be created by initDatabase
      console.log('No database found locally or in cloud, will create new one');
    }
  } catch (error) {
    console.error('Error during database sync on startup:', error);
    // Continue with local database if sync fails
  }
}

/**
 * Check if Cloud Storage is configured
 */
export function isCloudStorageConfigured(): boolean {
  return !!GCS_BUCKET_NAME;
}

