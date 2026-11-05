import { describe, expect, it } from 'vitest';
import { defaultSettings } from '../src/db/actions';
import { addDays } from '../src/domain/dates';
import { assessment, filmFrames, monthSpread, monthsWithData, sleepProfile, topFives, type MonthInput } from '../src/domain/monthReport';
import { correctionsIn, type Correction } from '../src/domain/corrections';
import type { Day, FoodEntry, SetEntry, Settings, TrainingSession } from '../src/domain/types';

const MONTH = '2026-10';
const TODAY = '2026-11-05';
const TARGETS = { kcalMin: 2000, kcalMax: 2400, proteinG: 100, steps: 10000, waterMl: 3000, sleepMin: 420, sessionsPerWeek: 3 };
const settings = (): Settings => ({ ...defaultSettings(), targets: [{ from: '2020-01-01', targets: TARGETS }] });
const month = (steps: number, over: Partial<Day> = {}): Day[] => Array.from({ length: 31 }, (_, n) => ({ date: addDays('2026-10-01', n), steps: steps + n, ...over }) as Day);
const session = (date: string): TrainingSession => ({ id: date, date, session: 'A', planName: 'P', startedAt: 0, status: 'done', short: false, exercises: [] });
const set = (date: string, mark?: '!!'): SetEntry => ({ id: date + Math.random(), sessionId: date, date, exercise: 'Row', exerciseId: 'row', reps: 10, loadKg: 10, mark }) as SetEntry;
const input = (over: Partial<MonthInput> = {}): MonthInput => ({ today: TODAY, settings: settings(), days: [], entries: [], sessions: [], sets: [], sightings: [], songs: [], ...over });

describe('assessment', () => {
  it('nothing logged gives no grades', () => {
    expect(assessment(MONTH, input())).toEqual([]);
  });

  it('every grade has a word and a reason', () => {
    const g = assessment(MONTH, input({ days: month(12000, { sleep: { asleep: 1380, woke: 420 } }), sessions: [session('2026-10-02')], entries: [{ date: '2026-10-02', protein: 120, kcal: 2100 } as FoodEntry] }));
    expect(g.length).toBeGreaterThanOrEqual(3);
    for (const x of g) {
      expect(x.word.length).toBeGreaterThan(0);
      expect(x.why.length).toBeGreaterThan(3);
    }
  });

  it('steps closed most days reads Strong; rarely reads Easing', () => {
    expect(assessment(MONTH, input({ days: month(12000) })).find((g) => g.area === 'Steps')?.word).toBe('Strong');
    expect(assessment(MONTH, input({ days: month(2000) })).find((g) => g.area === 'Steps')?.word).toBe('Easing');
  });

  it('sets its word from the area, never colour alone', () => {
    expect(assessment(MONTH, input({ days: month(12000) }))[0]).toHaveProperty('word');
  });
});

describe('monthSpread', () => {
  it('counts sets without skipped ones', () => {
    const s = monthSpread(MONTH, input({ sets: [set('2026-10-02'), { ...set('2026-10-03'), skipped: true }], sessions: [session('2026-10-02')] }));
    expect(s.sets).toBe(1);
    expect(s.sessions).toBe(1);
    expect(s.perWeekday.reduce((a, b) => a + b, 0)).toBe(1);
  });
});

describe('topFives', () => {
  it('takes the five biggest step days, biggest first', () => {
    const t = topFives(MONTH, input({ days: month(1000) }));
    expect(t.steps).toHaveLength(5);
    expect(t.steps[0].date).toBe('2026-10-31');
  });
});

describe('sleepProfile', () => {
  it('is absent under 7 nights', () => {
    expect(sleepProfile(MONTH, input({ days: month(1, { sleep: { asleep: 1380, woke: 420 } }).slice(0, 6) }))).toBeUndefined();
  });
  it('gives the usual hours and the shortest and longest nights', () => {
    const p = sleepProfile(MONTH, input({ days: month(1, { sleep: { asleep: 1380, woke: 420 } }) }));
    expect(p?.avg).toBe(480);
  });
});

describe('filmFrames', () => {
  const full = input({ days: month(9000), sessions: [session('2026-10-02')], sets: [set('2026-10-02', '!!')] });

  it('ends with credits, then the assessment', () => {
    const f = filmFrames(MONTH, full);
    expect(f.slice(-2).map((x) => x.kind)).toEqual(['credits', 'assessment']);
  });

  it('every number frame has its own colour and a ground', () => {
    for (const x of filmFrames(MONTH, full)) {
      expect(x.ground.length).toBeGreaterThan(5);
      if (x.kind === 'number') expect(x.color).toMatch(/^#/);
    }
  });

  it('draws the real trail when there were steps', () => {
    expect(filmFrames(MONTH, full).some((x) => x.kind === 'trail')).toBe(true);
    expect(filmFrames(MONTH, input({ sessions: [session('2026-10-02')] })).some((x) => x.kind === 'trail')).toBe(false);
  });

  it('a frame with nothing to say is left out', () => {
    const k = filmFrames(MONTH, input({ days: month(9000) })).map((x) => x.kind === 'number' ? x.small : x.kind);
    expect(k).not.toContain('sessions finished.');
  });

  it('an empty month has no film', () => {
    expect(filmFrames(MONTH, input())).toEqual([]);
  });
});

describe('monthsWithData', () => {
  it('lists finished months, newest first', () => {
    expect(monthsWithData([{ date: '2026-09-02', steps: 1 }, { date: '2026-10-02', steps: 1 }, { date: '2026-11-02', steps: 1 }] as Day[], TODAY)).toEqual(['2026-10', '2026-09']);
  });
});

describe('correctionsIn', () => {
  const c = (date: string): Correction => ({ id: date, at: 0, date, what: 'Steps', was: '1', now: '2', note: 'Phone died' });
  it('finds those in the range only', () => {
    expect(correctionsIn('2026-10-01', '2026-10-31', [c('2026-10-05'), c('2026-11-05')]).map((x) => x.date)).toEqual(['2026-10-05']);
  });
});
