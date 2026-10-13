import { byMonth, count, countDays, isPalindrome, longestRun, setScore, type AchStats, type DayStat } from './achStats';
import { addDays, daysBetween, weekStart, weekday, type DayKey } from './dates';
import { FESTIVALS } from './festivals';
import { fmtInt } from './format';
import { exerciseMark } from './marks';
import { findExercise, groupExercises, isSuperset, topOfRange } from './plan';
import { triggerMet } from './progression';
import { targetsOn } from './rings';
import type { SetEntry, Settings } from './types';
import { QUAD_DONE_KM, STRIDE_M, statesReached } from './walk';

export type Category = 'start' | 'steps' | 'india' | 'training' | 'strength' | 'food' | 'water' | 'sleep' | 'body' | 'streaks' | 'nights' | 'joints' | 'data' | 'secret';
export type Tier = 'b' | 's' | 'g' | 'p';

export const CATEGORIES: { id: Category; name: string; icon: 'sun' | 'steps' | 'journey' | 'train' | 'trend' | 'food' | 'water' | 'sleep' | 'tape' | 'shield' | 'night' | 'check' | 'save' | 'win' }[] = [
  { id: 'start', name: 'Getting started', icon: 'sun' },
  { id: 'steps', name: 'Steps', icon: 'steps' },
  { id: 'india', name: 'Walk across India', icon: 'journey' },
  { id: 'training', name: 'Training', icon: 'train' },
  { id: 'strength', name: 'Strength', icon: 'trend' },
  { id: 'food', name: 'Food and protein', icon: 'food' },
  { id: 'water', name: 'Water', icon: 'water' },
  { id: 'sleep', name: 'Sleep', icon: 'sleep' },
  { id: 'body', name: 'Body', icon: 'tape' },
  { id: 'streaks', name: 'Streaks', icon: 'shield' },
  { id: 'nights', name: 'Nights out', icon: 'night' },
  { id: 'joints', name: 'Joints', icon: 'check' },
  { id: 'data', name: 'Data', icon: 'save' },
  { id: 'secret', name: 'Secret', icon: 'win' },
];

type Text = string | ((s: AchStats) => string);

export interface AchDef {
  id: string;
  cat: Category;
  name: string;
  desc: Text;
  tier: Tier;
  reward?: string;
  /** A secret's hint, shown before it's found. */
  hint?: string;
  test: (s: AchStats) => boolean;
  /** How close you are, for "Nearly there". */
  progress?: (s: AchStats) => [number, number];
  /** Needs a feature that hasn't arrived yet, so it can't be earned for now. */
  soon?: boolean;
}

export const text = (t: Text, s: AchStats) => (typeof t === 'function' ? t(s) : t);

const slug = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// Shared measures.
const finished = (s: AchStats) => s.daily.filter((d) => d.date < s.today);
const stepDays = (s: AchStats) => s.daily.filter((d) => d.steps !== undefined);
const home2 = (s: AchStats) => s.settings.homes[1];
const hourOf = (ts: number) => new Date(ts).getHours() + new Date(ts).getMinutes() / 60;
const matching = (s: AchStats, re: RegExp) => s.entries.filter((e) => re.test(e.name)).length;
const setsBySession = (s: AchStats) => {
  const m = new Map<string, SetEntry[]>();
  for (const x of s.sets) m.set(x.sessionId, [...(m.get(x.sessionId) ?? []), x]);
  return m;
};
const byExercise = (sets: SetEntry[]) => {
  const m = new Map<string, SetEntry[]>();
  for (const x of sets) if (!x.drop) m.set(x.exerciseId, [...(m.get(x.exerciseId) ?? []), x]);
  return m;
};
const hands = (s: AchStats, id: string) => (s.settings.plan && findExercise(s.settings.plan, id)?.load === 'pair' ? 2 : 1);
const kgMoved = (s: AchStats, sets: SetEntry[]) => sets.reduce((n, x) => n + (x.loadKg ?? 0) * (x.reps ?? 0) * hands(s, x.exerciseId), 0);
const waists = (s: AchStats) => s.measurements.filter((m) => m.waistStanding !== undefined).sort((a, b) => a.date.localeCompare(b.date));
const latestWaist = (s: AchStats) => waists(s).at(-1)?.waistStanding;
const waistBelow = (s: AchStats, by: number) => s.baselineWaist !== undefined && latestWaist(s) !== undefined && latestWaist(s)! <= s.baselineWaist - by + 1e-9;
const trendDrop = (s: AchStats) => (s.trend.length ? s.trend[0].trend - Math.min(...s.trend.map((t) => t.trend)) : 0);
const sleptDays = (s: AchStats) => s.daily.filter((d) => d.day?.sleep);
const circ = (a: number, b: number) => {
  const d = Math.abs(a - b) % 1440;
  return Math.min(d, 1440 - d);
};
const median = (xs: number[]) => {
  const v = [...xs].sort((a, b) => a - b);
  return v.length ? v[Math.floor(v.length / 2)] : 0;
};
const wake = (d: DayStat) => d.day!.sleep!.woke;
const asleep = (d: DayStat) => d.day!.sleep!.asleep;
const tshirt = (s: AchStats) => s.checkins.map((c) => c.tshirt).filter((t): t is NonNullable<typeof t> => !!t);
const cityReached = (name: string) => (s: AchStats) => s.cities.includes(name);
const sessionsOf = (s: AchStats, i: number) => {
  const id = s.settings.plan?.sessions[i]?.id;
  return id ? s.sessions.filter((x) => x.session === id).length : 0;
};
const planSessionName = (s: AchStats, i: number) => s.settings.plan?.sessions[i]?.name ?? (i === 0 ? 'Session A' : 'Session B');
const flagCount = (s: AchStats) => s.sessions.filter((x) => x.flags?.length).length + s.daily.filter((d) => Object.values(d.day?.answers ?? {}).some(Boolean)).length;
const timed = (s: AchStats) => s.settings.plan?.sessions.flatMap((x) => x.exercises).filter((e) => e.seconds) ?? [];
const openEx = (s: AchStats) => s.settings.plan?.sessions.flatMap((x) => x.exercises).filter((e) => e.open) ?? [];

/** Marks per exercise in a session, from the saved set marks. */
function exerciseMarks(sets: SetEntry[]) {
  return [...byExercise(sets).values()].map((xs) => exerciseMark(xs));
}

/** Every record set, with the best that came before it. */
function recordJumps(s: AchStats) {
  const out: { set: SetEntry; prevLoad: number; prevVal: number }[] = [];
  const bestLoad = new Map<string, number>();
  const bestVal = new Map<string, Map<number, number>>();
  for (const x of s.sets) {
    if (x.drop) continue;
    const key = `${x.exerciseId}|${x.exercise}|${x.side}`;
    const v = x.reps ?? x.seconds ?? 0;
    const kg = x.loadKg ?? 0;
    if (x.mark === '!!') out.push({ set: x, prevLoad: bestLoad.get(key) ?? 0, prevVal: bestVal.get(key)?.get(kg) ?? 0 });
    bestLoad.set(key, Math.max(bestLoad.get(key) ?? 0, kg));
    const m = bestVal.get(key) ?? new Map<number, number>();
    m.set(kg, Math.max(m.get(kg) ?? 0, v));
    bestVal.set(key, m);
  }
  return out;
}

const A: AchDef[] = [];
function a(cat: Category, name: string, desc: Text, tier: Tier, test: AchDef['test'], extra: Partial<AchDef> = {}) {
  A.push({ id: slug(name), cat, name, desc, tier, test, ...extra });
}

// Getting started
a('start', "It's dangerous to go alone", 'Finish setting up Health.', 'b', (s) => s.settings.setupDone);
a('start', 'Hello, world', 'Log your very first entry of anything.', 'b', (s) => s.daily.some((d) => d.logged));
a('start', 'Home screen hero', 'Install Health and open it from its home-screen icon.', 'b', (s) => count(s, 'standalone') > 0);
a('start', 'Tutorial complete', 'Log weight, steps, food and a workout on the same day.', 'b', (s) =>
  s.daily.some((d) => d.day?.weightKg !== undefined && d.steps !== undefined && d.entries.length > 0 && d.trained),
);
a('start', 'First light', 'Complete your first morning log.', 'b', (s) => s.daily.some((d) => d.day?.morning));
a('start', 'Voice of reason', 'Try all four voices.', 'b', (s) => (s.counters.get('voices')?.values?.length ?? 0) >= 4, {
  progress: (s) => [s.counters.get('voices')?.values?.length ?? 0, 4],
});

