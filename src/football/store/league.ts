// The League section's read: the current season, tables for every tier, and Brabo's rating for the pyramid.
import { db } from '../../db/db';
import { clubById, rememberClubs, TIER_BANDS } from '../data/load';
import { parityRating } from '../engine';
import { monthAverage } from '../oldSelves';
import { standings, type Row } from '../table';
import { TIERS, type Tier } from '../types';
import { OWN } from './season';
import type { FbClub, FbSave, FbSeason, StoredMatch } from './tables';

export interface League {
  save: FbSave;
  season: FbSeason;
  clubs: Map<string, FbClub>;
  tables: Record<Tier, Row[]>;
  /** Brabo's rating on the 1–100 club scale, from the last 7 matches' shapes. */
  rating: number;
  matches: StoredMatch[];
}

export function tablesFor(season: FbSeason): Record<Tier, Row[]> {
  const out = {} as Record<Tier, Row[]>;
  for (const t of TIERS) out[t] = standings(season.results[t], Object.keys(season.tierOf).filter((id) => season.tierOf[id] === t), season.deductions);
  return out;
}

export function braboRating(matches: StoredMatch[]): number {
  const recent = [...matches].sort((a, b) => a.date.localeCompare(b.date)).slice(-7);
  return recent.length ? Math.round(parityRating(monthAverage(recent.map((m) => m.values)))) : 37;
}

export async function loadLeague(): Promise<League | null> {
  const save = await db.fbSave.get('save');
  if (!save) return null;
  const season = await db.fbSeasons.get(save.season);
  if (!season) return null;
  const list = await db.fbClubs.toArray();
  rememberClubs(list);
  const matches = await db.fbMatches.where('season').equals(save.season).toArray();
  const all = await db.fbMatches.orderBy('date').toArray();
  return { save, season, clubs: new Map(list.map((c) => [c.id, c])), tables: tablesFor(season), rating: braboRating(all), matches };
}

export type Gap = 'gap-up' | 'gap-even' | 'gap-down';
/** How a tier's rating band sits against yours: above you, at your level, or below. Words always go with the colour. */
export function gapOf(rating: number, tier: Tier): { cls: Gap; word: string } {
  const [lo, hi] = TIER_BANDS[String(tier)];
  if (rating > hi) return { cls: 'gap-down', word: 'below you' };
  if (rating >= lo - 3) return { cls: 'gap-even', word: 'your level' };
  return { cls: 'gap-up', word: lo - rating > 15 ? 'far above' : 'above' };
}
export const clubColour = (id: string) => (id === OWN ? '#ff7a1a' : clubById(id).colours[0] ?? '#888888');
