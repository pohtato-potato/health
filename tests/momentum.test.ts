import { describe, expect, it } from 'vitest';
import { addDays, type DayKey } from '../src/domain/dates';
import { areaScores, momentumChange, momentumNeeds, momentumOn, momentumSeries, trendRows, type MomentumInput } from '../src/domain/momentum';
import type { Day, FoodEntry, Settings, TrainingSession } from '../src/domain/types';
import { defaultSettings } from '../src/db/actions';
import { PLAN } from './fixtures';

const DATE = '2026-10-20';
const TARGETS = { kcalMin: 2000, kcalMax: 2400, proteinG: 140, steps: 10000, waterMl: 3000, sleepMin: 420, sessionsPerWeek: 4 };

const settings = (plan = false): Settings => ({
  ...defaultSettings(),
  createdAt: new Date(2020, 0, 1).getTime(),
  targets: [{ from: '2020-01-01', targets: TARGETS }],
  plan: plan ? PLAN : undefined,
});
/** The n days ending the day before `end`. */
const windowDays = (n: number, end: DayKey = DATE) => Array.from({ length: n }, (_, i) => addDays(end, -1 - i));
const day = (date: DayKey, over: Partial<Day>): Day => ({ date, ...over }) as Day;
const stepDays = (met: number, total: number, end: DayKey = DATE) =>
  windowDays(total, end).map((d, i) => day(d, { steps: i < met ? 12000 : 5000 }));
const meal = (date: DayKey, protein: number, kcal = 2200): FoodEntry =>
  ({ id: `${date}${protein}`, date, meal: 'lunch', at: 0, kind: 'food', name: 'x', portion: '', kcal, protein }) as FoodEntry;
const session = (date: DayKey, status: 'done' | 'active' = 'done'): TrainingSession =>
  ({ id: date, date, session: 'A', planName: 'p', startedAt: 0, status, short: false, exercises: [] });
const input = (over: Partial<MomentumInput> = {}): MomentumInput => ({ settings: settings(), days: [], entries: [], sessions: [], ...over });
/** Sleep from 23:00, for the given minutes. */
const sleep = (min: number) => ({ asleep: 1380, woke: (1380 + min) % 1440 });

describe('areaScores', () => {
  it('steps: 7 of 14 logged days closed scores 0.5', () => {
    expect(areaScores(DATE, input({ days: stepDays(7, 14) })).steps).toBe(0.5);
  });

  it('a logged 0 counts as not met; a day with no steps is not counted', () => {
    const days = [
      ...windowDays(5).map((d) => day(d, { steps: 12000 })),
      ...windowDays(10).slice(5).map((d) => day(d, { steps: 0 })),
      ...windowDays(14).slice(10).map((d) => day(d, {})),
    ];
    expect(areaScores(DATE, input({ days })).steps).toBe(0.5);
  });

  it('an area with 3 logged days is left out', () => {
    expect(areaScores(DATE, input({ days: stepDays(3, 3) })).steps).toBeUndefined();
    expect(areaScores(DATE, input({ days: stepDays(4, 4) })).steps).toBe(1);
  });

  it('protein counts food-logged days, and closes at its target', () => {
    const entries = windowDays(4).map((d, i) => meal(d, i < 3 ? 140 : 139));
    expect(areaScores(DATE, input({ entries })).protein).toBe(0.75);
  });

  it('training: 4 done sessions at 4 a week scores 0.5; 12 caps at 1', () => {
    const s = settings(true);
    expect(areaScores(DATE, input({ settings: s, sessions: windowDays(4).map((d) => session(d)) })).training).toBe(0.5);
    expect(areaScores(DATE, input({ settings: s, sessions: windowDays(12).map((d) => session(d)) })).training).toBe(1);
  });

  it('an unfinished session does not count', () => {
    const sessions = windowDays(4).map((d) => session(d, 'active'));
    expect(areaScores(DATE, input({ settings: settings(true), sessions })).training).toBe(0);
  });

  it('training is left out without a plan', () => {
    expect(areaScores(DATE, input({ sessions: windowDays(4).map((d) => session(d)) })).training).toBeUndefined();
  });

  it('sleep meets at exactly the target minutes', () => {
    const days = windowDays(4).map((d, i) => day(d, { sleep: sleep(i === 0 ? 419 : 420) }));
    expect(areaScores(DATE, input({ days })).sleep).toBe(0.75);
  });

  it('today is not in the window', () => {
    const base = stepDays(7, 14);
    const a = areaScores(DATE, input({ days: base })).steps;
    const b = areaScores(DATE, input({ days: [...base, day(DATE, { steps: 20000 })] })).steps;
    expect(b).toBe(a);
  });

  it('the day 15 days back is not in the window', () => {
    const base = stepDays(7, 14);
    const old = day(addDays(DATE, -15), { steps: 20000 });
    expect(areaScores(DATE, input({ days: [...base, old] })).steps).toBe(0.5);
  });
});

