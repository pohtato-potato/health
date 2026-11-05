import { describe, expect, it } from 'vitest';
import { defaultSettings } from '../src/db/actions';
import { askData, type AskInput } from '../src/domain/askData';
import { dayCard, searchDiary } from '../src/domain/dayCard';
import { confidenceWord, insightCards, naturalEvents, statOfWeek, trackRecord, trendWorking } from '../src/domain/insightCards';
import { addDays, dayRange } from '../src/domain/dates';
import type { Day, FoodEntry, SetEntry, TrainingSession } from '../src/domain/types';

const TODAY = '2026-11-05';
const input = (over: Partial<AskInput> = {}): AskInput => ({ today: TODAY, settings: defaultSettings(), days: [], entries: [], sessions: [], sets: [], ...over });
const session = (date: string) => ({ id: date, date, status: 'done', startedAt: 0 }) as TrainingSession;
const food = (date: string, name: string, protein = 20) => ({ id: date + name, date, name, kind: 'quick', protein, kcal: 100, at: 0 }) as unknown as FoodEntry;
const steps = (from: string, to: string, n = 9000): Day[] => dayRange(from, to).map((date) => ({ date, steps: n }));

describe('askData', () => {
  it('"when did I last train" finds the right day and lists it', () => {
    const a = askData('When did I last train?', input({ sessions: [session('2026-10-20'), session('2026-10-28')] }))!;
    expect(a.days).toEqual(['2026-10-28']);
    expect(a.answer).toMatch(/28 Oct/);
  });
  it('finds a food by name', () => {
    expect(askData('when did i last eat paneer', input({ entries: [food('2026-10-02', 'Paneer bhurji'), food('2026-10-09', 'Eggs')] }))!.days).toEqual(['2026-10-02']);
  });
  it('an answer lists every day it used', () => {
    const a = askData('how many sessions in october', input({ sessions: [session('2026-10-02'), session('2026-10-09'), session('2026-11-01')] }))!;
    expect(a.answer).toMatch(/2 sessions/);
    expect(a.days).toEqual(['2026-10-02', '2026-10-09']);
  });
  it('an average uses logged days only and says how many', () => {
    const a = askData('average steps last week', input({ days: [...steps('2026-10-26', '2026-10-28'), { date: '2026-10-29' }] }))!;
    expect(a.answer).toMatch(/9,000.*3 logged days/);
    expect(a.days).toHaveLength(3);
  });
  it('the best step day', () => {
    const a = askData('best step day', input({ days: [{ date: '2026-10-01', steps: 5 }, { date: '2026-10-02', steps: 50 }] }))!;
    expect(a.days).toEqual(['2026-10-02']);
  });
  it('says nothing happened rather than making something up', () => {
    const a = askData('when did i last train', input())!;
    expect(a.answer).toMatch(/no session/i);
    expect(a.days).toEqual([]);
  });
  it('a question it can not read returns nothing', () => {
    expect(askData('why is the sky blue', input())).toBeUndefined();
  });
});

describe('confidenceWord', () => {
  it('grows with the data, in words', () => {
    expect([confidenceWord(3), confidenceWord(10), confidenceWord(30), confidenceWord(90)]).toEqual(['Early days', 'Some evidence', 'Fair evidence', 'Solid']);
  });
});

describe('insightCards', () => {
  it('with no data every card states what it still needs', () => {
    const cards = insightCards(input());
    expect(cards.length).toBeGreaterThanOrEqual(4);
    for (const c of cards) {
      expect(c.needed).toMatch(/\d/);
      expect(c.text).toBeUndefined();
    }
  });
  it('a card that speaks has its working and a confidence word', () => {
    const c = insightCards(input({ days: steps(addDays(TODAY, -60), TODAY) })).find((x) => x.id === 'weekday')!;
    expect(c.text).toBeTruthy();
    expect(c.working).toMatch(/\d/);
    expect(c.confidence).toBeTruthy();
  });
});

describe('naturalEvents', () => {
  it('finds a sick run and compares it with the week before', () => {
    const days: Day[] = [...steps('2026-10-05', '2026-10-11', 10000), ...dayRange('2026-10-12', '2026-10-14').map((date) => ({ date, steps: 2000, status: 'sick' as const }))];
    const e = naturalEvents(days, defaultSettings(), TODAY);
    expect(e[0]).toMatchObject({ name: 'Sick', from: '2026-10-12', to: '2026-10-14' });
    expect(e[0].line).toMatch(/2,000.*10,000/);
  });
  it('a single day is not an event', () => {
    expect(naturalEvents([{ date: '2026-10-12', status: 'sick' }], defaultSettings(), TODAY)).toEqual([]);
  });
});

