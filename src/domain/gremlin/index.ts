import { dayKey, daysBetween, type DayKey } from '../dates';
import { prefOn, type Settings } from '../types';
import { GREMLIN_LINES } from './lines';

export { GREMLIN_LINES };
export type Moment = keyof typeof GREMLIN_LINES;
export const GREMLIN_MOMENTS = Object.keys(GREMLIN_LINES) as Moment[];
export const GREMLIN_HELLO = "Oh. A new human. I'll be doing the counting. Try to keep up.";

export interface GremlinVars { session?: string; steps?: string; laps?: string; sleep?: string; protein?: string }

const STAGE_TWO_DAY = 30;
const STAGE_THREE_DAY = 120;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function gremlinStage(day: number): 0 | 1 | 2 {
  if (day >= STAGE_THREE_DAY) return 2;
  return day >= STAGE_TWO_DAY ? 1 : 0;
}

/** A line for the moment: the same all day, different tomorrow. Early on only the first stage speaks; later a stage and the one before it share the floor. */
export function gremlinLine(moment: Moment, seed: string, day: number, vars: GremlinVars = {}): string {
  const stage = gremlinStage(day);
  const staged = GREMLIN_LINES[moment];
  const pool: string[] = stage === 0 ? staged[0] : [...staged[stage - 1], ...staged[stage]];
  const line = pool[hash(seed + moment) % pool.length];
  return line.replace(/\{(\w+)\}/g, (_, k: keyof GremlinVars) => vars[k] ?? '');
}

export function journeyDay(settings: Pick<Settings, 'createdAt'>, today: DayKey): number {
  if (!settings.createdAt) return 0;
  return Math.max(0, daysBetween(dayKey(new Date(settings.createdAt)), today));
}

/** The line to show, or nothing when the Gremlin has been switched off. Any stored voice from an old backup lands here too. */
export function spokenLine(settings: Settings, today: DayKey, moment: Moment, seed: string, vars: GremlinVars = {}): string {
  if (!prefOn(settings.prefs, 'gremlin')) return '';
  return gremlinLine(moment, seed, journeyDay(settings, today), vars);
}
