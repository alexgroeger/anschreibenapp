import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats user profile data from database into structured text
 * @param userProfile User profile object from database
 * @returns Formatted string with user profile information
 */
export function formatUserProfile(userProfile: any): string {
  if (!userProfile) {
    return '';
  }

  const sections: string[] = [];

  if (userProfile.values_motivation && userProfile.values_motivation.trim()) {
    sections.push(`**Werte und motivierende Themen:**\n${userProfile.values_motivation}`);
  }

  if (userProfile.soft_skills && userProfile.soft_skills.trim()) {
    sections.push(`**Besondere Soft Skills:**\n${userProfile.soft_skills}`);
  }

  if (userProfile.work_style_abilities && userProfile.work_style_abilities.trim()) {
    sections.push(`**Arbeitsweise und besondere Fähigkeiten:**\n${userProfile.work_style_abilities}`);
  }

  if (userProfile.development_direction && userProfile.development_direction.trim()) {
    sections.push(`**Entwicklungsrichtung:**\n${userProfile.development_direction}`);
  }

  return sections.length > 0 ? sections.join('\n\n') : '';
}


