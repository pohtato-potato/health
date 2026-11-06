// The replay timeline: a stored match becomes timed steps the match screen plays (spec §5.2).
// Nothing here is random: the same stored events always give the same replay.
import type { ChanceEvent, MatchEvents } from '../../../football/types';

export type StepKind = 'phase' | 'mod' | 'pct' | 'fly' | 'goalline' | 'result' | 'banner' | 'feed';
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
    goal?: 'for' | 'against';
    save?: boolean;
    wave?: Wave;
    takeover?: Takeover;
    score?: [number, number];
  };
}

export const MAX_BIG_MS = 180_000;
export const MAX_NORMAL_MS = 90_000;
// Base lengths (ms). Big nights run slower and add takeovers.
const T = { open: 3000, half: 2600, close: 2600, phase: 1400, mod: 1500, pct: 1100, fly: 1500, goalline: 2400, result: 2000, banner: 1800, takeover: 5200, feed: 0 };

const isGoal = (c: ChanceEvent, ok: boolean) => (c.side === 'atk' ? ok : !ok);

export function timeline(ev: MatchEvents, big: boolean): Step[] {
  const slow = big ? 1.35 : 1;
  const steps: Step[] = [];
  let t = 0;
  const push = (kind: StepKind, chance: number, data: Step['data'], len: number) => {
    steps.push({ at: Math.round(t), kind, chance, data });
    t += len * (kind === 'result' && data.takeover ? 1 : slow);
  };
  let mine = 0, theirs = 0, goals = 0, half = false;
  push('phase', -1, { bookend: 'kickoff', minute: 0, score: [0, 0] }, T.open);
  ev.chances.forEach((c, i) => {
    if (!half && c.minute > 45) { half = true; push('phase', -1, { bookend: 'halftime', minute: 45, score: [mine, theirs] }, T.half); }
    push('phase', i, { minute: c.minute, text: c.type }, T.phase);
    push('mod', i, {}, T.mod);
    push('pct', i, {}, T.pct);
    const shot = (land: [number, number], ok: boolean, retake: boolean) => {
      push('fly', i, { land, retake }, T.fly);
      if (c.glDist !== null && !retake) push('goalline', i, { land, ok }, T.goalline);
    };
    const firstOk = firstLandingOk(c);
    shot(c.land, firstOk, false);
    if (c.retake) {
      push('result', i, { ok: firstOk, minute: c.minute }, T.result);
      push('banner', i, { text: `${c.retake.why}! Chance 2 of 2`, minute: c.minute }, T.banner);
      shot(c.retake.land, c.retake.ok, true);
    }
    const goal = isGoal(c, c.ok);
    if (goal && c.side === 'atk') mine++; else if (goal) theirs++;
    const data: Step['data'] = { ok: c.ok, minute: c.minute, score: [mine, theirs] };
    if (goal) {
      data.goal = c.side === 'atk' ? 'for' : 'against';
      if (c.side === 'atk') { data.wave = WAVES[goals % WAVES.length]; goals++; }
      if (c.side === 'atk' && (c.tag === 'SCREAMER' || big)) data.takeover = c.tag === 'SCREAMER' ? 'screamer' : 'big';
    } else if (c.side === 'def') data.save = true;
    push('result', i, data, T.result + (data.takeover ? T.takeover : 0));
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

/** Squeeze the whole replay under its cap, keeping the order. */
function fit(steps: Step[], total: number, cap: number): Step[] {
  const end = total;
  if (end <= cap - 1000) return [...steps, { at: Math.round(end), kind: 'feed', chance: -1, data: { text: 'end' } }];
  const k = (cap - 1000) / end;
  return [...steps.map((s) => ({ ...s, at: Math.round(s.at * k) })), { at: cap - 1000, kind: 'feed' as const, chance: -1, data: { text: 'end' } }];
}

export const lengthOf = (steps: Step[]) => steps[steps.length - 1]?.at ?? 0;

export interface FinalState { score: [number, number]; xg: [number, number]; moments: string[]; revealed?: string }
export const skipToEnd = (ev: MatchEvents): FinalState => ({ score: ev.score, xg: ev.xg, moments: ev.moments, revealed: ev.revealed });
