// The Club section's read: the squad as six members, the bench, abilities and awakenings.
import { db } from '../../db/db';
import { addDays, dayOfLogging, type DayKey } from '../../domain/dates';
import { rememberClubs } from '../data/load';
import { shownRating } from '../ratings';
import { averageOf, HABITS, TRAIT, type HabitId } from '../squad';
import { AXES, type Axis, type Tier } from '../types';
import { loadHealth } from './gather';
import { OWN } from './season';
import type { FbSave, FbSquadRow, StoredMatch } from './tables';
import { tonightKnocks } from './tonight';

export interface Member {
  habit: HabitId;
  label: string;
  axis: Axis;
  /** The 28-day average real value, 1–20 (0 before any match). */
  real: number;
  /** The tier-relative football rating out of 20. */
  shown: number;
  /** The last five matches' real values, oldest first. */
  form: number[];
  contract: string;
  knock?: 'knock' | 'injury';
  captain: boolean;
  awakened: number[];
  trait?: string;
}
export interface Club { save: FbSave; tier: Tier; members: Member[]; bench: FbSquadRow[]; matches: StoredMatch[]; youth?: FbSquadRow[]; today?: DayKey }

/** Pure: the six members from the save and recent matches (newest last). */
export function membersOf(save: FbSave, matches: StoredMatch[], tier: Tier, today: DayKey, knock?: 'knock' | 'injury'): Member[] {
  const played = matches.filter((m) => !m.rotation).sort((a, b) => a.date.localeCompare(b.date));
  const avg = averageOf(played.filter((m) => m.date > addDays(today, -28)).map((m) => m.values));
  return HABITS.filter((h) => !(save.sold ?? []).includes(h.id)).map((h) => {
    const real = Math.round(avg[h.axis]);
    const done = save.awakenings[h.axis] ?? [];
    return {
      habit: h.id, label: h.label, axis: h.axis, real,
      shown: real ? shownRating(real, tier) : 0,
      form: played.slice(-5).map((m) => m.values[h.axis]),
      contract: h.contract,
      knock: h.axis === 'Rest' ? knock : undefined,
      captain: save.slots.includes('armband') && save.captain === h.axis,
      awakened: done,
      trait: done.length ? TRAIT[h.axis] : undefined,
    };
  });
}

export async function loadClub(now = Date.now()): Promise<Club | null> {
  const save = await db.fbSave.get('save');
  if (!save) return null;
  rememberClubs(await db.fbClubs.toArray());
  const season = await db.fbSeasons.get(save.season);
  const tier = (season?.tierOf[OWN] ?? 6) as Tier;
  const today = dayOfLogging(now);
  const matches = await db.fbMatches.where('date').aboveOrEqual(addDays(today, -60)).toArray();
  const k = tonightKnocks(await loadHealth(), today, save.physioRoom).find((m) => m.kind === 'knock');
  const knock = k ? (k.why === 'Injury' ? 'injury' : 'knock') : undefined;
  const squad = await db.fbSquad.toArray();
  const bench = squad.filter((y) => y.status === 'promoted');
  const youth = squad.filter((y) => y.status === 'growing');
  return { save, tier, members: membersOf(save, matches, tier, today, knock), bench, matches, youth, today };
}
export const axisOrder = AXES;
