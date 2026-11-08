// Engine 2's players through the days: ratings from the logs, best-ever cards, Club legend status, the eleven on a
// match night, named goals and saves, and the save rebuilt from history. Pure over a Health read; play.ts writes.
import { addDays, type DayKey } from '../../domain/dates';
import { FAREWELLS } from '../content/words';
import { hashSeed, rng } from '../rng';
import { AXES, type Axis, type AxisValues } from '../types';
import { ctxFor, ratingOf, type Ctx } from '../players/attributes';
import { cardAfter, firstCard } from '../players/cards';
import { playersOn } from '../players/catalogue';
import { creditsFor } from '../players/credit';
import { benchOf, blend, elevenOf, squadValues, type SquadMember } from '../players/eleven';
import type { FbPlayer, LimitBreak, PlayerDef, Unit, XiPlace } from '../players/types';
import { PROMOTED_START, youthDay, type YouthLink } from '../players/youth';
import type { Health } from './gather';
import type { FbNews, FbSave, FbSquadRow, StoredMatch } from './tables';

/** Club legend (spec §4): 100 appearances, a record held for 26 weeks, or 3 seasons in the squad. */
export const LEGEND_APPS = 100;
export const LEGEND_RECORD_DAYS = 26 * 7;
export const LEGEND_SEASONS = 3;
/** The trait an Awakened axis gave (squad.ts TRAIT), by its id in the content traits. */
const AWAKE_TRAIT: Record<Axis, string> = { Pace: 'burst', Power: 'thunder', Fuel: 'engine', Rest: 'fresh-legs', Routine: 'clockwork', Shape: 'frame' };

export type Roster = Map<string, FbPlayer>;
const linkId = (l: YouthLink) => (l.kind === 'habit' ? `habit:${l.id}` : `ex:${l.id}`);
/** Players whose habit belongs to a youngster still growing: they wait in the academy, out of the eleven. */
export const academyIds = (squad: FbSquadRow[]) => new Set(squad.filter((y) => y.status === 'growing' && y.link).map((y) => linkId(y.link!)));
/** A promoted youngster's player rates from its potential while it settles in. */
export const rampStarts = (squad: FbSquadRow[]) => Object.fromEntries(squad.filter((y) => y.status === 'promoted' && y.link).map((y) => [linkId(y.link!), PROMOTED_START[y.potential]]));
export const playerCtx = (h: Health, save: Pick<FbSave, 'bedtime'>, squad: FbSquadRow[]): Ctx => ctxFor(h, save.bedtime, rampStarts(squad));

function newRow(d: PlayerDef, overall: number, on: DayKey): FbPlayer {
  return { id: d.id, unit: d.unit, kind: d.kind, ref: d.ref, name: d.name, art: d.art, signed: d.signed, status: 'squad', overall, on, ...firstCard(overall, on), apps: 0, goals: 0, saves: 0, seasons: [], limitBreaks: [] };
}

/**
 * One day for every player: sign new ones, work out today's ratings, move cards up (never down), and keep
 * Club legend status. `quiet` (the rebuild) records step-ups in the card's history without queueing their moments.
 */
export function playersDay(roster: Roster, h: Health, c: Ctx, date: DayKey, academy: Set<string>, quiet = false): Roster {
  const next: Roster = new Map(roster);
  for (const d of playersOn(h, date)) {
    const old = next.get(d.id);
    const def = { ...d, signed: old?.signed ?? d.signed };
    const r = ratingOf(c, def, date);
    const overall = r?.overall ?? old?.overall ?? c.rampStart?.[d.id] ?? 50;
    const base = old ?? newRow(def, overall, date);
    const status: FbPlayer['status'] = academy.has(d.id) ? 'academy' : d.active ? 'squad' : 'left';
    next.set(d.id, {
      ...base, name: d.name, art: d.art, overall, on: date, status,
      leftOn: status === 'left' ? base.leftOn ?? date : undefined,
      ...(old ? cardAfter(base, overall, date, quiet) : {}),
    });
  }
  // Records: the holder of each unit's best-ever overall; held for 26 weeks, it makes a Club legend.
  for (const u of AXES) {
    const rows = [...next.values()].filter((p) => p.unit === u && p.status !== 'academy');
    if (!rows.length) continue;
    const top = rows.reduce((a, b) => (b.best > a.best ? b : a));
    for (const p of rows) {
      const since = p === top ? p.recordSince ?? date : undefined;
      if (since !== p.recordSince) next.set(p.id, { ...p, recordSince: since });
    }
  }
  for (const p of next.values()) {
    if (p.clubLegend) continue;
    const why = p.apps >= LEGEND_APPS ? 'apps' : p.recordSince && p.recordSince <= addDays(date, -LEGEND_RECORD_DAYS) ? 'record' : p.seasons.length >= LEGEND_SEASONS ? 'seasons' : undefined;
    if (why) next.set(p.id, { ...p, clubLegend: { on: date, why } });
  }
  return next;
}

export const membersOf = (roster: Roster): SquadMember[] => [...roster.values()].filter((p) => p.status === 'squad').map((p) => ({ id: p.id, unit: p.unit, name: p.name, rating: p.overall }));

/** Tonight's eleven and axis values. A sick day plays the rotation squad: the bench at 100% squad value. */
export function squadNight(roster: Roster, today: AxisValues, sick: boolean): { xi: XiPlace[]; values: AxisValues; squad: Partial<AxisValues> } {
  const members = membersOf(roster);
  const starters = elevenOf(members);
  const xi = sick ? benchOf(members, starters) : starters;
  const squad = squadValues(xi);
  return { xi, squad, values: blend(today, squad, sick ? 0 : undefined) };
}

