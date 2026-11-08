// The rotation's choices (layer 2): the team sheet, the morning tactic, buy-backs and seen limit breaks.
// The only writers for these fields; play.ts reads them on match nights.
import { db } from '../../db/db';
import { addDays, dayOfLogging, type DayKey } from '../../domain/dates';
import { euros } from '../money';
import { bringHome, canBuyBack } from '../rotation/freeAgents';
import type { Tactic, TeamSheet } from '../rotation/night';
import type { Unit } from '../players/types';
import type { Formation } from '../players/eleven';
import { clubById } from '../data/load';
import { OWN } from './season';
import type { FbSave } from './tables';

async function editSave(f: (s: FbSave) => FbSave | undefined) {
  await db.transaction('rw', db.fbSave, async () => {
    const s = await db.fbSave.get('save');
    const next = s && f(s);
    if (next) await db.fbSave.put(next);
  });
}
const sheetOf = (s: FbSave): TeamSheet => s.sheet ?? {};

/** Today's tactic (null: leave it to the assistant). Only the last fortnight of picks is kept. */
export const setTactic = (date: DayKey, t: Tactic | null) => editSave((s) => {
  const keep = Object.fromEntries(Object.entries(s.tactics ?? {}).filter(([d]) => d >= addDays(date, -14) && d !== date));
  return { ...s, tactics: t ? { ...keep, [date]: t } : keep };
});

/** A unit's starters on the team sheet; an empty list lets its best match ratings start. */
export const setStarters = (unit: Unit, ids: string[]) => editSave((s) => {
  const picks = { ...sheetOf(s).picks };
  if (ids.length) picks[unit] = ids; else delete picks[unit];
  return { ...s, sheet: { ...sheetOf(s), picks } };
});
/** Every unit back to its best match ratings. */
export const resetStarters = () => editSave((s) => ({ ...s, sheet: { ...sheetOf(s), picks: {} } }));
export const setUnitCaptain = (unit: Unit, id: string) => editSave((s) => ({ ...s, sheet: { ...sheetOf(s), captains: { ...sheetOf(s).captains, [unit]: id } } }));
/** The formation for match nights. Only one the tree has opened is kept; the sheet shows the rest as locked. */
export const setFormation = (f: Formation) => editSave((s) => ({ ...s, sheet: { ...sheetOf(s), formation: f } }));
export const setSetPiece = (id: string) => editSave((s) => ({ ...s, sheet: { ...sheetOf(s), setPiece: id } }));

/** A limit break's moment has been seen. */
export async function seeLimitBreak(playerId: string) {
  await db.transaction('rw', db.fbPlayers, async () => {
    const p = await db.fbPlayers.get(playerId);
    if (p && p.limitBreaks.some((l) => !l.seen)) await db.fbPlayers.put({ ...p, limitBreaks: p.limitBreaks.map((l) => ({ ...l, seen: true })) });
  });
}

/** The division we play in now (for the buy-back clause). */
export async function braboTier() {
  const save = await db.fbSave.get('save');
  const season = save ? await db.fbSeasons.get(save.season) : undefined;
  return season?.tierOf[OWN] ?? 6;
}

/** Pays a free agent's clause from the budget and brings it home (spec §6). Returns why not, when it can't. */
export async function buyBackPlayer(id: string, now = Date.now()): Promise<string | null> {
  const tier = await braboTier();
  return db.transaction('rw', [db.fbSave, db.fbPlayers, db.fbNews], async () => {
    const [s, p] = [await db.fbSave.get('save'), await db.fbPlayers.get(id)];
    if (!s || !p) return 'Not found.';
    const can = canBuyBack(p, s.budget, tier);
    if (!can.ok) return can.why ?? 'Not now.';
    const date = dayOfLogging(now);
    const from = p.freeAgent ? clubById(p.freeAgent.club).name : 'their club';
    await db.fbSave.put({ ...s, budget: Math.round((s.budget - can.fee) * 1000) / 1000 });
    await db.fbPlayers.put(bringHome(p, date));
    await db.fbNews.put({ id: `${date}:home:${p.id}`, date, kind: 'club', text: `${p.name} comes home from ${from} for ${euros(can.fee)}, with every goal and card it had.` });
    return null;
  });
}