// Steps
a('steps', 'One small step', 'Log steps for the first time.', 'b', (s) => stepDays(s).length > 0);
a('steps', 'Walk it off', 'Hit your step goal for the first time.', 'b', (s) => s.daily.some((d) => d.stepsOk));
a('steps', 'Lap of honour', 'Measure your walking loop at home.', 'b', (s) => !!s.settings.loopSteps);
a('steps', 'Comeback kid', 'Hit your step goal the day after missing it.', 'b', (s) =>
  s.daily.some((d, i) => i > 0 && d.stepsOk && s.daily[i - 1].steps !== undefined && !s.daily[i - 1].stepsOk),
);
a('steps', 'Weekend warrior', 'Hit your step goal on both days of a weekend.', 'b', (s) =>
  s.daily.some((d, i) => weekday(d.date) === 5 && d.stepsOk && s.daily[i + 1]?.stepsOk),
);
a('steps', 'Lakhpati', 'Walk 1,00,000 steps in total.', 'b', (s) => s.totalSteps >= 1e5, { progress: (s) => [s.totalSteps, 1e5], reward: 'The ‘Lakhpati’ title' });
a('steps', "It's over 9,000!", 'Log more than 9,000 steps in an entry made before noon.', 's', (s) => count(s, 'steps-9000-by-noon') > 0);
a('steps', 'Twenty-20', 'Walk 20,000 steps in a day.', 's', (s) => stepDays(s).some((d) => d.steps! >= 20000));
a('steps', 'Saturday Night Fever', 'Walk 15,000 steps on a Saturday.', 's', (s) => stepDays(s).some((d) => weekday(d.date) === 5 && d.steps! >= 15000));
a('steps', 'Seven-day week', 'Hit your step goal every day from Monday to Sunday.', 's', (s) =>
  s.daily.some((d, i) => weekday(d.date) === 0 && [0, 1, 2, 3, 4, 5, 6].every((k) => s.daily[i + k]?.stepsOk)),
);
a('steps', 'Step Brothers', 'Two days in a row within 100 steps of each other.', 's', (s) =>
  s.daily.some((d, i) => i > 0 && d.steps !== undefined && s.daily[i - 1].steps !== undefined && d.steps >= 1000 && Math.abs(d.steps - s.daily[i - 1].steps!) <= 100),
);
a('steps', 'Personal best', 'Beat your best-ever step day.', 's', (s) => {
  let best = 0;
  let n = 0;
  for (const d of stepDays(s)) {
    if (n >= 7 && d.steps! > best) return true;
    best = Math.max(best, d.steps!);
    n++;
  }
  return false;
});
a('steps', 'Ten lakh club', 'Walk 10,00,000 steps in total.', 's', (s) => s.totalSteps >= 1e6, { progress: (s) => [s.totalSteps, 1e6] });
a('steps', 'Naatu Naatu', 'Walk 25,000 steps in a day. The feet are dancing now.', 'g', (s) => stepDays(s).some((d) => d.steps! >= 25000));
a('steps', 'Half marathon', 'Walk 21.1 km in a single day.', 'g', (s) => stepDays(s).some((d) => d.steps! * STRIDE_M >= 21100));
a('steps', '400K club', 'Walk 4,00,000 steps in one calendar month.', 'g', (s) =>
  [...byMonth(s.daily).values()].some((ds) => ds.reduce((n, d) => n + (d.steps ?? 0), 0) >= 4e5),
);
a('steps', 'Lord of the laps', 'Walk 10,000 laps of your loop at home in total.', 'g', (s) => !!s.settings.loopSteps && s.totalSteps / s.settings.loopSteps >= 1e4, {
  progress: (s) => [s.settings.loopSteps ? s.totalSteps / s.settings.loopSteps : 0, 1e4],
});
a(
  'steps',
  'Kaun Banega Crorepati',
  (s) => {
    const perDay = stepDays(s).slice(-30).reduce((n, d) => n + d.steps!, 0) / Math.max(1, Math.min(30, stepDays(s).length));
    const months = perDay > 0 ? Math.round((1e7 - s.totalSteps) / perDay / 30.4) : 0;
    return `Walk 1,00,00,000 steps in total.${months > 0 ? ` At your pace, about ${months} months.` : ''}`;
  },
  'p',
  (s) => s.totalSteps >= 1e7,
  { reward: 'The ‘Crorepati’ title', progress: (s) => [s.totalSteps, 1e7] },
);

// Walk across India
a('india', 'Pack your bags', 'Start your walk across India.', 'b', (s) => s.km > 0);
a('india', 'Wah Taj!', 'Reach Agra, about 230 km from Delhi.', 'b', cityReached('Agra'), { progress: (s) => [s.km, 230] });
a('india', 'Fortified', 'Reach Gwalior and its hilltop fort.', 'b', cityReached('Gwalior'), { progress: (s) => [s.km, 350] });
a('india', 'City of Lakes', 'Reach Bhopal.', 's', cityReached('Bhopal'), { progress: (s) => [s.km, 770] });
a('india', 'Zero Mile', 'Reach Nagpur, home of the Zero Mile Stone.', 's', cityReached('Nagpur'), { progress: (s) => [s.km, 1120] });
a('india', 'Biryani checkpoint', 'Reach Hyderabad.', 's', cityReached('Hyderabad'), { progress: (s) => [s.km, 1620] });
a('india', 'State of mind', 'Enter your fifth state or union territory.', 's', (s) => s.states >= 5, { progress: (s) => [s.states, 5] });
a('india', 'Postcard collector', 'Collect 25 city postcards.', 's', (s) => s.cities.length >= 25, { progress: (s) => [s.cities.length, 25] });
a('india', 'Namma Bengaluru', 'Reach Bengaluru.', 'g', cityReached('Bengaluru'), { progress: (s) => [s.km, 2190] });
a('india', 'Temple Run', 'Reach Madurai, home of the Meenakshi Temple.', 'g', cityReached('Madurai'), { progress: (s) => [s.km, 2625] });
a('india', 'Chak De! India', 'Enter 10 states.', 'g', (s) => s.states >= 10, { progress: (s) => [s.states, 10] });
a('india', 'Mumbai Meri Jaan', 'Reach Mumbai on the Golden Quadrilateral.', 'g', cityReached('Mumbai'));
a('india', 'Chennai Express', 'Reach Chennai.', 'g', cityReached('Chennai'));
a('india', 'City of Joy', 'Reach Kolkata.', 'g', cityReached('Kolkata'));
a('india', 'One does not simply walk to Kanyakumari', 'But you did: about 2,870 km from Delhi to the southern tip.', 'p', cityReached('Kanyakumari'), {
  reward: 'The Kanyakumari sunrise theme',
  progress: (s) => [s.km, 2870],
});
a('india', 'Quad goals', 'Complete the Golden Quadrilateral, about 5,850 km.', 'p', (s) => s.km >= QUAD_DONE_KM, {
  reward: 'A gold route on your map',
  progress: (s) => [Math.max(0, s.km - (QUAD_DONE_KM - 5850)), 5850],
});
a('india', 'Kashmir to Kanyakumari', 'Walk 3,214 km in total, the length of India.', 'p', (s) => s.km >= 3214, { progress: (s) => [s.km, 3214] });
a('india', 'Incredible !ndia', 'Visit all 28 states.', 'p', (s) => statesReached(s.km).filter((x) => !x.ut).length >= 28, { progress: (s) => [statesReached(s.km).filter((x) => !x.ut).length, 28] });
a('india', 'Unity in diversity', 'Visit all 36 states and union territories.', 'p', (s) => statesReached(s.km).length >= 36, { reward: 'Tricolour confetti', progress: (s) => [statesReached(s.km).length, 36] });
a(
  'india',
  'Around the world',
  (s) => {
    const perDay = (stepDays(s).slice(-30).reduce((n, d) => n + d.steps!, 0) * STRIDE_M) / 1000 / Math.max(1, Math.min(30, stepDays(s).length));
    const years = perDay > 0 ? Math.round((40075 - s.km) / perDay / 365) : 0;
    return `Walk 40,075 km in total.${years > 0 ? ` Expected arrival: about ${years} years from now.` : ''}`;
  },
  'p',
  (s) => s.km >= 40075,
  { progress: (s) => [s.km, 40075] },
);
a('india', 'Moonwalker', 'Walk the 384,400 km to the Moon. Expected arrival: next century.', 'p', (s) => s.km >= 384400, { reward: 'The Moonlight theme' });

