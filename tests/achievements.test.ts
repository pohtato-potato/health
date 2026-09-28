import { describe, expect, it } from 'vitest';
import { buildStats, type AchInput } from '../src/domain/achStats';
import { ACHIEVEMENTS, achievementById, text } from '../src/domain/achievements';
import { addDays, dayRange } from '../src/domain/dates';
import type { Day, FoodEntry } from '../src/domain/types';
import { defaultSettings } from '../src/db/actions';
import { EQ, PLAN, sets } from './fixtures';

const T = { kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 10000, waterMl: 3000, sleepMin: 420, sessionsPerWeek: 3 };
const today = '2026-10-20';

function input(over: Partial<AchInput> = {}): AchInput {
  return {
    today,
    now: Date.parse(`${today}T20:00:00`),
    settings: { ...defaultSettings(), setupDone: true, heightCm: 178, plan: PLAN, equipment: EQ, targets: [{ from: '2026-09-01', targets: T }], createdAt: Date.parse('2026-09-01T09:00:00') },
    days: [],
    entries: [],
    foods: [],
    sessions: [],
    sets: [],
    measurements: [],
    wins: [],
    checkins: [],
    occasions: [],
    weekNotes: [],
    clips: 0,
    counters: [],
    unlocked: [],
    ...over,
  };
}

const passes = (id: string, i: AchInput) => {
  const def = achievementById(id);
  if (!def) throw new Error(`No achievement ${id}`);
  return def.test(buildStats(i));
};

const food = (date: string, kcal: number, protein: number, hour = 13, meal: FoodEntry['meal'] = 'lunch'): FoodEntry => ({
  id: `${date}-${hour}-${kcal}`,
  date,
  meal,
  at: Date.parse(`${date}T${String(hour).padStart(2, '0')}:00:00`),
  kind: 'food',
  foodId: 'f1',
  name: 'Chicken breast',
  amount: 100,
  portion: '100 g',
  kcal,
  protein,
});

describe('achievement catalogue', () => {
  it('has all 223, with unique ids and readable text', () => {
    expect(ACHIEVEMENTS.length).toBe(223);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(223);
    const s = buildStats(input());
    for (const a of ACHIEVEMENTS) {
      expect(text(a.desc, s).length).toBeGreaterThan(5);
      expect(() => a.test(s)).not.toThrow();
    }
  });
  it('has the right mix of tiers and secrets', () => {
    expect(ACHIEVEMENTS.filter((a) => a.cat === 'secret').length).toBe(55);
    expect(ACHIEVEMENTS.filter((a) => a.tier === 'p').length).toBeGreaterThan(15);
  });
  it('keeps personal numbers out of the text', () => {
    const s = buildStats(input());
    const all = ACHIEVEMENTS.map((a) => text(a.desc, s)).join(' ');
    expect(all).toContain('Hit exactly 140 g of protein');
    expect(all).toContain('half your height');
  });
});

