import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/client';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { format } from 'date-fns';

// POST: Backup erstellen
export async function POST() {
  try {
    const db = getDatabase();
    const dbPath = db.name;

    // Read the database file
    const dbBuffer = readFileSync(dbPath);

    // Create backup directory if it doesn't exist
    const backupDir = join(process.cwd(), 'data', 'backups');
    if (!require('fs').existsSync(backupDir)) {
      require('fs').mkdirSync(backupDir, { recursive: true });
    }

    // Create backup filename with timestamp
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    const backupPath = join(backupDir, `anschreiben_${timestamp}.db`);

    // Write backup file
    writeFileSync(backupPath, dbBuffer);

    return NextResponse.json(
      {
        success: true,
        backupPath,
        timestamp,
        size: dbBuffer.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error creating backup:', error);
    return NextResponse.json(
      { error: 'Failed to create backup' },
      { status: 500 }
    );
  }
}

