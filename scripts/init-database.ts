import { initDatabase } from '../lib/database/init';
import { existsSync } from 'fs';
import { join } from 'path';

const dbPath = join(process.cwd(), 'data', 'anschreiben.db');

console.log('🔄 Starte manuelle Datenbankinitialisierung...\n');

// Prüfe ob Datenbank bereits existiert
const dbExists = existsSync(dbPath);
if (dbExists) {
  console.log('⚠️  Datenbank existiert bereits: ' + dbPath);
  console.log('   Die Initialisierung wird die Tabellen nur erstellen, wenn sie nicht existieren.');
  console.log('   Settings werden nur hinzugefügt, wenn sie noch nicht existieren (INSERT OR IGNORE).\n');
} else {
  console.log('📝 Neue Datenbank wird erstellt: ' + dbPath + '\n');
}

try {
  const db = initDatabase();
  
  console.log('✅ Datenbankinitialisierung erfolgreich abgeschlossen!');
  console.log('\n📊 Datenbank-Status:');
  
  // Prüfe Tabellen
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all() as Array<{ name: string }>;
  
  console.log(`   Tabellen: ${tables.length}`);
  tables.forEach(table => {
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get() as { count: number };
    console.log(`   - ${table.name}: ${count.count} Einträge`);
  });
  
  // Prüfe Settings
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM settings').get() as { count: number };
  console.log(`\n   Settings: ${settingsCount.count} Einträge`);
  
  // Zeige Generierungs-Settings
  const generationSettings = db.prepare(`
    SELECT key, value FROM settings 
    WHERE category = 'generation'
    ORDER BY key
  `).all() as Array<{ key: string; value: string }>;
  
  if (generationSettings.length > 0) {
    console.log('\n   Generierungs-Einstellungen:');
    generationSettings.forEach(setting => {
      const displayValue = setting.value.length > 50 
        ? setting.value.substring(0, 50) + '...' 
        : setting.value || '(leer)';
      console.log(`   - ${setting.key}: "${displayValue}"`);
    });
  }
  
  db.close();
  console.log('\n✅ Fertig!');
  
} catch (error) {
  console.error('❌ Fehler bei der Datenbankinitialisierung:', error);
  process.exit(1);
}