// Training
a('training', 'Day one', 'Complete your first session.', 'b', (s) => s.sessions.length >= 1);
a('training', 'Got your back', (s) => `Complete 10 ${planSessionName(s, 0)}s.`, 'b', (s) => sessionsOf(s, 0) >= 10, { progress: (s) => [sessionsOf(s, 0), 10] });
a('training', 'Never skip leg day', (s) => `Complete 10 ${planSessionName(s, 1)}s.`, 'b', (s) => sessionsOf(s, 1) >= 10, { progress: (s) => [sessionsOf(s, 1), 10] });
a('training', 'Something beats nothing', 'Pick a short session over skipping, five times.', 'b', (s) => s.sessions.filter((x) => x.short).length >= 5, {
  progress: (s) => [s.sessions.filter((x) => x.short).length, 5],
});
a(
  'training',
  'Plank you very much',
  (s) => {
    const e = timed(s).find((x) => x.perSide);
    return e ? `Hold the ${e.name.toLowerCase()} for ${topOfRange(e)} s on both sides.` : 'Reach the top of a timed hold on both sides.';
  },
  'b',
  (s) =>
    timed(s)
      .filter((e) => e.perSide)
      .some((e) => [...setsBySession(s).values()].some((xs) => ['L', 'R'].every((side) => xs.some((x) => x.exerciseId === e.id && x.side === side && (x.seconds ?? 0) >= topOfRange(e)!)))),
);
a(
  'training',
  'Carry on',
  (s) => {
    const e = timed(s).find((x) => x.load === 'pair' || x.load === 'single');
    return e ? `${e.name} for ${topOfRange(e)} s with ${e.startKg} kg${e.load === 'pair' ? ' in each hand' : ''}.` : 'Reach the top of a timed carry with dumbbells.';
  },
  'b',
  (s) =>
    timed(s)
      .filter((e) => e.load === 'pair' || e.load === 'single')
      .some((e) => s.sets.some((x) => x.exerciseId === e.id && (x.seconds ?? 0) >= topOfRange(e)! && (x.loadKg ?? 0) >= (e.startKg ?? 0))),
);
a('training', 'Full house', 'Finish every exercise in a full session.', 'b', (s) => {
  const by = setsBySession(s);
  return s.sessions.some((x) => !x.short && x.exercises.length > 0 && x.exercises.every((id) => by.get(x.id)?.some((y) => y.exerciseId === id)));
});
a('training', 'Sheesh', 'Beat last time on every exercise in one session.', 's', (s) =>
  [...setsBySession(s).values()].some((xs) => {
    const marks = exerciseMarks(xs);
    return marks.length >= 3 && marks.every((m) => m === '!' || m === '!!');
  }),
);
a('training', 'Hat-trick', 'Set three records in one session.', 's', (s) =>
  [...setsBySession(s).values()].some((xs) => new Set(xs.filter((x) => x.mark === '!!').map((x) => x.exerciseId)).size >= 3),
);
a('training', 'Half-century', 'Complete 50 sessions.', 's', (s) => s.sessions.length >= 50, { progress: (s) => [s.sessions.length, 50] });
a('training', 'Super Set Saiyan', 'Finish 50 supersets.', 's', (s) => supersetsDone(s) >= 50, { progress: (s) => [supersetsDone(s), 50] });
a('training', 'Time under tension', 'Do 100 sets with the 3-second lowering.', 's', (s) => s.sets.filter((x) => x.tempo).length >= 100, {
  progress: (s) => [s.sets.filter((x) => x.tempo).length, 100],
});
a('training', "Director's cut", 'Record 10 form clips.', 's', (s) => s.clips >= 10, { progress: (s) => [s.clips, 10] });
a('training', 'Elephant in the room', "Move 5,000 kg in one week. That's roughly an elephant.", 's', (s) => {
  const weeks = new Map<DayKey, SetEntry[]>();
  for (const x of s.sets) weeks.set(weekStart(x.date), [...(weeks.get(weekStart(x.date)) ?? []), x]);
  return [...weeks.values()].some((xs) => kgMoved(s, xs) >= 5000);
});
a('training', 'Chill pill', (s) => `Train exactly ${s.weeks.perWeek} times a week, rest days kept, for four weeks.`, 's', (s) => {
  const counts = weekCounts(s);
  let run = 0;
  for (const [, n] of counts) {
    run = n === s.weeks.perWeek ? run + 1 : 0;
    if (run >= 4) return true;
  }
  return false;
});
a('training', 'Century', 'Complete 100 sessions.', 'g', (s) => s.sessions.length >= 100, { progress: (s) => [s.sessions.length, 100] });
a('training', '10K club', 'Log 10,000 reps in total.', 'g', (s) => totalReps(s) >= 1e4, { progress: (s) => [totalReps(s), 1e4] });
a('training', 'Heavy metal', 'Move 1,00,000 kg in total.', 'g', (s) => kgMoved(s, s.sets) >= 1e5, { progress: (s) => [kgMoved(s, s.sets), 1e5] });
a('training', 'Double century', 'Complete 200 sessions.', 'p', (s) => s.sessions.length >= 200, { progress: (s) => [s.sessions.length, 200] });

// Strength
a('strength', 'Level up', 'Accept your first ‘go heavier’ suggestion.', 'b', (s) => {
  for (const xs of byExerciseSessions(s).values()) {
    for (let i = 1; i < xs.length; i++) if (xs[i].load > xs[i - 1].load && xs[i - 1].load > 0) return true;
  }
  return false;
});
a('strength', 'Plate expectations', 'Switch on new plates in Settings.', 'b', (s) => count(s, 'plates-on') > 0);
a('strength', 'Kickstarted', 'Graduate to a harder version of an exercise.', 's', (s) => Object.values(s.settings.planState.variants).some((v) => v > 0));
a('strength', 'Push it', (s) => `Reach 12 clean ${openEx(s)[0]?.name.toLowerCase() ?? 'push-up'}s.`, 's', (s) => openEx(s).some((e) => s.sets.some((x) => x.exerciseId === e.id && (x.reps ?? 0) >= 12)));
a('strength', 'Lower the table', (s) => `Reach 20 clean ${openEx(s)[0]?.name.toLowerCase() ?? 'push-up'}s.`, 's', (s) => openEx(s).some((e) => s.sets.some((x) => x.exerciseId === e.id && (x.reps ?? 0) >= 20)));
a('strength', 'Stonks', 'Raise your strength score on five exercises in one month.', 's', (s) => {
  for (const month of new Set(s.sets.map((x) => x.date.slice(0, 7)))) {
    let up = 0;
    for (const [, xs] of byExercise(s.sets)) {
      const before = xs.filter((x) => x.date.slice(0, 7) < month).map(setScore);
      const during = xs.filter((x) => x.date.slice(0, 7) === month).map(setScore);
      if (before.length && during.length && Math.max(...during) > Math.max(...before)) up++;
    }
    if (up >= 5) return true;
  }
  return false;
});
a('strength', 'Doubled', 'Double your starting load on any exercise.', 'g', (s) =>
  s.sets.some((x) => {
    const e = s.settings.plan ? findExercise(s.settings.plan, x.exerciseId) : undefined;
    return !!e?.startKg && (x.loadKg ?? 0) >= e.startKg * 2;
  }),
);
a('strength', 'Strength in numbers', 'Raise your total strength score 25% above day one.', 'g', (s) => {
  let first = 0;
  let best = 0;
  for (const [, xs] of byExercise(s.sets)) {
    const sessions = [...new Set(xs.map((x) => x.sessionId))];
    if (sessions.length < 2) continue;
    first += Math.max(...xs.filter((x) => x.sessionId === sessions[0]).map(setScore));
    best += Math.max(...xs.map(setScore));
  }
  return first > 0 && best >= first * 1.25;
});
a(
  'strength',
  'Mission: Gym-possible',
  (s) => {
    const t = s.settings.plan?.triggers?.[0];
    return t ? `Hit your plan’s trigger: ${t.message.split('.')[0]}.` : 'Hit the trigger in your training plan.';
  },
  'p',
  (s) => !!s.settings.plan?.triggers?.some((t) => triggerMet(t, s.sets)),
  { reward: 'Gym mode, and the ‘Gym-possible’ title' },
);

