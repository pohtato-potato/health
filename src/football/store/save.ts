// Founding the club, settings and choices.
import { db } from '../../db/db';
import { addDays } from '../../domain/dates';
import { pressHeadline } from '../news';
import type { DayKey } from '../../domain/dates';
import { CLUBS, rememberClubs } from '../data/load';
import { fillSlots, SLOTS } from '../oldSelves';
import { ANTIGOON } from '../rivals';
import { BUILT_INS } from '../data/abilities';
import { equip } from '../squad';
import type { Axis } from '../types';
import { loadHealth } from './gather';
import { factsFor } from './lines';
import { monthsFromHealth } from './play';
import { newSeason } from './season';
import type { CrestOpt, FbClub, FbSave } from './tables';

export const FB_TABLES = ['fbSave', 'fbClubs', 'fbMatches', 'fbSeasons', 'fbSquad', 'fbNews', 'fbBundles'] as const;
export const getSave = () => db.fbSave.get('save');

/** Seeds the pyramid, builds the Old Selves from Health's past months, and starts Season 1 on `date`. */
export async function foundClub(date: DayKey, choices: { shirt: string; crest: CrestOpt; captain?: Axis }): Promise<void> {
  const h = await loadHealth();
  const olds = fillSlots(monthsFromHealth(h, date), SLOTS);
  const clubs: FbClub[] = CLUBS.map((c) => {
    const o = olds.find((x) => x.id === c.id);
    return { id: c.id, tier: o?.tier ?? c.tier, rating: o?.rating ?? c.rating ?? 40, style: c.style, old: o };
  });
  const save: FbSave = {
    id: 'save', founded: date, season: 1, phase: 'season', day: 1, eventState: { used: [], clubWorldDue: false },
    captain: choices.captain, captains: choices.captain ? [choices.captain] : [], slots: ['armband', 'second-wind', 'stack'], earned: [],
    budget: 0.05, buzz: true, crest: { step: 1, opt: choices.crest }, shirt: choices.shirt,
    rivals: [{ clubId: ANTIGOON, how: 'legend', since: date }], met: [], physioRoom: false, awakenings: {}, firstRunDone: true,
  };
  await db.transaction('rw', [db.fbSave, db.fbClubs, db.fbSeasons, db.fbMatches, db.fbNews, db.fbSquad, db.fbBundles], async () => {
    for (const t of FB_TABLES) await db.table(t).clear();
    await db.fbClubs.bulkPut(clubs);
    rememberClubs(clubs);
    await db.fbSeasons.put(newSeason(1, date, clubs));
    await db.fbSave.put(save);
  });
}
export async function setFbSetting<K extends 'buzz' | 'wcCountry' | 'ownSponsor' | 'captain' | 'slots'>(k: K, v: FbSave[K]) {
  await db.transaction('rw', db.fbSave, async () => {
    const s = await db.fbSave.get('save');
    if (!s) return;
    const next = { ...s, [k]: v };
    if (k === 'captain' && v) next.captains = [...s.captains, v as Axis];
    await db.fbSave.put(next);
  });
}
export async function resetFootball() {
  await db.transaction('rw', FB_TABLES.map((t) => db.table(t)), async () => { for (const t of FB_TABLES) await db.table(t).clear(); });
}
export async function markWatched(id: string) {
  await db.fbMatches.update(id, { watched: true });
}

/** The answer picked at the press conference becomes tomorrow's back page (one answer per match). */
export async function answerPress(matchId: string, i: 0 | 1 | 2): Promise<string | undefined> {
  return db.transaction('rw', [db.fbNews, db.fbMatches, db.fbSeasons], async () => {
    const q = await db.fbNews.get(`${matchId}:press`);
    const m = await db.fbMatches.get(matchId);
    if (!q?.lineId || !m || q.answered !== undefined) return undefined;
    const tier = (await db.fbSeasons.get(m.season))?.tierOf.bra ?? 6;
    const facts = factsFor(m, tier, 1, 'press');
    const headline = pressHeadline(q.lineId, i, facts);
    if (!headline) return undefined;
    await db.fbNews.put({ ...q, answered: i });
    await db.fbNews.put({ id: `${matchId}:back`, date: addDays(m.date, 1), kind: 'back', text: headline, lineId: q.lineId, matchId });
    return headline;
  });
}

/** The season-end screens for this season have been seen. */
export async function markSeasonSeen(season: number) {
  await db.fbSave.update('save', { seenSeasonEnd: season });
}

/** This week's captain. Picking the same one as last week restarts the Harmony count. */
export async function setCaptain(axis: Axis) {
  await setFbSetting('captain', axis);
}
/** Put an owned ability in slot 0–2. A fourth slot is refused. */
export async function equipAbility(id: string, slot: number) {
  await db.transaction('rw', db.fbSave, async () => {
    const s = await db.fbSave.get('save');
    if (!s) return;
    const owned = [...BUILT_INS.map((b) => b.id), ...s.earned.map((e) => e.id)];
    const slots = equip(s.slots, id, slot, owned);
    if (slots !== s.slots) await db.fbSave.put({ ...s, slots });
  });
}
/** The newest awakening has been shown. */
export async function markAwakeSeen(n: number) {
  await db.fbSave.update('save', { awakeSeen: n });
}
