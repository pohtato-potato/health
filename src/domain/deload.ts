import { daysBetween, type DayKey } from './dates';
import type { TrainingSession } from './types';

/** Weeks of training before a lighter week is offered. */
export const LIGHTER_EVERY_WEEKS = 6;
/** Readiness under this, two sessions running, also makes the case. */
export const LOW_READINESS = 60;

/**
 * The case for a lighter week, evidence first: six weeks since the start or the last lighter
 * week, or readiness low two sessions running. The owner decides.
 */
export function deloadCase(sessions: Pick<TrainingSession, 'date' | 'status' | 'readiness'>[], today: DayKey, lastLighter?: DayKey): { due: boolean; evidence: string[] } {
  const done = sessions.filter((s) => s.status === 'done' && s.date <= today && (!lastLighter || s.date > lastLighter)).sort((a, b) => a.date.localeCompare(b.date));
  const evidence: string[] = [];
  if (done.length) {
    const weeks = Math.floor(daysBetween(done[0].date, today) / 7);
    if (weeks >= LIGHTER_EVERY_WEEKS) evidence.push(`${weeks} weeks of training since ${lastLighter ? 'the last lighter week' : 'you started'}. Every ${LIGHTER_EVERY_WEEKS} weeks a lighter one lets it settle.`);
  }
  const lastTwo = done.slice(-2).map((s) => s.readiness);
  if (lastTwo.length === 2 && lastTwo.every((r) => r !== undefined && r < LOW_READINESS)) evidence.push(`Readiness was ${lastTwo.join(' and ')} the last two sessions.`);
  return { due: evidence.length > 0, evidence };
}
