// Founding the club, settings and choices.
import { db } from '../../db/db';
import { addDays } from '../../domain/dates';
import { pressHeadline } from '../news';
import type { DayKey } from '../../domain/dates';
import { CLUBS, rememberClubs } from '../data/load';
import { fillSlots, SLOTS } from '../oldSelves';
import { ANTIGOON } from '../rivals';
import { BUILT_INS } from '../data/abilities';
import { equip, type HabitId } from '../squad';
import { bidFor, letRun, renew } from '../contracts';
import type { Offer, Slot } from '../money';
import type { Axis } from '../types';
import { loadHealth } from './gather';
import { factsFor } from './lines';
import { contractsFor, monthsFromHealth, youthIntake } from './play';
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
    contracts: contractsFor(date), sold: [], sponsors: [], offers: [], staff: [],
    crestHistory: [{ step: 1, opt: choices.crest, season: 1 }],
  };
  await db.transaction('rw', [db.fbSave, db.fbClubs, db.fbSeasons, db.fbMatches, db.fbNews, db.fbSquad, db.fbBundles], async () => {
    for (const t of FB_TABLES) await db.table(t).clear();
    await db.fbClubs.bulkPut(clubs);
    rememberClubs(clubs);
    await db.fbSeasons.put(newSeason(1, date, clubs));
    await db.fbSave.put(save);
    await db.fbSquad.bulkPut(youthIntake(1, date));
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

async function editSave(f: (s: FbSave) => FbSave | undefined) {
  await db.transaction('rw', db.fbSave, async () => {
    const s = await db.fbSave.get('save');
    const next = s && f(s);
    if (next) await db.fbSave.put(next);
  });
}
const onContract = (s: FbSave, habit: HabitId, f: (c: NonNullable<FbSave['contracts']>[number]) => NonNullable<FbSave['contracts']>[number]) =>
  ({ ...s, contracts: (s.contracts ?? []).map((c) => (c.habit === habit ? f(c) : c)) });

/** The renewal tap on a contract that's due. */
export const renewContract = (habit: HabitId, today: DayKey) =>
  editSave((s) => onContract(s, habit, (c) => (c.state === 'due' ? renew(c, today) : c)));
/** Keep a due or listed habit on the same terms for four more weeks. */
export const keepHabit = (habit: HabitId, today: DayKey) =>
  editSave((s) => onContract(s, habit, (c) => (c.state !== 'running' ? letRun(c, today) : c)));
/** Sell a listed habit. Football stops tracking it; its matches stay; Health's own settings are never touched. */
export const sellHabit = (habit: HabitId) =>
  editSave((s) => {
    const c = (s.contracts ?? []).find((x) => x.habit === habit);
    if (!c || c.state !== 'listed') return undefined;
    const { fee } = bidFor(habit, s.season);
    return {
      ...s,
      contracts: (s.contracts ?? []).filter((x) => x.habit !== habit),
      sold: [...(s.sold ?? []), habit],
      budget: fee.kind === 'money' ? Math.round((s.budget + fee.amount) * 1000) / 1000 : s.budget,
      youthSlots: (s.youthSlots ?? 0) + (fee.kind === 'youth' ? 1 : 0),
      staff: fee.kind === 'staff' ? [...(s.staff ?? []), fee.role] : s.staff,
    };
  });
/** Sign an offer: it fills its slot from this season. */
export const acceptOffer = (o: Offer) =>
  editSave((s) => ({ ...s, sponsors: [...(s.sponsors ?? []).filter((x) => x.slot !== o.slot || o.slot === 'partner'), { ...o, since: s.season }], offers: (s.offers ?? []).filter((x) => x.slot !== o.slot || (o.slot === 'partner' && x !== o && x.brand !== o.brand)) }));
/** Your own sponsor, typed in, in any slot. */
export const setOwnSponsor = (name: string, slot: Slot) =>
  editSave((s) => (name.trim() ? { ...s, ownSponsor: { name: name.trim().slice(0, 40), slot } } : { ...s, ownSponsor: undefined }));

/** Launch day: pick a design for a slot, for the coming season. */
export const pickKit = (season: number, slot: 'home' | 'away' | 'third', id: string) =>
  editSave((s) => ({ ...s, kits: [...(s.kits ?? []).filter((k) => !(k.season === season && k.slot === slot)), { season, slot, id }] }));
export const setSponsorStyle = (sp: 'A' | 'B' | 'C' | 'R') => editSave((s) => ({ ...s, sponsorStyle: sp }));
/** The crest level-up: one of five new options, or keep the old crest. */
export const levelUpCrest = (opt: CrestOpt | 'keep') =>
  editSave((s) => {
    const step = s.crestPending;
    if (!step) return undefined;
    const history = [...(s.crestHistory ?? []), { step, opt, season: s.season }];
    return { ...s, crestPending: undefined, crestHistory: history, crest: opt === 'keep' ? s.crest : { step, opt } };
  });

/** Book moving day for the next season break (once the Kaai Stand is built). */
export const bookMove = (on: boolean) => editSave((s) => ({ ...s, moveAtBreak: on }));
/** An opening night has been shown. */
export const markOpened = (id: string) => editSave((s) => ({ ...s, openings: (s.openings ?? []).filter((x) => x !== id) }));

/** A rival's birth moment has been shown. */
export const markRivalSeen = (id: string) => editSave((s) => ({ ...s, rivalMoments: (s.rivalMoments ?? []).filter((x) => x !== id) }));
