// Taps on the world, and the reads its screens use. Taps write save.globeUser (a user key in play.ts) or a youngster's
// row; play.ts keeps a trialist tied by a tap while days play.
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { dayOfLogging, type DayKey } from '../../domain/dates';
import { clubById, rememberClubs } from '../data/load';
import { breakDue, BREAK_DAYS, callUps, loggedOn } from '../globe/duty';
import { daysLeft, loanById, loansWaiting } from '../globe/loans';
import { sleepWeek, academyFull, type SleepWeek } from '../globe/trials';
import { emptyGlobeUser, type DutyRow, type GlobeEngine, type GlobeUser, type LoanStay } from '../globe/types';
import { opponentFor } from '../opponent';
import type { ScoutLine } from '../globe/scout';
import type { YouthLink } from '../players/youth';
import type { FbPlayer } from '../players/types';
import { loadHealth, type Health } from './gather';
import { globeOf, globeRules, globeUserOf, loansOn, scoutFor, type GlobeRules } from './globe';
import { userOf } from './tree';
import type { FbBundle, FbSave, FbSquadRow } from './tables';
import type { Fixture } from './tonight';

async function editUser(f: (u: GlobeUser, s: FbSave) => GlobeUser | undefined) {
  await db.transaction('rw', db.fbSave, async () => {
    const s = await db.fbSave.get('save');
    if (!s) return;
    const next = f(s.globeUser ?? emptyGlobeUser(), s);
    if (next) await db.fbSave.put({ ...s, globeUser: next });
  });
}
/** A loan's arrival moment was seen. */
export const seeLoan = (key: string) => editUser((u) => (u.seenLoans.includes(key) ? undefined : { ...u, seenLoans: [...u.seenLoans, key].slice(-40) }));
/** The trial day's reveal was seen. */
export const seeTrials = (on: DayKey) => editUser((u) => (u.seenTrials && u.seenTrials >= on ? undefined : { ...u, seenTrials: on }));

/** Tie a trialist to a real habit (spec §9.2 step 2): it joins the academy if a place is free. */
export async function tieTrialist(id: string, link: YouthLink): Promise<boolean> {
  let ok = false;
  await db.transaction('rw', db.fbSquad, db.fbSave, db.fbBundles, async () => {
    const [y, s, bundles, squad] = [await db.fbSquad.get(id), await db.fbSave.get('save'), await db.fbBundles.toArray(), await db.fbSquad.toArray()];
    if (!y || !s || y.status !== 'trial') return;
    if (academyFull(squad, globeRules(s, bundles).academy)) return;
    await db.fbSquad.put({ ...y, status: 'growing', link, sessions: [], growth: 0, grown: [], logged: [], trialUntil: undefined });
    ok = true;
  });
  return ok;
}
/** Let a trialist go: no penalty, the door stays open. */
export async function letTrialistGo(id: string, on: DayKey = dayOfLogging(Date.now())) {
  await db.transaction('rw', db.fbSquad, async () => {
    const y = await db.fbSquad.get(id);
    if (y && y.status === 'trial') await db.fbSquad.put({ ...y, status: 'left', leftOn: on });
  });
}

export interface BreakView { n: 1 | 2; day: number; rows: (Pick<DutyRow, 'player' | 'name' | 'nation' | 'days'> & { today: boolean })[] }
/** The international break the next day to play belongs to, with its call-ups and the days each was logged. */
export function breakView(save: FbSave, players: FbPlayer[], h: Health, today: DayKey): BreakView | undefined {
  const g = globeOf(save);
  const due = breakDue(save.phase, save.season, save.day, g.breaks);
  if (!due) return undefined;
  const rows = g.duty.filter((d) => d.season === save.season && d.n === due.n);
  const list = rows.length ? rows : callUps(players, g.nations).map(({ player, nation }) => ({ player: player.id, name: player.name, nation, days: [] as DayKey[] }));
  const byId = new Map(players.map((p) => [p.id, p]));
  return {
    n: due.n, day: Math.min(BREAK_DAYS, due.done + 1),
    rows: list.map((r) => ({ player: r.player, name: r.name, nation: r.nation, days: r.days, today: Boolean(byId.get(r.player) && loggedOn(h, byId.get(r.player)!, today)) })),
  };
}

