import { parseDay, type DayKey } from '../domain/dates';
import type { RouteRun } from '../domain/types';
import { kindOf, type Group, type RouteDef } from './catalogue';
import { placesFree } from './runs';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "aiming for 14 March" from today until the day itself; once it has passed, nothing. Never "behind". */
export function targetLine(target: DayKey | undefined, today: DayKey): string | undefined {
  if (!target || target < today) return undefined;
  const d = parseDay(target);
  return `aiming for ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/**
 * "Choose for me": a ready route you haven't joined, of a kind with a place free. Pinned routes first, in shelf
 * order; then the group you've finished most (the latest finish breaks a tie); then the shortest.
 */
export function chooseForMe(defs: RouteDef[], runs: RouteRun[], pinned: Set<string>, kmById: Map<string, number>): RouteDef | undefined {
  const free = placesFree(runs, kmById);
  const joined = new Set(runs.map((r) => r.id));
  const open = defs.filter((d) => d.ready && !joined.has(d.id) && free[kindOf(d)] > 0);
  const pin = open.find((d) => pinned.has(d.id));
  if (pin) return pin;
  const finished = runs.filter((r) => r.doneOn).map((r) => ({ group: defs.find((d) => d.id === r.id)?.group, on: r.doneOn! }));
  const score = new Map<Group, { n: number; last: DayKey }>();
  for (const f of finished) {
    if (!f.group) continue;
    const s = score.get(f.group) ?? { n: 0, last: '' };
    score.set(f.group, { n: s.n + 1, last: f.on > s.last ? f.on : s.last });
  }
  const best = [...score].sort((a, b) => b[1].n - a[1].n || b[1].last.localeCompare(a[1].last)).map(([g]) => g);
  const byLength = [...open].sort((a, b) => a.km - b.km);
  for (const g of best) {
    const r = byLength.find((d) => d.group === g);
    if (r) return r;
  }
  return byLength.find((d) => kindOf(d) === 'challenge') ?? byLength[0];
}
