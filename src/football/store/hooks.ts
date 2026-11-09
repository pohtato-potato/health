// Live reads for the Football screens. Football never writes from here.
import { useLiveQuery } from 'dexie-react-hooks';
import { OWN } from './season';
import { db } from '../../db/db';
import { addDays, dayOfLogging, type DayKey } from '../../domain/dates';
import { clubById, rememberClubs, type AbilityDef, type ClubDef } from '../data/load';
import type { Axis, AxisFlags, AxisValues, Mod } from '../types';
import { comebackOn, loadHealth, nightFor, squadCondition } from './gather';
import { dressingRoom, lowLogOn } from '../squadCare';
import { opponentFor, type Opponent } from '../opponent';
import type { FbSave, StoredMatch } from './tables';
import { contTonight, fixtureFor, tonightKnocks, type Fixture } from './tonight';
import { monthAverage } from '../oldSelves';
import { seasonChange, type SeasonChange } from '../seasonChange';
import { AXES } from '../types';
import type { FbPlayer, Unit, XiPlace } from '../players/types';
import { rotationOf } from './tree';
import { formationFor, type TreeRotation } from '../tree/rotation';
import type { Formation } from '../players/eleven';
import { membersOf, nightOptsFor, playerCtx, sheetEleven, squadNight } from './players';
import type { SquadMember } from '../players/eleven';
import type { Nudge, Tactic } from '../rotation/night';
import { playersOn } from '../players/catalogue';
import { ratingOf } from '../players/attributes';
import { dutyBonus } from '../globe/duty';
import { globeNight } from './globe';
import { morningFor, type Morning } from './globeActions';

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
  /** Tonight's shape so far: 70% today, 30% squad (spec §8); an axis with no data stays as it is. */
  liveValues: AxisValues;
  flags: AxisFlags;
  /** The eleven that would start tonight. */
  xi: XiPlace[];
  /** How tonight adds up (spec §8): today, the squad share, the blend and the capped nudges. */
  today: AxisValues;
  squad: Partial<AxisValues>;
  base: AxisValues;
  nudges: Nudge[];
  total: AxisValues;
  tactic: { pick: Tactic; by: 'you' | 'assistant' };
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
  /** Layer 4: the morning (growth overnight, trialists, the scout line, loans arriving, the break). */
  morning: Morning;
  /** Loans in tonight's eleven, and who sits to make room. */
  loansPlaying: string[];
  loanRested: string[];
  /** Tonight's opponent as the engine sizes it (rating from the save), for Today's shape and matchup bar. */
  oppTonight?: Opponent;
  /** Tonight earns the comeback lift (+1, first fully logged day after a gap). */
  comeback: boolean;
  /** Release 1: squad condition (50–100 %), the dressing room's response after a defeat, and this week's low-log axis. */
  condition: { Power: number; Pace: number };
  respond?: Axis;
  lowLog?: Axis;
}

