// Cup runs, layer 1: reading the last seven days for the deck (spec §3, §12). Invented values only.
import { describe, expect, it } from 'vitest';
import { addDays, type DayKey } from '../../../src/domain/dates';
import type { Day, SetEntry, Settings, TrainingSession } from '../../../src/domain/types';
import { dealDeck } from '../../../src/football/cup/deck';
import { dealInputFor, firstWeek } from '../../../src/football/cup/gather';
import type { Health } from '../../../src/football/store/gather';

const settings = {
  targets: [{ from: '2026-01-01', kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 8000, waterMl: 0, sleepMin: 450, sessionsPerWeek: 3 }],
  checklist: [{ id: 'brush', name: 'Brush', slots: ['am'], active: true }],
} as unknown as Settings;
const TODAY: DayKey = '2026-11-11';
function health(days: Partial<Day>[], more: Partial<Health> = {}): Health {
  return { settings, days: new Map(days.map((d) => [d.date!, d as Day])), sessions: [], kcal: new Map(), measures: [], sets: [], meals: new Map(), walks: [], routes: [], ...more };
}
const full = (date: DayKey, extra: Partial<Day> = {}): Partial<Day> => ({ date, steps: 11000, sleep: { asleep: 1380, woke: 420 }, ticks: { 'brush:0': 1 }, weightKg: 70, ...extra });
const back = (n: number) => addDays(TODAY, -n);

describe('the seven days', () => {
  const longAgo = Array.from({ length: 40 }, (_, i) => full(back(i + 1)));
  it('reads the seven days before today, oldest first', () => {
    const i = dealInputFor(health(longAgo), TODAY);
    expect(i.days.map((d) => d.date)).toEqual([7, 6, 5, 4, 3, 2, 1].map(back));
    expect(i.firstWeek).toBe(false);
  });
  it('marks a day with nothing logged, and a sick day', () => {
    const days = longAgo.filter((d) => d.date !== back(3)).map((d) => (d.date === back(2) ? { ...d, status: 'sick' as const } : d));
    const i = dealInputFor(health(days), TODAY);
    expect(i.days.find((d) => d.date === back(3))!.empty).toBe(true);
    expect(i.days.find((d) => d.date === back(2))!.status).toBe('sick');
    expect(dealDeck(i).extras.filter((e) => e.kind === 'empty')).toHaveLength(1);
  });
  it('a record set that week names a rare finish', () => {
    const sess = { id: 's1', date: back(4), status: 'done' } as TrainingSession;
    const set = { id: 'x', sessionId: 's1', date: back(4), exercise: 'Exercise A', mark: '!!' } as SetEntry;
    const d = dealDeck(dealInputFor(health(longAgo, { sessions: [sess], sets: [set] }), TODAY));
    expect(d.cards.find((c) => c.kind === 'thunderbolt')?.name).toBe('Exercise A');
  });
  it('a day with every ring closed gives Total football', () => {
    const kcal = new Map([[back(5), { kcal: 2100, protein: 150, n: 3 }]]);
    const d = dealDeck(dealInputFor(health(longAgo, { kcal }), TODAY));
    expect(d.cards.filter((c) => c.kind === 'total')).toHaveLength(1);
  });
  it('uses the league\'s nightly values: a well-slept, well-walked week is not basic', () => {
    const d = dealDeck(dealInputFor(health(longAgo), TODAY));
    expect(d.rows.find((r) => r.axis === 'Pace')!.level).not.toBe('basic');
    expect(d.rows.find((r) => r.axis === 'Rest')!.level).not.toBe('punt');
  });
});

describe('first week', () => {
  it('is the first week of the app', () => {
    expect(firstWeek(health([full(back(2))]), TODAY)).toBe(true);
  });
  it('and the first week back after a long gap', () => {
    const old = Array.from({ length: 10 }, (_, i) => full(back(i + 30)));
    expect(firstWeek(health([...old, full(back(1))]), TODAY)).toBe(true);
    expect(firstWeek(health([...old, full(back(1)), full(back(12))]), TODAY)).toBe(false);
  });
  it('thin axes in the first week come as basic cards, never punts', () => {
    const d = dealDeck(dealInputFor(health([full(back(2)), full(back(1))]), TODAY));
    expect(d.cards.some((c) => c.kind === 'punt' && !d.extras.some((e) => e.card.id === c.id))).toBe(false);
  });
});
