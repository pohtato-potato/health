// The Continental Cup (spec §9.2, owner's design of 7 Nov): last season's Crown League top 4 plus 12 clubs
// from abroad. A league phase of 8 nights, each a double-header with that night's league match, then the top 8
// play a quarter-final, semi-final and final. Win it and the Club World Cup replaces the next event.
import type { Bracket, Tie } from './cups';
import { CONT_INVENTED, CONT_REAL, WORLD_CHAMPS } from './data/continental';
import { hashSeed, rng, shuffle } from './rng';
import { standings, type Played, type Row } from './table';

export const CONT_NAME = 'The Continental Cup';
export const CWC_NAME = 'The Club World Cup';
/** The season days it plays on: all league days, so each is a double-header. */
export const CONT = { phase: [2, 4, 7, 9, 12, 14, 18, 20], qf: 26, sf: 32, final: 39 } as const;
export type ContStage = 'phase' | 'qf' | 'sf' | 'final';
export interface ContNight { stage: ContStage; round: number }
/** Which continental night a season day is (round counts from 1 in the phase). */
export function contNight(day: number): ContNight | undefined {
  const i = (CONT.phase as readonly number[]).indexOf(day);
  if (i >= 0) return { stage: 'phase', round: i + 1 };
  if (day === CONT.qf) return { stage: 'qf', round: 0 };
  if (day === CONT.sf) return { stage: 'sf', round: 0 };
  if (day === CONT.final) return { stage: 'final', round: 0 };
  return undefined;
}

export interface Continental {
  field: string[];
  /** 8 phase rounds of [home, away]. */
  rounds: [string, string][][];
  /** Phase results, one list per round played. */
  results: Played[][];
  /** The knockout rounds, filled once the phase ends. */
  ko?: Bracket;
}

/** The top 4 plus 12 from abroad: 9 real clubs and 3 invented ones, drawn by season. */
export function drawField(season: number, top4: string[]): string[] {
  const r = rng(hashSeed('continental', String(season)));
  const real = shuffle(r, CONT_REAL.map((c) => c.id)).slice(0, 9);
  const made = shuffle(r, CONT_INVENTED.map((c) => c.id)).slice(0, 3);
  return [...top4.slice(0, 4), ...real, ...made];
}

/** The first 8 rounds of a circle-method round robin: 8 different opponents each. */
function phaseRounds(ids: string[]): [string, string][][] {
  const n = ids.length, rot = ids.slice(1), out: [string, string][][] = [];
  for (let k = 0; k < 8; k++) {
    const ring = [ids[0], ...rot], round: [string, string][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = ring[i], b = ring[n - 1 - i];
      round.push([a, b]); // home and away are set afterwards by balance()
    }
    out.push(round);
    rot.unshift(rot.pop()!);
  }
  return out;
}

export function newContinental(season: number, top4: string[]): Continental {
  const field = drawField(season, top4);
  const order = shuffle(rng(hashSeed('continental-draw', String(season))), field);
  return { field, rounds: balance(phaseRounds(order)), results: [] };
}
/**
 * Home and away by an Euler circuit: every club has 8 opponents (an even number), so walking a circuit and
 * playing each pairing at the club you leave from gives everyone exactly 4 home and 4 away.
 */
function balance(rounds: [string, string][][]): [string, string][][] {
  const edges = rounds.flat().map(([a, b]) => ({ a, b, used: false, home: '' }));
  const adj = new Map<string, number[]>();
  edges.forEach((e, k) => { for (const x of [e.a, e.b]) adj.set(x, [...(adj.get(x) ?? []), k]); });
  for (const start of adj.keys()) {
    const stack = [start];
    while (stack.length) {
      const v = stack[stack.length - 1];
      const k = (adj.get(v) ?? []).find((x) => !edges[x].used);
      if (k === undefined) { stack.pop(); continue; }
      const e = edges[k];
      e.used = true; e.home = v;
      stack.push(e.a === v ? e.b : e.a);
    }
  }
  let k = 0;
  return rounds.map((r) => r.map(() => { const e = edges[k++]; return [e.home, e.home === e.a ? e.b : e.a] as [string, string]; }));
}

export const phaseTable = (c: Continental): Row[] => standings(c.results.flat(), c.field);

/** The top 8 seeded 1v8, 4v5, 2v7, 3v6: the top two can only meet in the final. */
export function koFromTable(c: Continental): Bracket {
  const t = phaseTable(c).slice(0, 8).map((r) => r.id);
  const qf: Tie[] = [[0, 7], [3, 4], [1, 6], [2, 5]].map(([a, b]) => ({ home: t[a], away: t[b] }));
  return { id: 'continental', name: CONT_NAME, size: 8, rounds: [{ name: 'Quarter-final', day: CONT.qf, ties: qf }, { name: 'Semi-final', day: CONT.sf, ties: [] }, { name: 'Final', day: CONT.final, ties: [] }] };
}

/** How far a club got: knocked out in the phase, or the knockout round it reached, or the winner. */
export type ContReach = 'phase' | 'qf' | 'sf' | 'final' | 'winner';
const PRIZE: Record<ContReach, number> = { phase: 2, qf: 5, sf: 8, final: 12, winner: 15 };
/** Continental prize money (€m), from league.json's "2 to 15 a round". */
export const contPrize = (reach: ContReach) => PRIZE[reach];
export function reachOf(c: Continental | undefined, id: string): ContReach | undefined {
  if (!c?.field.includes(id)) return undefined;
  if (c.ko?.winner === id) return 'winner';
  const r = c.ko?.rounds ?? [];
  if (r[2]?.ties.some((t) => t.home === id || t.away === id)) return 'final';
  if (r[1]?.ties.some((t) => t.home === id || t.away === id)) return 'sf';
  if (r[0]?.ties.some((t) => t.home === id || t.away === id)) return 'qf';
  return 'phase';
}

/** The Club World Cup: Brabo and the champions of the other continents, one round a night. */
export const CWC_DAYS = { qf: 1, sf: 2, third: 3, final: 4 } as const;
export function newClubWorld(season: number): Bracket {
  const ids = shuffle(rng(hashSeed('clubworld', String(season))), ['bra', ...WORLD_CHAMPS.map((c) => c.id)]);
  const qf: Tie[] = [0, 2, 4, 6].map((i) => ({ home: ids[i], away: ids[i + 1] }));
  return { id: 'clubworld', name: CWC_NAME, size: 8, rounds: [{ name: 'Quarter-final', day: CWC_DAYS.qf, ties: qf }, { name: 'Semi-final', day: CWC_DAYS.sf, ties: [] }, { name: 'Final', day: CWC_DAYS.final, ties: [] }] };
}
