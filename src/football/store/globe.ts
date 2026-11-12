// Football engine 2, layer 4 (the world), inside the day-by-day play. play.ts calls these hooks; nothing else in
// play.ts knows about loans, trials, breaks or duty:
//   breakStarts   at the start of each day: is it an international break day? (the season pauses: no matches)
//   globeDay      every day, after the tree: loans arrive and leave, trials, youngsters grow, nations, duty
//   globeNight    before a match: tonight's loans, False nine, Two fronts, loan traits as abilities
//   globeMatch    after a match: loan appearances and goals
//   globeSeasonEnd at the season's end: youngsters not promoted leave, kindly
// Taps (moments seen, tying a trialist) are in store/globeActions.ts.
import { daysBetween, type DayKey } from '../../domain/dates';
import { DUTY_LINES, DUTY_QUIET, FAREWELLS } from '../content/words';
import { nationByCode } from '../content/nations';
import { traitById } from '../content/traits';
import { YOUTH_POOL } from '../data/load';
import { BREAK_DAYS, breakDue, callUps, dutyReward, loggedOn } from '../globe/duty';
import { atClub, LOAN_DAYS, LOAN_SLOTS, leavingOn, loanById, loanPlayerId, mentorFor, startLoans, type LoanRules } from '../globe/loans';
import { assignNations } from '../globe/nations';
import { scoutLine, type ScoutLine } from '../globe/scout';
import { ACADEMY_SLOTS, sleepWeek, TRIAL_HOLD, TRIAL_SIZE, trialDay, trialists, type TrialRules } from '../globe/trials';
import { emptyGlobe, emptyGlobeUser, type GlobeEngine, type GlobeUser, type LoanStay } from '../globe/types';
import type { Opponent } from '../opponent';
import { ratingOf, type Ctx } from '../players/attributes';
import { playersOn } from '../players/catalogue';
import { PROMOTE_SESSIONS, youthDay } from '../players/youth';
import type { FbPlayer, Unit } from '../players/types';
import { playable } from '../rotation/traits';
import { hashSeed, rng } from '../rng';
import { ruleValue, slots, type Active } from '../tree/research';
import type { AxisFlags, BraboAbility } from '../types';
import { nightFor, type Health } from './gather';
import { missedDays } from '../market/market';
import { FORM_STATUSES } from '../desk/dice';
import type { NightOpts, Roster } from './players';
import { activeFor, engineOf, userOf } from './tree';
import type { FbBundle, FbNews, FbSave, FbSquadRow, StoredMatch } from './tables';

export const globeOf = (s: FbSave): GlobeEngine => s.globe ?? emptyGlobe();
export const globeUserOf = (s: FbSave): GlobeUser => s.globeUser ?? emptyGlobeUser();
/** Duty rows kept: the last two breaks' worth. */
const DUTY_KEPT = 24;

/** The world's rules from the tree: loan days and slots, trials, the academy, growth, the scout. */
export interface GlobeRules {
  loan: LoanRules;
  trials: TrialRules & { extraDay: boolean };
  academy: number;
  growthExtra: number;
  promoteSessions: number;
  scout: boolean;
  scoutWeak: boolean;
  falseNine: number;
  twoFronts: boolean;
  researchDuty: number;
}
export function rulesFrom(a: Active): GlobeRules {
  return {
    loan: { days: ruleValue(a, 'loan-days', LOAN_DAYS), slots: ruleValue(a, 'loan-slots', LOAN_SLOTS) },
    trials: {
      size: ruleValue(a, 'trials-size', TRIAL_SIZE), hold: Math.max(ruleValue(a, 'trials-hold-days', TRIAL_HOLD), ruleValue(a, 'trialist-wait', TRIAL_HOLD)),
      rarity: ruleValue(a, 'trials-rarity', 0), abroad: ruleValue(a, 'trials-abroad', 0) > 0, potential: ruleValue(a, 'youth-potential', 0),
      extraDay: ruleValue(a, 'trials-extra-day', 0) > 0,
    },
    academy: ACADEMY_SLOTS + slots(a, 'academy'),
    growthExtra: ruleValue(a, 'youth-growth-bedtime', 0),
    promoteSessions: ruleValue(a, 'academy-promote-sessions', PROMOTE_SESSIONS),
    scout: ruleValue(a, 'scout-line', 0) > 0,
    scoutWeak: ruleValue(a, 'scout-weak', 0) > 0,
    falseNine: ruleValue(a, 'false-nine', 0),
    twoFronts: ruleValue(a, 'rotation-two-fronts', 0) > 0,
    researchDuty: ruleValue(a, 'research-duty', 0),
  };
}
export const globeRules = (save: FbSave, bundles: Iterable<FbBundle>) => rulesFrom(activeFor(save, bundles));

