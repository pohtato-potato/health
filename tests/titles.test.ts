import { describe, expect, it } from 'vitest';
import { defaultSettings } from '../src/db/actions';
import { addDays } from '../src/domain/dates';
import type { Sighting } from '../src/domain/creatures';
import type { Day, FoodEntry, SetEntry, Settings, TrainingSession } from '../src/domain/types';
import { EMPTY_STATS, TITLE_DEFS, earnedTitles, titleName, titleStats, wornTitle, type TitleInput } from '../src/domain/titles';
import { CREATURES } from '../src/domain/creatureRoster';
import { regionAt } from '../src/domain/regions';
import { PLAN } from './fixtures';

const TODAY = '2026-11-05';
const TARGETS = { kcalMin: 2000, kcalMax: 2400, proteinG: 100, steps: 10000, waterMl: 3000, sleepMin: 420, sessionsPerWeek: 3 };
const settings = (): Settings => ({ ...defaultSettings(), plan: PLAN, targets: [{ from: '2020-01-01', targets: TARGETS }] });
const input = (over: Partial<TitleInput> = {}): TitleInput => ({
  today: TODAY, settings: settings(), days: [], entries: [], sessions: [], sets: [], sightings: [], forecasts: [], usage: [], edits: 0, ...over,
});
const run = (from: string, n: number, over: Partial<Day> = {}): Day[] => Array.from({ length: n }, (_, i) => ({ date: addDays(from, i), ...over }) as Day);
const session = (id: string, date: string, over: Partial<TrainingSession> = {}): TrainingSession =>
  ({ id, date, session: 'A', planName: 'P', startedAt: new Date(`${date}T10:00:00`).getTime(), status: 'done', short: false, exercises: [], ...over });
const record = (sessionId: string, date: string): SetEntry => ({ id: `${sessionId}${date}${Math.random()}`, sessionId, date, mark: '!!', reps: 5 }) as SetEntry;
const food = (date: string, meal: string, protein = 40, at = new Date(`${date}T12:00:00`).getTime()): FoodEntry =>
  ({ id: `${date}${meal}${at}`, date, meal, at, kind: 'quick', name: 'x', portion: '', kcal: 300, protein }) as FoodEntry;
const sighting = (date: string, creatureId: string): Sighting => ({ id: `${date}:${creatureId}`, date, creatureId, tier: 'everyday', stageAfter: 1, grew: false, why: 'night', at: 0 });
const stat = (over: Partial<TitleInput>) => titleStats(input(over));

describe('TITLE_DEFS', () => {
  it('every rule is false with nothing done', () => {
    for (const t of TITLE_DEFS) expect(t.rule(EMPTY_STATS), t.name).toBe(false);
  });

  it('every rule fires at its own number, not one below', () => {
    for (const t of TITLE_DEFS) {
      expect(t.rule({ ...EMPTY_STATS, [t.stat]: t.needs }), t.name).toBe(true);
      expect(t.rule({ ...EMPTY_STATS, [t.stat]: t.needs - 1 }), t.name).toBe(false);
    }
  });

  it('ids and names are unique, and every family is there', () => {
    expect(new Set(TITLE_DEFS.map((t) => t.id)).size).toBe(TITLE_DEFS.length);
    expect(new Set(TITLE_DEFS.map((t) => t.name)).size).toBe(TITLE_DEFS.length);
    expect(new Set(TITLE_DEFS.map((t) => t.family)).size).toBe(5); // Visitors retired with the creatures (R4-7)
  });

  it('no rule leans on a match result', () => {
    expect(TITLE_DEFS.every((t) => !/conceded|unbeaten|top of the table|goals/i.test(t.how))).toBe(true);
  });

  it('earnedTitles lists what the stats reach', () => {
    const got = earnedTitles({ ...EMPTY_STATS, sessions: 50 });
    expect(got.has('t:iron-regular')).toBe(true);
    expect(got.has('t:century')).toBe(false);
  });

  it('titleName resolves new ids, and leaves others alone', () => {
    expect(titleName('t:century')).toBe('Century');
    expect(titleName('lvl:1')).toBeUndefined();
  });
});