// Food and protein
a('food', 'First bite', 'Log your first meal.', 'b', (s) => s.entries.length > 0);
a('food', 'Protein mode: on', 'Close your protein ring for the first time.', 'b', (s) => s.daily.some((d) => d.proteinOk), {
  progress: (s) => [Math.max(0, ...s.daily.map((d) => d.protein)), targetsOn(s.settings.targets, s.today)?.proteinG ?? 1],
});
a('food', "What's left?", 'Use ‘What can I still eat?’ 10 times.', 'b', (s) => count(s, 'whatsleft') >= 10, { progress: (s) => [count(s, 'whatsleft'), 10] });
a('food', "Chef's kiss", 'Log a whole day from your saved foods.', 'b', (s) =>
  finished(s).some((d) => d.entries.length >= 3 && d.entries.every((e) => e.kind === 'food' && e.foodId) && new Set(d.entries.map((e) => e.meal)).size >= 3),
);
a('food', 'Kitne gram the?', (s) => `Hit exactly ${targetsOn(s.settings.targets, s.today)?.proteinG ?? 'your target in'} g of protein, to the gram.`, 's', (s) =>
  s.daily.some((d) => d.targets && d.entries.length && Math.round(d.protein) === d.targets.proteinG),
);
a('food', 'The Lunchbox', 'Log 100 g of protein before 2 pm.', 's', (s) => s.daily.some((d) => d.entries.filter((e) => hourOf(e.at) < 14).reduce((n, e) => n + e.protein, 0) >= 100));
a('food', 'Breakfast of champions', 'Eat 40 g of protein before 11 am on 10 days.', 's', (s) => proteinMornings(s) >= 10, { progress: (s) => [proteinMornings(s), 10] });
a('food', 'Close call', 'Finish a day within 25 kcal under your calorie ceiling.', 's', (s) =>
  finished(s).some((d) => d.targets && d.entries.length && d.kcal <= d.targets.kcalMax && d.kcal >= d.targets.kcalMax - 25),
);
a('food', 'Let him cook', 'Log 25 meals made entirely from your saved foods.', 's', (s) => ownMeals(s) >= 25, { progress: (s) => [ownMeals(s), 25] });
a('food', 'MasterChef', 'Add 10 of your own foods or recipes.', 's', (s) => ownFoods(s) >= 10, { progress: (s) => [ownFoods(s), 10] });
a('food', "Gotta log 'em all", 'Log 50 different foods.', 's', (s) => distinctFoods(s) >= 50, { progress: (s) => [distinctFoods(s), 50] });
a('food', 'Winner winner chicken dinner', 'Log chicken 50 times.', 's', (s) => matching(s, /chicken/i) >= 50, { progress: (s) => [matching(s, /chicken/i), 50] });
a('food', 'Amul-ya', 'Log 50 Amul shakes. The name means priceless.', 's', (s) => matching(s, /amul/i) >= 50, { progress: (s) => [matching(s, /amul/i), 50] });
a('food', 'Chana jor garam', 'Log chana 30 times.', 's', (s) => matching(s, /chana/i) >= 30, { progress: (s) => [matching(s, /chana/i), 30] });
a('food', 'Ghar ka khana', (s) => `Log 20 meals at ${home2(s)?.name ?? 'your other home'}.`, 's', (s) => home2Meals(s) >= 20, { progress: (s) => [home2Meals(s), 20] });
a('food', 'Mere paas maa hai', (s) => `Spend 30 days at ${home2(s)?.name ?? 'your other home'}.`, 's', (s) => home2Days(s) >= 30, { progress: (s) => [home2Days(s), 30] });
a('food', 'Shake-speare', 'Log 100 protein shakes of any kind.', 'g', (s) => matching(s, /shake|whey/i) >= 100, { progress: (s) => [matching(s, /shake|whey/i), 100] });
a('food', 'The gains train', 'Close your protein ring 14 days in a row.', 'g', (s) => longestRun(s.daily, (d) => d.proteinOk) >= 14, {
  progress: (s) => [longestRun(s.daily, (d) => d.proteinOk), 14],
});
a('food', 'Goldilocks', 'Land inside your calorie range on 20 days in a month.', 'g', (s) => [...byMonth(s.daily).values()].some((ds) => ds.filter((d) => d.kcalIn).length >= 20));
a('food', 'Balanced, as all things should be', 'Close calories and protein together 7 days in a row.', 'g', (s) => longestRun(s.daily, (d) => d.kcalIn && d.proteinOk) >= 7, {
  progress: (s) => [longestRun(s.daily, (d) => d.kcalIn && d.proteinOk), 7],
});

// Water
a('water', 'Hydration station', 'Hit your water target for the first time.', 'b', (s) => s.daily.some((d) => d.waterOk));
a('water', 'Morning dew', 'Drink 1 L before 10 am.', 'b', (s) => count(s, 'water-1l-by-10') > 0);
a('water', 'Steady flow', 'Log water in the morning, afternoon and evening of one day.', 'b', (s) => s.daily.some((d) => d.day?.waterParts === 7));
a('water', 'Just keep swimming', 'Hit your water target 7 days in a row.', 's', (s) => longestRun(s.daily, (d) => d.waterOk) >= 7, {
  progress: (s) => [longestRun(s.daily, (d) => d.waterOk), 7],
});
a('water', 'Monsoon', 'Drink 100 L in total.', 's', (s) => totalWater(s) >= 1e5, { progress: (s) => [totalWater(s) / 1000, 100] });
a('water', 'Water under the bridge', 'Hit your water target the day after a night out.', 's', (s) =>
  s.daily.some((d, i) => i > 0 && d.waterOk && (s.daily[i - 1].nightOut || s.daily[i - 1].drinks > 0)),
);
a('water', 'Paani Paani', 'Hit your water target on 30 days in one month.', 'g', (s) => [...byMonth(s.daily).values()].some((ds) => ds.filter((d) => d.waterOk).length >= 30));
a('water', 'Reservoir', 'Drink 1,000 L in total.', 'g', (s) => totalWater(s) >= 1e6, { progress: (s) => [totalWater(s) / 1000, 1000] });

// Sleep
a('sleep', 'Beauty sleep', 'Sleep 8 hours.', 'b', (s) => sleptDays(s).some((d) => d.sleepMin! >= 480));
a('sleep', "How's the josh?", 'Rate yourself 5 out of 5 rested. High, sir!', 'b', (s) => sleptDays(s).some((d) => d.day!.sleep!.rested === 5));
a('sleep', 'Early riser', 'Wake before 6:30 am.', 'b', (s) => sleptDays(s).some((d) => wake(d) >= 180 && wake(d) < 390));
a('sleep', 'Lights out', 'Fall asleep within 15 minutes of your ‘Tonight’ target.', 'b', (s) => {
  const ds = sleptDays(s);
  return ds.some((d, i) => {
    if (i < 3 || !d.targets) return false;
    const usualWake = median(ds.slice(Math.max(0, i - 7), i).map(wake));
    return circ(asleep(d), (usualWake - d.targets.sleepMin + 1440) % 1440) <= 15;
  });
});
a('sleep', 'Seven wonders', 'Sleep 7 hours or more, 7 nights in a row.', 's', (s) => longestRun(s.daily, (d) => (d.sleepMin ?? 0) >= 420) >= 7);
a('sleep', 'Captain Cool', 'Fall asleep within 20 minutes of your usual time, 7 nights running.', 's', (s) => {
  const ds = sleptDays(s);
  let run = 0;
  for (let i = 7; i < ds.length; i++) {
    const usual = median(ds.slice(Math.max(0, i - 14), i).map(asleep));
    const consecutive = daysBetween(ds[i - 1].date, ds[i].date) === 1;
    run = circ(asleep(ds[i]), usual) <= 20 ? (consecutive ? run + 1 : 1) : 0;
    if (run >= 7) return true;
  }
  return false;
});
a('sleep', 'Dadi approves', 'Fall asleep before 11 pm.', 's', (s) => sleptDays(s).some((d) => asleep(d) >= 1080 && asleep(d) < 1380));
a('sleep', 'The Metronome', 'Wake within 15 minutes of the same time all week.', 's', (s) =>
  s.daily.some((_, i) => {
    const w = s.daily.slice(i, i + 7);
    if (w.length < 7 || !w.every((d) => d.day?.sleep)) return false;
    const m = median(w.map(wake));
    return w.every((d) => circ(wake(d), m) <= 15);
  }),
);
a('sleep', 'No lie-in needed', 'Wake within 30 minutes of your weekday time all weekend.', 's', (s) =>
  s.daily.some((d, i) => {
    if (weekday(d.date) !== 5 || !d.day?.sleep || !s.daily[i + 1]?.day?.sleep) return false;
    const weekdays = s.daily.slice(Math.max(0, i - 5), i).filter((x) => x.day?.sleep);
    if (weekdays.length < 3) return false;
    const m = median(weekdays.map(wake));
    return circ(wake(d), m) <= 30 && circ(wake(s.daily[i + 1]), m) <= 30;
  }),
);
a('sleep', 'REM-ember the name', 'Log sleep for 30 nights.', 's', (s) => sleptDays(s).length >= 30, { progress: (s) => [sleptDays(s).length, 30] });
a('sleep', 'Fully charged', 'Average 7.5 hours of sleep over a month.', 'g', (s) =>
  [...byMonth(s.daily).values()].some((ds) => {
    const xs = ds.filter((d) => d.sleepMin !== undefined).map((d) => d.sleepMin!);
    return xs.length >= 20 && xs.reduce((a2, b) => a2 + b, 0) / xs.length >= 450;
  }),
);
a('sleep', 'Sleep on it', 'Log sleep for 100 nights.', 'g', (s) => sleptDays(s).length >= 100, { progress: (s) => [sleptDays(s).length, 100] });

