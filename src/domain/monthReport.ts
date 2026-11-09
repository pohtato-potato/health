import type { Sighting } from './creatures';
import { parseDay, type DayKey } from './dates';
import { lastMonth, strongestWeek, surpriseRecord } from './film';
import { fmtInt } from './format';
import { dosesAllowPerfect } from './medicines';
import { sleepMinutes } from './rings';
import type { Day, FoodEntry, SetEntry, Settings, SongRecord, TrainingSession } from './types';
import { kmFromSteps, positionAt, setStride } from './walk';
import { dayRings } from '../state/derived';

export interface MonthInput {
  today: DayKey;
  settings: Settings;
  days: Day[];
  entries: FoodEntry[];
  sessions: TrainingSession[];
  sets: SetEntry[];
  sightings: Sighting[];
  songs: SongRecord[];
}
export type GradeWord = 'Strong' | 'Good' | 'Usual' | 'Easing' | 'Slipped';
export interface Grade { area: string; word: GradeWord; why: string }
export type FilmFrame =
  | { kind: 'number'; ground: string; big: string; color: string; small: string }
  | { kind: 'opening'; ground: string; title: string; small: string }
  | { kind: 'trail'; ground: string; fromKm: number; toKm: number; small: string }
  | { kind: 'stars'; ground: string; dates: DayKey[]; small: string }
  | { kind: 'credits'; ground: string; lines: [string, string][] }
  | { kind: 'assessment'; ground: string; grades: Grade[] };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthName = (m: string) => MONTHS[Number(m.slice(5)) - 1];
const inMonth = (m: string) => (x: { date: DayKey }) => x.date.startsWith(m);
const DONE = (s: TrainingSession) => s.status === 'done';
const MIN_NIGHTS = 7;

function byDate(entries: FoodEntry[]) {
  const m = new Map<DayKey, FoodEntry[]>();
  for (const e of entries) m.set(e.date, [...(m.get(e.date) ?? []), e]);
  return m;
}

function word(share: number): GradeWord {
  if (share >= 0.7) return 'Strong';
  if (share >= 0.5) return 'Good';
  if (share >= 0.3) return 'Usual';
  return 'Easing';
}

/** The month, marked in words. A grade only where there's data to mark. */
export function assessment(month: string, i: MonthInput): Grade[] {
  const days = i.days.filter(inMonth(month));
  const food = byDate(i.entries.filter(inMonth(month)));
  const dayBy = new Map(days.map((d) => [d.date, d]));
  const rings = (d: DayKey) => dayRings(i.settings, d, dayBy.get(d), food.get(d) ?? []);
  const out: Grade[] = [];
  const steps = days.filter((d) => d.steps !== undefined);
  if (steps.length) {
    const met = steps.filter((d) => rings(d.date).rings.steps.closed).length;
    out.push({ area: 'Steps', word: word(met / steps.length), why: `Goal met on ${met} of ${steps.length} days` });
  }
  const done = i.sessions.filter(inMonth(month)).filter(DONE);
  if (done.length && i.settings.plan) {
    const per = rings(`${month}-15`).targets.sessionsPerWeek || 3;
    const records = i.sets.filter(inMonth(month)).filter((s) => s.mark === '!!' && !s.skipped).length;
    const share = done.length / (per * (daysInMonth(month) / 7));
    out.push({ area: 'Training', word: word(share), why: `${done.length} sessions, ${records} records` });
  } else if (done.length) {
    out.push({ area: 'Training', word: 'Usual', why: `${done.length} sessions` });
  }
  if (food.size) {
    const met = [...food.keys()].filter((d) => rings(d).rings.protein.closed).length;
    out.push({ area: 'Food', word: word(met / food.size), why: `Protein met on ${met} of ${food.size} logged days` });
  }
  const nights = days.filter((d) => d.sleep);
  if (nights.length) {
    const met = nights.filter((d) => sleepMinutes(d.sleep!.asleep, d.sleep!.woke) >= rings(d.date).targets.sleepMin).length;
    out.push({ area: 'Sleep', word: word(met / nights.length), why: `Your target on ${met} of ${nights.length} nights` });
  }
  const drinkNights = (m: string) => new Set(i.entries.filter((e) => e.kind === 'drink' && e.date.startsWith(m)).map((e) => e.date)).size;
  const [now, was] = [drinkNights(month), drinkNights(previousMonth(month))];
  const answeredNone = i.days.filter((d) => d.date.startsWith(month) && d.noDrinks).length;
  if (now || (was && answeredNone)) {
    const n = `${now} night${now === 1 ? '' : 's'}`;
    out.push(now > was
      ? { area: 'Drinks', word: was ? 'Slipped' : 'Usual', why: was ? `${n}, up from ${was}` : n }
      : { area: 'Drinks', word: 'Good', why: !now ? `No drinks on the ${answeredNone} day${answeredNone === 1 ? '' : 's'} you answered, down from ${was} night${was === 1 ? '' : 's'}` : now === was ? `${n}, the same as last month` : `${n}, down from ${was}` });
  }
  return out;
}