export interface Morning {
  /** Youngsters who grew on the last day played (the reveal), with how much. */
  grew: { name: string; n: number }[];
  /** Trialists waiting to be tied to a habit. */
  trials: FbSquadRow[];
  /** A trial day whose reveal hasn't been seen. */
  newTrials?: DayKey;
  scout?: ScoutLine;
  /** Loans at the club today whose arrival hasn't been seen. */
  arrivals: LoanStay[];
  intl?: BreakView;
}
/** The morning (spec §13): who grew overnight, who came to the trials, the scout line, loans arriving, the break. */
export function morningFor(save: FbSave, squad: FbSquadRow[], players: FbPlayer[], bundles: FbBundle[], h: Health, date: DayKey, fixture?: Fixture): Morning {
  const g = globeOf(save), u = globeUserOf(save);
  const last = save.lastPlayed;
  const grew = squad.filter((y) => y.status === 'growing' && y.lastGrow && y.lastGrow.on === last).map((y) => ({ name: y.name, n: y.lastGrow!.n }));
  const trials = squad.filter((y) => y.status === 'trial');
  const lastTrial = g.trials[g.trials.length - 1];
  const rules = globeRules(save, bundles);
  const opp = fixture?.opp ? clubById(fixture.opp) : undefined;
  let scout = opp ? scoutFor(save, bundles, opponentFor(opp), opp.name, date) : undefined;
  // The lines were written for the night before; on the day itself they say today.
  if (scout) scout = { ...scout, line: scout.line.replace(/Tomorrow(’|')s/g, 'Today$1s').replace(/tomorrow(’|')s/g, 'today$1s').replace(/\btomorrow\b/g, 'today') };
  if (scout?.weak) scout = { ...scout, weak: { ...scout.weak, line: scout.weak.line.replace('tomorrow', 'today') } };
  return {
    grew, trials, scout,
    ...(lastTrial && lastTrial.came.length && (!u.seenTrials || u.seenTrials < lastTrial.on) && trials.length ? { newTrials: lastTrial.on } : {}),
    arrivals: loansOn(save, date, rules.loan).filter((s) => !u.seenLoans.includes(s.key)),
    intl: breakView(save, players, h, date),
  };
}

export interface WorldView {
  save: FbSave;
  g: GlobeEngine;
  rules: GlobeRules;
  today: DayKey;
  here: (LoanStay & { left: number })[];
  waiting: { key: string; loan: string; on: DayKey }[];
  past: LoanStay[];
  trials: FbSquadRow[];
  academy: FbSquadRow[];
  week: SleepWeek;
  h: Health;
  players: FbPlayer[];
  squad: FbSquadRow[];
  intl?: BreakView;
}
export async function loadWorld(now = Date.now()): Promise<WorldView | null> {
  const save = await db.fbSave.get('save');
  if (!save) return null;
  rememberClubs(await db.fbClubs.toArray());
  const [bundles, squad, players, h] = [await db.fbBundles.toArray(), await db.fbSquad.toArray(), await db.fbPlayers.toArray(), await loadHealth()];
  const today = dayOfLogging(now);
  const g = globeOf(save);
  const rules = globeRules(save, bundles);
  const here = loansOn(save, today, rules.loan).map((s) => ({ ...s, left: daysLeft(s, today) }));
  return {
    save, g, rules, today, here, h, players, squad,
    waiting: loansWaiting([...g.loans, ...here], userOf(save).opened),
    past: g.loans.filter((s) => s.until < today).reverse(),
    trials: squad.filter((y) => y.status === 'trial'),
    academy: squad.filter((y) => y.status === 'growing'),
    week: sleepWeek(h, today, save.bedtime ?? undefined),
    intl: breakView(save, players, h, today),
  };
}
export const useWorld = () => useLiveQuery(() => loadWorld(), []);
export { loanById };