// Body
a('body', 'Weigh to go', 'Log your first weigh-in.', 'b', (s) => s.daily.some((d) => d.day?.weightKg !== undefined));
a('body', 'Just looking like a wow', 'Complete your first photo check-in.', 'b', (s) => s.checkins.some((c) => Object.keys(c.photos).length > 0));
a('body', 'Waist not, want not', 'Take an inch off your waist.', 'b', (s) => waistBelow(s, 1), { progress: (s) => waistProgress(s, 1) });
a('body', 'Notched it', 'Put a new belt notch in the wins jar.', 'b', (s) => s.wins.some((w) => /notch|belt/i.test(w.text)));
a('body', 'Scale model', 'Weigh in 30 mornings in a row.', 's', (s) => longestRun(s.daily, (d) => d.day?.weightKg !== undefined) >= 30, {
  progress: (s) => [longestRun(s.daily, (d) => d.day?.weightKg !== undefined), 30],
});
a('body', 'Trendsetter', 'Bring your trend weight down 2 kg from day one.', 's', (s) => trendDrop(s) >= 2, { progress: (s) => [trendDrop(s), 2] });
a('body', 'Glow up', 'Complete three monthly check-ins.', 's', (s) => s.checkins.length >= 3, { progress: (s) => [s.checkins.length, 3] });
a('body', 'Time traveller', 'Compare photos taken three months apart.', 's', (s) => count(s, 'compare-3mo') > 0);
a(
  'body',
  'Picture abhi baaki hai',
  (s) => (s.baselineWaist ? `Waist under ${s.baselineWaist - 2} inches. The film isn’t over yet.` : 'Take 2 inches off your waist. The film isn’t over yet.'),
  's',
  (s) => waistBelow(s, 2),
  { progress: (s) => waistProgress(s, 2) },
);
a('body', 'Stand tall', 'Get your posture gap under 1 inch.', 's', (s) =>
  s.measurements.some((m) => m.waistStanding !== undefined && m.waistSlouched !== undefined && m.waistSlouched - m.waistStanding < 1),
);
a('body', 'Welcome to the gun show', 'Rate ‘arms fill the sleeves’ 5 out of 5.', 's', (s) => tshirt(s).some((t) => t.arms === 5));
a('body', 'Apna time aayega', (s) => (s.baselineWaist ? `Waist under ${s.baselineWaist - 3} inches.` : 'Take 3 inches off your waist.'), 'g', (s) => waistBelow(s, 3), {
  progress: (s) => waistProgress(s, 3),
});
a('body', 'Five down', 'Bring your trend weight down 5 kg from day one.', 'g', (s) => trendDrop(s) >= 5, { progress: (s) => [trendDrop(s), 5] });
a('body', 'V for V-taper', 'Raise your shoulder-to-waist ratio by 0.05.', 'g', (s) => {
  const r = ratios(s);
  return r.length >= 2 && Math.max(...r) - r[0] >= 0.05;
});
a('body', 'Tee-rific', 'Score 4 or more on all three t-shirt test questions.', 'g', (s) => tshirt(s).some((t) => t.shoulders >= 4 && t.arms >= 4 && t.stomach >= 4));
a(
  'body',
  'Jai Ho',
  (s) => (s.heightIn ? `Waist under ${(s.heightIn / 2).toFixed(1)} inches: half your height.` : 'Waist under half your height.'),
  'p',
  (s) => !!s.heightIn && latestWaist(s) !== undefined && latestWaist(s)! < s.heightIn / 2,
  { reward: 'Gold rings' },
);

// Streaks
a('streaks', 'Three for three', 'Close all three rings for the first time.', 'b', (s) => s.daily.some((d) => d.perfect));
a('streaks', '1-UP', 'Bank your first shield.', 'b', (s) => s.streak.earned >= 1);
a('streaks', 'Saved by the shield', 'Let a shield save one of your streaks.', 'b', (s) => s.streak.shieldsUsed.length >= 1);
a('streaks', 'Bounce back', 'Close all three rings the day after a missed day.', 'b', (s) => s.daily.some((d, i) => i > 0 && d.perfect && s.daily[i - 1].logged && !s.daily[i - 1].perfect));
a('streaks', 'Challenge accepted', 'Complete your first monthly challenge.', 'b', (s) => count(s, 'challenge-done') >= 1);
a('streaks', 'True to your word', 'Follow through on the weekly ‘one thing’ 4 weeks in a row.', 's', (s) => oneThingRun(s) >= 4, { progress: (s) => [oneThingRun(s), 4] });
a('streaks', 'Main character energy', '7 perfect days in a row.', 'g', (s) => longestRun(s.daily, (d) => d.perfect) >= 7, { progress: (s) => [longestRun(s.daily, (d) => d.perfect), 7] });
a('streaks', 'Groundhog Day', 'Complete the morning log 30 days in a row.', 'g', (s) => longestRun(s.daily, (d) => !!d.day?.morning) >= 30, {
  progress: (s) => [longestRun(s.daily, (d) => !!d.day?.morning), 30],
});
a('streaks', 'Dream month', '20 perfect days in one month.', 'g', (s) => [...byMonth(s.daily).values()].some((ds) => ds.filter((d) => d.perfect).length >= 20));
a('streaks', 'The Wall', (s) => `Train ${s.weeks.perWeek} times a week for 12 weeks straight.`, 'g', (s) => s.weeks.best >= 12, {
  reward: 'The ‘Wall’ title',
  progress: (s) => [s.weeks.streak, 12],
});
a('streaks', 'Never gonna give you up', (s) => `Train ${s.weeks.perWeek} times a week for 26 weeks straight.`, 'p', (s) => s.weeks.best >= 26, { progress: (s) => [s.weeks.streak, 26] });
a('streaks', 'I am inevitable', 'Keep a step streak going for 100 days.', 'p', (s) => s.streak.best >= 100, { progress: (s) => [s.streak.current, 100] });
a('streaks', 'Legen—wait for it—dary', 'Complete six monthly challenges.', 'p', (s) => count(s, 'challenge-done') >= 6, { reward: 'Legendary confetti' });

// Nights out
a('nights', 'Pawri ho rahi hai', 'Log your first night out.', 'b', (s) => s.daily.some((d) => d.nightOut));
a('nights', "Treat yo' self", 'Use your weekly free meal for the first time.', 'b', (s) => s.daily.some((d) => d.free));
a('nights', 'Diya-ry entry', 'Log anything on Diwali.', 'b', (s) => FESTIVALS.some((f) => f.id === 'diwali' && s.dayMap.get(f.day)?.logged), { reward: 'The Diwali theme' });
a('nights', 'Holi hai!', 'Log anything on Holi.', 'b', (s) => FESTIVALS.some((f) => f.id === 'holi' && s.dayMap.get(f.day)?.logged), { reward: 'Holi confetti' });
a('nights', 'Dobby is free', 'Save up for a free meal by trimming other days.', 's', (s) => count(s, 'saveup-used') > 0);
a('nights', 'Designated driver', 'Log a night out with zero drinks.', 's', (s) => s.daily.some((d) => d.nightOut && d.drinks === 0));
a('nights', 'Sober October', 'Log no drinks for the whole of October.', 's', (s) =>
  [...byMonth(s.daily).entries()].some(([m, ds]) => m.endsWith('-10') && s.today > `${m}-31` && ds.filter((d) => d.logged).length >= 20 && ds.every((d) => d.drinks === 0)),
);
a('nights', 'Comeback season', 'Close all three rings the day after a night out.', 's', (s) => s.daily.some((d, i) => i > 0 && d.perfect && s.daily[i - 1].nightOut));
a('nights', 'Shaken, not stirred', 'End occasion mode with your trend within half a kilo.', 'g', (s) =>
  s.occasions.some((o) => {
    if (o.to >= s.today) return false;
    const at = (d: DayKey) => [...s.trend].reverse().find((t) => t.date <= d)?.trend;
    const a0 = at(o.from);
    const a1 = at(addDays(o.to, 2));
    return a0 !== undefined && a1 !== undefined && a1 - a0 <= 0.5;
  }),
);
a('nights', 'Shaadi season survivor', 'Get through three weddings in occasion mode.', 'g', (s) => s.occasions.filter((o) => o.kind === 'wedding' && o.to < s.today).length >= 3);
a('nights', 'Having your cake', 'Use your free meal 4 weeks running while your trend keeps falling.', 'g', (s) => {
  const weeks = [...new Set(s.daily.filter((d) => d.free).map((d) => weekStart(d.date)))].sort();
  const trendAt = (d: DayKey) => [...s.trend].reverse().find((t) => t.date <= d)?.trend;
  let run = 1;
  for (let i = 1; i < weeks.length; i++) {
    const consecutive = addDays(weeks[i - 1], 7) === weeks[i];
    const t0 = trendAt(addDays(weeks[i - 1], 6));
    const t1 = trendAt(addDays(weeks[i], 6));
    run = consecutive && t0 !== undefined && t1 !== undefined && t1 < t0 ? run + 1 : 1;
    if (run >= 4) return true;
  }
  return false;
});

