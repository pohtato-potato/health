// Event nights between seasons (spec §9.3–9.4), and the World Cup.
import { hashSeed, rng, shuffle } from './rng';

export type EventId = 'worldcup' | 'nations' | 'clubworld' | 'tour' | 'supercup' | 'oldselves' | 'lostclubs' | 'fivenations' | 'derbyweek'
  | 'legends' | 'floodlit' | 'island' | 'night108' | 'testimonial' | 'centenary';
export const EVENTS: Record<EventId, { name: string; days: number }> = {
  worldcup: { name: 'The World Cup', days: 7 },
  nations: { name: 'The Continental Nations Cup', days: 5 },
  clubworld: { name: 'The Club World Cup', days: 4 },
  tour: { name: 'Pre-season tour', days: 3 },
  supercup: { name: 'The Super Cup', days: 1 },
  oldselves: { name: 'The Old Selves Cup', days: 3 },
  lostclubs: { name: 'The Tournament of Lost Clubs', days: 3 },
  fivenations: { name: 'The Five Nations Cup', days: 2 },
  derbyweek: { name: 'Winter Derby Week', days: 5 },
  legends: { name: 'Charity Legends Match', days: 1 },
  floodlit: { name: 'The Floodlit Invitational', days: 2 },
  island: { name: 'The Island Cup', days: 2 },
  night108: { name: 'The Night of 108', days: 1 },
  testimonial: { name: 'Testimonial', days: 1 },
  centenary: { name: 'Centenary match', days: 1 },
};
export const INVENTED: EventId[] = ['tour', 'supercup', 'oldselves', 'lostclubs', 'fivenations', 'derbyweek', 'legends', 'floodlit', 'island', 'night108', 'testimonial', 'centenary'];
export interface EventState { used: EventId[]; clubWorldDue: boolean }

/** The event after season n: World Cup after every fourth season, Nations Cup two seasons later, else an invented one. */
export function nextEvent(seasonNo: number, st: EventState, r: () => number): { id: EventId; days: number; state: EventState } {
  const done = (id: EventId, state: EventState) => ({ id, days: EVENTS[id].days, state });
  if (seasonNo % 4 === 0) return done('worldcup', st);
  if (seasonNo % 4 === 2) return done('nations', st);
  if (st.clubWorldDue) return done('clubworld', { ...st, clubWorldDue: false });
  const left = INVENTED.filter((e) => !st.used.includes(e));
  const pool = left.length ? left : INVENTED;
  const id = shuffle(r, pool)[0];
  return done(id, { ...st, used: left.length ? [...st.used, id] : [id] });
}

export interface NationDef { id: string; name: string; strength: number }
const N = (id: string, name: string, strength: number): NationDef => ({ id, name, strength });
export const NATIONS: NationDef[] = [
  N('bra', 'Brazil', 94), N('arg', 'Argentina', 95), N('fra', 'France', 95), N('eng', 'England', 92), N('esp', 'Spain', 93), N('ger', 'Germany', 90),
  N('por', 'Portugal', 90), N('ned', 'Netherlands', 89), N('bel', 'Belgium', 86), N('ita', 'Italy', 87), N('cro', 'Croatia', 84), N('uru', 'Uruguay', 84),
  N('col', 'Colombia', 82), N('mar', 'Morocco', 82), N('usa', 'United States', 79), N('mex', 'Mexico', 79), N('jpn', 'Japan', 80), N('sui', 'Switzerland', 80),
  N('den', 'Denmark', 80), N('sen', 'Senegal', 79), N('kor', 'South Korea', 77), N('aut', 'Austria', 78), N('ecu', 'Ecuador', 76), N('swe', 'Sweden', 75),
  N('nor', 'Norway', 76), N('pol', 'Poland', 74), N('ser', 'Serbia', 74), N('tur', 'Türkiye', 76), N('ukr', 'Ukraine', 74), N('aus', 'Australia', 72),
  N('nga', 'Nigeria', 73), N('egy', 'Egypt', 71), N('civ', "Côte d'Ivoire", 74), N('irn', 'Iran', 71), N('can', 'Canada', 72), N('sco', 'Scotland', 70),
  N('wal', 'Wales', 68), N('gha', 'Ghana', 69), N('cmr', 'Cameroon', 69), N('per', 'Peru', 68), N('chi', 'Chile', 69), N('par', 'Paraguay', 70),
  N('alg', 'Algeria', 70), N('tun', 'Tunisia', 67), N('qat', 'Qatar', 62), N('nzl', 'New Zealand', 58), N('crc', 'Costa Rica', 63), N('irl', 'Ireland', 67),
];
/** You are called up when your 28-day average real radar reaches the nation's bar: 8 for the weakest, about 18 for the strongest. */
export const nationBar = (strength: number) => 8 + ((strength - 40) * 10) / 55;
export const calledUp = (avg28: number, strength: number) => avg28 >= nationBar(strength);