/** What the hooks need from play.ts's world. */
export interface GlobeWorld {
  h: Health;
  save: FbSave;
  squad: FbSquadRow[];
  roster: Roster;
  ctx: Ctx;
  bundles: Map<string, FbBundle>;
  news: FbNews[];
}

/** True when `date` is an international break day: recorded in the save, so the day plays no matches. */
export function breakStarts(w: Pick<GlobeWorld, 'save' | 'news'>, date: DayKey): boolean {
  const s = w.save;
  const g = globeOf(s);
  if (g.breaks.some((b) => b.days.includes(date))) return true;
  const due = breakDue(s.phase, s.season, s.day, g.breaks);
  if (!due) return false;
  const have = g.breaks.find((b) => b.season === s.season && b.n === due.n);
  const breaks = have ? g.breaks.map((b) => (b === have ? { ...b, days: [...b.days, date] } : b)) : [...g.breaks, { season: s.season, n: due.n, days: [date] }];
  s.globe = { ...g, breaks: breaks.slice(-6) };
  if (!have) w.news.push({ id: `${date}:intl:${due.n}`, date, kind: 'club', text: `International break: three days with no league matches. Players go away on duty; two logged days in three brings something home.` });
  return true;
}
export const isBreakDay = (save: FbSave, date: DayKey) => globeOf(save).breaks.some((b) => b.days.includes(date));

/** The loans at the club on a day: those already here, plus any opened loan that starts that day. */
export function loansOn(save: FbSave, date: DayKey, rules: LoanRules): LoanStay[] {
  const g = globeOf(save);
  return atClub([...g.loans, ...startLoans(g.loans, userOf(save).opened, g.met, date, rules)], date);
}

/** Every day, after the tree: loans, trials, youngsters, nations and duty. Mutates the world it's given. */
export function globeDay(w: GlobeWorld, date: DayKey, season: number) {
  const s = w.save;
  const rules = globeRules(s, w.bundles.values());
  let g: GlobeEngine = { ...globeOf(s) };

  // 1. Loans: yesterday's last day goes home; opened loans start while there's a slot.
  for (const st of leavingOn(g.loans, date)) {
    const def = loanById(st.loan);
    if (def) w.news.push({ id: `${date}:loan-out:${st.key}`, date, kind: 'club', text: `${def.farewell} ${st.apps.length ? `${st.apps.length} ${st.apps.length === 1 ? 'game' : 'games'}${st.goals ? `, ${st.goals} ${st.goals === 1 ? 'goal' : 'goals'}` : ''}.` : 'No games this time: its habit never had a logged day.'}` });
  }
  // Fork 3: a market loan with a promise of minutes goes home with the days the promise broke (relations read it).
  if (g.loans.some((st) => st.market && st.promise && st.missed === undefined && st.until < date)) {
    g = { ...g, loans: g.loans.map((st) => (st.market && st.promise && st.missed === undefined && st.until < date
      ? { ...st, missed: missedDays(st.from, st.until, (d) => Boolean(nightFor(w.h, d).flags[st.unit]), (d) => (FORM_STATUSES as readonly string[]).includes(w.h.days.get(d)?.status ?? '')) }
      : st)) };
  }
  const started = startLoans(g.loans, userOf(s).opened, g.met, date, rules.loan);
  for (const st of started) {
    const def = loanById(st.loan)!;
    w.news.push({ id: `${date}:loan-in:${st.key}`, date, kind: 'club', text: `${st.back ? 'Back on loan. ' : ''}${def.arrival}` });
  }
  if (started.length) g = { ...g, loans: [...g.loans, ...started], met: [...new Set([...g.met, ...started.map((x) => x.loan)])] };

  // 2. Trials: trialists not tied in time leave kindly; then a trial day brings new ones.
  const sick = w.h.days.get(date)?.status === 'sick';
  w.squad = w.squad.map((y) => {
    if (y.status !== 'trial' || !y.trialUntil || y.trialUntil >= date) return y;
    w.news.push({ id: `${date}:trial-out:${y.id}`, date, kind: 'club', text: farewell(y) });
    return { ...y, status: 'left' as const, leftOn: date };
  });
  const kind = trialDay(date, rules.trials.extraDay);
  if (kind && s.phase === 'season' && !sick && !g.trials.some((t) => t.on === date)) {
    const week = sleepWeek(w.h, date, s.bedtime ?? undefined);
    const taken = new Set([...w.squad.map((y) => y.name), ...[...w.roster.values()].map((p) => p.name)].map((n) => n.trim().toLowerCase()));
    const came = trialists(YOUTH_POOL, week, date, season, taken, rules.trials, kind);
    w.squad = [...w.squad, ...came];
    g = { ...g, trials: [...g.trials, { on: date, style: week.style, came: came.map((y) => y.id) }].slice(-12) };
    if (came.length) w.news.push({ id: `${date}:trials`, date, kind: 'club', text: `${came.length === 1 ? 'One came' : `${came.length} came`} to the trials: ${came.map((y) => y.name).join(' and ')}. Tie them to a habit in the academy.` });
  }

  // 3. Youngsters: sessions from their habit, growth from kept bedtimes (×1.5 with a loan in the unit).
  w.squad = w.squad.map((y) => {
    const next = youthDay(w.h, y, date, s.bedtime, { mult: mentorFor(g.loans, date, y.axis), extra: rules.growthExtra, sessions: rules.promoteSessions });
    if (next.status === 'promoted' && y.status !== 'promoted') w.news.push({ id: `${date}:youth:${y.id}`, date, kind: 'club', text: `${y.name} joins the squad after ${next.sessions?.length ?? 0} sessions and a run of kept bedtimes.` });
    return next;
  });

  s.globe = g;
}

