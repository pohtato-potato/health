// Clubs play like themselves (spec §5): the six cup styles read from each club's league style, the eight giants'
// signature moves, and a club's line and threat from its rating. All giants are treated alike (owner, 11 Nov).
import { hashSeed } from '../rng';
import type { CupStyle, Signature, Side } from './types';

/** What a cup match needs to know about a club. Built from the league's own club data. */
export interface ClubSpec {
  id: string; name: string; short: string; rating: number; tier: number; style: CupStyle;
  elite?: Signature;
  /** Met in the league (spec §5.3): intentions two spells ahead and penalty habits on show. */
  scouted: boolean;
  colours: string[];
}

/** The league's eight styles onto the cup's six. Clubs without one of these get one from their id, for good. */
const FROM_LEAGUE: Record<string, CupStyle> = {
  'low-block': 'deep', counter: 'deep', press: 'press', possession: 'keep', direct: 'direct', flair: 'wide', grit: 'setpiece',
};
const ALL: CupStyle[] = ['deep', 'press', 'keep', 'direct', 'wide', 'setpiece'];
export const cupStyleOf = (style: string, id: string): CupStyle => FROM_LEAGUE[style] ?? ALL[hashSeed('cup-style', id) % ALL.length];

export const STYLE_NAME: Record<CupStyle, string> = {
  deep: 'Sits deep', press: 'Presses', keep: 'Keeps the ball', direct: 'Direct', wide: 'Wide', setpiece: 'Set-piece side',
};
export const STYLE_TEXT: Record<CupStyle, string> = {
  deep: 'A high line and a low threat. When your move breaks down, their next attack grows by your build-up.',
  press: 'Every recycle you make adds 1 to this spell\'s threat.',
  keep: 'You draw four cards a spell, not five.',
  direct: 'No attack in odd spells, a big one in even spells.',
  wide: 'Strong through the middle: their line is 25% lower against a move with a carry.',
  setpiece: 'Every attack that costs you fitness adds 2 to their next one.',
};
/** The kind of attack shown with each intention. */
export const ATTACK_KIND: Record<CupStyle, string[]> = {
  deep: ['Counter', 'Long ball', 'Break'],
  press: ['High press', 'Turnover', 'Swarm'],
  keep: ['Slow build', 'Through the middle', 'Probe'],
  direct: ['Long ball', 'Knock-down', 'Route one'],
  wide: ['Cross', 'Down the wing', 'Cut-back'],
  setpiece: ['Corner', 'Free kick', 'Long throw'],
};

/** The giants and their signature moves (spec §5.2). Ids are the league data's. */
export const SIGNATURE_OF: Record<string, Signature> = {
  atm: 'bus', bar: 'rondo', liv: 'metal', bay: 'machine', lee: 'murderball', rma: 'comeback', mci: 'control', juv: 'oldlady',
};
export const SIGNATURE: Record<Signature, { name: string; text: string }> = {
  bus: { name: 'The bus', text: 'Their line is 50% higher in spells five and six.' },
  rondo: { name: 'The rondo', text: 'Each spell they take the best pass from your hand.' },
  metal: { name: 'Heavy metal', text: 'An attack every spell, growing by 2 each time.' },
  machine: { name: 'The machine', text: 'Their line re-forms 80% stronger after a goal, not 60%.' },
  murderball: { name: 'Murderball', text: 'Fitness you lose against them is doubled.' },
  comeback: { name: 'The comeback', text: 'If they are behind in spell six, they attack twice.' },
  control: { name: 'Control', text: 'Your build-up starts each spell at ×0.5.' },
  oldlady: { name: 'The old lady', text: 'Your first goal is checked: it stands only if the chance beat the line by 3.' },
};

export function clubSpec(c: { id: string; name: string; short: string; rating: number | null; tier: number; style: string; colours: string[] }, scouted: boolean): ClubSpec {
  return {
    id: c.id, name: c.name, short: c.short, rating: c.rating ?? 50, tier: c.tier, style: cupStyleOf(c.style, c.id),
    elite: SIGNATURE_OF[c.id], scouted, colours: c.colours,
  };
}

/** A club's numbers from its rating (tuned by the simulation). Ratings run about 30 (Division Six) to 96. */
export const CLUB_TUNE = {
  line0: 10, linePer: 0.7,
  threat0: 6, threatPer: 0.15,
  /** Each spell's attack is the base times a draw between these. */
  spread: [0.5, 1.7] as [number, number],
  /** Sits deep: line and threat. */
  deepLine: 1.25, deepThreat: 0.7,
  /** Direct: the even-spell attack. */
  directBig: 2,
};
export const baseLine = (rating: number, style: CupStyle) => Math.round((CLUB_TUNE.line0 + CLUB_TUNE.linePer * (rating - 30)) * (style === 'deep' ? CLUB_TUNE.deepLine : 1));
export const baseThreat = (rating: number, style: CupStyle) => (CLUB_TUNE.threat0 + CLUB_TUNE.threatPer * (rating - 30)) * (style === 'deep' ? CLUB_TUNE.deepThreat : 1);

/** Penalty habits (spec §4.6): where the keeper dives and where the takers aim, as weights left, centre, right. */
export function habitsOf(id: string): { keeper: [number, number, number]; takers: [number, number, number] } {
  const h = hashSeed('cup-pens', id);
  const pick = (k: number): [number, number, number] => {
    const lean = (k % 3) as 0 | 1 | 2;
    const w: [number, number, number] = [0.4, 0.2, 0.4];
    // Each habit leans on one side; a keeper rarely stays in the middle.
    if (lean === 0) return [0.55, 0.15, 0.3];
    if (lean === 2) return [0.3, 0.15, 0.55];
    return w;
  };
  return { keeper: pick(h), takers: pick(h >>> 4) };
}
export const SIDE_WORD: Record<Side, string> = { left: 'left', centre: 'the middle', right: 'right' };
