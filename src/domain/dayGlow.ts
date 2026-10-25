import { trainGlow } from './trainView';

/** How the day went, as a light on the land: a session in range, a record night, a perfect day. */
export type DayGlow = 'in' | 'record' | 'perfect';

const GLOWS: readonly string[] = ['in', 'record', 'perfect'] satisfies DayGlow[];

/**
 * The day's glow, in order: a perfect day, then a record night, then a session in range, else none. Gold (perfect,
 * record) only for what was earned; an ordinary day leaves the land its own colour.
 */
export function dayGlow({ perfect, session }: { perfect: boolean; session?: { records: number; checks?: number; formAvg?: number } }): DayGlow | undefined {
  if (perfect) return 'perfect';
  const g = trainGlow(session);
  return g === 'calm' ? undefined : g;
}

export function isDayGlow(v: string | null): v is DayGlow {
  return v !== null && GLOWS.includes(v);
}
