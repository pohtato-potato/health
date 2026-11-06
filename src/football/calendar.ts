// The 42-day season (spec §9.2) and the league fixtures.
import { rng, shuffle } from './rng';

export type DayKind = 'league' | 'bigcup' | 'tiercup' | 'finals1' | 'finals2' | 'event';
export interface DayPlan { day: number; kind: DayKind; matchday?: number; round?: string; double?: boolean; window?: boolean; event?: string }

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
    else out.push({ day, kind: 'league', matchday: ++md, window });
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
