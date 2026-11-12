// Matchday §4–§5 (Fork B): the morning parcel, the ground at night and the target talks, read and written.
// Football writes only to its own tables, except the target talks, which set the Health target the owner signs.
import { db } from '../../db/db';
import { getSettings, setTargets } from '../../db/actions';
import { useLiveQuery } from 'dexie-react-hooks';
import { addDays, dayOfLogging, type DayKey } from '../../domain/dates';
import { targetsOn } from '../../domain/rings';
import { physioDue } from '../../domain/treatment';
import type { Day } from '../../domain/types';
import { SEASON_DAYS } from '../calendar';
import { groundShut, parcelDue, parcelTiles, type TileKind } from '../parcel';
import { talkAsk, talkDue, talkTarget, talkWindow, type TalkHabit, type TalkOutcome, type TalkPick } from '../talks';
import { loadHealth, type Health } from './gather';
import type { Tonight } from './hooks';
import { OWN } from './season';
import type { AroundUser, FbSave, StoredMatch } from './tables';

export const aroundOf = (s: Pick<FbSave, 'around'> | undefined | null): AroundUser => s?.around ?? {};

export interface TalkOffer { habit: TalkHabit; current: number; ask: number; days: number }

/** The logged values the agents count: real step counts, and protein on days with food logged, sick days left out. */
export function talkValues(h: Health, habit: TalkHabit, today: DayKey): number[] {
  const { from, to } = talkWindow(today);
  const sick = (d: DayKey) => h.days.get(d)?.status === 'sick';
  if (habit === 'steps') return [...h.days.values()].filter((d) => d.date >= from && d.date <= to && !sick(d.date) && d.steps != null && !d.stepsEstimated).map((d) => d.steps!);
  return [...h.kcal].filter(([d, k]) => d >= from && d <= to && !sick(d) && k.n > 0).map(([, k]) => k.protein);
}

export function talkOffers(h: Health, save: FbSave, today: DayKey): TalkOffer[] {
  const done = aroundOf(save).talks ?? [];
  const t = targetsOn(h.settings.targets ?? [], today);
  if (!t) return [];
  const out: TalkOffer[] = [];
  for (const habit of ['steps', 'protein'] as const) {
    if (!talkDue(save, done, habit)) continue;
    const current = habit === 'steps' ? t.steps : t.proteinG;
    const xs = talkValues(h, habit, today);
    const ask = talkAsk(habit, xs, current);
    if (ask !== undefined) out.push({ habit, current, ask, days: xs.length });
  }
  return out;
}

/** Sign, haggle or hold: the target is set from today (never lowered) and the talk is recorded for the season. */
export async function holdTalk(o: TalkOffer, pick: TalkPick, today: DayKey): Promise<number> {
  const save = await db.fbSave.get('save');
  if (!save) return o.current;
  const to = talkTarget(o.habit, pick, o.current, o.ask);
  const rec: TalkOutcome = { season: save.season, habit: o.habit, pick, from: o.current, to, on: today, until: addDays(today, Math.max(0, SEASON_DAYS - save.day)) };
  if (to > o.current) {
    const t = targetsOn((await getSettings()).targets, today);
    if (t) await setTargets(o.habit === 'steps' ? { ...t, steps: to } : { ...t, proteinG: to }, today);
  }
  await db.transaction('rw', db.fbSave, async () => {
    const s = await db.fbSave.get('save');
    if (!s) return;
    const a = aroundOf(s);
    await db.fbSave.put({ ...s, around: { ...a, talks: [...(a.talks ?? []).filter((x) => !(x.season === rec.season && x.habit === rec.habit)), rec] } });
  });
  return to;
}

/** The parcel has been opened for this logging day. */
export async function openParcel(today: DayKey) {
  await db.transaction('rw', db.fbSave, async () => {
    const s = await db.fbSave.get('save');
    if (s && aroundOf(s).parcel !== today) await db.fbSave.put({ ...s, around: { ...aroundOf(s), parcel: today } });
  });
}

export interface Parcel {
  tiles: TileKind[];
  due: boolean;
  shut: boolean;
  /** Last night's league match (Brabo's), for the result tile. */
  result?: StoredMatch;
  talks: TalkOffer[];
  packs: number;
  today: Pick<Day, 'date' | 'status' | 'physio'>;
  /** When the day was closed: shown on the night page only. */
  sealAt?: number;
}

/** Packs earned and not yet opened. */
export function packsWaiting(save: FbSave): number {
  const opened = new Set((save.treeUser?.opened ?? []).map((o) => o.id));
  return (save.tree?.packs ?? []).filter((p) => !opened.has(p.id)).length;
}

/** What the morning holds: the parcel's tiles and whether it is due now. */
export async function loadParcel(t: Tonight): Promise<Parcel> {
  const h = await loadHealth();
  const date = t.date;
  const day = h.days.get(date) ?? { date };
  const shut = groundShut(day);
  const result = (await db.fbMatches.where('date').equals(addDays(date, -1)).toArray()).filter((m) => m.home === OWN || m.away === OWN).sort((a, b) => (a.leg ?? 1) - (b.leg ?? 1))[0];
  const talks = talkOffers(h, t.save, date);
  const packs = packsWaiting(t.save);
  const tiles = parcelTiles({
    result: Boolean(result),
    table: physioDue(day),
    talks: talks.length > 0,
    scout: Boolean(t.morning.scout),
    academy: t.morning.grew.length > 0,
    pack: packs > 0,
  });
  return { tiles, due: parcelDue(aroundOf(t.save).parcel, date, shut, tiles), shut, result, talks, packs, today: day, sealAt: day.seal?.at };
}

/** True from Close the day until the 4 am roll-over: packs and results wait for the morning. */
export function useGroundShut(now = Date.now()): boolean | undefined {
  const date = dayOfLogging(now);
  return useLiveQuery(async () => groundShut(await db.days.get(date)), [date]);
}
