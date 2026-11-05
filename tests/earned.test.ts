import { describe, expect, it } from 'vitest';
import { defaultSettings } from '../src/db/actions';
import { CREATURES } from '../src/domain/creatureRoster';
import type { Sighting } from '../src/domain/creatures';
import { firsts, milestones, odometers, shelves, visitorsByStretch } from '../src/domain/earned';
import { regionAt } from '../src/domain/regions';
import { pickedTrophies, trophyCandidates } from '../src/domain/trophies';
import type { Day, SetEntry, TrainingSession } from '../src/domain/types';

const TODAY = '2026-11-05';
const session = (id: string, date: string): TrainingSession => ({ id, date, session: 'A', planName: 'P', startedAt: 0, status: 'done', short: false, exercises: [] });
const set = (over: Partial<SetEntry>): SetEntry => ({ id: String(Math.random()), sessionId: 'a', date: '2026-10-01', reps: 10, loadKg: 10, ...over }) as SetEntry;
const sighting = (date: string, creatureId: string): Sighting => ({ id: `${date}:${creatureId}`, date, creatureId, tier: 'everyday', stageAfter: 2, grew: false, why: 'night', at: 0 });

describe('odometers', () => {
  it('adds up, and leaves skipped sets out', () => {
    const o = odometers({
      days: [{ date: '2026-10-01', steps: 1000, sleep: { asleep: 0, woke: 60 } }, { date: '2026-10-02', steps: 2000 }] as Day[],
      sessions: [session('a', '2026-10-01'), { ...session('b', '2026-10-02'), status: 'active' }],
      sets: [set({}), set({ skipped: true })],
    });
    expect(o.find((x) => x.id === 'steps')?.value).toBe('3,000');
    expect(o.find((x) => x.id === 'sessions')?.value).toBe('1');
    expect(o.find((x) => x.id === 'moved')?.value).toBe('100');
    expect(o.find((x) => x.id === 'nights')?.value).toBe('1');
  });

  it('nothing logged gives nothing', () => {
    expect(odometers({ days: [], sessions: [], sets: [] })).toEqual([]);
  });
});

describe('firsts', () => {
  it('takes the earliest of each, oldest first', () => {
    const f = firsts({
      days: [{ date: '2026-10-05', steps: 12000 }, { date: '2026-10-01', steps: 11000 }] as Day[],
      sessions: [session('b', '2026-10-09'), session('a', '2026-10-03')],
      sets: [set({ date: '2026-10-07', mark: '!!' })],
      sightings: [sighting('2026-10-08', 'peacock')],
    });
    expect(f.map((x) => x.date)).toEqual(['2026-10-01', '2026-10-03', '2026-10-07', '2026-10-08']);
  });

  it('is empty with nothing logged', () => {
    expect(firsts({ days: [], sessions: [], sets: [], sightings: [] })).toEqual([]);
  });
});

describe('milestones', () => {
  it('dates a session milestone on the session that reached it', () => {
    const sessions = Array.from({ length: 12 }, (_, n) => session(String(n), `2026-10-${String(n + 1).padStart(2, '0')}`));
    expect(milestones({ days: [], sessions }).find((m) => m.id === 's10')?.date).toBe('2026-10-10');
  });

  it('dates a distance milestone on the day it was crossed', () => {
    const m = milestones({ days: [{ date: '2026-10-01', steps: 100000 }, { date: '2026-10-02', steps: 100000 }] as Day[], sessions: [], stride: 0.74 });
    expect(m.find((x) => x.id === 'km100')?.date).toBe('2026-10-02');
  });
});

describe('visitorsByStretch', () => {
  it('lists a visitor under its own stretch, with no totals', () => {
    const c = CREATURES.find((x) => x.region === regionAt(0))!;
    const [first] = visitorsByStretch([sighting('2026-10-01', c.id), sighting('2026-10-02', c.id)], 0);
    expect(first.region).toBe(regionAt(0));
    expect(first.visitors[0]).toMatchObject({ id: c.id, visits: 2, stage: 2 });
    expect(Object.keys(first)).not.toContain('total');
  });

  it('the stretch you are on comes first and says so, with no one met yet', () => {
    const c = CREATURES.find((x) => x.region === regionAt(0))!;
    const out = visitorsByStretch([sighting('2026-10-01', c.id)], 3000);
    expect(out[0].here).toBe(true);
    expect(out[0].region).toBe(regionAt(3000));
    expect(out.some((s) => s.visitors.some((v) => v.id === c.id))).toBe(true);
  });

  it('a creature no longer on the roster still lists, under Elsewhere', () => {
    const out = visitorsByStretch([sighting('2026-10-01', 'gone-now')], 0);
    expect(out.find((s) => s.region === 'elsewhere')?.visitors[0].id).toBe('gone-now');
  });
});

describe('shelves', () => {
  it('groups by month, newest first, with records and achievements filling back', () => {
    const out = shelves({
      moments: [{ id: 'm', at: 0, kind: 'title', date: '2026-11-02', payload: { text: 'Wore a title' } }],
      achievements: [{ id: 'first-steps', date: '2026-10-05' }],
      sets: [set({ date: '2026-10-07', mark: '!!', exercise: 'Row' })],
    });
    expect(out.map((s) => s.month)).toEqual(['2026-11', '2026-10']);
    expect(out[1].items.map((i) => i.date)).toEqual(['2026-10-07', '2026-10-05']);
    expect(out[1].items[0].text).toMatch(/Row/);
  });

  it('is empty with nothing', () => {
    expect(shelves({ moments: [], achievements: [], sets: [] })).toEqual([]);
  });
});

describe('trophies', () => {
  const i = {
    today: TODAY,
    settings: defaultSettings(),
    days: [{ date: '2026-10-02', steps: 16204 }, { date: '2026-09-02', steps: 500 }] as Day[],
    entries: [],
    sets: [set({ mark: '!!' })],
    sightings: [sighting('2026-10-01', 'peacock')],
  };

  it('offers more than six to choose from when there is data', () => {
    expect(trophyCandidates(i).map((t) => t.id)).toEqual(expect.arrayContaining(['steps', 'month', 'records', 'lastmonth', 'visitors']));
  });

  it('every label takes two words or more', () => {
    for (const t of trophyCandidates(i)) expect(t.label.split(' ').length).toBeGreaterThanOrEqual(2);
  });

  it('picks win, in their order, and unknown picks drop out', () => {
    const t = pickedTrophies(trophyCandidates(i), ['visitors', 'nope', 'steps'], 6);
    expect(t.map((x) => x.id)).toEqual(['visitors', 'steps']);
  });

  it('no picks means automatic, up to the limit', () => {
    expect(pickedTrophies(trophyCandidates(i), undefined, 3)).toHaveLength(3);
  });
});
