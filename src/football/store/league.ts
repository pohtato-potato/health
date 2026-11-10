// The League section's read: the current season, tables for every tier, and Brabo's rating for the pyramid.
import { db } from '../../db/db';
import { clubById, rememberClubs, TIER_BANDS } from '../data/load';
import { parityRating } from '../engine';
import { monthAverage } from '../oldSelves';
import { DOUBLE_MIN_NIGHTS, formRating } from '../promotion';
import { addDays } from '../../domain/dates';
import { standings, type Row } from '../table';
import { TIERS, type Tier } from '../types';
import { OWN } from './season';
import type { DayKey } from '../../domain/dates';
import type { FbClub, FbNews, FbSave, FbSeason, StoredMatch } from './tables';

export interface League {
  save: FbSave;
  season: FbSeason;
  clubs: Map<string, FbClub>;
  tables: Record<Tier, Row[]>;
  /** Brabo's rating on the 1–100 club scale, from the last 7 matches' shapes. */
  rating: number;
  matches: StoredMatch[];
  /** Brabo's form for a double promotion: 28-day parity rating, once there are enough real nights. */
  form?: number;
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

/** Form over the 28 days up to the last match played: the rating a double promotion is judged on (promotion.ts). */
export function braboForm(matches: StoredMatch[]): number | undefined {
  const last = matches.reduce<string | undefined>((d, m) => (!d || m.date > d ? m.date : d), undefined);
  if (!last) return undefined;
  const nights = new Map<string, StoredMatch['values']>();
  for (const m of matches) if (!m.rotation && m.date > addDays(last as DayKey, -28) && !nights.has(m.date)) nights.set(m.date, m.values);
  return nights.size >= DOUBLE_MIN_NIGHTS ? formRating([...nights.values()]) : undefined;
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
  return { save, season, clubs: new Map(list.map((c) => [c.id, c])), tables: tablesFor(season), rating: braboRating(all), matches, form: braboForm(all) };
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

export interface H2H { w: number; d: number; l: number; meetings: StoredMatch[] }
/** Brabo's record against one club, over every stored match. */
export function headToHead(matches: StoredMatch[], id: string): H2H {
  const meetings = matches.filter((m) => m.opp === id).sort((a, b) => a.date.localeCompare(b.date));
  return { w: meetings.filter((m) => m.result === 'W').length, d: meetings.filter((m) => m.result === 'D').length, l: meetings.filter((m) => m.result === 'L').length, meetings };
}

export interface ClubPageData { league: League; id: string; all: StoredMatch[]; news: FbNews[]; seasons: FbSeason[] }
export async function loadClubPage(id: string): Promise<ClubPageData | null> {
  const league = await loadLeague();
  if (!league) return null;
  const all = await db.fbMatches.orderBy('date').toArray();
  const news = (await db.fbNews.orderBy('date').reverse().toArray()).filter((n) => n.clubId === id || (n.matchId && all.find((m) => m.id === n.matchId)?.opp === id));
  const seasons = await db.fbSeasons.toArray();
  return { league, id, all, news, seasons };
}

/** The back page: the newest headline up to today, and a call-back to an earlier result. */
export interface BackPage { headline?: FbNews; callback?: string }
export function backPage(news: FbNews[], matches: StoredMatch[], today: DayKey): BackPage {
  const headline = news.filter((n) => n.kind === 'back' && n.date <= today).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))[0];
  if (!headline) return {};
  const m = headline.matchId ? matches.find((x) => x.id === headline.matchId) : undefined;
  const before = matches.filter((x) => x.date < (m?.date ?? headline.date) && x.comp !== 'friendly').sort((a, b) => b.date.localeCompare(a.date));
  const past = (m && before.find((x) => x.opp === m.opp)) ?? before[0];
  if (!past) return { headline };
  const opp = clubById(past.opp).name;
  const s = past.score;
  const verb = past.result === 'W' ? `beat ${opp} ${s[0]}–${s[1]}` : past.result === 'L' ? `lost ${s[0]}–${s[1]} to ${opp}` : `drew ${s[0]}–${s[1]} with ${opp}`;
  const when = m && past.opp === m.opp ? 'Last time they met' : 'The match before';
  return { headline, callback: `${when}, Brabo ${verb} (season ${past.season}, day ${past.day}).` };
}
