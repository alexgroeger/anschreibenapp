import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import Database from 'better-sqlite3';

const dbPath = join(process.cwd(), 'data', 'anschreiben.db');
const promptsDir = join(process.cwd(), 'prompts');
const initDbPath = join(process.cwd(), 'lib', 'database', 'init.ts');

interface PromptDiff {
  name: string;
  file: string;
  systemContent: string;
  dbContent: string | null;
  hasChanges: boolean;
}

interface SettingDiff {
  key: string;
  systemValue: string;
  dbValue: string;
  category: string;
  description: string;
  hasChanges: boolean;
}

function readPromptFile(fileName: string): string {
  const filePath = join(promptsDir, fileName);
  try {
    const content = readFileSync(filePath, 'utf-8');
    // Extract content from export statement
    const match = content.match(/export const \w+ = `([\s\S]*)`/);
    if (match) {
      return match[1];
    }
    return content;
  } catch (error) {
    console.error(`Error reading prompt file ${fileName}:`, error);
    return '';
  }
}

function getLatestPromptVersion(db: Database.Database | null, promptName: string): string | null {
  if (!db) {
    return null;
  }
  try {
    const result = db
      .prepare(`
        SELECT content FROM prompt_versions 
        WHERE prompt_name = ? 
        ORDER BY version DESC 
        LIMIT 1
      `)
      .get(promptName) as { content: string } | undefined;
    return result?.content || null;
  } catch (error) {
    console.error(`Error reading prompt version for ${promptName}:`, error);
    return null;
  }
}

function getSettingsFromDb(db: Database.Database | null): Record<string, { value: string; category: string; description: string }> {
  if (!db) {
    return {};
  }
  try {
    const settings = db.prepare('SELECT key, value, category, description FROM settings').all() as Array<{
      key: string;
      value: string;
      category: string;
      description: string;
    }>;
    
    const settingsObj: Record<string, { value: string; category: string; description: string }> = {};
    settings.forEach((setting) => {
      settingsObj[setting.key] = {
        value: setting.value,
        category: setting.category,
        description: setting.description,
      };
    });
    return settingsObj;
  } catch (error) {
    console.error('Error reading settings from database:', error);
    return {};
  }
}

function getDefaultSettingsFromInit(): Record<string, { value: string; category: string; description: string }> {
  try {
    const content = readFileSync(initDbPath, 'utf-8');
    const match = content.match(/const defaultSettings = \[([\s\S]*?)\];/);
    if (!match) {
      return {};
    }
    
    const settingsObj: Record<string, { value: string; category: string; description: string }> = {};
    const settingsArray = match[1];
    
    // Parse the array entries
    const entries = settingsArray.match(/\{[^}]+\}/g) || [];
    entries.forEach((entry) => {
      const keyMatch = entry.match(/key:\s*['"]([^'"]+)['"]/);
      const valueMatch = entry.match(/value:\s*['"]([^'"]*)['"]/);
      const categoryMatch = entry.match(/category:\s*['"]([^'"]+)['"]/);
      const descMatch = entry.match(/description:\s*['"]([^'"]*)['"]/);
      
      if (keyMatch) {
        settingsObj[keyMatch[1]] = {
          value: valueMatch ? valueMatch[1] : '',
          category: categoryMatch ? categoryMatch[1] : '',
          description: descMatch ? descMatch[1] : '',
        };
      }
    });
    
    return settingsObj;
  } catch (error) {
    console.error('Error reading default settings from init.ts:', error);
    return {};
  }
}

function comparePrompts(): PromptDiff[] {
  let db: Database.Database;
  try {
    db = new Database(dbPath);
  } catch (error) {
    console.error('Fehler beim Öffnen der Datenbank:', error);
    return [];
  }
  const promptFiles: Record<string, string> = {
    extract: 'extract.ts',
    match: 'match.ts',
    generate: 'generate.ts',
    'tone-analysis': 'tone-analysis.ts',
  };

  const diffs: PromptDiff[] = [];

  for (const [name, fileName] of Object.entries(promptFiles)) {
    const systemContent = readPromptFile(fileName);
    const dbContent = getLatestPromptVersion(db, name);
    const hasChanges = dbContent !== null && dbContent !== systemContent;

    diffs.push({
      name,
      file: fileName,
      systemContent,
      dbContent,
      hasChanges,
    });
  }

  db.close();
  return diffs;
}

function compareSettings(): SettingDiff[] {
  let db: Database.Database;
  try {
    db = new Database(dbPath);
  } catch (error) {
    console.error('Fehler beim Öffnen der Datenbank:', error);
    return [];
  }
  
  const dbSettings = getSettingsFromDb(db);
  const systemSettings = getDefaultSettingsFromInit();
  
  const diffs: SettingDiff[] = [];
  
  // Check all database settings
  for (const [key, dbSetting] of Object.entries(dbSettings)) {
    const systemSetting = systemSettings[key];
    const systemValue = systemSetting?.value || '';
    const hasChanges = dbSetting.value !== systemValue;
    
    diffs.push({
      key,
      systemValue,
      dbValue: dbSetting.value,
      category: dbSetting.category,
      description: dbSetting.description,
      hasChanges,
    });
  }
  
  // Also check for system settings that don't exist in DB
  for (const [key, systemSetting] of Object.entries(systemSettings)) {
    if (!dbSettings[key]) {
      diffs.push({
        key,
        systemValue: systemSetting.value,
        dbValue: '',
        category: systemSetting.category,
        description: systemSetting.description,
        hasChanges: false, // New setting, not a change
      });
    }
  }
  
  db.close();
  return diffs;
}

