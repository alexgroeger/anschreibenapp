import { Storage } from '@google-cloud/storage';
import { readFileSync, writeFileSync, existsSync, statSync } from 'fs';
import { join, dirname, basename } from 'path';
import { getDatabase } from '@/lib/database/client';
import { getDatabasePath } from '@/lib/database/init';

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
export function getBucket(): any | null {
  const storage = getStorage();
  if (!storage) {
    if (!GCS_BUCKET_NAME) {
      console.warn('Cloud Storage not configured: GCS_BUCKET_NAME environment variable is not set');
    }
    return null;
  }

  if (!bucketInstance) {
    try {
      bucketInstance = storage.bucket(GCS_BUCKET_NAME);
      console.log(`Using Cloud Storage bucket: ${GCS_BUCKET_NAME}`);
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
    const dbPath = getDatabasePath();
    const file = bucket.file(DB_FILE_NAME);

    // Check if file exists in Cloud Storage
    const [exists] = await file.exists();
    if (!exists) {
      console.log('No database found in Cloud Storage, starting fresh');
      return false;
    }

    // Download the database file
    console.log('Downloading database from Cloud Storage...');
    
    // Download to temporary file first to avoid corruption
    const tempPath = `${dbPath}.tmp`;
    await file.download({ destination: tempPath });
    
    // Verify database integrity before replacing
    try {
      const Database = require('better-sqlite3');
      const testDb = new Database(tempPath);
      // Try to read from database to verify it's not corrupted
      testDb.prepare('SELECT COUNT(*) FROM sqlite_master').get();
      testDb.close();
      
      // If we get here, database is valid - replace the old one
      const fs = require('fs');
      if (existsSync(dbPath)) {
        fs.renameSync(dbPath, `${dbPath}.backup`);
      }
      fs.renameSync(tempPath, dbPath);
      console.log('Database downloaded successfully from Cloud Storage');
    } catch (dbError: any) {
      console.error('Downloaded database is corrupted, keeping local version:', dbError.message);
      const fs = require('fs');
      if (existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      return false;
    }

    // Also download backup if it exists
    const backupFile = bucket.file(DB_BACKUP_FILE_NAME);
    const [backupExists] = await backupFile.exists();
    if (backupExists) {
      const backupPath = join(dirname(dbPath), DB_BACKUP_FILE_NAME);
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
    const dbPath = getDatabasePath();
    
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
    
    // Verify database integrity before uploading
    try {
      const db = getDatabase();
      // Try to read from database to verify it's not corrupted
      db.prepare('SELECT COUNT(*) FROM sqlite_master').get();
    } catch (dbError: any) {
      console.error('Local database is corrupted, cannot upload:', dbError.message);
      return false;
    }
    
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
    const dbPath = getDatabasePath();
    const localExists = existsSync(dbPath);
    const file = bucket.file(DB_FILE_NAME);
    const [cloudExists] = await file.exists();

    if (cloudExists && !localExists) {
      // Cloud has database, local doesn't - download
      console.log('Local database not found, downloading from Cloud Storage...');
      const downloaded = await downloadDatabaseFromCloud();
      if (!downloaded) {
        console.warn('Failed to download database from cloud, will create new one');
      }
    } else if (cloudExists && localExists) {
      // Both exist - use cloud version if it's newer
      const [metadata] = await file.getMetadata();
      const cloudModified = new Date(metadata.updated);
      const localStats = statSync(dbPath);
      const localModified = localStats.mtime;

      if (cloudModified > localModified) {
        console.log('Cloud database is newer, downloading...');
        const downloaded = await downloadDatabaseFromCloud();
        if (!downloaded) {
          console.warn('Failed to download newer database from cloud, keeping local version');
        }
      } else {
        console.log('Local database is newer or same, keeping local version');
        // Upload local version to ensure cloud is up to date
        console.log('Uploading local database to ensure cloud is synchronized...');
        await uploadDatabaseToCloud();
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

/**
 * Upload a file to Cloud Storage
 * Returns the path in Cloud Storage if successful, null otherwise
 */
export async function uploadFileToCloud(
  file: File | Buffer,
  fileName: string,
  contentType?: string
): Promise<string | null> {
  const bucket = getBucket();
  console.log('uploadFileToCloud called:', {
    hasBucket: !!bucket,
    fileName,
    contentType,
    fileType: file instanceof Buffer ? 'Buffer' : file instanceof File ? 'File' : typeof file,
  });
  
  if (!bucket) {
    // If Cloud Storage is not configured, save to local filesystem
    try {
      const fs = require('fs');
      const path = require('path');
      // Handle nested paths (e.g., "application-documents/123/file.pdf")
      const uploadsDir = join(process.cwd(), 'data', 'uploads');
      const fullPath = join(uploadsDir, fileName);
      const fileDir = path.dirname(fullPath);
      
      console.log('Saving file locally:', {
        uploadsDir,
        fileName,
        fullPath,
        fileDir,
        dirExists: existsSync(fileDir),
      });
      
      if (!existsSync(fileDir)) {
        console.log('Creating directory:', fileDir);
        fs.mkdirSync(fileDir, { recursive: true });
        console.log('Directory created successfully');
      }
      
      let buffer: Buffer;
      if (file instanceof Buffer) {
        buffer = file;
        console.log('Using provided buffer, size:', buffer.length);
      } else if (file instanceof File) {
        console.log('Converting File to buffer...');
        const arrayBuffer = await file.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
        console.log('File converted to buffer, size:', buffer.length);
      } else {
        throw new Error(`Unsupported file type: ${typeof file}`);
      }
      
      console.log('Writing file to:', fullPath);
      writeFileSync(fullPath, buffer);
      console.log(`File saved locally successfully: ${fullPath}`);
      
      return `local:${fullPath}`;
    } catch (error: any) {
      console.error('Error saving file locally:', error);
      const errorDetails = {
        message: error.message,
        stack: error.stack,
        fileName,
        fullPath: join(process.cwd(), 'data', 'uploads', fileName),
        code: error.code,
        errno: error.errno,
        syscall: error.syscall,
      };
      console.error('Error details:', errorDetails);
      // Throw error instead of returning null to get better error messages
      throw new Error(`Failed to save file locally: ${error.message} (Path: ${errorDetails.fullPath}, Code: ${error.code || 'N/A'})`);
    }
  }

  try {
    // Use the fileName as-is if it already contains a path (e.g., "application-documents/123/file.pdf")
    // Otherwise, prefix it with "job-documents/" for backward compatibility
    const filePath = fileName.includes('/') ? fileName : `job-documents/${fileName}`;
    console.log(`Uploading file to Cloud Storage with path: ${filePath}`);
    const bucketFile = bucket.file(filePath);
    
    let buffer: Buffer;
    if (file instanceof Buffer) {
      buffer = file;
    } else if (file instanceof File) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
        console.log(`File converted to buffer, size: ${buffer.length} bytes`);
      } catch (bufferError: any) {
        console.error('Error converting file to buffer:', bufferError);
        throw new Error(`Failed to convert file to buffer: ${bufferError.message}`);
      }
    } else {
      console.error('Unsupported file type:', typeof file, file);
      throw new Error(`Unsupported file type: ${typeof file}`);
    }
    
    try {
      await bucketFile.save(buffer, {
        metadata: {
          contentType: contentType || 'application/octet-stream',
          cacheControl: 'public, max-age=31536000',
        },
      });
      console.log(`File uploaded successfully to Cloud Storage: ${filePath}`);
      return filePath;
    } catch (saveError: any) {
      console.error('Error saving file to Cloud Storage bucket:', saveError);
      console.error('Error details:', {
        message: saveError.message,
        code: saveError.code,
        stack: saveError.stack,
      });
      
      // Check if this is a credentials error - if so, fall back to local filesystem
      const isCredentialsError = 
        saveError.message?.includes('Could not load the default credentials') ||
        saveError.message?.includes('Could not load default credentials') ||
        saveError.message?.includes('authentication') ||
        saveError.code === 'ENOENT' ||
        saveError.code === 401 ||
        saveError.code === 403;
      
      if (isCredentialsError) {
        console.warn('Cloud Storage credentials not available, falling back to local filesystem');
        // Fall through to local filesystem save below
        throw new Error('CREDENTIALS_ERROR'); // Special marker to trigger fallback
      }
      
      throw saveError;
    }
  } catch (error: any) {
    // If it's a credentials error, fall back to local filesystem
    if (error.message === 'CREDENTIALS_ERROR' || 
        error.message?.includes('Could not load the default credentials') ||
        error.message?.includes('Could not load default credentials')) {
      console.warn('Cloud Storage credentials not available, saving to local filesystem instead');
      
      try {
        const fs = require('fs');
        const path = require('path');
        // Handle nested paths (e.g., "application-documents/123/file.pdf")
        const uploadsDir = join(process.cwd(), 'data', 'uploads');
        const fullPath = join(uploadsDir, fileName);
        const fileDir = path.dirname(fullPath);
        
        console.log('Saving file locally (Cloud Storage fallback):', {
          uploadsDir,
          fileName,
          fullPath,
          fileDir,
          dirExists: existsSync(fileDir),
        });
        
        if (!existsSync(fileDir)) {
          console.log('Creating directory:', fileDir);
          fs.mkdirSync(fileDir, { recursive: true });
          console.log('Directory created successfully');
        }
        
        let buffer: Buffer;
        if (file instanceof Buffer) {
          buffer = file;
          console.log('Using provided buffer, size:', buffer.length);
        } else if (file instanceof File) {
          console.log('Converting File to buffer...');
          const arrayBuffer = await file.arrayBuffer();
          buffer = Buffer.from(arrayBuffer);
          console.log('File converted to buffer, size:', buffer.length);
        } else {
          throw new Error(`Unsupported file type: ${typeof file}`);
        }
        
        console.log('Writing file to:', fullPath);
        writeFileSync(fullPath, buffer);
        console.log(`File saved locally successfully (Cloud Storage fallback): ${fullPath}`);
        
        return `local:${fullPath}`;
      } catch (localError: any) {
        console.error('Error saving file locally (fallback):', localError);
        const errorDetails = {
          message: localError.message,
          stack: localError.stack,
          fileName,
          fullPath: join(process.cwd(), 'data', 'uploads', fileName),
          code: localError.code,
          errno: localError.errno,
          syscall: localError.syscall,
        };
        console.error('Error details:', errorDetails);
        throw new Error(`Failed to save file locally: ${localError.message} (Path: ${errorDetails.fullPath}, Code: ${localError.code || 'N/A'})`);
      }
    }
    
    // For other errors, throw as before
    console.error('Error uploading file to Cloud Storage:', error);
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      fileName,
      contentType,
      code: error.code,
    };
    console.error('Error details:', errorDetails);
    // Throw error instead of returning null to get better error messages
    throw new Error(`Failed to upload file to Cloud Storage: ${error.message} (Code: ${error.code || 'unknown'})`);
  }
}

/**
 * Download a file from Cloud Storage or local filesystem
 * Returns the file buffer if successful, null otherwise
 */
export async function downloadFileFromCloud(filePath: string): Promise<Buffer | null> {
  // Check if it's a local file
  if (filePath.startsWith('local:')) {
    try {
      const localPath = filePath.replace('local:', '');
      if (existsSync(localPath)) {
        return readFileSync(localPath);
      }
    } catch (error) {
      console.error('Error reading local file:', error);
      return null;
    }
  }

  const bucket = getBucket();
  if (!bucket) {
    console.error('Cloud Storage not configured and file is not local');
    return null;
  }

  try {
    const file = bucket.file(filePath);
    const [exists] = await file.exists();
    
    if (!exists) {
      console.error(`File not found in Cloud Storage: ${filePath}`);
      return null;
    }

    const [buffer] = await file.download();
    return buffer;
  } catch (error) {
    console.error('Error downloading file from Cloud Storage:', error);
    return null;
  }
}

/**
 * Get a signed URL for a file in Cloud Storage (for viewing in browser)
 * Returns the URL if successful, null otherwise
 * For local files, returns null (they should be served directly via API route)
 */
export async function getFileUrl(filePath: string, expiresInMinutes: number = 60): Promise<string | null> {
  // For local files, return null - they should be served directly via the document API route
  if (filePath.startsWith('local:')) {
    return null;
  }

  const bucket = getBucket();
  if (!bucket) {
    return null;
  }

  try {
    const file = bucket.file(filePath);
    const [exists] = await file.exists();
    
    if (!exists) {
      return null;
    }

    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + expiresInMinutes * 60 * 1000,
    });

    return url;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return null;
  }
}