describe('statOfWeek and trackRecord', () => {
  it('has no stat without a week', () => expect(statOfWeek(input())).toBeUndefined());
  it('gives km for a walked week', () => {
    expect(statOfWeek(input({ days: steps('2026-10-26', '2026-11-01') }))?.small).toMatch(/km/);
  });
  it('counts forecasts that landed, and is quiet with none', () => {
    expect(trackRecord([])).toBeUndefined();
    expect(trackRecord([{ id: 'a', kind: 'x', madeAt: 0, targetDate: TODAY, low: 1, high: 3, outcome: 2 }, { id: 'b', kind: 'x', madeAt: 0, targetDate: TODAY, low: 1, high: 3, outcome: 9 }, { id: 'c', kind: 'x', madeAt: 0, targetDate: TODAY, low: 1, high: 3 }])).toEqual({ hit: 1, total: 2 });
  });
});

describe('the day card', () => {
  it('says what was not logged in words, and never a zero', () => {
    const c = dayCard(TODAY, input({ days: [{ date: TODAY, steps: 9000 }] }));
    expect(c.lines).toContainEqual(['Steps', '9,000']);
    expect(c.missing).toContain('sleep');
    expect(c.missing).toContain('food');
    expect(JSON.stringify(c)).not.toMatch(/\b0\b/);
  });
  it('an answered no-drinks day says none; a blank one stays not logged', () => {
    expect(dayCard(TODAY, input({ days: [{ date: TODAY, noDrinks: true }] })).lines).toContainEqual(['Drinks', 'None']);
    expect(dayCard(TODAY, input()).missing).toContain('drinks');
  });
});

describe('searchDiary', () => {
  it('finds food, notes and exercises, newest first', () => {
    const i = input({
      entries: [food('2026-10-02', 'Paneer bhurji')],
      days: [{ date: '2026-10-05', note: 'paneer at a wedding' }],
      sets: [{ date: '2026-10-07', exercise: 'Row' } as SetEntry],
    });
    expect(searchDiary('paneer', i).map((r) => r.date)).toEqual(['2026-10-05', '2026-10-02']);
    expect(searchDiary('row', i)[0].date).toBe('2026-10-07');
  });
  it('an empty search finds nothing', () => expect(searchDiary('  ', input())).toEqual([]));
});

describe('the working behind a trend', () => {
  it('says what it was, what it is, and what it counted', () => {
    const w = trendWorking({ area: 'steps', word: 'Improving', now: '9,000 a day', was: '7,000 a day', series: [1, 2, 3] });
    expect(w).toMatch(/7,000 a day/);
    expect(w).toMatch(/9,000 a day/);
    expect(w).toMatch(/14 days/);
  });
  it('without an earlier period it says so', () => {
    expect(trendWorking({ area: 'sleep', word: 'Building', now: '7h a night', series: [] })).toMatch(/nothing to compare/i);
  });
});

describe('the day card in full', () => {
  it('counts a blank weight as not logged and shows a logged one', () => {
    expect(dayCard(TODAY, input()).missing).toContain('weight');
    expect(dayCard(TODAY, input({ days: [{ date: TODAY, weightKg: 70.5 }] })).lines).toContainEqual(['Weight', '70.5 kg']);
  });
  it('gives sleep its clock times and length', () => {
    const line = dayCard(TODAY, input({ days: [{ date: TODAY, sleep: { asleep: 1380, woke: 420 } }] })).lines.find((l) => l[0] === 'Sleep');
    expect(line?.[1]).toMatch(/11:00 pm → 7:00 am · 8 h/);
  });
  it('always names a place, even on a blank day', () => {
    expect(dayCard(TODAY, input()).lines.some((l) => l[0] === 'Place')).toBe(true);
  });
});

describe('words on insight cards', () => {
  it('one more night is singular', () => {
    const entries = [{ id: 'd', date: '2026-10-01', kind: 'drink', name: 'Beer', protein: 0, kcal: 100, at: 0, drink: { type: 'beer', count: 1 } }] as unknown as FoodEntry[];
    expect(insightCards(input({ entries })).find((c) => c.id === 'drinks')?.needed).toBe('Needs 1 more night with drinks.');
  });
  it('the working does not repeat its span', () => {
    expect(trendWorking({ area: 'training', word: 'Easing', now: '2 sessions in two weeks', was: '6', series: [] })).toBe('Now: 2 sessions in two weeks. Four weeks ago: 6. Each is measured over 14 days, and only logged days count.');
  });
});