function updatePromptFile(promptName: string, content: string): void {
  const promptFiles: Record<string, string> = {
    extract: 'extract.ts',
    match: 'match.ts',
    generate: 'generate.ts',
    'tone-analysis': 'tone-analysis.ts',
  };
  
  const fileName = promptFiles[promptName];
  if (!fileName) {
    throw new Error(`Unknown prompt: ${promptName}`);
  }
  
  const filePath = join(promptsDir, fileName);
  const exportName = promptName === 'tone-analysis' ? 'toneAnalysisPrompt' : promptName + 'Prompt';
  const fileContent = `export const ${exportName} = \`${content}\``;
  
  writeFileSync(filePath, fileContent, 'utf-8');
  console.log(`✓ Updated ${fileName}`);
}

function updateInitFile(settings: SettingDiff[]): void {
  const content = readFileSync(initDbPath, 'utf-8');
  
  // Find the defaultSettings array - match from "const defaultSettings = [" to "];" including any whitespace
  const arrayStart = content.indexOf('const defaultSettings = [');
  if (arrayStart === -1) {
    throw new Error('Could not find defaultSettings array in init.ts');
  }
  
  // Find the closing bracket - look for "];" or just "]" after the array start
  const afterArrayStart = content.substring(arrayStart);
  let arrayEndMatch = afterArrayStart.match(/\];/);
  if (!arrayEndMatch) {
    // Try to find just "]" followed by newline and then "const insertSetting"
    arrayEndMatch = afterArrayStart.match(/\]\s*\n\s*const insertSetting/);
    if (arrayEndMatch) {
      // Find the position of "]" before "const insertSetting"
      const beforeInsert = afterArrayStart.substring(0, arrayEndMatch.index || 0);
      const lastBracket = beforeInsert.lastIndexOf(']');
      if (lastBracket !== -1) {
        arrayEndMatch = { index: lastBracket, 0: ']' };
      }
    }
  }
  
  if (!arrayEndMatch) {
    throw new Error('Could not find end of defaultSettings array in init.ts');
  }
  
  const arrayEnd = arrayStart + (arrayEndMatch.index || 0) + (arrayEndMatch[0].length || 1);
  const beforeArray = content.substring(0, arrayStart);
  const afterArray = content.substring(arrayEnd);
  
  // Build settings array string
  const settingsLines: string[] = [];
  
  // Add all settings (both changed and unchanged)
  const allSettings = [...settings];
  allSettings.sort((a, b) => {
    // Sort by category, then by key
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.key.localeCompare(b.key);
  });
  
  for (const setting of allSettings) {
    const value = setting.hasChanges ? setting.dbValue : setting.systemValue;
    const escapedValue = value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
    const escapedDesc = setting.description.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
    
    settingsLines.push(
      `    { key: '${setting.key}', value: '${escapedValue}', category: '${setting.category}', description: '${escapedDesc}' },`
    );
  }
  
  const newSettingsArray = settingsLines.join('\n');
  const newContent = beforeArray + 'const defaultSettings = [\n' + newSettingsArray + '\n  ];' + afterArray;
  
  writeFileSync(initDbPath, newContent, 'utf-8');
  console.log(`✓ Updated lib/database/init.ts`);
}

function main() {
  console.log('🔍 Vergleiche Admin-Konfigurationen mit Systemdateien...\n');
  
  // Compare prompts
  console.log('📝 Prompts:');
  const promptDiffs = comparePrompts();
  let hasPromptChanges = false;
  
  for (const diff of promptDiffs) {
    if (diff.hasChanges) {
      hasPromptChanges = true;
      console.log(`  ⚠️  ${diff.name} (${diff.file}): Änderungen gefunden`);
      console.log(`     System: ${diff.systemContent.substring(0, 50)}...`);
      console.log(`     Admin:  ${diff.dbContent?.substring(0, 50)}...`);
    } else {
      console.log(`  ✓ ${diff.name} (${diff.file}): Keine Änderungen`);
    }
  }
  
  // Compare settings
  console.log('\n⚙️  Settings:');
  const settingDiffs = compareSettings();
  const generationSettings = settingDiffs.filter(s => s.category === 'generation');
  const hasSettingChanges = generationSettings.some(s => s.hasChanges);
  
  for (const diff of generationSettings) {
    if (diff.hasChanges) {
      console.log(`  ⚠️  ${diff.key}: "${diff.systemValue}" → "${diff.dbValue}"`);
    } else {
      console.log(`  ✓ ${diff.key}: "${diff.systemValue}"`);
    }
  }
  
  // Summary
  console.log('\n📊 Zusammenfassung:');
  console.log(`  Prompts mit Änderungen: ${promptDiffs.filter(p => p.hasChanges).length}`);
  console.log(`  Settings mit Änderungen: ${generationSettings.filter(s => s.hasChanges).length}`);
  
  if (hasPromptChanges || hasSettingChanges) {
    console.log('\n💾 Aktualisiere Systemdateien...\n');
    
    // Update prompts
    for (const diff of promptDiffs) {
      if (diff.hasChanges && diff.dbContent) {
        updatePromptFile(diff.name, diff.dbContent);
      }
    }
    
    // Update settings
    if (hasSettingChanges) {
      updateInitFile(settingDiffs);
    }
    
    console.log('\n✅ Alle Änderungen wurden in die Systemdateien übernommen!');
  } else {
    console.log('\n✅ Keine Änderungen gefunden. Systemdateien sind bereits aktuell.');
  }
}

main();

