// Kits (spec §8.8): the launch-day catalogue, the data kit, the anniversary kit and the one-night patch.
import { BRABO_KITS, type KitDef, type Pattern, type SponsorStyle } from './art/kit';
import type { CrestOptKey, CrestStep } from './art/crest';
import type { Result, Tier } from './types';

const OR = '#ff7a1a', PU = '#6c3fc4', BK = '#141414', WH = '#f3eee6';
export type KitSlot = 'home' | 'away' | 'third';
export interface KitEntry { id: string; slot: KitSlot; name: string; kit: KitDef }

const K = (base: string, pattern: Pattern, o: Partial<KitDef> = {}): KitDef =>
  ({ base, pattern, a: BK, b: PU, collar: 'crew', collarC: BK, cuff: PU, ink: WH, sp: 'A', numEdge: BK, ...o });

/** The kit maker's designs, from the round-4 picker board (H1–H6, A1–A6, T1–T6). */
export const CATALOGUE: KitEntry[] = [
  { id: 'H1', slot: 'home', name: 'Black sleeves', kit: K(OR, 'plain', { sleeve: BK, side: PU }) },
  { id: 'H2', slot: 'home', name: 'Shoulder print', kit: K(OR, 'geo', { a: BK, b: PU, collar: 'polo', backPattern: 'plain' }) },
  { id: 'H3', slot: 'home', name: 'Black pinstripes', kit: K(OR, 'pin', { a: BK, collar: 'v', cuff: BK }) },
  { id: 'H4', slot: 'home', name: 'Chest band', kit: K(OR, 'hoop1', { a: PU, b: BK, collar: 'v', backPattern: 'plain' }) },
  { id: 'H5', slot: 'home', name: 'Black yoke', kit: K(OR, 'yoke', { a: BK, b: PU, cuff: BK }) },
  { id: 'H6', slot: 'home', name: 'Fade to black', kit: K(OR, 'fade', { a: BK, collarC: PU, cuff: PU }) },
  { id: 'A1', slot: 'away', name: 'Orange pinstripes', kit: K(BK, 'pinsparse', { a: OR, collar: 'v', collarC: OR, cuff: OR, side: OR }) },
  { id: 'A2', slot: 'away', name: 'Purple, orange sash', kit: K(PU, 'sash', { a: OR, b: BK, collar: 'polo', collarC: OR, cuff: OR, numEdge: undefined, backPattern: 'plain' }) },
  { id: 'A3', slot: 'away', name: 'Black, orange band', kit: K(BK, 'hoop1', { a: OR, b: PU, collarC: OR, cuff: OR, backPattern: 'plain' }) },
  { id: 'A4', slot: 'away', name: 'Purple sleeves', kit: K(BK, 'plain', { sleeve: PU, cuff: OR, collarC: OR, side: OR }) },
  { id: 'A5', slot: 'away', name: 'Tonal stripes', kit: K(BK, 'tonal', { collar: 'wrap', collarC: OR, cuff: OR }) },
  { id: 'A6', slot: 'away', name: 'Purple, black chevron', kit: K(PU, 'chevron', { a: BK, collarC: OR, cuff: BK, numEdge: undefined, backPattern: 'plain' }) },
  { id: 'T1', slot: 'third', name: 'Purple, two bands', kit: K(PU, 'bands', { a: OR, collarC: OR, cuff: BK, side: BK, numEdge: undefined }) },
  { id: 'T2', slot: 'third', name: 'Black hoops', kit: K(BK, 'hoops', { a: OR, b: PU, collarC: PU, cuff: OR }) },
  { id: 'T3', slot: 'third', name: 'Purple river wave', kit: K(PU, 'wave', { a: OR, b: '#4c2a8e', collarC: OR, cuff: OR, numEdge: undefined, backPattern: 'plain' }) },
  { id: 'T4', slot: 'third', name: 'Purple and black halves', kit: K(PU, 'halves', { a: BK, collarC: OR, cuff: OR, numEdge: undefined }) },
  { id: 'T5', slot: 'third', name: 'Black, bold stripes', kit: K(BK, 'stripes', { a: PU, collarC: OR, cuff: OR }) },
  { id: 'T6', slot: 'third', name: 'Purple fade', kit: K(PU, 'fade', { a: BK, collar: 'v', collarC: OR, cuff: OR, numEdge: undefined }) },
];
export const SPONSOR_STYLES: { id: SponsorStyle; name: string }[] = [
  { id: 'A', name: 'Wordmark' }, { id: 'B', name: 'Badge' }, { id: 'C', name: 'Script' }, { id: 'R', name: 'Block' },
];
/** The founding shirts (first run) are board 9's direction A. */
export const FIRST_KITS: Record<string, KitDef> = { A1: BRABO_KITS.A[0], A2: BRABO_KITS.A[1], A3: BRABO_KITS.A[2] };