export interface WorldCupPlan { groups: string[][]; days: { day: number; label: string; matches: [string, string][] }[] }
/** 16 groups of three; group day 1 plays the first-listed nation twice, day 2 the other two. Then five knockout days. */
export function worldCupGroups(nations: NationDef[], r: () => number, own?: string): WorldCupPlan {
  const ids = shuffle(r, nations.map((n) => n.id));
  if (own && ids.includes(own)) { ids.splice(ids.indexOf(own), 1); ids.unshift(own); }
  const groups: string[][] = [];
  for (let g = 0; g < 16; g++) groups.push([ids[g], ids[16 + g], ids[32 + g]]);
  const day1: [string, string][] = [], day2: [string, string][] = [];
  for (const [a, b, c] of groups) { day1.push([a, b], [a, c]); day2.push([b, c]); }
  return {
    groups,
    days: [
      { day: 1, label: 'Group day 1 (double-header)', matches: day1 },
      { day: 2, label: 'Group day 2', matches: day2 },
      ...['Last 32', 'Last 16', 'Quarter-final', 'Semi-final', 'Final'].map((label, i) => ({ day: 3 + i, label, matches: [] as [string, string][] })),
    ],
  };
}

export type WcResult = 'W' | 'D' | 'L';
export interface WorldCupRun {
  /** Each group's nations, best first, once both group days are in. */
  tables: string[][];
  /** Knockout rounds played so far: day 3 is the last 32. */
  rounds: { day: number; label: string; ties: [string, string][]; winners: string[] }[];
  /** The ties for the next day still to play (empty after the final). */
  next: [string, string][];
  winner?: string;
}
const KO = ['Last 32', 'Last 16', 'Quarter-final', 'Semi-final', 'Final'];
/**
 * The whole tournament up to day `through`, deterministic from `seed`. `own(day, opp)` gives the result of a
 * match the player actually played for `ownId` (stored, from their side); every other match is drawn by strength.
 */
export function worldCupRun(plan: WorldCupPlan, nations: NationDef[], seed: string, through: number, ownId?: string, own: (day: number, opp: string) => WcResult | undefined = () => undefined): WorldCupRun {
  const str = new Map(nations.map((n) => [n.id, n.strength]));
  const sim = (day: number, a: string, b: string, knockout: boolean): WcResult => {
    if (a === ownId || b === ownId) {
      const r = own(day, a === ownId ? b : a);
      if (r) return a === ownId ? r : r === 'W' ? 'L' : r === 'L' ? 'W' : 'D';
    }
    const x = rng(hashSeed(seed, String(day), a, b))();
    const pa = (str.get(a) ?? 60) ** 3 / ((str.get(a) ?? 60) ** 3 + (str.get(b) ?? 60) ** 3);
    if (!knockout && x < 0.22) return 'D';
    const y = knockout ? x : (x - 0.22) / 0.78;
    return y < pa ? 'W' : 'L';
  };
  const out: WorldCupRun = { tables: [], rounds: [], next: [] };
  if (through < 2) return out;
  const pts = new Map<string, number>();
  for (const d of plan.days.slice(0, 2)) for (const [a, b] of d.matches) {
    const r = sim(d.day, a, b, false);
    pts.set(a, (pts.get(a) ?? 0) + (r === 'W' ? 3 : r === 'D' ? 1 : 0));
    pts.set(b, (pts.get(b) ?? 0) + (r === 'L' ? 3 : r === 'D' ? 1 : 0));
  }
  out.tables = plan.groups.map((g) => [...g].sort((a, b) => (pts.get(b) ?? 0) - (pts.get(a) ?? 0) || (str.get(b) ?? 0) - (str.get(a) ?? 0)));
  // Last 32: each group winner meets the runner-up of the group across the draw.
  let ties: [string, string][] = out.tables.map((t, g) => [t[0], out.tables[15 - g][1]]);
  for (let i = 0; i < KO.length; i++) {
    const day = 3 + i;
    if (day > through) { out.next = ties; return out; }
    const winners = ties.map(([a, b]) => (sim(day, a, b, true) === 'L' ? b : a));
    out.rounds.push({ day, label: KO[i], ties, winners });
    ties = [];
    for (let k = 0; k + 1 < winners.length; k += 2) ties.push([winners[k], winners[k + 1]]);
  }
  out.winner = out.rounds[out.rounds.length - 1].winners[0];
  return out;
}
