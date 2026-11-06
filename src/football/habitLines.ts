// The one-line football notes on Train, Walk, You and the weekly story. Pure: the screens pass the numbers in.
import { paceFromSteps } from './axes';
import type { StoredMatch } from './store/tables';

/** How many more steps lift tonight's Pace by one, and to what. Null once Pace is at 20. */
export function paceNext(steps: number): { more: number; to: number } | null {
  const now = paceFromSteps(steps);
  if (now >= 20) return null;
  for (let s = Math.floor(steps / 50) * 50 + 50; s <= 20000; s += 50) {
    const v = paceFromSteps(s);
    if (v > now) return { more: s - steps, to: v };
  }
  return null;
}

export const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th')}`;

/** "This week: 3 won, 2 drawn, 2 lost. Up to 4th." `before` and `after` are league positions; either may be missing. */
export function weekRecap(ms: StoredMatch[], before?: number, after?: number): string {
  const n = (r: 'W' | 'D' | 'L') => ms.filter((m) => m.result === r).length;
  const head = `This week: ${n('W')} won, ${n('D')} drawn, ${n('L')} lost.`;
  if (!after) return head;
  if (!before || before === after) return `${head} Still ${ordinal(after)}.`;
  return `${head} ${after < before ? 'Up' : 'Down'} to ${ordinal(after)}.`;
}
