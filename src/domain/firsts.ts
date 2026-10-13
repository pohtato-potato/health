import { fmtKg } from './loads';
import { isPlaceholder, realSets } from './plan';
import type { SetEntry } from './types';

export interface First {
  key: string;
  title: string;
  detail: string;
}

/** The rep count that earns its own first. */
const BIG_SET = 20;

/**
 * Firsts in the new sets against everything before: the first time at a weight, the first
 * 20-rep set, the first textbook set at a weight. The very first session is the baseline.
 */
export function detectFirsts(before: SetEntry[], after: SetEntry[]): First[] {
  const prior = realSets(before).filter((s) => !s.drop && !isPlaceholder(s));
  if (!prior.length) return [];
  const loads = new Set(prior.map((s) => s.loadKg).filter((k): k is number => k !== null));
  const bigSet = prior.some((s) => (s.reps ?? 0) >= BIG_SET);
  const clean = new Set(prior.filter((s) => s.form === 5).map((s) => `${s.exerciseId}:${s.loadKg}`));
  const out = new Map<string, First>();
  for (const s of realSets(after)) {
    if (s.drop || isPlaceholder(s)) continue;
    const where = `${s.exercise} · set ${s.setNo}`;
    if (s.loadKg !== null && !loads.has(s.loadKg) && s.loadKg > Math.max(0, ...loads)) out.set(`load:${s.loadKg}`, { key: `load:${s.loadKg}`, title: `Your first ${fmtKg(s.loadKg)} kg`, detail: where });
    if (!bigSet && (s.reps ?? 0) >= BIG_SET) out.set(`reps:${BIG_SET}`, { key: `reps:${BIG_SET}`, title: `Your first ${BIG_SET}-rep set`, detail: where });
    const ck = `${s.exerciseId}:${s.loadKg}`;
    if (s.form === 5 && !clean.has(ck)) out.set(`clean:${ck}`, { key: `clean:${ck}`, title: `First textbook set at ${s.loadKg !== null ? `${fmtKg(s.loadKg)} kg` : 'bodyweight'}`, detail: where });
  }
  return [...out.values()];
}

/** Every kind of moment, and the style each is shown in (spec §7). */
export const MOMENT_KINDS = ['perfect', 'sleepWeek', 'first', 'win', 'record', 'achievement', 'streak', 'monthly', 'chapter', 'seasonal', 'stepsMilestone', 'strengthJump', 'arrival', 'golden'] as const;
export type MomentKind = (typeof MOMENT_KINDS)[number];
export type MomentStyle = 'stars' | 'polaroid' | 'confetti' | 'fireworks' | 'rangoli' | 'coins' | 'levelup' | 'train';

const STYLE: Record<MomentKind, MomentStyle> = {
  perfect: 'stars',
  sleepWeek: 'stars',
  first: 'polaroid',
  win: 'confetti',
  record: 'confetti',
  achievement: 'confetti',
  streak: 'confetti',
  monthly: 'fireworks',
  chapter: 'fireworks',
  seasonal: 'rangoli',
  stepsMilestone: 'coins',
  strengthJump: 'levelup',
  arrival: 'train',
  golden: 'stars',
};

export function styleFor(kind: MomentKind): MomentStyle {
  return STYLE[kind];
}
