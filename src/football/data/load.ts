// Typed access to the generated league data, plus the private youth entries when present.
import league from './league.json';
import type { Axis, AxisValues, Tier } from '../types';

export type When = string; // 'always' | 'home' | 'away' | 'first-15' | 'after-70' | 'home-first-20' | 'level' | 'cup' | …
export interface AbilityFx { when: When; mods: { axis: Axis; d: number }[]; reach: number; all?: number; cond?: string; side?: 'atk' | 'def' }
export interface AbilityDef { name: string; text: string; trigger: string; data: boolean; fx: AbilityFx | null; special?: boolean }
export type ClubKind = 'own' | 'real' | 'quirky' | 'old';
export interface ClubDef {
  id: string; name: string; short: string; nickname: string; city: string; country: string; founded: string | number;
  ground: string; colours: string[]; crest: string; tier: Tier; rating: number | null; elite: boolean; style: string;
  kind: ClubKind; lore: string; sponsor: string; kitMaker: string; sponsorReal: boolean; kitReal: boolean;
  known: AbilityDef[]; hidden?: AbilityDef; shrinks: Partial<AxisValues>; presses: Partial<AxisValues>;
}
export interface YouthDef { name: string; age: number; axis: Axis; potential: 3 | 4 | 5; what: string; kind: 'habit' | 'exercise' }
export interface StyleDef { atk: number[]; def: number[]; split: number; say: string }

export const LEAGUE = league;
export const CLUBS = league.clubs as unknown as ClubDef[];
export const STYLES = league.styles as unknown as Record<string, StyleDef>;
export const TIER_NAMES = league.tierNames as Record<string, string>;
export const TIER_BANDS = league.tierBands as unknown as Record<string, [number, number]>;

const priv = import.meta.glob('/private/football-youth.json', { eager: true, import: 'default' }) as Record<string, YouthDef[]>;
export const YOUTH_POOL: YouthDef[] = [...(league.youth as unknown as YouthDef[]), ...Object.values(priv).flat()];

const byId = new Map(CLUBS.map((c) => [c.id, c]));
const named = new Map<string, ClubDef>();
/** Old-self clubs take their names from the save (built from the owner's past months), not the placeholder in league.json. */
export function rememberClubs(clubs: { id: string; old?: { name: string; nickname: string } }[]) {
  for (const c of clubs) {
    const def = byId.get(c.id);
    if (def && c.old) named.set(c.id, { ...def, name: c.old.name, nickname: c.old.nickname });
    else named.delete(c.id);
  }
}
export function clubById(id: string): ClubDef {
  const c = named.get(id) ?? byId.get(id);
  if (!c) throw new Error(`unknown club ${id}`);
  return c;
}
export const tierName = (t: Tier) => TIER_NAMES[String(t)];
