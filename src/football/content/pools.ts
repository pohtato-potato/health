// Running low (spec §16): every limited pool tracks how much of it has been collected. At 80–85%
// the app shows one notice, once per pool size, saying it's time to ask Claude for more content.
import { ALBUM_CARDS } from './album';
import { LOANS } from './loans';
import { BOONS, BOUNTIES } from './season';
import type { PoolSize } from './types';

export const POOLS: PoolSize[] = [
  { pool: 'loans', size: LOANS.length, unit: 'loan players met' },
  { pool: 'album', size: ALBUM_CARDS.length, unit: 'album cards found' },
  { pool: 'boons', size: BOONS.length, unit: 'boons picked' },
  { pool: 'bounties', size: BOUNTIES.length, unit: 'bounties done at least once' },
];
/**
 * The notice shows once a pool reaches 80% collected, and not again until the pool grows. With these
 * pool sizes the crossing step always lands between 80% and 85%; a pack that jumps past 85% still shows it.
 */
export const RUNNING_LOW_AT = 0.8;

/** True when the notice should show: at least 80% collected, and not yet shown for this pool size. */
export function runningLow(collected: number, size: number, shownForSize?: number): boolean {
  if (!size || shownForSize === size) return false;
  return collected / size >= RUNNING_LOW_AT;
}
