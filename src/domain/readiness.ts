import { fmtDuration } from './format';
import type { SetEntry, TrainingSession } from './types';

export interface Readiness {
  score: number;
  band: 'rest' | 'easy' | 'steady' | 'push';
  label: string;
  /** Every reason, largest first: "Slept 6 h 10, 50 m short −5". */
  parts: ReadinessReason[];
  /** Enough to say anything: last night's sleep at least. */
  known: boolean;
  /** The inputs as -1…+1 values, kept on the session for refitting. */
  x: Partial<Record<ReadinessKey, number>>;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** The band and its words for a score. */
export function bandFor(score: number): { band: Readiness['band']; label: string } {
  const band = score >= 80 ? 'push' : score >= 65 ? 'steady' : score >= 50 ? 'easy' : 'rest';
  return { band, label: { push: 'Good to push', steady: 'Steady', easy: 'Take it easy', rest: 'Rest' }[band] };
}

/**
 * The chance of beating last time, from your own history once there's enough:
 * the share of sets marked ! or !! in sessions that started at a similar score.
 */
export function beatChance(score: number, sessions: TrainingSession[], sets: SetEntry[]): { pct: number; learned: boolean } {
  const scored = sessions.filter((s) => s.status === 'done' && s.readiness !== undefined);
  if (scored.length >= 10) {
    const near = scored.filter((s) => Math.abs(s.readiness! - score) <= 10);
    const pool = near.length >= 4 ? near : scored;
    const ids = new Set(pool.map((s) => s.id));
    const mine = sets.filter((x) => ids.has(x.sessionId) && !x.drop);
    if (mine.length) return { pct: Math.round((mine.filter((x) => x.mark === '!' || x.mark === '!!').length / mine.length) * 100), learned: true };
  }
  return { pct: clamp(Math.round(score * 0.9 + 8), 25, 95), learned: false };
}

/* ------------------------------------------------------------------ */
/* v2: eleven inputs, each a signed reason; weights refitted monthly.  */
/* ------------------------------------------------------------------ */

export const READINESS_KEYS = ['sleep', 'rested', 'office', 'stomach', 'soreness', 'flags', 'energy', 'effort', 'restDays', 'stepsYesterday', 'timeOfDay'] as const;
export type ReadinessKey = (typeof READINESS_KEYS)[number];
export type Weights = Record<ReadinessKey, number>;

/** Points each input moves the score at its strongest (documented defaults). */
export const DEFAULT_WEIGHTS: Weights = {
  sleep: 10,
  rested: 6,
  office: 3,
  stomach: 4,
  soreness: 8,
  flags: 8,
  energy: 6,
  effort: 4,
  restDays: 6,
  stepsYesterday: 3,
  timeOfDay: 3,
};

export interface ReadinessInputs {
  sleepNeed: number;
  sleepMin?: number;
  rested?: number;
  office?: boolean;
  stomach?: boolean;
  soreness?: Partial<Record<string, 1 | 2 | 3>>;
  /** Sessions since the last joint flag; undefined when there has never been one. */
  sessionsSinceFlag?: number;
  energy?: number;
  /** Average reps in reserve last session. */
  lastRir?: number;
  /** Days between the last session and today, minus one. */
  restDays?: number;
  stepsYesterday?: number;
  stepsGoal?: number;
  hour?: number;
}

export interface ReadinessReason {
  key: ReadinessKey;
  label: string;
  delta: number;
}

const BASE = 75;
const AREA: Record<string, string> = { quads: 'Quads', hamstrings: 'Hamstrings', glutes: 'Glutes', calves: 'Calves', chest: 'Chest', 'upper-back': 'Upper back', lats: 'Lats', 'front-delts': 'Shoulders', 'side-delts': 'Shoulders', 'rear-delts': 'Shoulders', biceps: 'Arms', triceps: 'Arms', forearms: 'Forearms', abs: 'Core' };

/** Each present input as a value from -1 (worst) to +1 (best), with its plain label. */
export function readinessFeatures(i: ReadinessInputs): Partial<Record<ReadinessKey, { x: number; label: string }>> {
  const f: Partial<Record<ReadinessKey, { x: number; label: string }>> = {};
  if (i.sleepMin !== undefined) {
    const gap = i.sleepMin - i.sleepNeed;
    f.sleep = { x: clamp(gap / 120, -1, 1), label: gap >= 0 ? `Slept ${fmtDuration(i.sleepMin)}` : `Slept ${fmtDuration(i.sleepMin)}, ${fmtDuration(-gap)} short` };
  }
  if (i.rested !== undefined) f.rested = { x: (i.rested - 3) / 2, label: `Felt rested ${i.rested} of 5` };
  if (i.office) f.office = { x: -1, label: 'Office day' };
  if (i.stomach === false) f.stomach = { x: -1, label: 'Stomach unsettled' };
  if (i.soreness) {
    const entries = Object.entries(i.soreness).filter(([, v]) => v);
    if (entries.length) {
      const [worst] = entries.sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
      const load = clamp(entries.reduce((n, [, v]) => n + (v ?? 0), 0) / 4, 0, 1);
      f.soreness = { x: -load, label: `${AREA[worst[0]] ?? worst[0]} sore` };
    }
  }
  if (i.sessionsSinceFlag !== undefined) f.flags = { x: -(0.85 ** i.sessionsSinceFlag), label: i.sessionsSinceFlag === 0 ? 'Joint flag last session' : `Joint flag ${i.sessionsSinceFlag} sessions ago` };
  if (i.energy !== undefined) f.energy = { x: (i.energy - 3) / 2, label: `Energy ${i.energy} of 5` };
  if (i.lastRir !== undefined) f.effort = { x: clamp((i.lastRir - 2) / 2, -1, 0.5), label: i.lastRir < 1 ? 'Last session was all-out' : 'Last session left reps in reserve' };
  if (i.restDays !== undefined) f.restDays = { x: i.restDays <= 0 ? -0.5 : i.restDays === 1 ? 0.5 : 1, label: i.restDays <= 0 ? 'Trained yesterday' : i.restDays === 1 ? 'One rest day' : i.restDays === 2 ? 'Two rest days' : `${i.restDays} rest days` };
  if (i.stepsYesterday !== undefined && i.stepsGoal && i.stepsYesterday > i.stepsGoal * 1.4) f.stepsYesterday = { x: -1, label: 'Big walking day yesterday' };
  if (i.hour !== undefined && (i.hour >= 22 || i.hour < 6)) f.timeOfDay = { x: -1, label: 'Late in the night' };
  return f;
}

/** The score with every reason, largest first. Missing inputs simply drop out. */
export function readinessScore(i: ReadinessInputs, weights: Weights = DEFAULT_WEIGHTS): { score: number; parts: ReadinessReason[]; known: boolean; x: Partial<Record<ReadinessKey, number>> } {
  const f = readinessFeatures(i);
  const x: Partial<Record<ReadinessKey, number>> = {};
  const parts: ReadinessReason[] = [];
  for (const k of READINESS_KEYS) {
    const v = f[k];
    if (!v) continue;
    x[k] = v.x;
    const delta = Math.round(v.x * weights[k]);
    if (delta !== 0) parts.push({ key: k, label: v.label, delta });
  }
  parts.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const score = clamp(BASE + parts.reduce((n, p) => n + p.delta, 0), 0, 100);
  return { score, parts, known: i.sleepMin !== undefined, x };
}

/** Sessions needed before the weights are refitted. */
export const REFIT_MIN = 8;

/**
 * Refit each weight to how sessions actually went: the slope of session quality against
 * the input, capped at ±50 % of the documented default.
 */
export function refitWeights(history: { x: Partial<Record<ReadinessKey, number>>; quality: number }[], defaults: Weights = DEFAULT_WEIGHTS): Weights {
  if (history.length < REFIT_MIN) return { ...defaults };
  const out = { ...defaults };
  for (const k of READINESS_KEYS) {
    const pts = history.filter((h) => h.x[k] !== undefined).map((h) => [h.x[k]!, h.quality] as const);
    if (pts.length < 5) continue;
    const mx = pts.reduce((n, p) => n + p[0], 0) / pts.length;
    const my = pts.reduce((n, p) => n + p[1], 0) / pts.length;
    const vx = pts.reduce((n, p) => n + (p[0] - mx) ** 2, 0);
    if (vx < 1e-6) continue;
    const slope = pts.reduce((n, p) => n + (p[0] - mx) * (p[1] - my), 0) / vx;
    const d = defaults[k];
    out[k] = Math.round(clamp(slope, d * 0.5, d * 1.5) * 10) / 10;
  }
  return out;
}

/** What a session keeps of the readiness at its start: nothing when the score was mostly guessed (no sleep logged). */
export function readinessToStore(r: { score: number; known: boolean; x: Partial<Record<ReadinessKey, number>> }): { readiness?: number; readinessX?: Partial<Record<ReadinessKey, number>> } {
  return r.known ? { readiness: r.score, readinessX: r.x } : {};
}

/** The score as shown: a dash until there is enough to go on. */
export function readinessText(r: { score: number; known: boolean }): string {
  return r.known ? String(r.score) : '—';
}

/** Readiness colours: rose under 60, gold 60–74, sage 75 and up. */
export function readinessInk(score: number): string {
  return score < 60 ? 'var(--rose)' : score < 75 ? 'var(--gold)' : 'var(--sage)';
}