const previousMonth = (m: string) => {
  const [y, n] = m.split('-').map(Number);
  return n === 1 ? `${y - 1}-12` : `${y}-${String(n - 1).padStart(2, '0')}`;
};

const NEXT: Record<string, string> = {
  Steps: 'A short walk after dinner on the slow days.',
  Training: 'One short session in the quiet part of the week.',
  Food: 'Protein at the first meal on the days you miss it.',
  Sleep: 'Bed half an hour earlier on training nights.',
  Drinks: 'Pick the nights for drinks at the start of the week.',
};
const RANK: GradeWord[] = ['Slipped', 'Easing', 'Usual', 'Good', 'Strong'];

/** One thing to try, from the month's weakest area. */
export function tryNext(grades: Grade[]): string | undefined {
  if (!grades.length) return undefined;
  const worst = [...grades].sort((a, b) => RANK.indexOf(a.word) - RANK.indexOf(b.word))[0];
  return NEXT[worst.area];
}

const daysInMonth = (m: string) => new Date(Number(m.slice(0, 4)), Number(m.slice(5)), 0).getDate();

export function monthSpread(month: string, i: MonthInput) {
  const sets = i.sets.filter(inMonth(month)).filter((s) => !s.skipped);
  const perWeekday = Array<number>(7).fill(0);
  for (const s of i.sessions.filter(inMonth(month)).filter(DONE)) perWeekday[(parseDay(s.date).getDay() + 6) % 7]++;
  const steps = i.days.filter(inMonth(month)).flatMap((d) => (d.steps === undefined ? [] : [d.steps]));
  const nights = i.days.filter(inMonth(month)).flatMap((d) => (d.sleep ? [sleepMinutes(d.sleep.asleep, d.sleep.woke)] : []));
  const food = byDate(i.entries.filter(inMonth(month)));
  const protein = [...food.values()].map((l) => l.reduce((n, e) => n + e.protein, 0));
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined);
  return {
    sets: sets.length,
    sessions: i.sessions.filter(inMonth(month)).filter(DONE).length,
    perWeekday,
    stepsAvg: mean(steps),
    stepsSeries: steps,
    proteinAvg: mean(protein),
    proteinSeries: protein,
    sleepAvg: mean(nights),
    sleepSeries: nights,
  };
}

export function topFives(month: string, i: MonthInput) {
  const steps = i.days.filter(inMonth(month)).filter((d) => d.steps).sort((a, b) => b.steps! - a.steps!).slice(0, 5).map((d) => ({ date: d.date, steps: d.steps! }));
  const lifts = new Map<string, number>();
  for (const s of i.sets.filter(inMonth(month))) if (!s.skipped && s.exercise) lifts.set(s.exercise, (lifts.get(s.exercise) ?? 0) + 1);
  return { steps, lifts: [...lifts].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, sets]) => ({ name, sets })) };
}

export function sleepProfile(month: string, i: MonthInput) {
  const nights = i.days.filter(inMonth(month)).flatMap((d) => (d.sleep ? [{ date: d.date, min: sleepMinutes(d.sleep.asleep, d.sleep.woke), woke: d.sleep.woke }] : []));
  if (nights.length < MIN_NIGHTS) return undefined;
  const sorted = [...nights].sort((a, b) => a.min - b.min);
  return {
    nights: nights.length,
    avg: Math.round(nights.reduce((n, x) => n + x.min, 0) / nights.length),
    shortest: sorted[0],
    longest: sorted[sorted.length - 1],
  };
}

const GROUND = {
  open: 'linear-gradient(160deg,#0f6b58,#123a63 62%,#3b1f6e)',
  road: 'linear-gradient(170deg,#0f7a6c,#134e4a 55%,#0b2b3f)',
  km: 'linear-gradient(150deg,#18a07c,#0f5f6b 60%,#123066)',
  sessions: 'linear-gradient(155deg,#6b43e0,#3a1f8f 58%,#1e1658)',
  records: 'linear-gradient(150deg,#c48a1d,#7a4b16 58%,#3a1f24)',
  best: 'linear-gradient(155deg,#f06a3c,#a12f5a 60%,#47205e)',
  week: 'linear-gradient(150deg,#d9408f,#6d2aa8 60%,#231a66)',
  surprise: 'linear-gradient(150deg,#b9851f,#8a3f22 60%,#3d1b3a)',
  met: 'linear-gradient(165deg,#0b1036,#141046 60%,#22124f)',
  stars: 'linear-gradient(170deg,#141a4a,#1f1456 60%,#4a1c58)',
  credits: 'linear-gradient(180deg,#0b0d1e,#1a1040)',
  grades: 'linear-gradient(165deg,#3a1f6e,#141a4a 70%)',
};