describe('momentum', () => {
  const twoAreas = input({
    days: stepDays(7, 14),
    entries: windowDays(4).map((d, i) => meal(d, i < 3 ? 150 : 50)),
  });

  it('is the rounded mean: 0.5 and 0.75 give 63', () => {
    expect(momentumOn(DATE, twoAreas)).toBe(63);
  });

  it('one area gives no score', () => {
    expect(momentumOn(DATE, input({ days: stepDays(7, 14) }))).toBeUndefined();
  });

  it('nothing logged gives no score, and no series value', () => {
    expect(momentumOn(DATE, input())).toBeUndefined();
    const s = momentumSeries(DATE, input());
    expect(s).toHaveLength(28);
    expect(s.every((v) => v === null)).toBe(true);
  });

  it('two weeks away gives no score, not a low one', () => {
    const away = input({ days: stepDays(14, 14, addDays(DATE, -14)), entries: windowDays(14, addDays(DATE, -14)).map((d) => meal(d, 150)) });
    expect(momentumOn(DATE, away)).toBeUndefined();
  });

  it('weight changes do not move it', () => {
    const withWeight = { ...twoAreas, days: twoAreas.days.map((d, i) => ({ ...d, weight: 60 + i })) as Day[] };
    expect(momentumOn(DATE, withWeight)).toBe(63);
  });

  it('calories do not move it', () => {
    const heavy = { ...twoAreas, entries: twoAreas.entries.map((e) => ({ ...e, kcal: 6000 })) };
    expect(momentumOn(DATE, heavy)).toBe(63);
  });

  it('the series ends today and holds 28 values', () => {
    const s = momentumSeries(DATE, twoAreas);
    expect(s).toHaveLength(28);
    expect(s[27]).toBe(63);
  });

  it('change is today minus 28 days ago', () => {
    const earlier = addDays(DATE, -28);
    const i = input({
      days: [...stepDays(14, 14), ...stepDays(7, 14, earlier)],
      entries: [...windowDays(4).map((d) => meal(d, 150)), ...windowDays(4, earlier).map((d) => meal(d, 150))],
    });
    expect(momentumChange(DATE, i)).toBe(100 - 75);
  });

  it('change is absent with no earlier score', () => {
    expect(momentumChange(DATE, twoAreas)).toBeUndefined();
  });

  it('needs: says how many more logged days make a score', () => {
    expect(momentumNeeds(DATE, input())).toBe(8);
    expect(momentumNeeds(DATE, input({ days: stepDays(4, 4) }))).toBe(4);
    expect(momentumNeeds(DATE, input({ days: stepDays(4, 4), entries: windowDays(2).map((d) => meal(d, 150)) }))).toBe(2);
    expect(momentumNeeds(DATE, twoAreas)).toBe(0);
  });

  it('needs: with a plan, training is already one area', () => {
    expect(momentumNeeds(DATE, input({ settings: settings(true) }))).toBe(4);
  });
});

describe('trendRows', () => {
  const earlier = addDays(DATE, -28);
  const rowFor = (metNow: number, metThen: number) => trendRows(DATE, input({
    days: [...stepDays(metNow, 100, DATE).slice(0, 14), ...stepDays(metThen, 100, earlier).slice(0, 14)].map((d) => d),
  })).find((r) => r.area === 'steps')!;

  it('up 8 points reads Improving, up 7 Steady, down 8 Easing', () => {
    // 14 logged days: each day is 7.14 points, so +2 days is +14, +1 is +7.
    expect(rowFor(9, 7).word).toBe('Improving');
    expect(rowFor(8, 7).word).toBe('Steady');
    expect(rowFor(5, 7).word).toBe('Easing');
  });

  it('training going up reads Building', () => {
    const r = trendRows(DATE, input({
      settings: settings(true),
      sessions: [...windowDays(8).map((d) => session(d)), ...windowDays(2, earlier).map((d) => session(d))],
    }));
    expect(r.find((x) => x.area === 'training')?.word).toBe('Building');
  });

  it('leaves out an area with no score, and gives 16 series values', () => {
    const rows = trendRows(DATE, input({ days: stepDays(7, 14) }));
    expect(rows.map((r) => r.area)).toEqual(['steps']);
    expect(rows[0].series).toHaveLength(16);
    expect(rows[0].series.every(Number.isFinite)).toBe(true);
  });

  it('now and was read as sentences, and never NaN', () => {
    const r = trendRows(DATE, input({
      settings: settings(true),
      days: [...windowDays(14).map((d) => day(d, { steps: 8900, sleep: sleep(424) })), ...windowDays(14, earlier).map((d) => day(d, { steps: 7400, sleep: sleep(430) }))],
      entries: [...windowDays(5).map((d) => meal(d, 112)), ...windowDays(5, earlier).map((d) => meal(d, 84))],
      sessions: [...windowDays(8).map((d) => session(d)), ...windowDays(4, earlier).map((d) => session(d))],
    }));
    const by = Object.fromEntries(r.map((x) => [x.area, x]));
    expect(by.steps.now).toBe('8,900 a day');
    expect(by.steps.was).toBe('7,400');
    expect(by.protein.now).toBe('112 g a day');
    expect(by.protein.was).toBe('84');
    expect(by.sleep.now).toBe('7 h 04 a night');
    expect(by.sleep.was).toBe('7 h 10');
    expect(by.training.now).toBe('8 sessions in two weeks');
    expect(by.training.was).toBe('4');
    expect(JSON.stringify(r)).not.toMatch(/NaN|undefined/);
  });

  it('with no earlier window, was is absent and the word stays Steady', () => {
    const [r] = trendRows(DATE, input({ days: stepDays(7, 14) }));
    expect(r.was).toBeUndefined();
    expect(r.word).toBe('Steady');
  });
});
