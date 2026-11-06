// Live reads for the Football screens. Football never writes from here.
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { addDays, dayOfLogging, type DayKey } from '../../domain/dates';
import { clubById, rememberClubs, type AbilityDef, type ClubDef } from '../data/load';
import type { AxisFlags, AxisValues, Mod } from '../types';
import { loadHealth, nightFor } from './gather';
import type { FbSave, StoredMatch } from './tables';
import { contTonight, fixtureFor, tonightKnocks, type Fixture } from './tonight';
import { monthAverage } from '../oldSelves';
import { seasonChange, type SeasonChange } from '../seasonChange';

export const useSave = () => useLiveQuery(async () => {
  const save = (await db.fbSave.get('save')) ?? null;
  if (save) rememberClubs(await db.fbClubs.toArray());
  return save;
}, []);

export function useMatches(from: DayKey, to: DayKey) {
  return useLiveQuery(() => db.fbMatches.where('date').between(from, to, true, true).toArray(), [from, to]);
}
export const useMatch = (id: string | null) => useLiveQuery(async () => (id ? (await db.fbMatches.get(id)) ?? null : null), [id]);

export interface Tonight {
  save: FbSave;
  date: DayKey;
  fixture?: Fixture;
  opp?: ClubDef;
  liveValues: AxisValues;
  flags: AxisFlags;
  known: AbilityDef[];
  hiddenNote: boolean;
  /** Abilities earned in the last 7 days (the weekly stack). */
  stack: number;
  knocks: Mod[];
  /** Tonight's stored matches once the day is closed. */
  played: StoredMatch[];
  /** Matches played automatically and not yet watched. */
  unwatchedAuto: StoredMatch[];
  /** The continental match on a double-header night. */
  also?: string;
  /** A finished season whose end screens are still to be seen. */
  change?: SeasonChange;
}

export async function loadTonight(date: DayKey): Promise<Tonight | null> {
  const save = await db.fbSave.get('save');
  if (!save) return null;
  rememberClubs(await db.fbClubs.toArray());
  const season = await db.fbSeasons.get(save.season);
  const h = await loadHealth();
  const night = nightFor(h, date);
  const fixture = season ? fixtureFor(save, season) : undefined;
  const opp = fixture?.opp ? clubById(fixture.opp) : undefined;
  const played = await db.fbMatches.where('date').equals(date).toArray();
  const unwatchedAuto = (await db.fbMatches.where('date').between(addDays(date, -60), date, true, false).toArray()).filter((m) => m.auto && !m.watched);
  return {
    save, date, fixture, opp,
    liveValues: night.values, flags: night.flags,
    known: opp?.known ?? [],
    hiddenNote: Boolean(opp?.hidden) && !save.met.includes(opp!.id),
    stack: save.earned.filter((e) => e.date > addDays(date, -7)).length,
    knocks: tonightKnocks(h, date, save.physioRoom),
    played, unwatchedAuto,
    change: await pendingChange(save),
    also: season ? contTonight(save, season, (id) => clubById(id).name) : undefined,
  };
}

async function pendingChange(save: FbSave): Promise<SeasonChange | undefined> {
  const done = (await db.fbSeasons.toArray()).filter((s) => s.final && s.id > (save.seenSeasonEnd ?? 0)).sort((a, b) => b.id - a.id)[0];
  if (!done) return undefined;
  const recent = (await db.fbMatches.orderBy('date').toArray()).filter((m) => m.season <= done.id).slice(-7);
  if (!recent.length) return undefined;
  return seasonChange(done, monthAverage(recent.map((m) => m.values))) ?? undefined;
}

export function useTonight(now = Date.now()): Tonight | null | undefined {
  const date = dayOfLogging(now);
  return useLiveQuery(() => loadTonight(date), [date]);
}