/** The month's film, frame by frame. A frame with nothing to say is left out. */
export function filmFrames(month: string, i: MonthInput): FilmFrame[] {
  setStride(i.settings.strideM);
  const name = monthName(month);
  const days = i.days.filter(inMonth(month)).filter((d) => d.steps !== undefined);
  const done = i.sessions.filter(inMonth(month)).filter(DONE);
  if (!days.length && !done.length) return [];
  const before = i.days.filter((d) => d.date < `${month}-01`).reduce((n, d) => n + (d.steps ?? 0), 0);
  const steps = days.reduce((n, d) => n + d.steps!, 0);
  const fromKm = kmFromSteps(before);
  const toKm = kmFromSteps(before + steps);
  const records = i.sets.filter(inMonth(month)).filter((s) => s.mark === '!!' && !s.skipped).length;
  const best = Math.max(0, ...days.map((d) => d.steps!));
  const out: FilmFrame[] = [];

  const plays = new Map<string, number>();
  for (const s of i.songs) {
    if (done.some((x) => s.at >= x.startedAt && s.at <= (x.endedAt ?? x.startedAt + 2 * 3_600_000))) plays.set(s.track, (plays.get(s.track) ?? 0) + 1);
  }
  const top = [...plays].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  out.push(top
    ? { kind: 'opening', ground: GROUND.open, title: `${name}, scored by ${top[0]}`, small: top[1] === 1 ? "Played once during sessions." : `Played ${top[1]} times during sessions.` }
    : { kind: 'opening', ground: GROUND.open, title: `Your ${name}`, small: 'The month, frame by frame.' });
  if (toKm > fromKm) {
    const [a, b] = [positionAt(fromKm).from.name, positionAt(toKm).from.name];
    out.push({ kind: 'trail', ground: GROUND.road, fromKm, toKm, small: a === b ? `Around ${b}: the month on the road.` : `From ${a} towards ${b}: the month on the road.` });
    out.push({ kind: 'number', ground: GROUND.km, big: fmtInt(toKm - fromKm), color: '#ffe27a', small: 'kilometres walked.' });
  }
  if (done.length) out.push({ kind: 'number', ground: GROUND.sessions, big: fmtInt(done.length), color: '#7ff0d0', small: 'sessions finished.' });
  if (records) out.push({ kind: 'number', ground: GROUND.records, big: fmtInt(records), color: '#ffe27a', small: `record${records === 1 ? '' : 's'} set.` });
  if (best) out.push({ kind: 'number', ground: GROUND.best, big: fmtInt(best), color: '#fff0a6', small: 'steps on your best day.' });
  const strong = strongestWeek(month, i.sets as Parameters<typeof strongestWeek>[1]);
  if (strong) out.push({ kind: 'number', ground: GROUND.week, big: `${fmtInt(strong.kg)} kg`, color: '#8ff0ff', small: `moved in your strongest week, from ${Number(strong.from.slice(8))} ${name}.` });
  const surprise = surpriseRecord(month, i.sets as Parameters<typeof surpriseRecord>[1]);
  if (surprise) out.push({ kind: 'number', ground: GROUND.surprise, big: `+${surprise.pct}%`, color: '#ffd77a', small: `${surprise.exercise}, ${surprise.from} to ${surprise.to} kg. The record you didn't see coming.` });
  const food = byDate(i.entries.filter(inMonth(month)));
  const dayBy = new Map(i.days.map((d) => [d.date, d]));
  const perfect = i.days.filter(inMonth(month)).filter((d) => d.date < i.today && food.has(d.date) && dayRings(i.settings, d.date, dayBy.get(d.date), food.get(d.date)!).rings.perfect && dosesAllowPerfect(i.settings, d)).map((d) => d.date);
  if (perfect.length) out.push({ kind: 'stars', ground: GROUND.stars, dates: perfect, small: `${perfect.length} perfect day${perfect.length === 1 ? '' : 's'}, joined into this month's stars.` });

  const lifts = topFives(month, i).lifts;
  const lines: [string, string][] = [['Starring', 'You']];
  if (lifts[0]) lines.push(['Stunts', lifts[0].name]);
  if (top) lines.push(['Original score', top[0]]);
  if (toKm > fromKm) lines.push(['Filmed on location', positionAt(toKm).from.name]);
  out.push({ kind: 'credits', ground: GROUND.credits, lines });
  out.push({ kind: 'assessment', ground: GROUND.grades, grades: assessment(month, i) });
  return out;
}

/** Finished months with anything logged, newest first. */
export function monthsWithData(days: Day[], today: DayKey): string[] {
  const latest = lastMonth(today);
  return [...new Set(days.filter((d) => d.steps !== undefined || d.sleep).map((d) => d.date.slice(0, 7)))].filter((m) => m <= latest).sort().reverse();
}

