import Database from 'better-sqlite3';
import { initDatabase } from './init';

let dbInstance: Database.Database | null = null;

// Cache for prepared statements to improve performance
const statementCache = new Map<string, Database.Statement>();

export function getDatabase(): Database.Database {
  if (!dbInstance) {
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
  }
  return dbInstance;
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