// Joints
a('joints', 'Pivot!', 'Accept an automatic swap after a flagged joint.', 'b', (s) => s.sessions.some((x) => x.swapped?.some((w) => w.reason !== 'Swapped during the session')));
a('joints', 'Knees before ego', 'Flag a joint the moment something feels off.', 'b', (s) => flagCount(s) > 0);
a('joints', 'Physio-logical', 'Export the summary for a physio.', 'b', (s) => count(s, 'physio') > 0);
a('joints', 'Aal izz well', '20 sessions in a row with no joint flags.', 's', (s) => cleanRun(s) >= 20, { progress: (s) => [cleanRun(s), 20] });
a('joints', 'Left, right, left', 'Keep a one-side-leads exercise balanced for 10 sessions.', 's', (s) => balancedSessions(s) >= 10, { progress: (s) => [balancedSessions(s), 10] });
a('joints', 'Wrist-ful thinking', (s) => `Improve your clean ${openEx(s)[0]?.name.toLowerCase() ?? 'push-up'}s three sessions in a row.`, 's', (s) =>
  openEx(s).some((e) => {
    const best = byExerciseSessions(s).get(e.id)?.map((x) => x.best) ?? [];
    return best.some((_, i) => i >= 3 && best[i] > best[i - 1] && best[i - 1] > best[i - 2] && best[i - 2] > best[i - 3]);
  }),
);

// Data
a('data', 'Safety first', 'Make your first backup.', 'b', (s) => !!s.settings.backup.lastQuick);
a('data', 'Spreadsheet enjoyer', 'Export the workbook for Claude.', 'b', (s) => count(s, 'export') > 0);
a('data', 'Ask the oracle', 'Use the Claude review button.', 'b', (s) => count(s, 'review') > 0);
a('data', 'New plan, who dis', 'Import a training plan.', 'b', (s) => count(s, 'plan-import') > 0);
a('data', 'Frequent flyer', 'Open the Health Passport on 10 different days.', 'b', (s) => countDays(s, 'passport') >= 10, { progress: (s) => [countDays(s, 'passport'), 10] });
a('data', 'Galaxy brain', 'Visit every Tracks page in one day.', 'b', (s) => {
  const visits = s.counters.get('tracks')?.values ?? [];
  const byDay = new Map<string, Set<string>>();
  for (const v of visits) {
    const [d, k] = v.split('|');
    byDay.set(d, (byDay.get(d) ?? new Set()).add(k));
  }
  return [...byDay.values()].some((ks) => ks.size >= TRACK_KINDS);
});
a('data', 'Throwback', 'Open an ‘On this day’ memory.', 'b', (s) => count(s, 'onthisday') > 0);
a('data', 'Sunday ritual', 'Back up four Sundays in a row.', 's', (s) => {
  const sundays = (s.counters.get('backup')?.days ?? []).filter((d) => weekday(d) === 6).sort();
  return sundays.some((d, i) => i >= 3 && daysBetween(sundays[i - 3], d) === 21);
});
a('data', 'Stats for nerds', 'Open session details 25 times.', 's', (s) => count(s, 'session-details') >= 25, { progress: (s) => [count(s, 'session-details'), 25] });

