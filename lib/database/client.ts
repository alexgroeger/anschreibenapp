import Database from 'better-sqlite3';
import { initDatabase } from './init';
import { syncDatabaseOnStartup, uploadDatabaseToCloud, downloadDatabaseFromCloud } from '@/lib/storage/sync';
import { existsSync } from 'fs';
import { join } from 'path';

let dbInstance: Database.Database | null = null;
let syncInProgress = false;
let syncCompleted = false;

// Cache for prepared statements to improve performance
const statementCache = new Map<string, Database.Statement>();

/**
 * Synchronously wait for a promise to resolve using deasync
 * This truly blocks until the promise resolves or timeout
 */
function waitForPromise<T>(promise: Promise<T>, timeout: number): { success: boolean; result?: T; error?: Error } {
  const deasync = require('deasync');
  let resolved = false;
  let result: T | undefined;
  let error: Error | undefined;
  
  promise.then((value) => {
    result = value;
    resolved = true;
  }).catch((err) => {
    error = err;
    resolved = true;
  });
  
  const startTime = Date.now();
  // Use deasync to truly block until promise resolves or timeout
  deasync.loopWhile(() => {
    const elapsed = Date.now() - startTime;
    return !resolved && elapsed < timeout;
  });
  
  return { success: resolved && !error, result, error };
}

/**
 * CRITICAL: Ensure database is synced from Cloud Storage BEFORE initialization
 * This prevents data loss when a new container starts
 * 
 * Implements multiple retry attempts with longer timeout to ensure data is not lost
 * Uses truly blocking wait to ensure download completes before initialization
 */
function ensureDatabaseSync(): void {
  if (syncCompleted || syncInProgress) {
    return;
  }

  syncInProgress = true;
  const dbPath = join(process.cwd(), 'data', 'anschreiben.db');
  const MAX_RETRIES = 5; // Mehrere Versuche um sicherzustellen, dass keine Daten verloren gehen
  const TIMEOUT_PER_ATTEMPT = 30000; // 30 Sekunden pro Versuch (erhöht für langsamere Verbindungen)
  const DELAY_BETWEEN_RETRIES = 2000; // 2 Sekunden Pause zwischen Versuchen

  // Prüfe ob lokale Datenbank existiert
  let localExists = existsSync(dbPath);
  
  // Wenn lokale Datenbank nicht existiert, versuche mehrfach aus Cloud Storage zu laden
  // Dies ist KRITISCH um Datenverlust bei neuen Deployments zu verhindern
  if (!localExists) {
    console.log('[DB Init] ⚠️  Local database not found - CRITICAL: Attempting to download from Cloud Storage...');
    console.log(`[DB Init] Will try up to ${MAX_RETRIES} times with ${TIMEOUT_PER_ATTEMPT}ms timeout per attempt`);
    
    let downloadSuccessful = false;
    let lastError: Error | null = null;
    
    // Mehrere Versuche mit Retry-Logik
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      console.log(`[DB Init] Download attempt ${attempt}/${MAX_RETRIES}...`);
      
      const downloadPromise = downloadDatabaseFromCloud();
      
      // Use blocking wait that truly waits for the promise
      const waitResult = waitForPromise(downloadPromise, TIMEOUT_PER_ATTEMPT);
      
      if (waitResult.success && waitResult.result === true) {
        // Download reported success, verify file exists
        localExists = existsSync(dbPath);
        if (localExists) {
          console.log(`[DB Init] ✅ Database downloaded successfully on attempt ${attempt}`);
          downloadSuccessful = true;
          break;
        } else {
          console.warn(`[DB Init] ⚠️  Download reported success but file not found, retrying...`);
        }
      } else if (waitResult.error) {
        lastError = waitResult.error;
        console.error(`[DB Init] Attempt ${attempt} error:`, waitResult.error.message || waitResult.error);
      } else if (waitResult.result === false) {
        console.log(`[DB Init] Attempt ${attempt}: No database found in Cloud Storage`);
      } else {
        console.warn(`[DB Init] ⚠️  Attempt ${attempt} timed out after ${TIMEOUT_PER_ATTEMPT}ms`);
      }
      
      // Check if file exists now (might have been downloaded even if promise didn't resolve)
      localExists = existsSync(dbPath);
      if (localExists) {
        console.log(`[DB Init] ✅ Database file found after attempt ${attempt}`);
        downloadSuccessful = true;
        break;
      }
      
      // If not successful and not last attempt, wait before retry
      if (!downloadSuccessful && attempt < MAX_RETRIES) {
        console.log(`[DB Init] Waiting ${DELAY_BETWEEN_RETRIES}ms before retry...`);
        const sleepStart = Date.now();
        while (Date.now() - sleepStart < DELAY_BETWEEN_RETRIES) {
          const { setImmediate } = require('timers');
          let done = false;
          setImmediate(() => { done = true; });
          while (!done && Date.now() - sleepStart < DELAY_BETWEEN_RETRIES) {
            for (let i = 0; i < 1000; i++) {}
          }
        }
      }
    }
    
    // Finale Prüfung
    localExists = existsSync(dbPath);
    
    if (downloadSuccessful || localExists) {
      console.log('[DB Init] ✅ SUCCESS: Database loaded from Cloud Storage - data preserved!');
      console.log(`[DB Init] Database file size: ${existsSync(dbPath) ? require('fs').statSync(dbPath).size : 0} bytes`);
    } else {
      console.error('[DB Init] ❌ FAILED: Could not download database after all attempts');
      if (lastError) {
        console.error('[DB Init] Last error:', lastError.message || lastError);
      }
      console.error('[DB Init] ⚠️  CRITICAL WARNING: Proceeding with new database creation - DATA WILL BE LOST!');
      console.error('[DB Init] ⚠️  This should only happen if Cloud Storage is truly empty or unreachable');
      console.error('[DB Init] ⚠️  Please check Cloud Storage bucket and network connectivity');
    }
  } else {
    // Lokale Datenbank existiert bereits
    console.log('[DB Init] ✅ Local database found, sync will happen asynchronously');
    syncDatabaseOnStartup().catch((error) => {
      console.error('[DB Init] Error during async sync:', error);
    });
  }
  
  syncCompleted = true;
  syncInProgress = false;
}

