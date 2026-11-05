import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { defaultSettings } from '../src/db/actions';
import { addDays, dayRange } from '../src/domain/dates';
import type { Day, FoodEntry, SetEntry, TrainingSession } from '../src/domain/types';
import {
  beforeFlag, compareSeries, drinksAnswer, shapeCone, fitnessFreshness, habitStrength, headlineFor, jointCalendar, moveTogether, newMedicine, ownSummary, proteinClock,
  sleepBalance, socialJetLag, sortedDays, strengthByExercise, stretchBands, TRACK_KEYS, type HeadInput,
} from '../src/domain/trackRules';

const TODAY = '2026-11-05';
const input = (over: Partial<HeadInput> = {}): HeadInput => ({ today: TODAY, settings: defaultSettings(), days: [], entries: [], sessions: [], sets: [], measurements: [], ...over });
const set = (date: string, exerciseId: string, loadKg: number, sessionId = date): SetEntry => ({ id: `${date}${exerciseId}${loadKg}`, sessionId, date, exercise: exerciseId, exerciseId, reps: 10, loadKg, at: 0 }) as unknown as SetEntry;
const last = (n: number, f: (d: string) => Partial<Day>): Day[] => dayRange(addDays(TODAY, -(n - 1)), TODAY).map((date) => ({ date, ...f(date) }));

describe('headlineFor', () => {
  it('no data never reads as zero, on any track', () => {
    for (const k of TRACK_KEYS) {
      const h = headlineFor(k, input());
      expect(h.say.length).toBeGreaterThan(3);
      expect(`${h.say} ${h.changed ?? ''} ${h.why ?? ''} ${h.next ?? ''}`).not.toMatch(/\b0\b|NaN|undefined|\+0%/);
    }
  });
  it('says steps in words with the change on the week before', () => {
    const days = [...dayRange(addDays(TODAY, -13), addDays(TODAY, -7)).map((date) => ({ date, steps: 5000 })), ...last(7, () => ({ steps: 9000 }))];
    const h = headlineFor('steps', input({ days }));
    expect(h.say).toMatch(/9,000/);
    expect(h.changed).toMatch(/Up 4,000/);
  });
  it('a track has no why it cannot back up', () => {
    expect(headlineFor('steps', input({ days: last(7, () => ({ steps: 9000 })) })).why).toBeUndefined();
  });
  it('drinks with nothing answered says not logged, not none', () => {
    expect(headlineFor('drinks', input()).say).toMatch(/not logged/i);
    expect(headlineFor('drinks', input({ days: [{ date: TODAY, noDrinks: true }] })).say).toMatch(/no drinks/i);
  });
});

describe('strengthByExercise', () => {
  it('says not enough until a lift has three sessions, never +0%', () => {
    const r = strengthByExercise([set('2026-10-01', 'row', 10), set('2026-10-30', 'row', 12)], TODAY);
    expect(r[0]).toMatchObject({ pct: undefined, word: 'Not enough sessions yet' });
  });
  it('gives the change once it can speak', () => {
    const r = strengthByExercise([set('2026-09-01', 'row', 10), set('2026-09-08', 'row', 10), set('2026-10-30', 'row', 12)], TODAY);
    expect(r[0].pct).toBe(20);
  });
  it('a flat lift is holding, not zero', () => {
    const r = strengthByExercise([set('2026-09-01', 'row', 10), set('2026-09-08', 'row', 10), set('2026-10-30', 'row', 10)], TODAY);
    expect(r[0]).toMatchObject({ pct: undefined, word: 'Holding' });
  });
});

describe('drinksAnswer', () => {
  const drink = { date: TODAY, kind: 'drink', drink: { count: 2 } } as unknown as FoodEntry;
  it('is not logged until answered', () => expect(drinksAnswer(TODAY, undefined, [])).toBe('not logged'));
  it('"no drinks" is an answer', () => expect(drinksAnswer(TODAY, { date: TODAY, noDrinks: true }, [])).toBe('none'));
  it('a logged drink beats a stale no', () => expect(drinksAnswer(TODAY, { date: TODAY, noDrinks: true }, [drink])).toBe(2));
});

describe('stretchBands', () => {
  const steps = new Map(dayRange('2026-10-01', '2026-10-30').map((d) => [d, 40000]));
  it('tiles the range with no gap and no overlap', () => {
    const b = stretchBands('2026-10-01', '2026-10-30', steps, 0.74);
    expect(b[0].from).toBe('2026-10-01');
    expect(b[b.length - 1].to).toBe('2026-10-30');
    for (let i = 1; i < b.length; i++) expect(b[i].from).toBe(addDays(b[i - 1].to, 1));
    expect(b.length).toBeGreaterThan(1);
  });
  it('an empty road is one band', () => {
    expect(stretchBands('2026-10-01', '2026-10-03', new Map(), 0.74)).toHaveLength(1);
  });
});

describe('sortedDays and habitStrength', () => {
  it('sorts logged days only, lowest first', () => {
    expect(sortedDays([{ date: TODAY, steps: 9 }, { date: addDays(TODAY, -1), steps: 3 }, { date: addDays(TODAY, -2) }], TODAY)).toEqual([3, 9]);
  });
  it('habit strength climbs with hits and falls with misses, inside 0 to 100', () => {
    const up = habitStrength(Array(30).fill(true));
    const down = habitStrength([...Array(30).fill(true), ...Array(10).fill(false)]);
    expect(up[up.length - 1]).toBeGreaterThan(90);
    expect(down[down.length - 1]).toBeLessThan(up[up.length - 1]);
    expect(Math.min(...down)).toBeGreaterThanOrEqual(0);
  });
});