describe('titleStats', () => {
  it('nothing logged gives empty stats', () => {
    expect(stat({})).toEqual(EMPTY_STATS);
  });

  it('box-to-box needs a session and 10,000 steps on one day', () => {
    const days = [{ date: '2026-10-01', steps: 10000 }, { date: '2026-10-02', steps: 9999 }, { date: '2026-10-03', steps: 20000 }] as Day[];
    const sessions = [session('a', '2026-10-01'), session('b', '2026-10-02')];
    expect(stat({ days, sessions }).boxToBoxDays).toBe(1);
  });

  it('a swap to nothing is a skip, not a swap', () => {
    const swapped = [{ from: 'a', to: 'b', reason: '' }, { from: 'c', to: null, reason: '' }];
    expect(stat({ sessions: [session('a', '2026-10-01', { swapped })] }).swaps).toBe(1);
  });

  it('records count per session and per week', () => {
    const sets = [record('a', '2026-10-05'), record('a', '2026-10-05'), record('b', '2026-10-07')];
    const s = stat({ sets });
    expect(s.bestRecordsInSession).toBe(2);
    expect(s.bestRecordsInWeek).toBe(3);
  });

  it('a full night before a record counts it', () => {
    const days = [{ date: '2026-10-05', sleep: { asleep: 1320, woke: 360 } }] as Day[];
    expect(stat({ days, sets: [record('a', '2026-10-05')] }).recordsAfterFullNight).toBe(1);
  });

  it('a record on a low-readiness day counts; a high one does not', () => {
    const sessions = [session('a', '2026-10-05', { readiness: 30 }), session('b', '2026-10-06', { readiness: 80 })];
    expect(stat({ sessions, sets: [record('a', '2026-10-05'), record('b', '2026-10-06')] }).recordsOnLowReadiness).toBe(1);
  });

  it('a clean step week needs all seven days, Monday to Sunday', () => {
    expect(stat({ days: run('2026-10-05', 7, { steps: 11000 }) }).cleanStepWeeks).toBe(1);
    expect(stat({ days: run('2026-10-05', 6, { steps: 11000 }) }).cleanStepWeeks).toBe(0);
  });

  it('meals run counts days with breakfast, lunch and dinner', () => {
    const entries = run('2026-10-05', 14).flatMap((d) => ['breakfast', 'lunch', 'dinner'].map((m) => food(d.date, m)));
    expect(stat({ entries, days: run('2026-10-05', 14) }).mealsRun).toBe(14);
  });

  it('a late meal that closes protein counts', () => {
    const late = new Date('2026-10-05T23:30:00').getTime();
    const entries = [food('2026-10-05', 'lunch', 80), food('2026-10-05', 'dinner', 30, late), food('2026-10-06', 'dinner', 200, new Date('2026-10-06T12:00:00').getTime())];
    expect(stat({ entries }).lateProteinCloses).toBe(1);
  });

  it('a rest after a short night counts; a session the same day does not', () => {
    const days = [{ date: '2026-10-05', sleep: { asleep: 60, woke: 360 } }, { date: '2026-10-06', sleep: { asleep: 60, woke: 360 } }] as Day[];
    expect(stat({ days, sessions: [session('a', '2026-10-06')] }).restAfterShortNight).toBe(1);
  });

  it('logged run takes the longest, and returns count week-long gaps', () => {
    const days = [...run('2026-09-01', 5, { steps: 1 }), ...run('2026-09-15', 2, { steps: 1 })];
    const s = stat({ days });
    expect(s.loggedRun).toBe(5);
    expect(s.returns).toBe(1);
  });

  it('km and regions grow with steps', () => {
    const s = stat({ days: [{ date: '2026-10-01', steps: 2000000 }] as Day[] });
    expect(s.km).toBeGreaterThan(1000);
    expect(s.regionsWalked).toBeGreaterThanOrEqual(2);
  });

  it('dal days match the word, not a part of a word', () => {
    const entries = [{ ...food('2026-10-01', 'lunch'), name: 'Moong dal' }, { ...food('2026-10-02', 'lunch'), name: 'Sandal' }];
    expect(stat({ entries }).dalDays).toBe(1);
  });

  it('forecasts beaten are those over the top of the range', () => {
    const f = (outcome: number) => ({ id: String(outcome), kind: 'k', madeAt: 0, targetDate: '2026-10-01', low: 1, high: 5, outcome });
    expect(stat({ forecasts: [f(6), f(5), f(3)] }).forecastsBeaten).toBe(1);
  });

  it('a quick morning is 15 seconds or under', () => {
    const days = [{ date: '2026-10-01', morning: { at: 0, seconds: 15 } }, { date: '2026-10-02', morning: { at: 0, seconds: 16 } }] as Day[];
    expect(stat({ days }).quickMornings).toBe(1);
  });

  it('a sick day counts only with something logged', () => {
    const days = [{ date: '2026-10-01', status: 'sick', steps: 100 }, { date: '2026-10-02', status: 'sick' }] as unknown as Day[];
    expect(stat({ days }).sickDaysLogged).toBe(1);
  });

  it('visits take the most seen, and notes grow with visits up to what exists', () => {
    const sightings = Array.from({ length: 3 }, (_, n) => sighting(addDays('2026-10-01', n), 'peacock'));
    const s = stat({ sightings });
    expect(s.topVisits).toBe(3);
    expect(s.fieldNotes).toBe(3);
  });

  it('a sighting of a creature no longer on the roster does no harm', () => {
    expect(stat({ sightings: [sighting('2026-10-01', 'gone-now')] }).topVisits).toBe(1);
  });

  it('a stretch is cleared when every local was met and you have moved on', () => {
    const start = regionAt(0);
    const locals = CREATURES.filter((c) => c.region === start);
    const days = [{ date: '2026-10-01', steps: 3000000 }] as Day[];
    expect(locals.length).toBeGreaterThan(0);
    expect(stat({ days, sightings: locals.map((c) => sighting('2026-10-02', c.id)) }).stretchesCleared).toBeGreaterThanOrEqual(1);
    expect(stat({ days, sightings: locals.slice(1).map((c) => sighting('2026-10-02', c.id)) }).stretchesCleared).toBe(0);
  });

  it('a plan held 100 days counts its span, and today is not assumed', () => {
    const sessions = [session('a', '2026-07-01'), session('b', addDays('2026-07-01', 100))];
    expect(stat({ sessions }).longestPlanDays).toBe(100);
  });
});

describe('wornTitle', () => {
  const u = new Set<string>();
  it('names a new title', () => {
    expect(wornTitle({ title: 't:century' }, u, 1)).toBe('Century');
  });
  it('an old level title still resolves once reached', () => {
    expect(wornTitle({ title: 'lvl:1' }, u, 1)).toBeDefined();
  });
  it('nothing worn, or a title that no longer exists, names nothing', () => {
    expect(wornTitle({}, u, 1)).toBeUndefined();
    expect(wornTitle({ title: 't:gone' }, u, 1)).toBeUndefined();
  });
});
