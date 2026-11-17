// The replay timeline: a stored match becomes timed steps the match screen plays (spec §5.2).
// Nothing here is random: the same stored events always give the same replay.
import type { ChanceEvent, MatchEvents } from '../../../football/types';
import { roll, rollSeed } from './roll';

export type StepKind = 'phase' | 'mod' | 'pct' | 'fly' | 'result' | 'banner' | 'feed';
export const WAVES = ['rings', 'hex', 'net', 'rays', 'shards'] as const;
export type Wave = (typeof WAVES)[number];
export type Takeover = 'screamer' | 'big';

export interface Step {
  at: number;
  kind: StepKind;
  /** Index into events.chances, or -1 for bookends. */
  chance: number;
  data: {
    bookend?: 'kickoff' | 'halftime' | 'fulltime';
    minute?: number;
    text?: string;
    land?: [number, number];
    retake?: boolean;
    ok?: boolean;
    /** A shot's roll (O44): its seed, whether it ends in the goal-line close-up, and how long the replay gives it. */
    roll?: { seed: number; close: boolean; ms: number };
    goal?: 'for' | 'against';
    save?: boolean;
    wave?: Wave;
    takeover?: Takeover;
    score?: [number, number];
  };
}

// The caps fit a usual 11 to 14 chance night with the roll (O44) unsqueezed.
export const MAX_BIG_MS = 240_000;
export const MAX_NORMAL_MS = 160_000;
// Base lengths (ms). Big nights run slower and add takeovers. A shot's length is its roll's (3.6 to 6 s, never
// slowed); after a goal-line roll the result holds longer, for the verdict and the close-up easing back.
const T = { open: 3000, half: 2600, close: 2600, phase: 1400, mod: 1500, pct: 1100, result: 2000, lineResult: 2600, banner: 1800, takeover: 5200, feed: 0 };

const isGoal = (c: ChanceEvent, ok: boolean) => (c.side === 'atk' ? ok : !ok);

export function timeline(ev: MatchEvents, big: boolean): Step[] {
  const slow = big ? 1.35 : 1;
  const steps: Step[] = [];
  let t = 0;
  const push = (kind: StepKind, chance: number, data: Step['data'], len: number) => {
    steps.push({ at: Math.round(t), kind, chance, data });
    t += len * ((kind === 'result' && data.takeover) || kind === 'fly' ? 1 : slow);
  };
  let mine = 0, theirs = 0, goals = 0, half = false;
  push('phase', -1, { bookend: 'kickoff', minute: 0, score: [0, 0] }, T.open);
  ev.chances.forEach((c, i) => {
    if (!half && c.minute > 45) { half = true; push('phase', -1, { bookend: 'halftime', minute: 45, score: [mine, theirs] }, T.half); }
    push('phase', i, { minute: c.minute, text: c.type }, T.phase);
    if (c.kept) { push('feed', i, { minute: c.minute, text: 'Kept the ball: no shot, and their next attack is easier to stop.' }, T.feed); return; }
    push('mod', i, {}, T.mod);
    push('pct', i, {}, T.pct);
    const shot = (land: [number, number], ok: boolean, retake: boolean) => {
      const close = c.glDist !== null && !retake, seed = rollSeed(ev.seed, i, retake);
      const ms = roll(c, land, seed, close).ms;
      push('fly', i, { land, retake, ok, roll: { seed, close, ms } }, ms);
      return close;
    };
    const firstOk = firstLandingOk(c);
    let close = shot(c.land, firstOk, false);
    if (c.retake) {
      push('result', i, { ok: firstOk, minute: c.minute }, close ? T.lineResult : T.result);
      push('banner', i, { text: `${c.retake.why}! Chance 2 of 2`, minute: c.minute }, T.banner);
      close = shot(c.retake.land, c.retake.ok, true);
    }
    const goal = isGoal(c, c.ok);
    if (goal && c.side === 'atk') mine++; else if (goal) theirs++;
    const data: Step['data'] = { ok: c.ok, minute: c.minute, score: [mine, theirs] };
    if (goal) {
      data.goal = c.side === 'atk' ? 'for' : 'against';
      if (c.side === 'atk') { data.wave = WAVES[goals % WAVES.length]; goals++; }
      if (c.side === 'atk' && (c.tag === 'SCREAMER' || big)) data.takeover = c.tag === 'SCREAMER' ? 'screamer' : 'big';
    } else if (c.side === 'def') data.save = true;
    push('result', i, data, (close ? T.lineResult : T.result) + (data.takeover ? T.takeover : 0));
    push('feed', i, { minute: c.minute, text: feedLine(c, goal) }, T.feed);
  });
  if (!half) push('phase', -1, { bookend: 'halftime', minute: 45, score: [mine, theirs] }, T.half);
  push('phase', -1, { bookend: 'fulltime', minute: 90, score: [mine, theirs] }, T.close);
  return fit(steps, t, big ? MAX_BIG_MS : MAX_NORMAL_MS);
}

/** A retaken chance's first try: the engine stores only the final result, so work back from what retook it. */
export function firstLandingOk(c: ChanceEvent): boolean {
  if (!c.retake) return c.ok;
  if (c.retake.why === 'Second wind') return false;
  if (c.retake.why === 'Scrappy' || c.retake.why === 'Rekordmeister') return true;
  return !c.ok;
}

function feedLine(c: ChanceEvent, goal: boolean): string {
  if (c.side === 'atk') return goal ? `Goal! ${c.type}, ${c.pct}% and in.` : `${c.type}: ${c.pct}%, and it stays out.`;
  return goal ? `They score. ${c.type}, ${c.pct}% to stop it.` : `Saved. ${c.type}, ${c.pct}% to stop it.`;
}

/** Squeeze the whole replay under its cap, keeping the order; each roll then plays in the time its step is given. */
function fit(steps: Step[], total: number, cap: number): Step[] {
  const k = total <= cap - 1000 ? 1 : (cap - 1000) / total;
  const out: Step[] = [...steps.map((s) => ({ ...s, at: Math.round(s.at * k) })), { at: Math.round(Math.min(total, cap - 1000)), kind: 'feed' as const, chance: -1, data: { text: 'end' } }];
  return out.map((s, j) => (s.data.roll ? { ...s, data: { ...s.data, roll: { ...s.data.roll, ms: out[j + 1].at - s.at } } } : s));
}

export const lengthOf = (steps: Step[]) => steps[steps.length - 1]?.at ?? 0;

export interface FinalState { score: [number, number]; xg: [number, number]; moments: string[]; revealed?: string }
export const skipToEnd = (ev: MatchEvents): FinalState => ({ score: ev.score, xg: ev.xg, moments: ev.moments, revealed: ev.revealed });