// Secret
const secret = (name: string, desc: string, tier: Tier, hint: string, test: AchDef['test'], extra: Partial<AchDef> = {}) => a('secret', name, desc, tier, test, { hint, ...extra });
const endedOn = (s: AchStats, n: number) => finished(s).some((d) => d.steps === n);
secret('Palindrome', 'End a day on a palindromic step count, like 12,321.', 's', 'Reads the same both ways.', (s) => finished(s).some((d) => d.steps !== undefined && d.steps >= 1000 && isPalindrome(d.steps)));
secret('Bullseye', 'End a day on exactly 15,000 steps.', 's', 'Dead centre.', (s) => endedOn(s, 15000));
secret('Thala for a reason', 'End a day on exactly 7,777 steps.', 's', "Seven. It's always seven.", (s) => endedOn(s, 7777));
secret('Six seven', 'End a day on exactly 6,767 steps.', 'b', 'You know the one.', (s) => endedOn(s, 6767));
secret('Nice.', 'End a day on exactly 6,969 steps.', 'b', 'Nice.', (s) => endedOn(s, 6969));
secret('Glitch in the Matrix', 'Log the same step count on two different days.', 's', 'Déjà vu, but for feet.', (s) => {
  const seen = new Set<number>();
  for (const d of stepDays(s)) {
    if (d.steps! >= 1000 && seen.has(d.steps!)) return true;
    seen.add(d.steps!);
  }
  return false;
});
secret('Déjà vu', 'Weigh exactly the same three mornings in a row.', 's', "Haven't we met?", (s) =>
  s.daily.some((d, i) => i >= 2 && d.day?.weightKg !== undefined && d.day.weightKg === s.daily[i - 1].day?.weightKg && d.day.weightKg === s.daily[i - 2].day?.weightKg),
);
secret('Feels like', 'Your scale weight matches your trend weight exactly.', 'b', 'Weather-app energy.', (s) =>
  s.trend.some((t, i) => i >= 6 && Math.round(t.kg * 10) === Math.round(t.trend * 10)),
);
secret('Plot twist', 'Trend weight up while your waist goes down in the same month.', 'g', "It's probably muscle.", (s) =>
  [...new Set(s.trend.map((t) => t.date.slice(0, 7)))].some((m) => {
    const ts = s.trend.filter((t) => t.date.startsWith(m));
    const ws = waists(s).filter((w) => w.date.startsWith(m));
    return ts.length >= 10 && ws.length >= 2 && ts.at(-1)!.trend > ts[0].trend && ws.at(-1)!.waistStanding! < ws[0].waistStanding!;
  }),
);
secret('Pi day', 'Drink exactly 3.14 L of water in a day.', 's', 'Irrational hydration.', (s) => s.daily.some((d) => d.water === 3140));
secret("Ramanujan's number", 'Log exactly 1,729 kcal in a day.', 's', 'A very interesting number.', (s) => finished(s).some((d) => Math.round(d.kcal) === 1729));
secret('The answer', 'Complete your 42nd session.', 's', 'Life, the universe and dumbbells.', (s) => s.sessions.length >= 42);
secret('Nelson', 'Complete your 111th session.', 'g', 'Umpires stand on one leg for this one.', (s) => s.sessions.length >= 111);
secret('007', 'Start a session at exactly 7:07 pm.', 's', 'Licence to lift.', (s) =>
  s.sessions.some((x) => {
    const d = new Date(x.startedAt);
    return d.getHours() === 19 && d.getMinutes() === 7;
  }),
);
secret('Leeroy Jenkins', 'Start a session within 60 seconds of opening the app.', 'b', 'At least you have chicken.', (s) => count(s, 'leeroy') > 0);
secret('Dhoni finishes off in style', 'Close your last ring after 11 pm.', 's', 'Last over, last ball.', (s) =>
  s.daily.some((d) => {
    if (!d.perfect) return false;
    const last = Math.max(...d.entries.map((e) => e.at), d.day?.stepsAt ?? 0);
    const h = new Date(last).getHours();
    return h === 23;
  }),
);
secret('Helicopter shot', 'Shake the phone while the rest timer runs.', 'b', 'A famous wristy finish.', (s) => count(s, 'shake-rest') > 0);
secret('Indiranagar ka gunda', 'Set a record on a day you rated your rest 2 or lower.', 'g', 'Even the calm ones have a limit.', (s) =>
  s.sets.some((x) => x.mark === '!!' && (s.dayMap.get(x.date)?.day?.sleep?.rested ?? 5) <= 2),
);
secret('Utha le re baba', "Lift the heaviest single dumbbell you've ever used.", 's', 'Baburao knows.', (s) => {
  const plan = s.settings.plan;
  if (!plan) return false;
  let max = 0;
  let n = 0;
  for (const x of s.sets) {
    if (findExercise(plan, x.exerciseId)?.load !== 'single' || x.loadKg === null) continue;
    if (n > 0 && x.loadKg > max) return true;
    max = Math.max(max, x.loadKg);
    n++;
  }
  return false;
});
secret('Rishtey mein toh hum tumhare baap lagte hain', 'Beat one of your records by 20% or more.', 'g', 'Naam hai...', (s) =>
  recordJumps(s).some(({ set, prevLoad, prevVal }) => (prevLoad > 0 && (set.loadKg ?? 0) >= prevLoad * 1.2) || (prevVal > 0 && (set.reps ?? set.seconds ?? 0) >= prevVal * 1.2)),
);
secret('Mogambo khush hua', 'Close calories, protein, steps, water and sleep in one day.', 'g', 'Someone very dramatic is pleased.', (s) => s.daily.some((d) => d.perfect && d.waterOk && d.sleepOk));
secret('Apun hi bhagwan hai', 'Hit every daily and weekly target in one week.', 'p', 'Kabhi kabhi lagta hai...', (s) =>
  s.daily.some((d, i) => {
    if (weekday(d.date) !== 0) return false;
    const w = s.daily.slice(i, i + 7);
    return w.length === 7 && w.every((x) => x.perfect && x.waterOk && x.sleepOk) && w.filter((x) => x.trained).length >= s.weeks.perWeek;
  }),
);
secret('Chhota packet, bada dhamaka', 'Set a record in a short session.', 's', 'Small packet.', (s) => {
  const short = new Set(s.sessions.filter((x) => x.short).map((x) => x.id));
  return s.sets.some((x) => x.mark === '!!' && short.has(x.sessionId));
});
secret('Jugaad', 'Use your improvised bench for 50 sessions.', 's', 'Improvised kit, real results.', (s) => !!s.settings.equipment.bench && s.sessions.length >= 50);
secret('Second breakfast', 'Log breakfast twice in one day.', 'b', 'What about elevenses?', (s) =>
  s.daily.some((d) => {
    const b = d.entries.filter((e) => e.meal === 'breakfast').map((e) => e.at);
    return b.length >= 2 && Math.max(...b) - Math.min(...b) >= 90 * 60000;
  }),
);
secret('Rasode mein kaun tha?', 'Log food between midnight and 4 am.', 'b', 'Someone was in the kitchen.', (s) => s.entries.some((e) => new Date(e.at).getHours() < 4));
secret('Doppelgänger', 'Log exactly the same food two days in a row.', 'b', 'Same again?', (s) =>
  s.daily.some((d, i) => {
    if (i === 0 || d.entries.length < 3) return false;
    const key = (xs: typeof d.entries) =>
      xs
        .map((e) => `${e.foodId ?? e.name}:${e.amount ?? ''}`)
        .sort()
        .join(',');
    return key(d.entries) === key(s.daily[i - 1].entries);
  }),
);
secret('Binod', 'Type ‘Binod’ into any notes field.', 'b', 'The comments section knows.', (s) =>
  [...s.sessions.map((x) => x.notes ?? ''), ...s.wins.map((w) => w.text), ...s.checkins.map((c) => c.line ?? ''), ...s.days.map((d) => d.note ?? '')].some((t) => /binod/i.test(t)),
);
secret('This is fine', 'Train after a night of less than 6 hours.', 's', 'Everything is fine.', (s) => s.daily.some((d) => d.trained && d.sleepMin !== undefined && d.sleepMin < 360));
secret('Emotional damage', 'Weigh in 1 kg or more above yesterday, then log the rest of your day anyway.', 's', 'The scale hit hard. You hit back.', (s) =>
  s.daily.some((d, i) => i > 0 && d.day?.weightKg !== undefined && s.daily[i - 1].day?.weightKg !== undefined && d.day.weightKg - s.daily[i - 1].day!.weightKg! >= 1 && d.entries.length >= 3),
);
secret('Moye moye', 'See your first ‘Delayed’ on the milestone board.', 'b', 'A sad little tune plays.', (s) => count(s, 'delayed') > 0);
secret('Press F', 'A streak ends. A fresh one starts tomorrow.', 'b', 'Pay your respects.', (s) => s.streak.broken.length > 0);
secret('The cake is a lie', "Open your free meal, then don't use it that week.", 's', 'Tempted, but no.', (s) =>
  (s.counters.get('free-open')?.days ?? []).some((d) => {
    const w = weekStart(d);
    if (addDays(w, 6) >= s.today) return false;
    return !s.daily.some((x) => x.free && weekStart(x.date) === w);
  }),
);
secret('Hakuna Matata', 'Take two rest days in a row in a week you hit your training target.', 'b', 'No worries.', (s) =>
  s.daily.some((d, i) => {
    if (i === 0 || d.trained || s.daily[i - 1].trained || weekStart(d.date) !== weekStart(s.daily[i - 1].date)) return false;
    const w = weekStart(d.date);
    return addDays(w, 6) < s.today && s.daily.filter((x) => weekStart(x.date) === w && x.trained).length >= s.weeks.perWeek;
  }),
);
secret('Aura +1000', 'Score 5 on all three t-shirt test questions.', 'p', 'The vibe is immaculate.', (s) => tshirt(s).some((t) => t.shoulders === 5 && t.arms === 5 && t.stomach === 5));
secret('Touch grass', "Tag a day's walking as outdoors.", 'b', "It's green, and it's outside.", (s) => s.days.some((d) => d.outdoors));
secret('Speedrunner', 'Finish the morning log in under 15 seconds.', 's', 'Any% morning.', (s) => s.days.some((d) => (d.morning?.seconds ?? 99) < 15));
secret('World record', 'Finish the morning log in under 8 seconds.', 'g', 'Frame-perfect.', (s) => s.days.some((d) => (d.morning?.seconds ?? 99) < 8));
secret('Early bird', 'Weigh in before 6 am.', 'b', 'The worm is optional.', (s) =>
  s.days.some((d) => {
    if (!d.weighedAt) return false;
    const h = new Date(d.weighedAt).getHours();
    return h >= 3 && h < 6;
  }),
);
secret('Sigma grindset', 'Finish the morning log before 6 am, 7 days in a row.', 'g', 'Rise and grind, literally.', (s) =>
  longestRun(s.daily, (d) => {
    const at = d.day?.morning?.at;
    return !!at && new Date(at).getHours() >= 3 && new Date(at).getHours() < 6;
  }) >= 7,
);
secret('Ctrl+Z', 'Undo an entry within 5 seconds.', 'b', 'Everyone makes typos.', (s) => count(s, 'undo-fast') > 0);
secret('Konami code', 'Swipe ↑ ↑ ↓ ↓ ← → ← → across the rings.', 's', 'Thirty lives not included.', (s) => count(s, 'konami') > 0, { reward: 'The Retro theme' });
secret('Error 404', "Find the page that doesn't exist.", 's', 'One link leads nowhere. Or somewhere.', (s) => count(s, '404') > 0);
secret('Rickrolled', 'Tap the headline about never giving up.', 'b', 'Some headlines are traps.', (s) => count(s, 'rickroll') > 0);
secret('Clickbait', 'Tap the news ticker 25 times.', 'b', 'Read all about it.', (s) => count(s, 'ticker-tap') >= 25, { progress: (s) => [count(s, 'ticker-tap'), 25] });
secret('Shake it off', 'Shake for a stat 50 times.', 's', 'Wrist-friendly cardio.', (s) => count(s, 'shake') >= 50, { progress: (s) => [count(s, 'shake'), 50] });
secret('Mic drop', 'Unlock three achievements in one day.', 's', 'Drop it.', (s) => {
  const days = new Map<string, number>();
  for (const u of s.unlocked.values()) if (!u.quiet) days.set(u.date, (days.get(u.date) ?? 0) + 1);
  return [...days.values()].some((n) => n >= 3);
});
secret('Big Crunch', 'Log something on 308 different days.', 'g', 'Antimatter Dimensions players know why.', (s) => s.daily.filter((d) => d.logged).length >= 308, {
  reward: 'The Antimatter theme',
  progress: (s) => [s.daily.filter((d) => d.logged).length, 308],
});
secret('Tryst with destiny', 'Log anything on 15 August.', 'b', 'At the stroke of the midnight hour.', (s) => s.daily.some((d) => d.logged && d.date.endsWith('-08-15')));
secret('Republic Day parade', 'Walk 26,000 steps on 26 January.', 'g', 'Kartavya Path, but at home.', (s) => stepDays(s).some((d) => d.date.endsWith('-01-26') && d.steps! >= 26000));
secret('New year, same routine', 'Log a session on 1 January.', 's', 'Resolutions are for amateurs.', (s) => s.sessions.some((x) => x.date.endsWith('-01-01')));
secret('Happy birthday, legend', 'Open Health on your birthday.', 'b', 'Your day.', (s) => count(s, 'birthday') > 0, { reward: 'Birthday confetti' });
secret('Cake day', 'Use Health for a full year.', 'g', 'Reddit would call it this.', (s) => s.now - s.settings.createdAt >= 365 * 86_400_000);
secret('Achievement hunter', 'Unlock 100 achievements.', 'g', "You're reading this, aren't you?", (s) => s.unlocked.size >= 100, { progress: (s) => [s.unlocked.size, 100] });
secret('Completionist', "Unlock every achievement that isn't secret.", 'p', 'All of them.', (s) => A.filter((d) => d.cat !== 'secret').every((d) => s.unlocked.has(d.id)), {
  reward: 'The Platinum theme',
});

