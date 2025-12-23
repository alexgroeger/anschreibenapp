/**
 * Berechnet das nächste Vorkommen einer wiederkehrenden Erinnerung
 * @param dueDate Das ursprüngliche Fälligkeitsdatum
 * @param pattern Das Wiederholungsmuster ('daily', 'weekly', 'monthly', 'yearly')
 * @param interval Das Wiederholungsintervall (z.B. 2 = alle 2 Wochen)
 * @returns Das nächste Fälligkeitsdatum
 */
export function calculateNextOccurrence(
  dueDate: Date,
  pattern: 'daily' | 'weekly' | 'monthly' | 'yearly',
  interval: number = 1
): Date {
  const nextDate = new Date(dueDate);

  switch (pattern) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + interval);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + (7 * interval));
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + interval);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + interval);
      break;
    default:
      throw new Error(`Unbekanntes Wiederholungsmuster: ${pattern}`);
  }

  return nextDate;
}

/**
 * Prüft, ob eine wiederkehrende Erinnerung noch aktiv sein sollte
 * basierend auf dem Enddatum
 * @param nextOccurrence Das nächste Vorkommen
 * @param endDate Das optionale Enddatum
 * @returns true wenn die Erinnerung noch aktiv sein sollte
 */
export function shouldRecurrenceContinue(
  nextOccurrence: Date,
  endDate: Date | null
): boolean {
  if (!endDate) {
    return true; // Kein Enddatum = unbegrenzt
  }
  return nextOccurrence <= endDate;
}

