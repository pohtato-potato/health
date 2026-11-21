import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { defaultSettings } from '../../src/db/actions';
import { addDays } from '../../src/domain/dates';
import type { MonthInput } from '../../src/domain/monthReport';
import { storySlides } from '../../src/domain/monthStory';
import type { Day, FoodEntry, Measurement, SetEntry, Settings, TrainingSession } from '../../src/domain/types';
import { StorySlideView } from '../../src/screens/you/StorySlide';

const MONTH = '2026-03';
const TODAY = '2026-04-04';
const TARGETS = { kcalMin: 1500, kcalMax: 2600, proteinG: 50, steps: 5000, waterMl: 1000, sleepMin: 300, sessionsPerWeek: 3 };
const settings = (): Settings => ({ ...defaultSettings(), targets: [{ from: '2020-01-01', targets: TARGETS }] });
const run = (from: string, n: number, steps: number): Day[] => Array.from({ length: n }, (_, k) => ({ date: addDays(from, k), steps: steps + k * 10, sleep: { asleep: 1380, woke: 420 } }) as Day);
const food = (from: string, n: number, protein: number): FoodEntry[] => Array.from({ length: n }, (_, k) => ({ id: `f${from}${k}`, date: addDays(from, k), protein, kcal: 2000 }) as FoodEntry);
const session = (date: string): TrainingSession => ({ id: date, date, session: 'A', planName: 'P', startedAt: 0, status: 'done', short: false, exercises: [] });
const best = (date: string): SetEntry => ({ id: date, sessionId: date, date, exercise: 'Test press', exerciseId: 'tp', reps: 8, loadKg: 30, mark: '!!' }) as SetEntry;
const waist = (date: string, v: number): Measurement => ({ id: date, date, at: 0, waistStanding: v });
const full = (): MonthInput => ({
  today: TODAY, settings: settings(), sightings: [], songs: [],
  days: [...run('2026-02-01', 28, 6000), ...run('2026-03-01', 31, 7000)],
  entries: [...food('2026-02-01', 28, 60), ...food('2026-03-01', 31, 70)],
  sessions: [session('2026-03-03'), session('2026-03-05')],
  sets: [best('2026-03-05')],
  measurements: [waist('2026-02-10', 34), waist('2026-03-12', 33.5)],
  results: [{ date: '2026-03-02', result: 'W' }, { date: '2026-03-09', result: 'D' }],
});

describe('y8-story The month\'s story', () => {
  it('nine slides you tap through, in order, when every part has data', () => {
    const s = storySlides(MONTH, full());
    expect(s.map((x) => x.kind)).toEqual(['days', 'perfect', 'road', 'gym', 'versus', 'shape', 'club', 'best', 'next']);
    expect(s[0].big).toBe('31');
    expect(s.find((x) => x.kind === 'versus')!.big).toBe('+10 g');
    expect(s.find((x) => x.kind === 'shape')!.big).toBe('−0.5 in');
  });

  it('a slide shows its place, its number and its line, and a Next button', () => {
    const s = storySlides(MONTH, full());
    const out = html(<StorySlideView slide={s[3]} at={3} of={s.length} month={MONTH} onNext={() => {}} onBack={() => {}} onClose={() => {}} />);
    expect(out).toContain('4 of 9');
    expect(out).toContain('>2<');
    expect(out).toContain('and 1 new best');
    expect(out).toContain('Test press');
    expect(out).toMatch(/<button[^>]*>Next<\/button>|<button[^>]*>[^<]*Next/);
    expect(out).toMatch(/aria-label="Close the story"/);
  });

  it('the calendar says its days in words, not colour alone', () => {
    const s = storySlides(MONTH, full());
    const out = html(<StorySlideView slide={s[0]} at={0} of={s.length} month={MONTH} onNext={() => {}} onBack={() => {}} onClose={() => {}} />);
    expect(out.match(/class="yu-st-d/g)).toHaveLength(31);
    expect(out).toMatch(/Every ring: \d+/);
  });

  it('renders with no data', () => {
    expect(storySlides(MONTH, { ...full(), days: [], entries: [], sessions: [], sets: [], measurements: [], results: [] })).toEqual([]);
  });
});
