import { describe, expect, it } from 'vitest';
import { ACH_SETS, setProgress } from '../src/domain/achievements';
import { benchmarkOn } from '../src/domain/benchmark';
import { atOn } from '../src/domain/dates';
import { experimentValues, experimentWindows } from '../src/domain/experiments';
import { lastMonth, monthlyFilm } from '../src/domain/film';
import { clockAt, onThisDay, rimFraction } from '../src/domain/journeyClock';
import { milestoneGroup } from '../src/domain/milestones';
import { charStatsV2 } from '../src/domain/rewards';

describe('character v2', () => {
  it('six stats from real data, Form from clean reps', () => {
    const s = charStatsV2({ strengthGain: 0.1, ladderClimbs: 4, stepsRatio: 1, carrySteps14: 4000, proteinDays14: 7, sri: 70, cleanRatio: 0.8, km: 625 });
    expect(Object.keys(s)).toEqual(['str', 'sta', 'fuel', 'rest', 'form', 'wand']);
    expect(s.form).toBe(12);
    expect(s.fuel).toBe(10);
    expect(s.wand).toBe(13);
    expect(charStatsV2({ strengthGain: 0, ladderClimbs: 0, stepsRatio: 0, carrySteps14: 0, proteinDays14: 0, km: 0 }).form).toBe(0);
    expect(Object.values(charStatsV2({ strengthGain: 9, ladderClimbs: 99, stepsRatio: 9, carrySteps14: 1e6, proteinDays14: 14, sri: 100, cleanRatio: 1, km: 1e5 })).every((v) => v === 20)).toBe(true);
  });
});

describe('journey clock', () => {
  it('the journey as one day: start at midnight, reveal day at the next midnight', () => {
    expect(clockAt('2026-01-01', '2026-01-25', '2026-01-01')).toMatchObject({ minutes: 0, label: '12:00 am', phase: 'night', day: 1 });
    expect(clockAt('2026-01-01', '2026-01-25', '2026-01-13')).toMatchObject({ minutes: 720, label: '12:00 pm', phase: 'day', day: 13, total: 25 });
    expect(clockAt('2026-01-01', '2026-01-25', '2026-01-08').phase).toBe('dawn');
    expect(clockAt('2026-01-01', '2026-01-25', '2026-01-19').phase).toBe('dusk');
    expect(rimFraction('2026-01-01', '2026-01-25', '2026-01-07')).toBeCloseTo(0.25);
  });

  it('on this day links then to now', () => {
    const r = onThisDay('2026-10-12', [
      { date: '2026-09-28', text: 'Your first session.' },
      { date: '2026-09-12', text: 'A walk to the lake.' },
      { date: '2026-09-30', text: 'Not a round number of days.' },
    ]);
    expect(r).toEqual([
      { ago: '2 weeks ago', date: '2026-09-28', text: 'Your first session.' },
      { ago: 'A month ago', date: '2026-09-12', text: 'A walk to the lake.' },
    ]);
  });
});

describe('achievement sets', () => {
  it('progress through a set and whether it is finished', () => {
    const set = ACH_SETS[0];
    expect(setProgress(set, new Set())).toEqual({ done: 0, total: set.ids.length, complete: false });
    expect(setProgress(set, new Set(set.ids)).complete).toBe(true);
  });
});

describe('departures filter', () => {
  it('groups milestones by walk, steps, training and shape', () => {
    expect(milestoneGroup('walk')).toBe('walk');
    expect(milestoneGroup('streak')).toBe('steps');
    expect(milestoneGroup('training')).toBe('training');
    expect(milestoneGroup('waist')).toBe('shape');
    expect(milestoneGroup('weight')).toBe('shape');
    expect(milestoneGroup('date')).toBeUndefined();
  });
});