/** After the players' day: nations for new players, and duty on break days (settled after the third). */
export function globeAfterPlayers(w: GlobeWorld, date: DayKey) {
  const s = w.save;
  let g = globeOf(s);
  const nations = assignNations(g.nations, [...w.roster.values()].filter((p) => p.status !== 'left'));
  if (nations !== g.nations) g = { ...g, nations };
  const b = g.breaks.find((x) => x.days.includes(date));
  if (b) {
    // The first day of a break: the call-ups.
    if (!g.duty.some((d) => d.season === b.season && d.n === b.n)) {
      const ups = callUps(w.roster.values(), g.nations).map(({ player, nation }) => ({ season: b.season, n: b.n, player: player.id, name: player.name, nation, days: [] as DayKey[] }));
      g = { ...g, duty: [...g.duty, ...ups].slice(-DUTY_KEPT) };
    }
    g = { ...g, duty: g.duty.map((d) => (d.season === b.season && d.n === b.n && !d.settled && !d.days.includes(date) && w.roster.get(d.player) && loggedOn(w.h, w.roster.get(d.player)!, date) ? { ...d, days: [...d.days, date] } : d)) };
    if (b.days.length >= BREAK_DAYS && b.days[BREAK_DAYS - 1] === date) g = settleDuty(w, g, b.season, b.n, date);
  }
  s.globe = g;
}

/** Back from duty: a trait or +2 to an attribute for two logged days in three, a quiet line otherwise. */
function settleDuty(w: GlobeWorld, g: GlobeEngine, season: number, n: 1 | 2, date: DayKey): GlobeEngine {
  const rules = globeRules(w.save, w.bundles.values());
  let logged = 0;
  const duty = g.duty.map((d) => {
    if (d.season !== season || d.n !== n || d.settled) return d;
    const p = w.roster.get(d.player);
    if (!p) return { ...d, settled: 'quiet' as const };
    const def = playersOn(w.h, date).find((x) => x.id === p.id);
    const attrs = def ? ratingOf(w.ctx, { ...def, signed: p.signed }, date, { base: p.base, weights: p.weights })?.attrs ?? null : null;
    const r = dutyReward(p, d, attrs, date);
    const nation = nationByCode(d.nation)?.name ?? d.nation;
    const pick = (xs: string[]) => xs[hashSeed(d.player, date, 'duty') % xs.length];
    if (d.days.length) logged++;
    if (r.kind === 'quiet') {
      w.news.push({ id: `${date}:duty:${d.player}`, date, kind: 'club', text: pick(DUTY_QUIET).replace('{player}', p.name).replace('{nation}', nation) });
      return { ...d, settled: 'quiet' as const };
    }
    const { kind: _k, ...rec } = r;
    w.roster.set(p.id, { ...p, duty: [...(p.duty ?? []), rec] });
    const what = r.trait ? `New trait: ${traitById(r.trait)?.name}.` : `+${r.d} ${attrs?.find((a) => a.id === r.attr)?.label ?? r.attr}.`;
    w.news.push({ id: `${date}:duty:${d.player}`, date, kind: 'club', text: `${pick(DUTY_LINES).replace('{player}', p.name).replace('{nation}', nation)} ${what}` });
    return { ...d, settled: r.kind };
  });
  // Fan clubs abroad: research for each player logged on duty.
  if (rules.researchDuty && logged) {
    const eng = structuredClone(engineOf(w.save));
    const k = rules.researchDuty * logged;
    eng.earned += k;
    eng.gains = [...eng.gains, { on: date, n: k, why: 'duty' as const, note: 'International duty' }].slice(-60);
    w.save.tree = eng;
  }
  return { ...g, duty };
}

