import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/client';

// GET: Alle Einstellungen abrufen
export async function GET(request: NextRequest) {
  try {
    const db = getDatabase();
    const category = request.nextUrl.searchParams.get('category');

    let settings;
    if (category) {
      settings = db
        .prepare('SELECT * FROM settings WHERE category = ? ORDER BY category, key')
        .all(category);
    } else {
      settings = db
        .prepare('SELECT * FROM settings ORDER BY category, key')
        .all();
    }

    // Convert to object format for easier access
    const settingsObj: Record<string, any> = {};
    settings.forEach((setting: any) => {
      settingsObj[setting.key] = {
        value: setting.value,
        category: setting.category,
        description: setting.description,
        updated_at: setting.updated_at,
      };
    });

    return NextResponse.json({ settings: settingsObj }, { status: 200 });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// POST: Einstellungen aktualisieren
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { error: 'Settings object is required' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const updateSetting = db.prepare(`
      UPDATE settings 
      SET value = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE key = ?
    `);

    const transaction = db.transaction(() => {
      for (const [key, data] of Object.entries(settings)) {
        if (typeof data === 'object' && data !== null && 'value' in data) {
          updateSetting.run((data as any).value, key);
        } else {
          // Support simple key-value updates
          updateSetting.run(data, key);
        }
      }
    });

    transaction();

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
