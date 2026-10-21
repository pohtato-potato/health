import { checksFor, okCount, slipCount } from './checks';
import { fmtKg } from './loads';
import { topOfRange, valueOfSet, type ExerciseDef } from './plan';
import { isTextbook } from './quality';
import type { SetEntry } from './types';

export type Tier = 'First light' | 'Clean' | 'Even' | 'Plated' | 'Mastery';
export const TIERS: Tier[] = ['First light', 'Clean', 'Even', 'Plated', 'Mastery'];

const MASTERY_RUN = 10;
const value = (s: SetEntry) => valueOfSet(s) ?? 0;

/** Working sets in time order, grouped by session. */
function bySession(sets: SetEntry[]): SetEntry[][] {
  const out = new Map<string, SetEntry[]>();
  for (const s of sets) out.set(s.sessionId, [...(out.get(s.sessionId) ?? []), s]);
  return [...out.values()];
}

/**
 * The card's tier: the highest one ever earned, never lost. Clean is one whole textbook session;
 * Even is both sides within a rep (per-side work) or two textbook sessions running; Plated is a
 * record at a new load; Mastery is ten textbook sets running at the top of the range.
 */
export function cardFor(ex: ExerciseDef, sets: SetEntry[]): { tier: Tier; next: string; logged: boolean } {
  const working = sets.filter((s) => !s.skipped && !s.drop).sort((a, b) => a.at - b.at);
  if (!working.length) return { tier: 'First light', next: '', logged: false };
  const checks = checksFor(ex).length;
  // Every check the plan has went well; sets from before checks count with an old 5/5.
  const textbook = (s: SetEntry) => (s.checks && Object.keys(s.checks).length ? (checks ? okCount(s) === checks && slipCount(s) === 0 : isTextbook(s)) : s.form === 5);
  const sessions = bySession(working);
  const clean = sessions.map((ss) => ss.every(textbook));
  const even = ex.perSide
    ? sessions.some((ss) => {
        const setNos = [...new Set(ss.map((s) => s.setNo))];
        const pairs = setNos.map((n) => [ss.find((s) => s.setNo === n && s.side === 'L'), ss.find((s) => s.setNo === n && s.side === 'R')]).filter((p): p is [SetEntry, SetEntry] => !!p[0] && !!p[1]);
        return pairs.length === setNos.length && pairs.every(([l, r]) => Math.abs(value(l) - value(r)) <= 1);
      })
    : clean.some((c, i) => c && clean[i + 1]);
  const loaded = working.some((s) => s.loadKg !== null);
  const plated = working.some((s, i) => s.mark === '!!' && s.loadKg !== null && i > 0 && s.loadKg > Math.max(...working.slice(0, i).map((x) => x.loadKg ?? 0)));
  const top = topOfRange(ex);
  // Ten textbook sets running at the top of the range; each side of per-side work counts as a set.
  let run = 0;
  let best = 0;
  let masteredKg: number | null = null;
  for (const s of working) {
    run = top !== undefined && textbook(s) && value(s) >= top ? run + 1 : 0;
    if (run >= MASTERY_RUN && s.loadKg !== null && (masteredKg === null || s.loadKg > masteredKg)) masteredKg = s.loadKg;
    best = Math.max(best, run);
  }
  const met: Record<Tier, boolean> = { 'First light': true, Clean: clean.some(Boolean), Even: even, Plated: plated, Mastery: best >= MASTERY_RUN };
  const tier = [...TIERS].reverse().find((t) => met[t])!;
  // Next only ever names a step that can still happen.
  const toMastery = !checks ? 'Mastery needs form checks from the coach' : top === undefined ? 'Mastery needs a top to the range' : `${MASTERY_RUN - run} more clean sets at the top of the range, for Mastery`;
  const nextFor: Record<Tier, string> = {
    'First light': checks ? 'Every check went well on a whole session, for Clean' : 'Clean needs form checks from the coach',
    Clean: ex.perSide ? 'Left and right within one rep for a whole session, for Even' : checks ? 'Two clean sessions running, for Even' : 'Even needs form checks from the coach',
    Even: loaded ? 'A record at a new load, for Plated' : toMastery,
    Plated: toMastery,
    Mastery: masteredKg !== null ? `Mastered at ${fmtKg(masteredKg)} kg` : 'Mastered',
  };
  return { tier, next: nextFor[tier], logged: true };
}

const fmtSet = (s: SetEntry) => `${s.loadKg !== null ? `${fmtKg(s.loadKg)} kg × ` : ''}${value(s)}${s.reps === undefined && s.seconds !== undefined ? ' s' : ''}`;
/** Strength in one number: an estimated one-rep max for loaded work, else reps or seconds. */
const strength = (s: SetEntry) => (s.loadKg ? s.loadKg * (1 + value(s) / 30) : value(s));

/** The back of a card: the best three sets, strength per session (last 12), and how many records. */
export function cardBack(sets: SetEntry[]): { best: string[]; curve: number[]; records: number } {
  const working = sets.filter((s) => !s.skipped && !s.drop).sort((a, b) => a.at - b.at);
  const best = [...new Set([...working].sort((a, b) => (b.loadKg ?? 0) - (a.loadKg ?? 0) || value(b) - value(a)).map(fmtSet))].slice(0, 3);
  const curve = bySession(working)
    .map((ss) => Math.max(...ss.map(strength)))
    .slice(-12);
  return { best, curve, records: working.filter((s) => s.mark === '!!').length };
}
