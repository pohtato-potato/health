import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { buildStats, type AchInput } from '../src/domain/achStats';
import { ACHIEVEMENTS } from '../src/domain/achievements';
import { statDeck } from '../src/domain/shakeStats';
import type { Day, SetEntry, Settings, TrainingSession } from '../src/domain/types';
import { defaultSettings } from '../src/db/actions';
import { setStride } from '../src/domain/walk';
import { PlaceStatusRow } from '../src/screens/walk/PlaceStatusRow';

const today = '2026-10-20';
const settings = { ...defaultSettings(), setupDone: true, strideM: 1.0 } as Settings;
const bigDay = { date: today, steps: 21_100 } as Day; // 15.6 km at 0.74 m, 21.1 km at 1.0 m

describe('part 0 review fixes', () => {
  afterEach(() => setStride(undefined));

  it('awards the half marathon with the stride in the settings it was given', () => {
    setStride(undefined); // the app-wide stride hasn't caught up yet
    const input = { today, now: Date.parse(`${today}T20:00:00`), settings, days: [bigDay], entries: [], foods: [], sessions: [], sets: [], measurements: [], wins: [], checkins: [], occasions: [], weekNotes: [], clips: 0, counters: [], unlocked: [] } as AchInput;
    const half = ACHIEVEMENTS.find((a) => a.name === 'Half marathon')!;
    expect(half.test(buildStats(input))).toBe(true);
    expect(half.test(buildStats({ ...input, settings: { ...settings, strideM: 0.74 } }))).toBe(false);
  });

  it('turns reps into km with the stride in the settings it was given', () => {
    setStride(undefined);
    const session = { id: 's1', date: today, status: 'done', startedAt: 1 } as TrainingSession;
    const set = { id: 'x', sessionId: 's1', reps: 1000 } as SetEntry;
    const deck = statDeck({ today, settings, days: [], entries: [], sessions: [session], sets: [set], measurements: [] });
    expect(deck.find((s) => s.text.includes('reps'))!.sub).toContain('1.0 km');
  });

  it('shows no place or status while the day is still loading, so a tap cannot clear a status', () => {
    expect(renderToStaticMarkup(<PlaceStatusRow settings={settings} today={today} day={undefined} onPlace={() => {}} />)).toBe('');
  });

  it('shows the status row once the day has loaded, even when there is no day saved', () => {
    expect(renderToStaticMarkup(<PlaceStatusRow settings={settings} today={today} day={null} onPlace={() => {}} startOpen />)).toContain('Status');
  });
});
