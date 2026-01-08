import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, syncDatabaseAfterWrite } from '@/lib/database/client';

// Route segment config - force dynamic for real-time data
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const db = getDatabase();
    const userProfile = db.prepare('SELECT * FROM user_profile ORDER BY updated_at DESC LIMIT 1').get();
    
    if (!userProfile) {
      return NextResponse.json({ userProfile: null }, { status: 200 });
    }
    
    return NextResponse.json({ userProfile }, { status: 200 });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user profile' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { values_motivation, soft_skills, work_style_abilities, development_direction } = body;
    
    // All fields are optional - allow saving even if all are empty
    
    const db = getDatabase();
    
    // Ensure user_profile table exists (for backward compatibility)
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS user_profile (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          values_motivation TEXT,
          soft_skills TEXT,
          work_style_abilities TEXT,
          development_direction TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (tableError) {
      console.warn('Could not ensure user_profile table exists:', tableError);
    }
    
    // Check if user profile exists
    const existing = db.prepare('SELECT id FROM user_profile LIMIT 1').get();
    
    if (existing) {
      // Update existing user profile
      const result = db
        .prepare(`
          UPDATE user_profile 
          SET 
            values_motivation = COALESCE(?, values_motivation),
            soft_skills = COALESCE(?, soft_skills),
            work_style_abilities = COALESCE(?, work_style_abilities),
            development_direction = COALESCE(?, development_direction),
            updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `)
        .run(
          values_motivation !== undefined ? values_motivation : null,
          soft_skills !== undefined ? soft_skills : null,
          work_style_abilities !== undefined ? work_style_abilities : null,
          development_direction !== undefined ? development_direction : null,
          (existing as { id: number }).id
        );
      
      console.log('User profile updated, result changes:', result.changes);
      
      // Ensure all writes are flushed before syncing
      try {
        db.pragma('wal_checkpoint(TRUNCATE)');
      } catch (error) {
        console.warn('Could not checkpoint WAL:', error);
      }
      
      // Sync to cloud storage after write
      try {
        await syncDatabaseAfterWrite();
        console.log('User profile synced to cloud storage successfully');
      } catch (syncError) {
        console.error('Error syncing user profile to cloud storage:', syncError);
        // Don't fail the request if sync fails, but log the error
      }
      
      return NextResponse.json(
        { message: 'User profile updated successfully', id: (existing as { id: number }).id },
        { status: 200 }
      );
    } else {
      // Insert new user profile
      const result = db
        .prepare(`
          INSERT INTO user_profile (values_motivation, soft_skills, work_style_abilities, development_direction) 
          VALUES (?, ?, ?, ?)
        `)
        .run(
          values_motivation || null,
          soft_skills || null,
          work_style_abilities || null,
          development_direction || null
        );
      
      console.log('User profile created, new ID:', result.lastInsertRowid);
      
      // Ensure all writes are flushed before syncing
      try {
        db.pragma('wal_checkpoint(TRUNCATE)');
      } catch (error) {
        console.warn('Could not checkpoint WAL:', error);
      }
      
      // Sync to cloud storage after write
      try {
        await syncDatabaseAfterWrite();
        console.log('User profile synced to cloud storage successfully');
      } catch (syncError) {
        console.error('Error syncing user profile to cloud storage:', syncError);
        // Don't fail the request if sync fails, but log the error
      }
      
      return NextResponse.json(
        { message: 'User profile created successfully', id: result.lastInsertRowid },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error('Error saving user profile:', error);
    return NextResponse.json(
      { error: 'Failed to save user profile', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
