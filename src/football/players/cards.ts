// The card is the player (spec §4, §16): its frame is the tier, its marks the step. Both stay at the best ever reached.
import { daysBetween, type DayKey } from '../../domain/dates';
import { CARD_TIERS, type CardMoment, type CardStep, type CardTier, type CardVersion, type FbPlayer } from './types';

/** Lowest overall of each tier. */
export const TIER_FLOOR: Record<CardTier, number> = { bronze: 0, silver: 60, gold: 70, prism: 80, icon: 90, legend: 95 };
/** Where each step starts, per tier (spec §16): three a tier, Icon two, Legend one. */
export const STEP_FLOORS: Record<CardTier, number[]> = {
  bronze: [0, 50, 55],
  silver: [60, 64, 67],
  gold: [70, 74, 77],
  prism: [80, 84, 87],
  icon: [90, 93],
  legend: [95],
};
export const TIER_NAME: Record<CardTier, string> = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', prism: 'Prism', icon: 'Icon', legend: 'Legend' };
const ROMAN = ['I', 'II', 'III'];

export function tierOf(overall: number): CardTier {
  let t: CardTier = 'bronze';
  for (const x of CARD_TIERS) if (overall >= TIER_FLOOR[x]) t = x;
  return t;
}
export function stepOf(overall: number): CardStep {
  const tier = tierOf(overall);
  const floors = STEP_FLOORS[tier];
  let step = 1;
  floors.forEach((f, i) => { if (overall >= f) step = i + 1; });
  return { tier, step };
}
/**
 * The top tiers need time held (owner, 9 Nov: "a varied pace"). The number stays honest to the logs; only the frame waits.
 * Icon needs 8 weeks of the player's history and 90+. Legend needs 12 weeks of history and 95+ held 28 days in a row.
 * Until then the card shows the tier below at its top step.
 */
export const ICON_DAYS = 8 * 7;
export const LEGEND_DAYS = 12 * 7;
export const LEGEND_HOLD = 28;
export interface TierGate { signed: DayKey; at95Since?: DayKey }
export function gatedStep(overall: number, on: DayKey, g: TierGate): CardStep {
  const s = stepOf(overall);
  const history = daysBetween(g.signed, on) + 1;
  const held = g.at95Since ? daysBetween(g.at95Since, on) + 1 : 0;
  if (s.tier === 'legend' && (history < LEGEND_DAYS || held < LEGEND_HOLD)) return history < ICON_DAYS ? { tier: 'prism', step: 3 } : { tier: 'icon', step: 2 };
  if (s.tier === 'icon' && history < ICON_DAYS) return { tier: 'prism', step: 3 };
  return s;
}
/** The first day of the current run at 95+ (undefined when below 95): Legend's 28-day hold counts from it. */
export const at95After = (since: DayKey | undefined, overall: number, on: DayKey) => (overall >= TIER_FLOOR.legend ? since ?? on : undefined);

/** One number per card step, so two steps compare simply. */
export const rankOf = (c: CardStep) => {
  let n = 0;
  for (const t of CARD_TIERS) { if (t === c.tier) return n + c.step; n += STEP_FLOORS[t].length; }
  return n;
};
/** "Gold II"; Legend has one step, so it is just "Legend". */
export const stepName = (c: CardStep) => (STEP_FLOORS[c.tier].length === 1 ? TIER_NAME[c.tier] : `${TIER_NAME[c.tier]} ${ROMAN[c.step - 1]}`);
/** The overall range a step covers, e.g. "74–76", "95+". */
export function stepRange(c: CardStep): string {
  const floors = STEP_FLOORS[c.tier];
  const lo = floors[c.step - 1];
  const next = floors[c.step] ?? (c.tier === 'legend' ? undefined : STEP_FLOORS[CARD_TIERS[CARD_TIERS.indexOf(c.tier) + 1]][0]);
  if (next === undefined) return `${lo}+`;
  return lo === 0 ? `up to ${next - 1}` : `${lo}–${next - 1}`;
}

/**
 * A day's overall against the card. The card only ever moves up: tier and step stay at the best ever,
 * only the number can drop. A move up adds a version to the card's history and a moment to play on a tap.
 */
export function cardAfter(p: Pick<FbPlayer, 'card' | 'best' | 'bestOn' | 'versions' | 'moments'>, overall: number, on: DayKey, quiet = false, gate?: TierGate): Pick<FbPlayer, 'card' | 'best' | 'bestOn' | 'versions' | 'moments'> {
  const best = overall > p.best ? overall : p.best;
  const bestOn = overall > p.best ? on : p.bestOn;
  const now = gate ? gatedStep(overall, on, gate) : stepOf(overall);
  if (rankOf(now) <= rankOf(p.card)) return { card: p.card, best, bestOn, versions: p.versions, moments: p.moments };
  const version: CardVersion = { ...now, on, overall };
  const moment: CardMoment = { ...now, on, overall, from: p.card, kind: now.tier !== p.card.tier ? 'tier' : 'step', ...(quiet ? { seen: true } : {}) };
  return { card: now, best, bestOn, versions: [...p.versions, version], moments: [...p.moments, moment] };
}
/** The card a brand-new player starts with: its first day's step, one version, no moment. */
export function firstCard(overall: number, on: DayKey, signed: DayKey = on): Pick<FbPlayer, 'card' | 'best' | 'bestOn' | 'versions' | 'moments'> {
  const card = gatedStep(overall, on, { signed, at95Since: overall >= TIER_FLOOR.legend ? on : undefined });
  return { card, best: overall, bestOn: on, versions: [{ ...card, on, overall }], moments: [] };
}
/** The CSS rarity class the card art uses: r1 Bronze … r5 Icon, Legend draws on the Icon frame with its own look. */
export const rarityClass = (t: CardTier) => (t === 'legend' ? 'r5 lgD' : `r${CARD_TIERS.indexOf(t) + 1}`);