const farewell = (y: FbSquadRow) => FAREWELLS[rng(hashSeed('farewell', y.id))() * FAREWELLS.length | 0].replace('{name}', y.name);

/**
 * The season's end (spec §9.2 step 7): a youngster not promoted leaves with a farewell line, never a penalty. One that
 * arrived in the season's last four weeks hasn't had a season yet: it stays on for the next.
 */
export function globeSeasonEnd(w: Pick<GlobeWorld, 'squad' | 'news'>, date: DayKey, season: number) {
  w.squad = w.squad.map((y) => {
    if (y.status === 'trial') return { ...y, status: 'left' as const, leftOn: date };
    if (y.status !== 'growing' || y.season > season) return y;
    const arrived = y.id.match(/(\d{4}-\d{2}-\d{2})$/)?.[1];
    if (y.link && arrived && daysBetween(arrived, date) < 28) return { ...y, season: season + 1 };
    w.news.push({ id: `${date}:farewell:${y.id}`, date, kind: 'club', text: farewell(y) });
    return { ...y, status: 'left' as const, leftOn: date };
  });
}

/** Tonight's world: loans, False nine, Two fronts, and the loans' traits as abilities. */
export function globeNight(save: FbSave, bundles: Iterable<FbBundle>, date: DayKey, flags: AxisFlags, sick: boolean, rested?: string[]): Pick<NightOpts, 'loans' | 'logged' | 'falseNine' | 'rested'> {
  const rules = globeRules(save, bundles);
  const loans = loansOn(save, date, rules.loan);
  return {
    ...(loans.length ? { loans, logged: (u: Unit) => !sick && !flags[u] } : {}),
    ...(rules.falseNine ? { falseNine: rules.falseNine } : {}),
    ...(rested?.length && rules.twoFronts ? { rested } : {}),
  };
}
/** A loan's signature move plays while it's on the pitch (only the kinds the match engine plays). */
export function loanAbilities(save: FbSave, played: string[] | undefined, date: DayKey, rules: LoanRules): BraboAbility[] {
  const out: BraboAbility[] = [];
  for (const st of loansOn(save, date, rules).filter((x) => played?.includes(x.key))) {
    const def = loanById(st.loan);
    const e = def?.trait.effect;
    if (!def || e?.kind !== 'axis' || !playable(def.trait)) continue;
    out.push({ id: `loan:${def.id}`, name: `${def.trait.name} (${def.name})`, axis: e.axis, d: e.d, when: e.when as BraboAbility['when'], side: e.side });
  }
  return out;
}
/** After a match: the loans that played get the day and their goals. A loan that starts today is written in globeDay. */
export function globeMatch(save: FbSave, m: Pick<StoredMatch, 'date' | 'credits'>, played: string[] | undefined) {
  if (!played?.length) return;
  const g = globeOf(save);
  save.globe = {
    ...g,
    loans: g.loans.map((st) => {
      if (!played.includes(st.key)) return st;
      const goals = (m.credits ?? []).filter((c) => c.kind === 'goal' && c.player === loanPlayerId(st)).length;
      return { ...st, apps: st.apps.includes(m.date) ? st.apps : [...st.apps, m.date], goals: st.goals + goals };
    }),
  };
}

/** Players rested for the last league match: fresh for a continental night with Two fronts. */
export function restedForLeague(roster: Roster, last?: Pick<StoredMatch, 'xi'>): string[] {
  if (!last?.xi) return [];
  const played = new Set(last.xi.map((x) => x.player));
  return [...roster.values()].filter((p: FbPlayer) => p.status === 'squad' && p.kind === 'exercise' && !played.has(p.id)).map((p) => p.id);
}

/** Tomorrow's scout line when the Programme is researched (spec §9.5); the scout adds their weak spot. */
export function scoutFor(save: FbSave, bundles: Iterable<FbBundle>, opp: Pick<Opponent, 'id' | 'shrinks' | 'presses'> | undefined, oppName: string, date: DayKey): ScoutLine | undefined {
  const r = globeRules(save, bundles);
  if (!opp || !r.scout) return undefined;
  return scoutLine(opp, oppName, date, r.scoutWeak);
}
