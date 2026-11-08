// Engine 2's players through the days: ratings from the logs, best-ever cards, Club legend status, the eleven on a
// match night, named goals and saves, and the save rebuilt from history. Pure over a Health read; play.ts writes.
import { addDays, type DayKey } from '../../domain/dates';
import { FAREWELLS } from '../content/words';
import { hashSeed, rng } from '../rng';
import { AXES, type Axis, type AxisValues } from '../types';
import { ctxFor, ratingOf, type Ctx } from '../players/attributes';
import { at95After, cardAfter, firstCard } from '../players/cards';
import { playersOn } from '../players/catalogue';
import { creditsFor } from '../players/credit';
import { benchOf, blend, FORMATIONS, startersOf, squadValues, type Formation, type SquadMember } from '../players/eleven';
import type { FbPlayer, LimitBreak, PlayerDef, Rating, Unit, XiPlace } from '../players/types';
import { ageDay, agedOverall, AGES, formOf, freshnessOn, matchRating, trailAfter } from '../rotation/condition';
import { breakToday, shiftWeights } from '../rotation/limitBreak';
import { applyNudges, assistantTactic, captainsOf, CHEM_MAX, chemistryAfter, defaultPool, moraleAfter, nudgesFor, setPieceOf, type Chemistry, type Morale, type NightCtx, type Nudge, type Tactic, type TeamSheet } from '../rotation/night';
import { agentsAt } from '../rotation/freeAgents';
import { BASE_RULES, type RotationRules } from '../rotation/rules';
import { NO_TREE, sheetFor, type TreeRotation } from '../tree/rotation';
import { captainChemistry, freshnessScale, pickTrait } from '../rotation/traits';
import { PROMOTED_START, youthDay, type YouthLink } from '../players/youth';
import { dutyBonus } from '../globe/duty';
import { withLoans } from '../globe/loans';
import type { LoanStay } from '../globe/types';
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
  return { id: d.id, unit: d.unit, kind: d.kind, ref: d.ref, name: d.name, art: d.art, signed: d.signed, status: 'squad', overall, on, ...firstCard(overall, on, d.signed), apps: 0, goals: 0, saves: 0, seasons: [], limitBreaks: [] };
}

/** What a limit break's new baseline needs added to keep the overall (the latest one with a carry). */
export const carryOf = (p: Pick<FbPlayer, 'limitBreaks'> | undefined) => [...(p?.limitBreaks ?? [])].reverse().find((l) => l.carry != null)?.carry ?? 0;
const growthSum = (r: Rating | null) => { const xs = r?.attrs.filter((a) => a.kind === 'growth') ?? []; return xs.length ? xs.reduce((t, a) => t + a.value, 0) : undefined; };
const clampO = (v: number) => Math.max(1, Math.min(100, Math.round(v)));

/**
 * One day for every player: sign new ones, work out today's ratings, move cards up (never down), and keep
 * Club legend status. Layer 2 adds freshness, form, ageing and limit breaks, and keeps free agents as they left.
 * `quiet` (the rebuild) records step-ups and limit breaks in the history without queueing their moments.
 */
