// A small, made-up stand-in for LG-2's real clubs (ledger O38), in the shape LG-3 reads: { id, rating, style,
// division } with division null for the outside pool. 94 pyramid clubs spread evenly over 62–104, and 30 pool clubs
// below. Ids and ratings are invented; none of it is anyone's data.
import type { ClubDef } from '../../../src/football/data/load';
import type { PyramidSeed } from '../../../src/football/pyramid/world';

const STYLES = ['press', 'possession', 'low-block', 'direct', 'counter', 'grit'];
export const FIXTURE_PYRAMID: PyramidSeed[] = Array.from({ length: 94 }, (_, i) => ({
  id: `rc${String(i).padStart(2, '0')}`, rating: Math.round((104 - (42 * i) / 93) * 10) / 10, style: STYLES[i % 6], division: 1,
}));
export const FIXTURE_POOL: PyramidSeed[] = Array.from({ length: 30 }, (_, i) => ({
  id: `pc${String(i).padStart(2, '0')}`, rating: 64 - i * 0.5, style: STYLES[(i + 3) % 6], division: null,
}));
export const FIXTURE_SEEDS = [...FIXTURE_PYRAMID, ...FIXTURE_POOL];

/** The fixture clubs as the club registry needs them: plain, no abilities, nothing real. */
export const fixtureDefs = (): ClubDef[] => FIXTURE_SEEDS.map((c) => ({
  id: c.id, name: `Club ${c.id}`, short: c.id.toUpperCase(), nickname: '', city: '', country: 'xx', founded: '', ground: '', colours: ['#888888', '#222222'],
  crest: '', tier: 1, rating: c.rating, elite: false, style: c.style, kind: 'real', lore: '', sponsor: '', kitMaker: '', sponsorReal: false, kitReal: false,
  known: [], shrinks: {}, presses: {},
}));
