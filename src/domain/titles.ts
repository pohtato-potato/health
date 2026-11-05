import { CREATURES, creatureById } from './creatureRoster';
import type { Sighting } from './creatures';
import { notesSoFar } from './creatures';
import { addDays, daysBetween, weekStart, type DayKey } from './dates';
import { regionAt } from './regions';
import { sleepMinutes } from './rings';
import type { Day, FoodEntry, ForecastRecord, SetEntry, Settings, TrainingSession, UsageEvent } from './types';
import { CHAPTERS, FINAL_KM, TOTAL_KM, kmFromSteps, setStride } from './walk';
import { dayRings, targetsFor } from '../state/derived';

/** Everything the titles are worked out from. None of it needs a match result. */
export const EMPTY_STATS = {
  boxToBoxDays: 0, swaps: 0, cleanStepWeeks: 0, bestRecordsInSession: 0, bestRingRun: 0, comebackWeeks: 0,
  fullPlanWeeksRun: 0, tickedSessions: 0, recordsAfterFullNight: 0, recordsOnLowReadiness: 0, lateProteinCloses: 0,
  mealsRun: 0, restAfterShortNight: 0, monthBests: 0, longestPlanDays: 0, bestRecordsInWeek: 0, plansThatWorked: 0,
  km: 0, regionsWalked: 0, loggedRun: 0, forecastsBeaten: 0, openMornings: 0, quickMornings: 0, edits: 0, recordWeeksRun: 0,
  sessions: 0, tempoSessions: 0, earlyRun: 0, fullNights: 0, proteinRun: 0, dalDays: 0,
  sickDaysLogged: 0, returns: 0, withinPlanWeeksRun: 0, bounceBacks: 0,
  stretchesCleared: 0, topVisits: 0, fieldNotes: 0, bestDawnWeek: 0,
};
export type TitleStats = typeof EMPTY_STATS;
export type TitleFamily = 'Football' | 'The road' | 'From Gremlin, grudgingly' | 'Doing the thing' | 'Slow days' | 'Visitors';
export interface TitleRule { id: string; name: string; how: string; family: TitleFamily; stat: keyof TitleStats; needs: number; rule: (s: TitleStats) => boolean }
export interface TitleInput {
  today: DayKey;
  settings: Settings;
  days: Day[];
  entries: FoodEntry[];
  sessions: TrainingSession[];
  sets: SetEntry[];
  sightings: Sighting[];
  forecasts: ForecastRecord[];
  usage: UsageEvent[];
  edits: number;
}

const LOW_READINESS = 40;
const FULL_NIGHT = 480;
const SHORT_NIGHT = 360;
const EARLY = 7 * 60;
const LATE_HOUR = 23;
const QUICK_SECONDS = 15;
const SALT_MARCH_KM = 390;
const BANDIT_KM = 350;