/** Appearances, goals, saves and seasons from one match. */
export function creditMatch(roster: Roster, m: Pick<StoredMatch, 'xi' | 'credits' | 'season'>): Roster {
  const next: Roster = new Map(roster);
  for (const x of new Set((m.xi ?? []).map((p) => p.player))) {
    const p = next.get(x);
    if (p) next.set(x, { ...p, apps: p.apps + 1, seasons: p.seasons.includes(m.season) ? p.seasons : [...p.seasons, m.season] });
  }
  for (const c of m.credits ?? []) {
    const p = next.get(c.player);
    if (p) next.set(c.player, c.kind === 'goal' ? { ...p, goals: p.goals + 1 } : { ...p, saves: p.saves + 1 });
  }
  return next;
}
export const oppName = (m: StoredMatch, name: (id: string) => string) => { try { return name(m.opp); } catch { return 'them'; } };

/** The youngster's arrival day, from its id (`s1:y0:2026-10-10`). */
const arrivedOn = (y: FbSquadRow): DayKey | undefined => y.id.match(/(\d{4}-\d{2}-\d{2})$/)?.[1];

/**
 * Rebuilds a save from history (spec §16): replays the logs day by day to set players, ratings and best-ever cards,
 * credits every stored match, turns each Awakening into its player's first limit break, and keeps a youngster only
 * when it can be tied to a real habit. League position, money, ground, kits, crest and history are left as they are.
 */
export function rebuildPlayers(h: Health, save: FbSave, squad: FbSquadRow[], matches: StoredMatch[], until: DayKey, name: (id: string) => string): {
  players: FbPlayer[]; matches: StoredMatch[]; squad: FbSquadRow[]; news: FbNews[];
} {
  const news: FbNews[] = [];
  // Youngsters: the old engine tied them by name to a checklist habit; that tie is kept, the rest leave kindly.
  const items = (h.settings.checklist ?? []).filter((i) => i.active && !i.med);
  const planEx = (h.settings.plan?.sessions ?? []).flatMap((s) => s.exercises);
  let youth = squad.map((y): FbSquadRow => {
    if (y.status === 'left' || y.link) return y;
    const item = items.find((i) => i.name.trim().toLowerCase() === y.name.trim().toLowerCase());
    const ex = y.exercise ? planEx.find((e) => e.name.trim().toLowerCase() === y.name.trim().toLowerCase()) : undefined;
    const link: YouthLink | undefined = item ? { kind: 'habit', id: item.id } : ex ? { kind: 'exercise', id: ex.id } : undefined;
    if (link) return { ...y, link, sessions: [], growth: 0, grown: [], logged: [], status: 'growing' };
    const r = rng(hashSeed('farewell', y.id));
    news.push({ id: `${until}:farewell:${y.id}`, date: until, kind: 'club', text: FAREWELLS[Math.floor(r() * FAREWELLS.length)].replace('{name}', y.name) });
    return { ...y, status: 'left' };
  });

  const firstDays = [...h.days.keys(), ...h.sets.map((s) => s.date), ...[...h.kcal.keys()]].sort();
  const start = firstDays[0] ?? until;
  const byDate = new Map<DayKey, StoredMatch[]>();
  for (const m of matches) byDate.set(m.date, [...(byDate.get(m.date) ?? []), m]);
  const outMatches: StoredMatch[] = [];
  let roster: Roster = new Map();
  for (let d = start; d <= until; d = addDays(d, 1)) {
    youth = youth.map((y) => { const a = arrivedOn(y); return a && d >= a ? youthDay(h, y, d, save.bedtime ?? undefined) : y; });
    const c = ctxFor(h, save.bedtime, rampStarts(youth));
    roster = playersDay(roster, h, c, d, academyIds(youth), true);
    for (const m of byDate.get(d) ?? []) {
      const sick = h.days.get(d)?.status === 'sick';
      const { xi } = squadNight(roster, m.values, m.rotation && sick);
      const credited: StoredMatch = { ...m, xi, credits: creditsFor(m.events, xi, oppName(m, name)) };
      roster = creditMatch(roster, credited);
      outMatches.push(credited);
    }
  }
  // An Awakened axis: its best player at the time takes it as its first limit break.
  for (const a of save.awakeLog ?? []) {
    const best = [...roster.values()].filter((p) => p.unit === a.axis && p.signed <= a.date).sort((x, y) => y.best - x.best)[0];
    if (!best || best.limitBreaks.some((l) => l.why === 'awakening')) continue;
    const lb: LimitBreak = { on: a.date, tier: best.card.tier, why: 'awakening', trait: AWAKE_TRAIT[a.axis] };
    roster.set(best.id, { ...best, limitBreaks: [...best.limitBreaks, lb] });
  }
  // A save with awakenings but no log of them (older saves): the axis's best player, on the rebuild day.
  for (const a of Object.keys(save.awakenings) as Unit[]) {
    if (!save.awakenings[a]?.length || (save.awakeLog ?? []).some((x) => x.axis === a)) continue;
    const best = [...roster.values()].filter((p) => p.unit === a).sort((x, y) => y.best - x.best)[0];
    if (best && !best.limitBreaks.length) roster.set(best.id, { ...best, limitBreaks: [{ on: until, tier: best.card.tier, why: 'awakening', trait: AWAKE_TRAIT[a] }] });
  }
  return { players: [...roster.values()], matches: outMatches, squad: youth, news };
}