export async function loadTonight(date: DayKey): Promise<Tonight | null> {
  const save = await db.fbSave.get('save');
  if (!save) return null;
  rememberClubs(await db.fbClubs.toArray());
  const season = await db.fbSeasons.get(save.season);
  const h = await loadHealth();
  const night = nightFor(h, date);
  const roster = new Map((await db.fbPlayers.toArray()).map((p) => [p.id, p]));
  const fixture = season ? fixtureFor(save, season) : undefined;
  const bundles = await db.fbBundles.toArray();
  const sick = h.days.get(date)?.status === 'sick';
  const o = nightOptsFor(save, roster, h, date, fixture?.opp, night.values, rotationOf(save, bundles));
  const team = squadNight(roster, night.values, sick, { ...o.opts, ...globeNight(save, bundles, date, night.flags, sick) });
  const liveValues = { ...team.values };
  for (const a of AXES) if (night.flags[a]) liveValues[a] = night.values[a];
  const opp = fixture?.opp ? clubById(fixture.opp) : undefined;
  const oppSaved = fixture?.opp ? await db.fbClubs.get(fixture.opp) : undefined;
  const played = await db.fbMatches.where('date').equals(date).toArray();
  const unwatchedAuto = (await db.fbMatches.where('date').between(addDays(date, -60), date, true, false).toArray()).filter((m) => m.auto && !m.watched);
  return {
    save, date, fixture, opp,
    liveValues, flags: night.flags, xi: team.xi,
    today: night.values, squad: team.squad, base: team.base, nudges: team.nudges, total: team.total, tactic: o.tactic,
    known: opp?.known ?? [],
    hiddenNote: Boolean(opp?.hidden) && !save.met.includes(opp!.id),
    stack: save.earned.filter((e) => e.date > addDays(date, -7)).length,
    knocks: tonightKnocks(h, date, save.physioRoom),
    played, unwatchedAuto,
    change: await pendingChange(save),
    also: season ? contTonight(save, season, (id) => clubById(id).name) : undefined,
    morning: morningFor(save, await db.fbSquad.toArray(), [...roster.values()], bundles, h, date, fixture),
    loansPlaying: team.loansPlayed ?? [], loanRested: team.loanRested ?? [],
    oppTonight: opp ? opponentFor(opp, { rating: oppSaved?.rating ?? undefined }) : undefined,
    comeback: comebackOn(h, date),
    condition: squadCondition(h, date),
    respond: dressingRoom((await db.fbMatches.where('date').below(date).sortBy('date')).pop())?.axis,
    lowLog: lowLogOn(save.lowLog, date) ? save.lowLog.axis : undefined,
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

/** Every player at the club, academy and departed ones included. */
export const usePlayers = () => useLiveQuery(() => db.fbPlayers.toArray(), []);
export const usePlayer = (id: string | null) => useLiveQuery(async (): Promise<FbPlayer | null> => (id ? (await db.fbPlayers.get(id)) ?? null : null), [id]);

/** A player's attributes today, worked out live from the logs (null: nothing in its window yet). */
export async function loadPlayerRating(id: string) {
  const [save, p, squad] = [await db.fbSave.get('save'), await db.fbPlayers.get(id), await db.fbSquad.toArray()];
  if (!save || !p) return null;
  const h = await loadHealth();
  const date = dayOfLogging(Date.now());
  const def = playersOn(h, date).find((d) => d.id === id) ?? { ...p, active: p.status !== 'left' };
  return { rating: ratingOf(playerCtx(h, save, squad), { ...def, signed: p.signed }, date, { base: p.base, weights: p.weights, bonus: dutyBonus(p) }), bedtime: save.bedtime };
}
export const usePlayerRating = (id: string | null) => useLiveQuery(async () => (id ? loadPlayerRating(id) : null), [id]);

/** The team sheet (spec §16): every squad player by unit with tonight's match rating, who starts, captains and set pieces. */
export interface SheetData {
  save: FbSave;
  players: FbPlayer[];
  members: SquadMember[];
  xi: XiPlace[];
  captains: Partial<Record<Unit, string>>;
  setPiece?: string;
  /** Power's default pool: the latest session's exercises. */
  latest?: string[];
  /** The tree's hand on the rotation: open formations, unit captains, the rules. */
  rot: TreeRotation;
  /** Tonight's formation (the sheet's pick while it's open). */
  formation: Formation;
}
export async function loadSheet(date: DayKey): Promise<SheetData | null> {
  const save = await db.fbSave.get('save');
  if (!save) return null;
  const players = await db.fbPlayers.toArray();
  const roster = new Map(players.map((p) => [p.id, p]));
  const h = await loadHealth();
  const rot = rotationOf(save, await db.fbBundles.toArray());
  const o = nightOptsFor(save, roster, h, date, undefined, nightFor(h, date).values, rot);
  const members = membersOf(roster);
  return { save, players, members, xi: sheetEleven(members, o.opts.sheet, o.opts.latest), captains: o.captains, setPiece: o.setPiece, latest: o.opts.latest, rot, formation: formationFor(save.sheet, rot) };
}
export function useSheet(now = Date.now()) {
  const date = dayOfLogging(now);
  return useLiveQuery(() => loadSheet(date), [date]);
}
/** The division we play in now, for the buy-back clause. */
export const useBraboTier = () => useLiveQuery(async () => { const s = await db.fbSave.get('save'); const season = s ? await db.fbSeasons.get(s.season) : undefined; return season?.tierOf[OWN] ?? 6; }, []);
