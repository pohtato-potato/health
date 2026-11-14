// The 42-day season (spec §9.2) and the league fixtures.
import { contNight, type ContNight } from './continental';
import { rng, shuffle } from './rng';

export type DayKind = 'league' | 'bigcup' | 'tiercup' | 'finals1' | 'finals2' | 'event';
export interface DayPlan {
  day: number; kind: DayKind; matchday?: number; round?: string; double?: boolean; window?: boolean; event?: string; cont?: ContNight;
  /** World 2: a Big Cup round played on a league night as the second match of a double-header. */
  cup?: string;
}

/** Big Cup rounds by day (two rounds on a double-header), and the tier cups. */
export const BIGCUP_DAYS: Record<number, string[]> = { 5: ['Last 128', 'Last 64'], 16: ['Last 32', 'Last 16'], 28: ['Quarter-final'], 34: ['Semi-final'], 41: ['Final'] };
export const TIERCUP_DAYS: Record<number, string[]> = { 10: ['Last 16', 'Quarter-final'], 22: ['Semi-final'], 42: ['Final'] };
export const SEASON_DAYS = 42;
export const WINDOW = [21, 22, 23];

export function seasonDays(): DayPlan[] {
  const out: DayPlan[] = [];
  let md = 0;
  for (let day = 1; day <= SEASON_DAYS; day++) {
    const window = WINDOW.includes(day) || undefined;
    if (day === 41) out.push({ day, kind: 'finals1', round: 'Playoff semi-finals and the Big Cup final', double: true });
    else if (day === 42) out.push({ day, kind: 'finals2', round: 'Playoff final, tier-cup final and awards night' });
    else if (BIGCUP_DAYS[day]) out.push({ day, kind: 'bigcup', round: BIGCUP_DAYS[day].join(' and '), double: BIGCUP_DAYS[day].length > 1 || undefined, window });
    else if (TIERCUP_DAYS[day]) out.push({ day, kind: 'tiercup', round: TIERCUP_DAYS[day].join(' and '), double: TIERCUP_DAYS[day].length > 1 || undefined, window });
    else out.push({ day, kind: 'league', matchday: ++md, window, ...(contNight(day) ? { cont: contNight(day) } : {}) });
  }
  return out;
}

/** Double round robin by the circle method: 34 rounds of 9 for 18 clubs. Pairs are [home, away]. */
export function leagueFixtures(clubIds: string[], seed: number): [string, string][][] {
  const ids = shuffle(rng(seed), clubIds);
  const n = ids.length;
  const first: [string, string][][] = [];
  const rot = ids.slice(1);
  for (let r = 0; r < n - 1; r++) {
    const round: [string, string][] = [];
    const ring = [ids[0], ...rot];
    for (let i = 0; i < n / 2; i++) {
      const a = ring[i], b = ring[n - 1 - i];
      round.push(r % 2 === 0 ? [a, b] : [b, a]);
    }
    first.push(round);
    rot.unshift(rot.pop()!);
  }
  return [...first, ...first.map((rd) => rd.map(([h, a]) => [a, h] as [string, string]))];
}

// ---- World 2 (league spec §6): 28 days, 22 league matchdays for 12 clubs ----
/**
 * Big Cup rounds by day. Days 7 and 19 are its own days; the first round and the semi-final ride on league nights
 * (spec §6 "earlier rounds are double-headers on league nights"; the builder's choice of §14); the final on day 27.
 */
export const BIGCUP_DAYS_2: Record<number, string[]> = { 3: ['Last 128'], 7: ['Last 64', 'Last 32'], 19: ['Last 16', 'Quarter-final'], 25: ['Semi-final'], 27: ['Final'] };
/** The pair cup (Brabo's division and the one above, 24 clubs): days 12 and 23, the final on day 28. */
export const PAIRCUP_DAYS: Record<number, string[]> = { 12: ['First round', 'Last 16'], 23: ['Quarter-final', 'Semi-final'], 28: ['Final'] };
export const SEASON_DAYS_2 = 28;
/** The transfer window, rescaled from days 21–23 of 42 to the same place in 28. */
export const WINDOW_2 = [14, 15, 16];

export function seasonDays2(): DayPlan[] {
  const out: DayPlan[] = [];
  let md = 0;
  for (let day = 1; day <= SEASON_DAYS_2; day++) {
    const window = WINDOW_2.includes(day) || undefined;
    const big = BIGCUP_DAYS_2[day];
    if (day === 27) out.push({ day, kind: 'finals1', round: 'Playoff semi-finals and the Big Cup final', double: true });
    else if (day === 28) out.push({ day, kind: 'finals2', round: 'Playoff final, pair-cup final and awards night' });
    else if (PAIRCUP_DAYS[day]) out.push({ day, kind: 'tiercup', round: PAIRCUP_DAYS[day].join(' and '), double: PAIRCUP_DAYS[day].length > 1 || undefined, window });
    else if (big && big.length > 1) out.push({ day, kind: 'bigcup', round: big.join(' and '), double: true, window });
    else {
      const cont = contNight(day, 2);
      out.push({ day, kind: 'league', matchday: ++md, window, ...(cont ? { cont } : {}), ...(big ? { cup: big[0] } : {}) });
    }
  }
  return out;
}
const DAYS_1 = seasonDays();
const DAYS_2 = seasonDays2();
/** The season's calendar for a world (absent or 1: the 42-day season). */
export const daysOf = (world: 1 | 2 = 1): DayPlan[] => (world === 2 ? DAYS_2 : DAYS_1);
export const seasonLength = (world: 1 | 2 = 1) => (world === 2 ? SEASON_DAYS_2 : SEASON_DAYS);
export const leagueMatchdays = (world: 1 | 2 = 1) => daysOf(world).filter((d) => d.kind === 'league').length;