const FAMILIES: [TitleFamily, [string, string, keyof TitleStats, number][]][] = [
  ['Football', [
    ['Box-to-Box', 'A session and 10,000 steps on one day, five times', 'boxToBoxDays', 5],
    ['Super Sub', 'Swapped an exercise rather than skipping, 10 times', 'swaps', 10],
    ['Clean Sheet', 'Every step ring closed for a whole week', 'cleanStepWeeks', 1],
    ['Hat-Trick Hero', 'Three records in one session', 'bestRecordsInSession', 3],
    ['Golden Boot', 'One ring closed 20 days running', 'bestRingRun', 20],
    ['Comeback Kid', 'Beat your usual week after three below it', 'comebackWeeks', 1],
    ['Invincible', 'Eight weeks running with every planned session done', 'fullPlanWeeksRun', 8],
    ['Set-Piece Specialist', 'Every set of a session done, 10 times', 'tickedSessions', 10],
    ['Deep-Lying Playmaker', 'Slept 8 hours before 3 records', 'recordsAfterFullNight', 3],
    ['False Nine', 'Set a record on a day readiness said rest', 'recordsOnLowReadiness', 1],
    ['Last-Minute Winner', 'Closed protein after 11 pm, 5 times', 'lateProteinCloses', 5],
    ['Tiki-Taka', 'Logged every meal for a fortnight', 'mealsRun', 14],
    ['Park the Bus', 'Rested after a short night, 10 times', 'restAfterShortNight', 10],
    ['Treble Winner', 'Beat your best month for steps, three times', 'monthBests', 3],
    ['One-Club Legend', 'Stayed on one plan for 100 days', 'longestPlanDays', 100],
    ['Galáctico', 'Five records in a week', 'bestRecordsInWeek', 5],
    ['Gaffer', 'Changed your plan, and set a record on the new one', 'plansThatWorked', 1],
  ]],
  ['The road', [
    ['Salt Marcher', 'Walked the length of the Dandi march', 'km', SALT_MARCH_KM],
    ['Grand Trunk Regular', '1,000 km on the road', 'km', 1000],
    ['Dacoit of the Chambal', 'Crossed Bandit Country', 'km', BANDIT_KM],
    ['The Cartographer', 'Walked five regions', 'regionsWalked', 5],
    ["Land's End", 'Reached Kanyakumari', 'km', TOTAL_KM],
    ['Long Way Round', 'Finished a second route', 'km', CHAPTERS[1].end],
  ]],
  ['From Gremlin, grudgingly', [
    ['Disappointingly Consistent', '30 days logged in a row', 'loggedRun', 30],
    ['Statistically Annoying', 'Beat a forecast 5 times', 'forecastsBeaten', 5],
    ["Gremlin's Least Unfavourite", 'Opened the app 100 mornings', 'openMornings', 100],
    ['Eleven-Second Club', 'Morning log inside 15 seconds, 20 times', 'quickMornings', 20],
    ['The Auditor', 'Corrected 10 old numbers', 'edits', 10],
    ["Spreadsheet's Problem", 'A record every week for a month', 'recordWeeksRun', 4],
  ]],
  ['Doing the thing', [
    ['Iron Regular', '50 sessions', 'sessions', 50],
    ['Century', '100 sessions', 'sessions', 100],
    ['Tempo Merchant', 'Tempo coach on for 20 sessions', 'tempoSessions', 20],
    ['Early Kickoff', 'Up before 7 for two weeks', 'earlyRun', 14],
    ['Full Eight', 'Eight hours, 10 times', 'fullNights', 10],
    ['Protein Baron', 'Protein target 30 days running', 'proteinRun', 30],
    ['Dal Laureate', 'Logged dal 100 times', 'dalDays', 100],
  ]],
  ['Slow days', [
    ['Still Here', 'Logged on a sick day', 'sickDaysLogged', 1],
    ['The Returner', 'Came back after a week away', 'returns', 1],
    ['Rest Day Enforcer', 'Kept to your plan, no extra sessions, for four weeks', 'withinPlanWeeksRun', 4],
    ['Bounce Back', 'Beat your usual after a bad week', 'bounceBacks', 1],
  ]],
  ['Visitors', [
    ['Friend of the Plains', "Met every visitor of a stretch you've finished", 'stretchesCleared', 1],
    ["The Regular's Regular", 'Saw one visitor 20 times', 'topVisits', 20],
    ['Field Researcher', 'Collected 10 field notes', 'fieldNotes', 10],
    ['Dawn Patrol', 'Saw 5 dawn visitors in a week', 'bestDawnWeek', 5],
  ]],
];

const slug = (name: string) => name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const TITLE_DEFS: TitleRule[] = FAMILIES.flatMap(([family, list]) =>
  list.map(([name, how, stat, needs]) => ({
    id: `t:${slug(name)}`,
    name,
    how,
    family,
    stat,
    needs,
    rule: (s: TitleStats) => s[stat] >= needs,
  })),
);

export const earnedTitles = (s: TitleStats): Set<string> => new Set(TITLE_DEFS.filter((t) => t.rule(s)).map((t) => t.id));
export const titleName = (id: string | undefined): string | undefined => TITLE_DEFS.find((t) => t.id === id)?.name;

function bump<K>(m: Map<K, number>, k: K, by = 1) {
  m.set(k, (m.get(k) ?? 0) + by);
}
const maxOf = (m: Map<unknown, number>) => Math.max(0, ...m.values());

/** The longest run of consecutive dates among those passing `ok`. */
function longestRun(dates: DayKey[], ok: (d: DayKey) => boolean, step = 1): number {
  let best = 0;
  let cur = 0;
  let prev: DayKey | undefined;
  for (const d of [...dates].sort()) {
    if (!ok(d)) { cur = 0; prev = d; continue; }
    cur = prev && addDays(prev, step) === d ? cur + 1 : 1;
    best = Math.max(best, cur);
    prev = d;
  }
  return best;
}