describe('conditions', () => {
  it('counts steps, streaks and exact finishes', () => {
    const days: Day[] = dayRange('2026-10-01', '2026-10-19').map((d, i) => ({ date: d, steps: i === 5 ? 12321 : i === 6 ? 15000 : 11000 + i }));
    const i = input({ days });
    expect(passes('walk-it-off', i)).toBe(true);
    expect(passes('palindrome', i)).toBe(true);
    expect(passes('bullseye', i)).toBe(true);
    expect(passes('lakhpati', i)).toBe(true);
    expect(passes('twenty-20', i)).toBe(false);
    expect(passes('1-up', i)).toBe(true);
    expect(passes('seven-day-week', i)).toBe(true);
  });
  it('closes rings for a perfect day and a bounce back', () => {
    const days: Day[] = [
      { date: '2026-10-10', steps: 4000 },
      { date: '2026-10-11', steps: 12000 },
    ];
    const entries = [food('2026-10-10', 1500, 90), food('2026-10-11', 2100, 150)];
    const i = input({ days, entries });
    expect(passes('three-for-three', i)).toBe(true);
    expect(passes('bounce-back', i)).toBe(true);
    expect(passes('protein-mode-on', i)).toBe(true);
  });
  it('finds the lunchbox and exact protein', () => {
    const entries = [food('2026-10-12', 900, 60, 9, 'breakfast'), food('2026-10-12', 900, 45, 13), food('2026-10-12', 400, 35, 20, 'dinner')];
    const i = input({ entries });
    expect(passes('the-lunchbox', i)).toBe(true);
    expect(passes('kitne-gram-the', i)).toBe(true);
  });
  it('tracks training milestones and records', () => {
    const s1 = sets('press', 'Press', 's1', '2026-10-05', 10, [10, 10, 10]);
    const s2 = sets('press', 'Press', 's2', '2026-10-07', 10, [13, 13, 13]).map((x, k) => (k === 0 ? { ...x, mark: '!!' as const } : x));
    const sessions = [
      { id: 's1', date: '2026-10-05', session: 'B', planName: 'x', startedAt: Date.parse('2026-10-05T19:07:00'), endedAt: 1, status: 'done' as const, short: false, exercises: ['press'] },
      { id: 's2', date: '2026-10-07', session: 'B', planName: 'x', startedAt: Date.parse('2026-10-07T18:00:00'), endedAt: 1, status: 'done' as const, short: true, exercises: ['press'] },
    ];
    const i = input({ sessions, sets: [...s1, ...s2] });
    expect(passes('day-one', i)).toBe(true);
    expect(passes('007', i)).toBe(true);
    expect(passes('chhota-packet-bada-dhamaka', i)).toBe(true);
    expect(passes('rishtey-mein-toh-hum-tumhare-baap-lagte-hain', i)).toBe(true);
  });
  it('measures the waist from the baseline at setup', () => {
    const measurements = [
      { id: 'a', date: '2026-06-01', at: 1, waistStanding: 42 },
      { id: 'b', date: '2026-09-05', at: 2, waistStanding: 38 },
      { id: 'c', date: '2026-10-15', at: 3, waistStanding: 36.9 },
    ];
    const i = input({ measurements });
    expect(passes('waist-not-want-not', i)).toBe(true);
    expect(passes('picture-abhi-baaki-hai', i)).toBe(false);
    expect(passes('jai-ho', i)).toBe(false);
    expect(passes('jai-ho', input({ measurements: [...measurements, { id: 'd', date: '2026-10-18', at: 4, waistStanding: 34.9 }] }))).toBe(true);
  });
  it('reads counters for app actions', () => {
    const i = input({ counters: [{ id: 'ticker-tap', n: 25 }, { id: 'voices', n: 4, values: ['zen', 'coach', 'comm', 'gremlin'] }] });
    expect(passes('clickbait', i)).toBe(true);
    expect(passes('voice-of-reason', i)).toBe(true);
    expect(passes('shake-it-off', i)).toBe(false);
  });
  it('does not count a batch of quiet unlocks as a mic drop', () => {
    const unlocked = ['a', 'b', 'c'].map((id) => ({ id, at: 1, date: today, quiet: true }));
    expect(passes('mic-drop', input({ unlocked }))).toBe(false);
    expect(passes('mic-drop', input({ unlocked: unlocked.map((u) => ({ ...u, quiet: false })) }))).toBe(true);
  });
  it('spots water and sleep feats', () => {
    const days: Day[] = dayRange(addDays(today, -8), addDays(today, -1)).map((d) => ({ date: d, waterMl: 3140, waterParts: 7, sleep: { asleep: 1350, woke: 360, rested: 5 } }));
    const i = input({ days });
    expect(passes('pi-day', i)).toBe(true);
    expect(passes('steady-flow', i)).toBe(true);
    expect(passes('just-keep-swimming', i)).toBe(true);
    expect(passes('dadi-approves', i)).toBe(true);
    expect(passes('early-riser', i)).toBe(true);
    expect(passes('how-s-the-josh', i)).toBe(true);
    expect(passes('the-metronome', i)).toBe(true);
  });
});