describe('monthly film', () => {
  it('titled by the most-played workout song, then last month in big numbers', () => {
    const s1 = { id: 's1', date: '2026-09-03', status: 'done' as const, startedAt: atOn('2026-09-03', 1140), endedAt: atOn('2026-09-03', 1200), session: 'A' };
    const songs = [
      { id: 'a', at: atOn('2026-09-03', 1150), artist: 'Prateek Kuhad', track: 'cold/mess' },
      { id: 'b', at: atOn('2026-09-03', 1160), artist: 'Prateek Kuhad', track: 'cold/mess' },
      { id: 'c', at: atOn('2026-09-03', 1170), artist: 'Other', track: 'Elsewhere' },
      { id: 'd', at: atOn('2026-09-04', 600), artist: 'Not in a session', track: 'Morning' },
    ];
    const days = [
      { date: '2026-09-01', steps: 10000 },
      { date: '2026-09-02', steps: 15000 },
      { date: '2026-10-01', steps: 99999 },
    ];
    const f = monthlyFilm('2026-09', { days, sessions: [s1], sets: [{ date: '2026-09-03', mark: '!!' as const }], songs });
    expect(f.title).toBe('cold/mess');
    expect(f.slides.map((s) => s.big)).toEqual(['25,000', '1', '1', '15,000']);
    expect(monthlyFilm('2026-08', { days, sessions: [], sets: [], songs: [] }).title).toBe('August');
  });
});

describe('film month', () => {
  it('the month before, across a new year', () => {
    expect(lastMonth('2026-10-13')).toBe('2026-09');
    expect(lastMonth('2027-01-01')).toBe('2026-12');
  });
});

describe('experiments', () => {
  it('compares the days during with as many days before, up to four weeks', () => {
    const values = new Map<string, number>();
    for (let d = 1; d <= 30; d++) values.set(`2026-09-${String(d).padStart(2, '0')}`, d);
    const w = experimentWindows('2026-09-16', undefined, '2026-09-25', values);
    expect(w.during).toEqual([16, 17, 18, 19, 20, 21, 22, 23, 24, 25]);
    expect(w.before).toEqual([6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    expect(experimentWindows('2026-09-16', '2026-09-18', '2026-09-25', values).during).toEqual([16, 17, 18]);
  });
});

describe('experiment metrics', () => {
  it('reads each metric by day, skipping days without it', () => {
    const days = [
      { date: '2026-09-01', steps: 9000, sleep: { asleep: 1380, woke: 420 }, energy: 4 },
      { date: '2026-09-02', steps: 11000 },
    ];
    const entries = [
      { date: '2026-09-01', kcal: 500, protein: 40 },
      { date: '2026-09-01', kcal: 700, protein: 30 },
    ];
    const sessions = [{ date: '2026-09-02', readiness: 72 }];
    const d = { days, entries, sessions };
    expect([...experimentValues('steps', d)]).toEqual([['2026-09-01', 9000], ['2026-09-02', 11000]]);
    expect([...experimentValues('sleep', d)]).toEqual([['2026-09-01', 480]]);
    expect([...experimentValues('protein', d)]).toEqual([['2026-09-01', 70]]);
    expect([...experimentValues('energy', d)]).toEqual([['2026-09-01', 4]]);
    expect([...experimentValues('readiness', d)]).toEqual([['2026-09-02', 72]]);
  });
});

describe('reveal-day forecast', () => {
  it('waist ÷ height on reveal day from the current trend, slowing as it goes, with a range', () => {
    const f = benchmarkOn({ current: 0.55, slope: -0.0005 }, '2026-10-13', '2027-01-21');
    // 100 days at a rate that halves about every six weeks: about 49 days' worth of the current rate.
    expect(f?.value).toBeCloseTo(0.5256, 3);
    // Far out, the line flattens instead of running on.
    const far = benchmarkOn({ current: 0.532, slope: -0.00082 }, '2026-10-13', '2027-05-31')!;
    expect(far.value).toBeGreaterThan(0.47);
    expect(f!.range[0]).toBeLessThan(f!.value);
    expect(f!.range[1]).toBeGreaterThan(f!.value);
    expect(benchmarkOn({ current: 0.55 }, '2026-10-13', '2027-01-21')).toBeUndefined();
  });
});
