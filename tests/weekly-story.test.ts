import { describe, expect, it } from 'vitest';
import { defaultSettings } from '../src/db/actions';
import { addDays } from '../src/domain/dates';
import type { Sighting } from '../src/domain/creatures';
import type { Day, FoodEntry, Settings, TrainingSession } from '../src/domain/types';
import { storyChapters, weeksWithData, type StoryInput } from '../src/domain/weeklyStory';

const WEEK = '2026-10-26';
const TARGETS = { kcalMin: 2000, kcalMax: 2400, proteinG: 100, steps: 10000, waterMl: 3000, sleepMin: 420, sessionsPerWeek: 3 };
const settings = (): Settings => ({ ...defaultSettings(), targets: [{ from: '2020-01-01', targets: TARGETS }] });
const input = (over: Partial<StoryInput> = {}): StoryInput => ({ settings: settings(), days: [], entries: [], sessions: [], sets: [], sightings: [], ...over });
const week = (from: string, steps: number, over: Partial<Day> = {}): Day[] => Array.from({ length: 7 }, (_, n) => ({ date: addDays(from, n), steps, ...over }) as Day);
const session = (date: string): TrainingSession => ({ id: date, date, session: 'A', planName: 'P', startedAt: 0, status: 'done', short: false, exercises: [] });
const food = (date: string, protein: number): FoodEntry => ({ id: date, date, meal: 'lunch', at: 0, kind: 'quick', name: 'x', portion: '', kcal: 500, protein }) as FoodEntry;
const sight = (date: string, id: string): Sighting => ({ id: `${date}:${id}`, date, creatureId: id, tier: 'everyday', stageAfter: 1, grew: false, why: 'night', at: 0 });
const ids = (i: StoryInput) => storyChapters(WEEK, i).map((c) => c.id);

describe('storyChapters', () => {
  it('a full week has every chapter, in the fixed order', () => {
    const i = input({
      days: [...week(addDays(WEEK, -7), 6000), ...week(WEEK, 9000, { sleep: { asleep: 1380, woke: 400 } })],
      entries: [food(WEEK, 120)],
      sessions: [session(WEEK)],
      sightings: [sight(WEEK, 'peacock')],
      backupText: 'No backup yet',
    });
    const got = ids(i);
    const order = ['road', 'visitors', 'tally', 'swing', 'food', 'sleep', 'training', 'next', 'backup'];
    expect(got.filter((x) => order.includes(x))).toEqual(order);
  });

  it('an empty week has no chapters', () => {
    expect(storyChapters(WEEK, input())).toEqual([]);
  });

  it('a chapter with no data is left out', () => {
    const got = ids(input({ days: week(WEEK, 9000) }));
    expect(got).toContain('road');
    for (const absent of ['visitors', 'food', 'sleep', 'training', 'swing']) expect(got).not.toContain(absent);
  });

  it('road says how far the week went and what is ahead', () => {
    const [road] = storyChapters(WEEK, input({ settings: { ...settings(), strideM: 0.74 }, days: week(WEEK, 10000) }));
    expect(road.id === 'road' && Math.round(road.km)).toBe(52);
    expect(road.id === 'road' && road.ahead).toBe('Agra');
  });

  it('swing picks the biggest change, in words with both numbers', () => {
    const i = input({ days: [...week(addDays(WEEK, -7), 5000), ...week(WEEK, 10000)] });
    const swing = storyChapters(WEEK, i).find((c) => c.id === 'swing');
    expect(swing).toMatchObject({ what: 'Steps', now: '10,000 a day', was: '5,000' });
  });

  it('a past week opens as it was, whatever came after', () => {
    const before = input({ days: week(WEEK, 9000), sessions: [session(WEEK)] });
    const later = { ...before, days: [...before.days, ...week(addDays(WEEK, 14), 20000)], sessions: [...before.sessions, session(addDays(WEEK, 15))] };
    expect(storyChapters(WEEK, later)).toEqual(storyChapters(WEEK, before));
  });

  it('visitors lists who came that week, and no one else', () => {
    const i = input({ days: week(WEEK, 1), sightings: [sight(WEEK, 'peacock'), sight(addDays(WEEK, 7), 'nilgai')] });
    const c = storyChapters(WEEK, i).find((x) => x.id === 'visitors');
    expect(c).toMatchObject({ ids: ['peacock'] });
  });
});

describe('weeksWithData', () => {
  it('lists full weeks with anything logged, newest first, and not the running one', () => {
    const days = [...week('2026-10-12', 1), ...week('2026-10-26', 1), { date: '2026-11-03', steps: 1 } as Day];
    expect(weeksWithData(days, [], '2026-11-05')).toEqual(['2026-10-26', '2026-10-12']);
  });
});