export function playersDay(roster: Roster, h: Health, c: Ctx, date: DayKey, academy: Set<string>, quiet = false, rules: RotationRules = BASE_RULES): Roster {
  const next: Roster = new Map(roster);
  const sickToday = c.sick.has(date);
  for (const d of playersOn(h, date)) {
    const old = next.get(d.id);
    const def = { ...d, signed: old?.signed ?? d.signed };
    // A free agent stays as it left; re-added, it waits for its clause to be paid.
    if (old?.status === 'left' && (old.freeAgent || !d.active)) {
      next.set(d.id, old.freeAgent ? { ...old, freeAgent: { ...old.freeAgent, readded: d.active || undefined } } : old);
      continue;
    }
    const r = ratingOf(c, def, date, { base: old?.base, weights: old?.weights, bonus: old && dutyBonus(old) });
    const computed = r ? clampO(r.overall + carryOf(old)) : old?.overall ?? c.rampStart?.[d.id] ?? 50;
    const base = old ?? newRow(def, computed, date);
    const status: FbPlayer['status'] = academy.has(d.id) ? 'academy' : d.active ? 'squad' : 'left';
    let row: FbPlayer = {
      ...base, name: d.name, art: d.art, overall: computed, on: date, status,
      leftOn: status === 'left' ? base.leftOn ?? date : undefined,
      ...(d.refs ? { refs: d.refs } : {}),
    };
    // Ageing (spec §3.3): exercises and walks, never a Club legend; the clock pauses on sick days.
    if (old && AGES.includes(d.kind) && !row.clubLegend) {
      const age = ageDay(row, r ? growthSum(r) : undefined, date, c.sick, row.base ?? row.signed);
      row = { ...row, peakGrowth: age.peakGrowth, grewOn: age.grewOn, pastBest: age.pastBest, overall: agedOverall(computed, row.best, age.pastBest, date, c.sick) };
    }
    // Limit breaks (spec §5): the baseline resets, the overall is kept plus 3, weights may shift, a trait may come.
    const found = old && r && status === 'squad' ? breakToday(c, def, row, date, rules) : null;
    if (found && r) {
      const switched = found.why === 'kit' || found.why === 'profile';
      const before = switched ? Math.max(old!.overall, row.overall) : row.overall;
      const { weights, moved } = shiftWeights(row.weights ?? Object.fromEntries(r.attrs.map((a) => [a.id, a.weight])), found.shift);
      const r2 = ratingOf(c, def, date, { base: date, weights, bonus: old && dutyBonus(old) });
      const after = Math.min(100, before + 3);
      const trait = found.why === 'kit' ? pickTrait(row, date, 'gym') ?? pickTrait(row, date) : pickTrait(row, date);
      const lb: LimitBreak = { on: date, tier: row.card.tier, why: found.why, from: before, to: after, carry: after - (r2 ?? r).overall, what: found.what, ...(trait ? { trait } : {}), ...(moved ? { shift: moved } : {}), ...(quiet ? { seen: true } : {}) };
      row = { ...row, overall: after, base: date, weights, limitBreaks: [...row.limitBreaks, lb], pastBest: undefined, peakGrowth: growthSum(r2), grewOn: date };
    }
    // Freshness (spec §3.2): only exercises tire. Sick days are days off.
    if (d.kind === 'exercise') {
      const refs = d.refs ?? [d.ref!];
      const trained = (x: DayKey) => !c.sick.has(x) && refs.some((id) => c.setsBy.get(id)?.some((s) => s.date === x && !s.drop));
      row.fresh = freshnessOn(trained, date, rules, freshnessScale(row));
    }
    // Form: the four-week trend of the overall; it doesn't move on a sick day.
    if (!sickToday) { row.trail = trailAfter(row.trail, date, row.overall); row.form = formOf(row.trail, date, row.signed); }
    // Legend's hold: a sick day never breaks the run at 95+ (the overall doesn't move then).
    if (!sickToday) row.at95Since = at95After(row.at95Since, row.overall, date);
    next.set(d.id, { ...row, ...(old ? cardAfter(row, row.overall, date, quiet, { signed: row.signed, at95Since: row.at95Since }) : {}) });
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

/** Squad players with tonight's match rating: overall × freshness + form (spec §3.2). */
export const membersOf = (roster: Roster): SquadMember[] => [...roster.values()].filter((p) => p.status === 'squad').map((p) => ({ id: p.id, unit: p.unit, name: p.name, rating: matchRating(p), ...(p.kind === 'exercise' ? { refs: p.refs ?? [p.ref!] } : {}) }));

/** The eleven from the team sheet: your picks where you made them, else the best match ratings (Power: from the latest session). */
export function sheetEleven(members: SquadMember[], sheet: TeamSheet | undefined, latest?: string[]): XiPlace[] {
  const formation: Formation = sheet?.formation ?? '4-3-3';
  const pool = defaultPool(members, latest);
  return AXES.flatMap((u) => {
    const pick = sheet?.picks?.[u];
    return startersOf(u, pick?.length ? members : pool, FORMATIONS[formation][u], pick);
  });
}

export interface NightOpts {
  sheet?: TeamSheet; latest?: string[]; night?: Omit<NightCtx, 'rules' | 'formation'>; rules?: RotationRules;
  /** Layer 4: loans at the club tonight, and whether each unit's habit was logged today (a loan plays only then). */
  loans?: LoanStay[]; logged?: (u: Unit) => boolean;
  /** Layer 4, False nine: a Fuel player can take Power's place at this share (90%) when that's better. */
  falseNine?: number;
  /** Layer 4, Two fronts: players rested for the league match who are fully fresh tonight. */
  rested?: string[];
}
export interface Night { xi: XiPlace[]; values: AxisValues; squad: Partial<AxisValues>; base: AxisValues; nudges: Nudge[]; total: AxisValues; /** Loans that played (stay keys) and the starters who sat out for them. */ loansPlayed?: string[]; loanRested?: string[] }

/** False nine (Continental era): the best Fuel player not starting takes the weakest Power place at 90%, when that's higher. */
export function withFalseNine(xi: XiPlace[], members: SquadMember[], share: number): XiPlace[] {
  const power = xi.map((x, i) => ({ x, i })).filter(({ x }) => x.unit === 'Power');
  const starting = new Set(xi.map((x) => x.player));
  const fuel = members.filter((m) => m.unit === 'Fuel' && !starting.has(m.id)).sort((a, b) => b.rating - a.rating)[0];
  if (!fuel || !power.length) return xi;
  const low = power.reduce((a, b) => (b.x.rating < a.x.rating ? b : a));
  const r = Math.round((fuel.rating * share) / 100);
  if (r <= low.x.rating) return xi;
  return xi.map((x, i) => (i === low.i ? { player: fuel.id, unit: 'Power', place: 'False nine', name: fuel.name, rating: r } : x));
}

/**
 * Tonight's eleven and axis values. Base = 70% today + 30% squad; the nudges (formation, tactic, chemistry, morale,
 * a rival holding one of ours) add up to ±3 an axis. A sick day plays the rotation squad: the bench at 100% squad
 * value, with no chemistry (its starters rest).
 */
export function squadNight(roster: Roster, today: AxisValues, sick: boolean, o: NightOpts = {}): Night {
  const fresh = o.rested?.length ? new Map([...roster].map(([id, p]) => [id, o.rested!.includes(id) && p.fresh != null ? { ...p, fresh: 100 } : p])) : roster;
  const members = membersOf(fresh);
  const sheetXi = sheetEleven(members, o.sheet, o.latest);
  const starters = o.falseNine && !o.sheet?.picks?.Power?.length ? withFalseNine(sheetXi, members, o.falseNine) : sheetXi;
  const formation = o.sheet?.formation ?? '4-3-3';
  // A sick day plays no loans: nothing was logged, so no loan has a day to play.
  const loaned = !sick && o.loans?.length ? withLoans(starters, o.loans, o.logged ?? (() => false)) : undefined;
  const xi = sick ? benchOf(members, starters, formation) : loaned?.xi ?? starters;
  const squad = squadValues(xi);
  const base = blend(today, squad, sick ? 0 : undefined);
  const nudges = nudgesFor({ ...o.night, formation, chemistry: sick ? undefined : o.night?.chemistry, rules: o.rules ?? BASE_RULES });
  const { values, total } = applyNudges(base, nudges);
  return { xi, squad, base, values, nudges, total, ...(loaned?.played.length ? { loansPlayed: loaned.played, loanRested: loaned.rested } : {}) };
}

/** Tonight's team sheet, tactic, captains, chemistry, morale and the rival's free agents (spec §8, §9.1). */
export function nightOptsFor(save: FbSave, roster: Roster, h: Health, date: DayKey, oppId: string | undefined, today: AxisValues, rot: TreeRotation = NO_TREE) {
  const own = save.tactics?.[date];
  const tactic: { pick: Tactic; by: 'you' | 'assistant' } = own ? { pick: own, by: 'you' } : { pick: assistantTactic(today), by: 'assistant' };
  // The tree decides which formations are open and whether units have captains (layer 3).
  const sheet = sheetFor(save.sheet, rot);
  const latest = latestSession(h, date);
  // Captains need tonight's starters; a captain's own trait can lift its unit's chemistry.
  const pre = squadNight(roster, today, false, { sheet, latest });
  const inSquad = (id: string) => roster.get(id)?.status === 'squad';
  const captains = rot.captains ? captainsOf(pre.xi, sheet, (id) => roster.get(id)?.apps ?? 0, inSquad) : {};
  const bonus = captainChemistry(captains, roster);
  const chemistry = Object.fromEntries(AXES.map((u) => [u, Math.min(CHEM_MAX, (save.chem?.[u]?.level ?? 0) + (bonus[u] ?? 0))])) as Partial<Record<Unit, number>>;
  return {
    tactic, captains, setPiece: setPieceOf(pre.xi, sheet, inSquad),
    opts: { sheet, latest, rules: rot.rules, night: { tactic: tactic.pick, chemistry, morale: save.morale, captain: save.slots.includes('armband') ? save.captain : undefined, agents: oppId ? agentsAt(roster.values(), oppId) : {} } } as NightOpts,
  };
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

/** The exercises of the latest finished session on or before `date` (Power's default starters come from it). */
export function latestSession(h: Health, date: DayKey): string[] | undefined {
  let best: Health['sessions'][number] | undefined;
  for (const s of h.sessions) if (s.date <= date && s.status === 'done' && (!best || s.date > best.date || (s.date === best.date && s.startedAt > best.startedAt))) best = s;
  if (!best) return undefined;
  const trained = new Set(h.sets.filter((x) => x.sessionId === best!.id).map((x) => x.exerciseId));
  return trained.size ? [...trained] : best.exercises;
}

/** The youngster's arrival day, from its id (`s1:y0:2026-10-10`). */
const arrivedOn = (y: FbSquadRow): DayKey | undefined => y.id.match(/(\d{4}-\d{2}-\d{2})$/)?.[1];

/**
 * Rebuilds a save from history (spec §16): replays the logs day by day to set players, ratings and best-ever cards,
 * credits every stored match, turns each Awakening into its player's first limit break, and keeps a youngster only
 * when it can be tied to a real habit. League position, money, ground, kits, crest and history are left as they are.
 */
export function rebuildPlayers(h: Health, save: FbSave, squad: FbSquadRow[], matches: StoredMatch[], until: DayKey, name: (id: string) => string): {
  players: FbPlayer[]; matches: StoredMatch[]; squad: FbSquadRow[]; news: FbNews[]; chem: Chemistry; morale: Morale;
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
  let chem: Chemistry = {};
  let morale: Morale = 0;
  for (let d = start; d <= until; d = addDays(d, 1)) {
    youth = youth.map((y) => { const a = arrivedOn(y); return a && d >= a ? youthDay(h, y, d, save.bedtime ?? undefined) : y; });
    const c = ctxFor(h, save.bedtime, rampStarts(youth));
    roster = playersDay(roster, h, c, d, academyIds(youth), true);
    for (const m of byDate.get(d) ?? []) {
      const sick = h.days.get(d)?.status === 'sick';
      const { xi } = squadNight(roster, m.values, m.rotation && sick, { latest: latestSession(h, d) });
      const credited: StoredMatch = { ...m, xi, credits: creditsFor(m.events, xi, oppName(m, name)) };
      roster = creditMatch(roster, credited);
      outMatches.push(credited);
      morale = moraleAfter(morale, m.result);
      if (!sick && !m.rotation && !outMatches.some((x) => x !== credited && x.date === d)) chem = chemistryAfter(chem, xi, BASE_RULES);
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
  return { players: [...roster.values()], matches: outMatches, squad: youth, news, chem, morale };
}
