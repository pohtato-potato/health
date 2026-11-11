// The twelve cups (spec §9, rewritten 11 Nov). Winning a cup opens the next; each adds one twist and keeps the earlier
// ones. Each has its own colour and silverware. Opponents come from the cup's country or competition where the club
// data allows (`from`), and the cup's strength band sets how hard each stop plays (tuned by the run simulation).
import type { ClubDef } from '../data/load';

export type Silverware = 'shield' | 'cup' | 'lantern' | 'plate' | 'ewer' | 'ears' | 'tall' | 'globe';

export interface CupDef {
  n: number; name: string; made: boolean; colour: string; silver: Silverware;
  /** The twist this cup adds (the earlier ones still apply). */
  twist: string;
  /** Who you meet: countries (league `country`), or a competition rule. */
  from: (c: ClubDef & { abroad?: boolean }) => boolean;
  /** Where the club data falls short, said plainly. */
  note?: string;
  /** The strength a match plays at, from the first row to the last (a club rating, 30 to 96). */
  band: [number, number];
}

const country = (...cs: string[]) => (c: ClubDef) => cs.includes(c.country);

export const CUPS: CupDef[] = [
  { n: 1, name: 'The Scheldt Shield', made: true, colour: '#e9a46a', silver: 'shield', twist: 'None', from: country('BE', 'NL'), band: [30, 46],
    note: 'Belgian and Dutch clubs; with only a dozen in the data, the draw repeats them across runs.' },
  { n: 2, name: 'Coupe de Belgique', made: false, colour: '#f08fa4', silver: 'cup', twist: 'Elite clubs have 15% more defence', from: country('BE'), band: [34, 52],
    note: 'Only eight Belgian clubs exist in the data, so the draw also takes the Old Selves and clubs from Brabo\'s own division.' },
  { n: 3, name: 'The Lowlands Lantern', made: true, colour: '#ffb35c', silver: 'lantern', twist: 'Rest stops recover 20%, not 30%', from: country('BE', 'NL', 'LU', ''), band: [38, 56] },
  { n: 4, name: 'Coppa Italia', made: false, colour: '#8fc9b0', silver: 'cup', twist: 'One more hopeful punt in your deck', from: country('IT'), band: [42, 62] },
  { n: 5, name: 'The North Sea Cup', made: true, colour: '#8fb3f0', silver: 'plate', twist: 'Matches pay 7 coins, not 10', from: country('EN', 'SC', 'NL', 'BE', 'NO', 'DK', 'DE'), band: [46, 66] },
  { n: 6, name: 'DFB-Pokal', made: false, colour: '#f5d76e', silver: 'ewer', twist: 'Every club\'s attack +1', from: country('DE', 'AT'), band: [50, 70] },
  { n: 7, name: 'Copa del Rey', made: false, colour: '#b7a6f0', silver: 'cup', twist: 'You start at 50 fitness', from: country('ES'), band: [54, 74] },
  { n: 8, name: 'The FA Cup', made: false, colour: '#d9e8f3', silver: 'ears', twist: 'A second elite club guards the final', from: country('EN', 'WA'), band: [58, 78] },
  { n: 9, name: 'The Conference League', made: false, colour: '#5fe0c0', silver: 'plate', twist: 'Card choices after a win drop to two',
    from: (c) => (c.tier >= 3 && c.tier <= 5 && c.kind !== 'own') || (!!c.abroad && (c.rating ?? 0) <= 76), band: [60, 80] },
  { n: 10, name: 'The Europa League', made: false, colour: '#ff9a76', silver: 'tall', twist: 'The stall sells one item fewer',
    from: (c) => c.tier === 2 || c.tier === 3 || (!!c.abroad && c.id.startsWith('ct-')), band: [64, 84] },
  { n: 11, name: 'The Champions League', made: false, colour: '#ffffff', silver: 'ears', twist: 'Two finals, back to back',
    from: (c) => c.tier <= 2 || (!!c.abroad && c.id.startsWith('ct-') && (c.rating ?? 0) >= 78), band: [66, 86] },
  { n: 12, name: 'The Club World Cup', made: false, colour: '#ffd56a', silver: 'globe', twist: 'Every opponent is an elite club',
    from: (c) => c.tier === 1 || (!!c.abroad && c.id.startsWith('cw-')), band: [58, 76],
    note: 'Only the eight giants have signature moves; the other elite clubs here play without one.' },
];

/** The twists in force for a cup: its own and every earlier one. */
export function twists(n: number) {
  return {
    eliteLine: n >= 2 ? 1.15 : 1,
    restShare: n >= 3 ? 0.2 : 0.3,
    extraPunt: n >= 4,
    winCoins: n >= 5 ? 7 : 10,
    threatPlus: n >= 6 ? 1 : 0,
    fitness: n >= 7 ? 50 : 60,
    finalGuard: n >= 8,
    choices: n >= 9 ? 2 : 3,
    stallLess: n >= 10 ? 1 : 0,
    twoFinals: n >= 11,
    allElite: n >= 12,
  };
}
export const cupByN = (n: number) => CUPS[Math.min(CUPS.length, Math.max(1, n)) - 1];
