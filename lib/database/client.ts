import Database from 'better-sqlite3';
import { initDatabase } from './init';
import { syncDatabaseOnStartup, uploadDatabaseToCloud } from '@/lib/storage/sync';

let dbInstance: Database.Database | null = null;
let syncOnStartupDone = false;

// Cache for prepared statements to improve performance
const statementCache = new Map<string, Database.Statement>();

export function getDatabase(): Database.Database {
  if (!dbInstance) {
    try {
      // Sync with Cloud Storage before initializing database (only once)
      if (!syncOnStartupDone) {
        syncOnStartupDone = true;
        // Run sync asynchronously to not block database initialization
        syncDatabaseOnStartup().catch((error) => {
          console.error('Error during startup sync:', error);
        });
      }
      
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
      
      // Test database connection by running a simple query
      try {
        dbInstance.prepare('SELECT 1').get();
      } catch (testError: any) {
        console.error('Database connection test failed:', testError);
        // If database is corrupted, try to recover
        if (testError.message?.includes('disk I/O error') || testError.message?.includes('database disk image is malformed')) {
          console.error('Database appears to be corrupted. Attempting recovery...');
          throw new Error(`Database corruption detected: ${testError.message}`);
        }
        throw testError;
      }
    } catch (error: any) {
      console.error('Failed to initialize database:', error);
      // Close database if it was partially initialized
      if (dbInstance) {
        try {
          dbInstance.close();
        } catch (closeError) {
          // Ignore close errors
        }
        dbInstance = null;
      }
      throw new Error(`Database initialization failed: ${error.message}`);
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
    await uploadDatabaseToCloud();
  } catch (error) {
    console.error('Error syncing database to cloud:', error);
    // Re-throw to allow callers to handle the error if needed
    throw error;
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
