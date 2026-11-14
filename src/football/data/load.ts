// Typed access to the generated league data, plus the private youth entries when present.
import { NATIONS } from '../events';
import league from './league.json';
import { ABROAD } from './continental';
import { WORLD_CLUBS, type WorldClub } from './world';
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

const base = new Map([...CLUBS, ...ABROAD].map((c) => [c.id, c]));
/** Clubs registered by hand (tests, fixtures): they win over both worlds' data. */
const extra = new Map<string, ClubDef>();

// ---- World 2 (ledger O38, LG-4): the real clubs of world.json ----
/** The landlords (Berchem Sport) and the legend rival (Royal Antwerp) by role. */
export const RIVAL_2 = WORLD_CLUBS.find((c) => c.role === 'rival')!.id;
export const LANDLORDS_2 = WORLD_CLUBS.find((c) => c.role === 'landlords')!.id;
/** Brabo's rented ground in world 2: Berchem Sport's, until the move to Kaai 42. */
export const RENTED_GROUND_2 = 'Het Rooi';
/** A world.json club in the shape every screen and rule reads. Old ids keep their crest words and kit facts. */
export function worldDef(w: WorldClub): ClubDef {
  const old = base.get(w.id);
  return {
    id: w.id, name: w.name, short: w.short, nickname: w.nickname, city: w.city, country: w.country, founded: w.founded, ground: w.ground,
    colours: w.colours, crest: old?.crest ?? '', tier: (w.division ?? 9) as Tier, rating: w.rating, elite: old?.elite ?? false, style: w.style,
    kind: 'real', lore: w.lore.history, sponsor: old?.sponsor ?? '', kitMaker: old?.kitMaker ?? '', sponsorReal: old?.sponsorReal ?? false,
    kitReal: old?.kitReal ?? false, known: w.known, hidden: w.hidden, shrinks: w.shrinks, presses: w.presses,
  };
}
const w2 = new Map<string, ClubDef>(WORLD_CLUBS.map((w) => [w.id, worldDef(w)]));
// Brabo in world 2 rents Berchem Sport's ground (owner, 15 Nov), in place of Zurenborg Athletic's.
const own = base.get('bra');
if (own) w2.set('bra', { ...own, ground: `${RENTED_GROUND_2} (tenants of ${w2.get(LANDLORDS_2)!.name})`, lore: own.lore });

let current: 1 | 2 = 1;
/** The world whose clubs `clubById` reads: 1 (league.json) unless a world-2 save has been read. */
export const clubWorld = () => current;
/**
 * Switch the club registry between worlds. World 1 reads league.json and the clubs abroad exactly as before; world 2
 * reads world.json first, and league.json only for Brabo, the Old Selves and retired clubs named in old records.
 */
export function setClubWorld(v: 1 | 2) { current = v; }
/** A club of league.json or the clubs abroad that world 2 no longer has: shown only in old records (spec §11). */
export const isRetired = (id: string) => base.has(id) && !w2.has(id) && !/^os\d$/.test(id);
/** Retired clubs' names and colours, for old matches and news. */
export const RETIRED: { id: string; name: string; colours: string[] }[] = [...base.values()].filter((c) => isRetired(c.id)).map((c) => ({ id: c.id, name: c.name, colours: c.colours }));

/**
 * Register clubs by hand (LG-3's fixtures): a registered club wins over both worlds' data. World 2's real clubs are
 * not registered this way; `setClubWorld(2)` switches them in, and back out for a world-1 save.
 */
export function registerClubs(defs: ClubDef[]) {
  for (const d of defs) extra.set(d.id, d);
}
const named = new Map<string, ClubDef>();
/**
 * Called whenever the stored clubs are read. Picks the world from them (world 2 has the outside pool and divisions
 * below six) and gives Old Selves their names from the save (built from the owner's past months).
 */
export function rememberClubs(clubs: { id: string; tier?: number; pool?: boolean; old?: { name: string; nickname: string } }[]) {
  if (clubs.length) setClubWorld(clubs.some((c) => c.pool || (c.tier ?? 0) > 6) ? 2 : 1);
  for (const c of clubs) {
    const def = lookup(c.id);
    if (def && c.old) named.set(c.id, { ...def, name: c.old.name, nickname: c.old.nickname });
    else named.delete(c.id);
  }
}
const lookup = (id: string) => extra.get(id) ?? (current === 2 ? w2.get(id) : undefined) ?? base.get(id);
/** World Cup nations play as opponents under `nat:<id>`, so Brazil never collides with Brabo. */
export const nationId = (id: string) => `nat:${id}`;
function nationClub(id: string): ClubDef | undefined {
  const n = id.startsWith('nat:') ? NATIONS.find((x) => x.id === id.slice(4)) : undefined;
  if (!n) return undefined;
  return {
    id, name: n.name, short: n.name.slice(0, 3).toUpperCase(), nickname: n.name, city: '', country: n.id, founded: '', ground: 'A World Cup stadium',
    colours: ['#f3eee6', '#141414'], crest: '', tier: 1, rating: n.strength, elite: false, style: 'possession', kind: 'quirky', lore: '',
    sponsor: '', kitMaker: '', sponsorReal: false, kitReal: false, known: [], shrinks: {}, presses: {},
  };
}
export function clubById(id: string): ClubDef {
  const c = named.get(id) ?? lookup(id) ?? nationClub(id);
  if (!c) throw new Error(`unknown club ${id}`);
  return c;
}
/** World 2 (ledger O38) runs to Division Eight, with the outside pool one below; the first six names are shared. */
const MORE_NAMES: Record<string, string> = { 7: 'Division Seven', 8: 'Division Eight', 9: 'The clubs abroad' };
export const tierName = (t: Tier) => TIER_NAMES[String(t)] ?? MORE_NAMES[String(t)];