export const ACHIEVEMENTS: readonly AchDef[] = A;
export const TRACK_KINDS = 9;

// Helpers used above, defined after the list for readability.
function totalReps(s: AchStats) {
  return s.sets.reduce((n, x) => n + (x.reps ?? 0), 0);
}
function totalWater(s: AchStats) {
  return s.daily.reduce((n, d) => n + d.water, 0);
}
function proteinMornings(s: AchStats) {
  return s.daily.filter((d) => d.entries.filter((e) => hourOf(e.at) < 11).reduce((n, e) => n + e.protein, 0) >= 40).length;
}
function ownMeals(s: AchStats) {
  const meals = new Map<string, boolean>();
  for (const e of s.entries) {
    const k = `${e.date}|${e.meal}`;
    meals.set(k, (meals.get(k) ?? true) && e.kind === 'food' && !!e.foodId);
  }
  return [...meals.values()].filter(Boolean).length;
}
function ownFoods(s: AchStats) {
  return s.foods.filter((f) => f.createdAt > s.settings.createdAt + 60_000).length;
}
function distinctFoods(s: AchStats) {
  return new Set(s.entries.filter((e) => e.kind === 'food').map((e) => e.foodId ?? e.name)).size;
}
function home2Days(s: AchStats) {
  const h = home2(s);
  return h ? s.days.filter((d) => d.home === h.id).length : 0;
}
function home2Meals(s: AchStats) {
  const h = home2(s);
  if (!h) return 0;
  const at = new Set(s.days.filter((d) => d.home === h.id).map((d) => d.date));
  return new Set(s.entries.filter((e) => at.has(e.date)).map((e) => `${e.date}|${e.meal}`)).size;
}
function waistProgress(s: AchStats, by: number): [number, number] {
  const w = latestWaist(s);
  if (s.baselineWaist === undefined || w === undefined) return [0, by];
  return [Math.max(0, s.baselineWaist - w), by];
}
function ratios(s: AchStats) {
  let shoulders: number | undefined;
  const out: number[] = [];
  for (const m of [...s.measurements].sort((x, y) => x.date.localeCompare(y.date))) {
    if (m.shoulders !== undefined) shoulders = m.shoulders;
    if (shoulders && m.waistStanding) out.push(shoulders / m.waistStanding);
  }
  return out;
}
function oneThingRun(s: AchStats) {
  let run = 0;
  let best = 0;
  for (const w of [...s.weekNotes].sort((x, y) => x.id.localeCompare(y.id))) {
    run = w.done ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}
function cleanRun(s: AchStats) {
  let run = 0;
  let best = 0;
  for (const x of s.sessions) {
    run = x.flags?.length ? 0 : run + 1;
    best = Math.max(best, run);
  }
  return best;
}
function balancedSessions(s: AchStats) {
  const plan = s.settings.plan;
  if (!plan) return 0;
  const leads = plan.sessions.flatMap((x) => x.exercises).filter((e) => e.lead && e.perSide);
  let n = 0;
  for (const xs of setsBySession(s).values()) {
    for (const e of leads) {
      const mine = xs.filter((x) => x.exerciseId === e.id && !x.drop);
      if (!mine.length) continue;
      const ok = mine
        .filter((x) => x.side === e.lead)
        .every((l) => {
          const f = mine.find((x) => x.setNo === l.setNo && x.side !== e.lead);
          return !f || (f.reps ?? 0) <= (l.reps ?? 0);
        });
      if (ok) n++;
    }
  }
  return n;
}
/** Per exercise, one row per session: its top load and best reps. */
function byExerciseSessions(s: AchStats) {
  const m = new Map<string, { sessionId: string; load: number; best: number }[]>();
  for (const [id, xs] of byExercise(s.sets)) {
    const rows: { sessionId: string; load: number; best: number }[] = [];
    for (const sid of [...new Set(xs.map((x) => x.sessionId))]) {
      const ys = xs.filter((x) => x.sessionId === sid);
      rows.push({ sessionId: sid, load: Math.max(...ys.map((y) => y.loadKg ?? 0)), best: Math.max(...ys.map((y) => y.reps ?? y.seconds ?? 0)) });
    }
    m.set(id, rows);
  }
  return m;
}
function weekCounts(s: AchStats): [DayKey, number][] {
  if (!s.sessions.length) return [];
  const out: [DayKey, number][] = [];
  const thisWeek = weekStart(s.today);
  for (let w = weekStart(s.sessions[0].date); w < thisWeek; w = addDays(w, 7)) {
    out.push([w, s.sessions.filter((x) => weekStart(x.date) === w).length]);
  }
  return out;
}
function supersetsDone(s: AchStats) {
  const plan = s.settings.plan;
  if (!plan) return 0;
  let n = 0;
  for (const x of s.sessions) {
    const def = plan.sessions.find((p) => p.id === x.session);
    if (!def) continue;
    const mine = s.sets.filter((y) => y.sessionId === x.id);
    for (const g of groupExercises(def.exercises.filter((e) => x.exercises.includes(e.id)))) {
      if (g.length < 2 || !isSuperset(g[0])) continue;
      if (g.every((e) => mine.filter((y) => y.exerciseId === e.id && !y.drop).length >= e.sets * (e.perSide ? 2 : 1))) n++;
    }
  }
  return n;
}

export function achievementById(id: string) {
  return A.find((d) => d.id === id);
}

export function fmtProgress(p: [number, number]): string {
  const [v, goal] = p;
  if (goal >= 1000) return `${fmtInt(Math.min(v, goal))} of ${fmtInt(goal)}`;
  return `${Math.round(Math.min(v, goal) * 10) / 10} of ${goal}`;
}

/**
 * Retired in v2: the morning log is no longer timed, identical step counts are usually a
 * copied number, water is no longer tracked, and the Passport is gone. Kept so old unlocks
 * still resolve.
 */
export const RETIRED_ACHIEVEMENTS: string[] = [
  ...['World record', 'Glitch in the Matrix', 'Speedrunner'].map(slug),
  ...ACHIEVEMENTS.filter((a) => a.cat === 'water' || (typeof a.desc === 'string' && /passport/i.test(a.desc))).map((a) => a.id),
];

/** The achievements that count and show. */
export const ACTIVE_ACHIEVEMENTS: AchDef[] = ACHIEVEMENTS.filter((a) => !RETIRED_ACHIEVEMENTS.includes(a.id));

/** What the owner sees and counts toward. */
export function visibleAchievements(_settings?: Pick<Settings, 'prefs'>): AchDef[] {
  return ACTIVE_ACHIEVEMENTS;
}

export interface AchSet {
  id: string;
  name: string;
  /** What finishing the set unlocks. */
  unlocks: string;
  ids: string[];
}

const setOf = (id: string, name: string, cat: Category, unlocks: string, max = 10): AchSet => ({
  id,
  name,
  unlocks,
  ids: ACTIVE_ACHIEVEMENTS.filter((a) => a.cat === cat && !a.soon).slice(0, max).map((a) => a.id),
});

/** Themed sets: finishing one unlocks a theme, a moment style or a map finish. */
export const ACH_SETS: AchSet[] = [
  setOf('iron', 'Iron at home', 'training', 'a confetti style'),
  setOf('strength', 'Under the bar', 'strength', 'the level-up chime'),
  setOf('road', 'The long road', 'india', 'the gold route on the map'),
  setOf('steps', 'Ten lakh club', 'steps', 'the gold-coin moment'),
  setOf('fuel', 'Fuelled', 'food', 'the harvest theme'),
  setOf('sleep', 'Night owl reformed', 'sleep', 'the moonlight theme'),
  setOf('steady', 'Steady hands', 'streaks', 'shooting stars'),
].filter((s) => s.ids.length >= 4);

/** How far through a set you are, and whether it is finished. */
export function setProgress(set: AchSet, unlocked: Set<string>): { done: number; total: number; complete: boolean } {
  const done = set.ids.filter((id) => unlocked.has(id)).length;
  return { done, total: set.ids.length, complete: done === set.ids.length };
}