describe('sleep', () => {
  it('balance adds up what the last week fell short of, ignoring unlogged nights', () => {
    const days = [{ date: TODAY, sleep: { asleep: 1380, woke: 300 } }, { date: addDays(TODAY, -1) }] as Day[];
    expect(sleepBalance(days, TODAY, 420)).toBe(60);
  });
  it('social jet lag needs both weekdays and weekends', () => {
    expect(socialJetLag([{ date: '2026-11-02', sleep: { asleep: 1380, woke: 420 } }] as Day[])).toBeUndefined();
  });
  it('measures the shift in the middle of the night', () => {
    const days = [
      { date: '2026-11-03', sleep: { asleep: 1380, woke: 420 } },
      { date: '2026-11-08', sleep: { asleep: 60, woke: 540 } },
    ] as Day[];
    expect(socialJetLag(days)).toBe(120);
  });
});

describe('proteinClock', () => {
  it('places protein meals between 6 am and midnight and splits by place', () => {
    const at = new Date(2026, 10, 4, 15).getTime();
    const r = proteinClock([{ date: '2026-11-04', at, protein: 30, meal: 'lunch' } as FoodEntry], () => 'office');
    expect(r.office[0]).toBe(50);
    expect(r.home).toEqual([]);
  });
});

describe('jointCalendar', () => {
  it('leaves unanswered days blank and marks flags', () => {
    const c = jointCalendar(TODAY, [{ date: TODAY }], [{ date: addDays(TODAY, -1) }], 3);
    expect(c.map((x) => x.state)).toEqual(['blank', 'flag', 'fine']);
  });
});

describe('fitnessFreshness', () => {
  it('needs sessions to speak', () => expect(fitnessFreshness([], TODAY)).toEqual({ fitness: [], freshness: [] }));
  it('fresher after rest than right after work', () => {
    const work = dayRange(addDays(TODAY, -30), addDays(TODAY, -6)).map((date) => ({ date, status: 'done' }) as TrainingSession);
    const f = fitnessFreshness(work, TODAY);
    expect(f.freshness[f.freshness.length - 1]).toBeGreaterThan(f.freshness[f.freshness.length - 7]);
  });
});

describe('compare', () => {
  it('uses only days with both, and says so', () => {
    const days = [{ date: TODAY, steps: 5 }, { date: addDays(TODAY, -1), steps: 6, sleep: { asleep: 1380, woke: 420 } }] as Day[];
    expect(compareSeries('steps', 'sleep', input({ days })).days).toEqual([addDays(TODAY, -1)]);
  });
  it('needs 14 shared days before it says they move together', () => {
    expect(moveTogether([1, 2, 3], [1, 2, 3])).toBeUndefined();
    const a = Array.from({ length: 20 }, (_, i) => i);
    expect(moveTogether(a, a)).toBe('together');
    expect(moveTogether(a, a.map((x) => -x))).toBe('opposite');
  });
});

describe('own tracks and medicines', () => {
  it('a yes or no track counts the yeses, and an empty one says not logged', () => {
    const t = { id: 'x', name: 'Stretch', kind: 'yesno' as const, active: true, createdAt: 0 };
    expect(ownSummary(t, [], TODAY)).toBe('Not logged yet');
    expect(ownSummary(t, [{ id: 'a', trackId: 'x', date: TODAY, value: 1 }, { id: 'b', trackId: 'x', date: addDays(TODAY, -1), value: 0 }], TODAY)).toBe('Yes on 1 of 2 days');
  });
  it('a new medicine is only a draft until saved', () => {
    expect(newMedicine('  Tablet ', '08:00', 5)).toMatchObject({ id: 'm5', name: 'Tablet', active: true });
    expect(newMedicine('  ', '08:00', 5)).toBeUndefined();
  });
});

describe('beforeFlag', () => {
  it('names what the data shows and nothing else', () => {
    const days = [{ date: TODAY, sleep: { asleep: 1380, woke: 240 } }];
    const sessions = [{ date: addDays(TODAY, -1), status: 'done' }, { date: addDays(TODAY, -3), status: 'done' }] as TrainingSession[];
    expect(beforeFlag(TODAY, days, sessions, 420)).toBe('A short night, 5 h, and 2 sessions in the 3 days before.');
    expect(beforeFlag(TODAY, [], [], 420)).toBeUndefined();
  });
});

describe('shapeCone', () => {
  const trend = Array.from({ length: 10 }, (_, n) => ({ date: addDays(TODAY, n * 2 - 18), trend: 80 - n * 0.1 }));
  it('is quiet with too few weigh-ins', () => expect(shapeCone(trend.slice(0, 3), TODAY)).toBeUndefined());
  it('points the way the trend runs, with the range around it', () => {
    const c = shapeCone(trend, TODAY)!;
    expect(c.mid).toBeLessThan(c.now);
    expect(c.low).toBeLessThan(c.mid);
    expect(c.high).toBeGreaterThan(c.mid);
  });
});

describe('the medicines page', () => {
  it('Add only opens the draft; Save is the one place a new medicine is stored', () => {
    const src = readFileSync('src/screens/Medicines.tsx', 'utf8');
    expect(src).toMatch(/onClick=\{\(\) => setAdding\(true\)\}>\+ Add/);
    expect(src).not.toMatch(/name: 'New medicine'/);
  });
});