export function titleStats(i: TitleInput): TitleStats {
  const s: TitleStats = { ...EMPTY_STATS };
  setStride(i.settings.strideM);
  const past = i.days.filter((d) => d.date <= i.today);
  const dayBy = new Map(past.map((d) => [d.date, d]));
  const done = i.sessions.filter((x) => x.status === 'done');
  const doneDates = new Set(done.map((x) => x.date));
  const foodBy = new Map<DayKey, FoodEntry[]>();
  for (const e of i.entries) foodBy.set(e.date, [...(foodBy.get(e.date) ?? []), e]);
  const records = i.sets.filter((x) => x.mark === '!!' && !x.skipped);
  const allDates = [...new Set([...past.map((d) => d.date), ...foodBy.keys()])];
  const hasPlan = !!i.settings.plan;

  // Rings, once per date.
  const rings = new Map(allDates.map((d) => [d, dayRings(i.settings, d, dayBy.get(d), foodBy.get(d) ?? []).rings]));

  // Steps and sessions together; weeks of closed rings.
  const stepWeeks = new Map<DayKey, number>();
  const stepTotals = new Map<DayKey, number>();
  for (const d of past) {
    if (d.steps === undefined) continue;
    if (d.steps >= 10000 && doneDates.has(d.date)) s.boxToBoxDays++;
    bump(stepTotals, weekStart(d.date), d.steps);
    if (rings.get(d.date)?.steps.closed) bump(stepWeeks, weekStart(d.date));
  }
  s.cleanStepWeeks = [...stepWeeks.values()].filter((n) => n === 7).length;

  // Records.
  const perSession = new Map<string, number>();
  const perWeek = new Map<DayKey, number>();
  for (const r of records) {
    bump(perSession, r.sessionId);
    bump(perWeek, weekStart(r.date));
    const night = dayBy.get(r.date)?.sleep;
    if (night && sleepMinutes(night.asleep, night.woke) >= FULL_NIGHT) s.recordsAfterFullNight++;
  }
  s.bestRecordsInSession = maxOf(perSession);
  s.bestRecordsInWeek = maxOf(perWeek);
  s.recordWeeksRun = longestRun([...perWeek.keys()], () => true, 7);
  const lowDays = new Set(done.filter((x) => x.readiness !== undefined && x.readiness < LOW_READINESS).map((x) => x.id));
  s.recordsOnLowReadiness = records.filter((r) => lowDays.has(r.sessionId)).length;

  // Sessions.
  s.sessions = done.length;
  for (const x of done) {
    s.swaps += (x.swapped ?? []).filter((w) => w.to !== null).length;
    if (x.tempo && Object.values(x.tempo).some(Boolean)) s.tempoSessions++;
  }
  const skipped = new Set(i.sets.filter((x) => x.skipped).map((x) => x.sessionId));
  const worked = new Set(i.sets.filter((x) => !x.skipped).map((x) => x.sessionId));
  s.tickedSessions = done.filter((x) => worked.has(x.id) && !skipped.has(x.id) && !x.short).length;
  const byPlan = new Map<string, DayKey[]>();
  for (const x of [...done].sort((a, b) => a.date.localeCompare(b.date))) byPlan.set(x.planName, [...(byPlan.get(x.planName) ?? []), x.date]);
  for (const dates of byPlan.values()) s.longestPlanDays = Math.max(s.longestPlanDays, dates.length > 1 ? daysBetween(dates[0], dates[dates.length - 1]) : 0);
  const planOf = new Map(done.map((x) => [x.id, x.planName]));
  const firstPlan = [...done].sort((a, b) => a.date.localeCompare(b.date))[0]?.planName;
  s.plansThatWorked = new Set(records.map((r) => planOf.get(r.sessionId)).filter((p) => p && p !== firstPlan)).size;

  // Weeks against the plan.
  const sessionWeeks = new Map<DayKey, number>();
  for (const x of done) bump(sessionWeeks, weekStart(x.date));
  if (hasPlan) {
    const weeks = [...sessionWeeks.keys()];
    const perWeekTarget = (w: DayKey) => targetsFor(i.settings, w).sessionsPerWeek;
    s.fullPlanWeeksRun = longestRun(weeks, (w) => perWeekTarget(w) > 0 && (sessionWeeks.get(w) ?? 0) >= perWeekTarget(w), 7);
    s.withinPlanWeeksRun = longestRun(weeks, (w) => (sessionWeeks.get(w) ?? 0) <= perWeekTarget(w), 7);
  }

  // Runs over days.
  const ring = (d: DayKey, k: 'steps' | 'protein') => !!rings.get(d)?.[k].closed;
  s.proteinRun = longestRun(allDates, (d) => ring(d, 'protein'));
  s.bestRingRun = Math.max(s.proteinRun, longestRun(allDates, (d) => ring(d, 'steps')));
  s.mealsRun = longestRun(allDates, (d) => {
    const meals = new Set((foodBy.get(d) ?? []).map((e) => e.meal));
    return meals.has('breakfast') && meals.has('lunch') && meals.has('dinner');
  });
  const isLogged = (d: Day) => d.steps !== undefined || !!d.sleep;
  const logged = past.filter(isLogged).map((d) => d.date).sort();
  s.loggedRun = longestRun(logged, () => true);
  for (let n = 1; n < logged.length; n++) if (daysBetween(logged[n - 1], logged[n]) - 1 >= 7) s.returns++;
  s.earlyRun = longestRun(past.filter((d) => d.sleep).map((d) => d.date), (d) => dayBy.get(d)!.sleep!.woke < EARLY);

  // Nights.
  for (const d of past) {
    if (d.morning?.seconds !== undefined && d.morning.seconds <= QUICK_SECONDS) s.quickMornings++;
    if (d.status === 'sick' && isLogged(d)) s.sickDaysLogged++;
    if (!d.sleep) continue;
    const m = sleepMinutes(d.sleep.asleep, d.sleep.woke);
    if (m >= FULL_NIGHT) s.fullNights++;
    if (m < SHORT_NIGHT && !doneDates.has(d.date)) s.restAfterShortNight++;
  }

  // Food.
  s.dalDays = i.entries.filter((e) => /\bdal\b/i.test(e.name)).length;
  for (const [d, list] of foodBy) {
    const target = targetsFor(i.settings, d).proteinG;
    const late = list.filter((e) => new Date(e.eatenAt ?? e.at).getHours() >= LATE_HOUR);
    if (!late.length) continue;
    const all = list.reduce((n, e) => n + e.protein, 0);
    const before = all - late.reduce((n, e) => n + e.protein, 0);
    if (all >= target && before < target) s.lateProteinCloses++;
  }

  // Weeks and months of steps.
  const weekList = [...stepTotals.keys()].sort();
  const totals = weekList.map((w) => stepTotals.get(w)!);
  const usual = [...totals].sort((a, b) => a - b)[Math.floor(totals.length / 2)] ?? 0;
  for (let n = 1; n < totals.length; n++) {
    if (totals[n] <= usual) continue;
    if (totals[n - 1] < usual * 0.7) s.bounceBacks++;
    if (n >= 3 && totals.slice(n - 3, n).every((v) => v < usual)) s.comebackWeeks++;
  }
  const months = new Map<string, number>();
  for (const d of past) if (d.steps) bump(months, d.date.slice(0, 7), d.steps);
  let best = 0;
  for (const m of [...months.keys()].sort()) {
    const v = months.get(m)!;
    if (best && v > best) s.monthBests++;
    best = Math.max(best, v);
  }

  // The road.
  s.km = kmFromSteps(past.reduce((n, d) => n + (d.steps ?? 0), 0));
  const reached = new Set<string>();
  for (let k = 0; k <= Math.min(s.km, FINAL_KM); k += 25) reached.add(regionAt(k));
  s.regionsWalked = s.km > 0 ? reached.size : 0;

  // Elsewhere.
  s.forecastsBeaten = i.forecasts.filter((f) => f.outcome !== undefined && f.outcome > f.high).length;
  s.edits = i.edits;
  const mornings = new Set<string>();
  for (const u of i.usage) {
    const t = new Date(u.at);
    if (u.kind === 'open' && t.getHours() < 12) mornings.add(t.toDateString());
  }
  s.openMornings = mornings.size;

  // Visitors.
  const visits = new Map<string, number>();
  const dawnWeek = new Map<DayKey, number>();
  for (const v of i.sightings) {
    bump(visits, v.creatureId);
    if (creatureById(v.creatureId)?.hours === 'dawn') bump(dawnWeek, weekStart(v.date));
  }
  s.topVisits = maxOf(visits);
  s.bestDawnWeek = maxOf(dawnWeek);
  const here = regionAt(s.km);
  for (const region of reached) {
    if (region === here) continue;
    const locals = CREATURES.filter((c) => c.region === region);
    if (locals.length && locals.every((c) => visits.has(c.id))) s.stretchesCleared++;
  }
  for (const [id, n] of visits) s.fieldNotes += notesSoFar(creatureById(id)?.notes ?? [], n).length;
  return s;
}
