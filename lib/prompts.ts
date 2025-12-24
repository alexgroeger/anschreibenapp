import { getDatabase } from '@/lib/database/client';
import { extractPrompt } from '@/prompts/extract';
import { matchPrompt } from '@/prompts/match';
import { generatePrompt } from '@/prompts/generate';
import { toneAnalysisPrompt } from '@/prompts/tone-analysis';

// Fallback prompts from files
const fallbackPrompts: Record<string, string> = {
  extract: extractPrompt,
  match: matchPrompt,
  generate: generatePrompt,
  'tone-analysis': toneAnalysisPrompt,
};

/**
 * Get a prompt from the database, or fallback to file if not found
 * @param promptName - The name of the prompt (extract, match, generate, tone-analysis)
 * @returns The prompt content
 */
export function getPrompt(promptName: string): string {
  try {
    const db = getDatabase();
    const getPrompt = db.prepare(`
      SELECT content FROM prompts WHERE prompt_name = ?
    `);
    const dbPrompt = getPrompt.get(promptName) as any;

    if (dbPrompt?.content) {
      return dbPrompt.content;
    }
  } catch (error) {
    console.warn(`Failed to load prompt ${promptName} from database:`, error);
  }

  // Fallback to file
  const fallback = fallbackPrompts[promptName];
  if (!fallback) {
    throw new Error(`Unknown prompt: ${promptName}`);
  }

  return fallback;
}