/**
 * Get database instance
 * CRITICAL: This ensures Cloud Storage sync happens BEFORE database initialization
 * to prevent data loss on new deployments
 */
export function getDatabase(): Database.Database {
  if (!dbInstance) {
    // CRITICAL: Ensure sync happens BEFORE initializing database
    // This prevents creating a new empty database when Cloud Storage has data
    ensureDatabaseSync();
    
    // Now initialize database (will use downloaded data if available)
    dbInstance = initDatabase();
    try {
      // Enable WAL mode for better concurrent read performance
      dbInstance.pragma('journal_mode = WAL');
      // Optimize for performance
      dbInstance.pragma('synchronous = NORMAL');
      dbInstance.pragma('cache_size = -64000'); // 64MB cache
      dbInstance.pragma('temp_store = MEMORY');
    } catch (error) {
      // If WAL mode fails (e.g., on read-only filesystem), continue without it
      console.warn('Could not enable WAL mode:', error);
    }
    
    // Continue async sync for ongoing synchronization
    if (!syncCompleted) {
      syncDatabaseOnStartup().catch((error) => {
        console.error('Error during async sync:', error);
      });
    }
  }
  return dbInstance;
}

/**
 * Sync database to Cloud Storage after write operations
 * This should be called after important write operations
 * Waits for the upload to complete before returning
 */
export async function syncDatabaseAfterWrite(): Promise<void> {
  try {
    console.log('Starting database sync to Cloud Storage...');
    const success = await uploadDatabaseToCloud();
    if (success) {
      console.log('Database sync to Cloud Storage completed successfully');
    } else {
      console.warn('Database sync to Cloud Storage returned false (may not be configured or failed)');
    }
  } catch (error) {
    console.error('Error syncing database to cloud:', error);
    // Don't throw - we don't want to fail the request if sync fails
    // The data is still saved locally
  }
}

/**
 * Get or create a cached prepared statement
 * This significantly improves performance for frequently used queries
 */
export function getCachedStatement(sql: string): Database.Statement {
  if (statementCache.has(sql)) {
    return statementCache.get(sql)!;
  }
  
  const db = getDatabase();
  const statement = db.prepare(sql);
  statementCache.set(sql, statement);
  return statement;
}

// Close database connection (useful for cleanup)
export function closeDatabase(): void {
  statementCache.clear();
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