/** The third kit unlocks in Division Four. */
export const slotsOpen = (tier: Tier): KitSlot[] => (tier <= 4 ? ['home', 'away', 'third'] : ['home', 'away']);
export const isAnniversary = (season: number) => season > 0 && season % 5 === 0;

export interface Week { avg: number; result: Result; numbers: string }
const TONE: Record<Result, string> = { W: OR, D: PU, L: BK };
/** The data kit: six stripes, one per week of last season. Width is the week's average radar, tone its result. */
export function dataKit(weeks: Week[]): { kit: KitDef; collar: string } {
  const six = weeks.slice(0, 6);
  const total = six.reduce((t, w) => t + Math.max(1, w.avg), 0) || 1;
  const stripes = six.map((w) => [TONE[w.result], (96 * Math.max(1, w.avg)) / total, w.result === 'L'] as [string, number, boolean]);
  return { kit: K(BK, 'weeks', { a: stripes, collarC: OR, cuff: OR }), collar: six.map((w) => w.numbers).join(' ') };
}
/** A season's six weeks from its matches: the average radar and the week's result. */
export function weeksOf(matches: { day: number; values: Record<string, number>; result: Result; comp: string }[]): Week[] {
  return Array.from({ length: 6 }, (_, w) => {
    const ms = matches.filter((m) => m.day > w * 7 && m.day <= (w + 1) * 7 && m.comp !== 'friendly');
    const vals = ms.map((m) => Object.values(m.values).reduce((a, b) => a + b, 0) / 6);
    const avg = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : 0;
    const won = ms.filter((m) => m.result === 'W').length, lost = ms.filter((m) => m.result === 'L').length;
    return { avg, result: won > lost ? 'W' : lost > won ? 'L' : 'D', numbers: avg.toFixed(1) };
  });
}
/** The anniversary kit, every fifth season: the old crests come back as bands. */
export function anniversaryKit(season: number): KitDef | null {
  if (!isAnniversary(season)) return null;
  return K(OR, 'anniv', { a: [BK, PU, BK], collarC: BK, cuff: BK, side: BK });
}
/** Launch day: the designs the kit maker offers for a slot. The data kit joins the third slot from season 2. */
export function launchOptions(slot: KitSlot, season: number): string[] {
  const base = CATALOGUE.filter((k) => k.slot === slot).map((k) => k.id);
  if (slot !== 'third') return base;
  return [...base, ...(season >= 2 ? ['DATA'] : []), ...(isAnniversary(season) ? ['ANNIV'] : [])];
}
/** The one-night patch: finals and derbies only. The text is the day of the month. */
export function patchFor(m: { derby?: boolean; round?: string; date: string }): { text: string } | undefined {
  const final = /(^|, )Final$|Playoff final/.test(m.round ?? '');
  return m.derby || final ? { text: String(Number(m.date.slice(8, 10))) } : undefined;
}

/** Crest level-ups: steps 2–5 come with promotion through Division Two. Step 1 offers nothing. */
export const crestStepFor = (tier: Tier): CrestStep => Math.min(5, Math.max(1, 7 - tier)) as CrestStep;
export function levelUpOptions(step: CrestStep): (CrestOptKey | 'keep')[] {
  return step <= 1 ? [] : ['a', 'b', 'c', 'd', 'e', 'keep'];
}
export const CREST_LINES: Record<CrestStep, string> = {
  1: 'The hand-me-down',
  2: 'Our own, roughly',
  3: 'A name and a year',
  4: 'The city joins in',
  5: 'The grown-up crest',
};
/** What each new crest step changes, said once on the level-up. */
export const CREST_CHANGES: Record<CrestStep, string> = {
  1: 'Paint over the landlords’ turret.',
  2: 'A single open hand, drawn plainly. No more paint over the landlords’ turret.',
  3: 'The club’s name and its founding year join the hand.',
  4: 'The river and the city’s skyline join in behind the hand.',
  5: 'A finished crest: shield, hand, river and the year, drawn with care.',
};
