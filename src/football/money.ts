// Money and sponsors (spec §8.6). Amounts are in millions.
import { LEAGUE } from './data/load';
import { shuffle } from './rng';
import type { Tier } from './types';

interface IncomeRow { tv: number; gate: number; shirt: [number, number]; kit: [number, number]; prize: string }
const INCOME = LEAGUE.income as unknown as Record<string, IncomeRow>;
export type Risk = 'stable' | 'flashy' | 'dodgy';
export type Slot = 'shirt' | 'kit' | 'sleeve' | 'ground' | 'partner';
export interface Offer { brand: string; what: string; risk: Risk; slot: Slot; perSeason: number; seasons: 1 | 2 | 3; line: string; real?: boolean }

/** Prize money: per place from the bottom, plus title or promotion money. */
export function prize(tier: Tier, position: number, promoted: boolean): number {
  const p = INCOME[String(tier)].prize;
  const per = Number(p.match(/([\d.]+) per/)?.[1] ?? 0);
  const bonus = Number(p.match(/\+([\d.]+)/)?.[1] ?? 0);
  const fromBottom = 19 - position;
  const titleOrUp = tier === 1 ? position === 1 : promoted;
  return per * fromBottom + (titleOrUp ? bonus : 0);
}
/** A season's income: TV, gate (scaled by capacity), the sponsors, prize money. */
export function incomeFor(tier: Tier, position: number, promoted: boolean, sponsors: number, capacityShare = 1): number {
  const row = INCOME[String(tier)];
  return Math.round((row.tv + row.gate * capacityShare + sponsors + prize(tier, position, promoted)) * 1000) / 1000;
}
const BANNED = /betting|bet\b|casino|alcohol|beer|brewery|vodka|wine|spirits/i;
/** Two or three offers for a slot from brands whose tiers cover yours; real brands only from Division Three up. */
export function offers(slot: Slot, tier: Tier, r: () => number): Offer[] {
  const row = INCOME[String(tier)];
  const range = slot === 'kit' ? row.kit : row.shirt;
  const pool = (LEAGUE.sponsors as { name: string; what: string; tiers: number[]; risk: Risk; line: string }[])
    .filter((s) => tier >= s.tiers[0] && tier <= s.tiers[s.tiers.length - 1] && !BANNED.test(s.what) && !BANNED.test(s.name));
  const n = 2 + (r() < 0.5 ? 1 : 0);
  const out: Offer[] = shuffle(r, pool).slice(0, n).map((s) => {
    const k = s.risk === 'stable' ? 0.2 : s.risk === 'flashy' ? 0.55 : 0.95;
    return { brand: s.name, what: s.what, risk: s.risk, slot, perSeason: Math.round((range[0] + (range[1] - range[0]) * k) * 1000) / 1000, seasons: (1 + Math.floor(r() * 3)) as 1 | 2 | 3, line: s.line };
  });
  if (tier <= 3 && r() < 0.5) {
    const brand = shuffle(r, LEAGUE.realOfferBrands as string[])[0];
    out.push({ brand, what: 'brand', risk: 'stable', slot, perSeason: range[1], seasons: 2, line: 'A name you know.', real: true });
  }
  return out;
}
/**
 * The sponsor slots that take offers. Sleeve opens at stage 4; the kit maker's slot opens with the tree's Kit sponsor
 * (ledger O40: the tech said so and nothing read it); partners take up to three.
 */
const OPEN: { slot: Slot; from?: Tier }[] = [{ slot: 'shirt' }, { slot: 'kit' }, { slot: 'sleeve', from: 4 }, { slot: 'partner' }];
export const KIT_SPONSOR_TECH = 's-kitsponsor';
export function openOffers(signed: Pick<Offer, 'slot' | 'brand'>[], tier: Tier, kitSlot: boolean, r: () => number): Offer[] {
  const taken = new Set(signed.map((s) => s.slot));
  const partners = signed.filter((s) => s.slot === 'partner').length;
  const all = OPEN.filter((o) => (o.from === undefined || tier <= o.from) && (o.slot !== 'kit' || kitSlot) && (o.slot === 'partner' ? partners < 3 : !taken.has(o.slot)))
    .flatMap((o) => offers(o.slot, tier, r));
  return oneBrandEach(all, signed);
}
/** One brand, one place (finding 9, O42): a brand already signed is never offered, and a brand is offered in one slot only. */
export function oneBrandEach(list: Offer[], signed: Pick<Offer, 'brand'>[]): Offer[] {
  const seen = new Set(signed.map((s) => s.brand));
  return list.filter((o) => (seen.has(o.brand) ? false : (seen.add(o.brand), true)));
}
/** A quarter of a deal's first season is paid on signing (O41 letter A); the rest comes at the season's end. */
export const SIGNING_SHARE = 0.25;
/** Dodgy sponsors collapse 1 season in 4. */
export const dodgyCollapse = (r: () => number) => r() < 0.25;
/** Millions in words people read: €820k under a million, €1.25m above. */
export const euros = (m: number) => (Math.abs(m) >= 1 ? `€${m.toFixed(2)}m` : `€${Math.round(m * 1000)}k`);
