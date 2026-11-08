import { describe, expect, it } from 'vitest';
import { comparable, contextOf } from '../src/domain/context';
import { lighterCase } from '../src/domain/deload';
import { estMinutes, shortPlan } from '../src/domain/plannerShort';
import { tripSession } from '../src/domain/trip';
import { DEFAULT_EQUIPMENT, DEFAULT_PLAN } from '../src/domain/defaultPlan';
import { exerciseStatus } from '../src/domain/progression';
import type { Day, Place, Settings, TrainingSession } from '../src/domain/types';

const office: Place = { id: 'o', name: 'Office', kind: 'office', meals: { breakfast: 480, lunch: 780, snacks: 1020, dinner: 1230 }, eased: true, foodsFirst: 'outside' };
const settings = { places: [office] } as unknown as Settings;
const at = (d: number, h: number) => new Date(2026, 9, d, h, 0).getTime();

describe('context and fair comparisons', () => {
  it('post-office tag after office day after 17:00', () => {
    const tags = contextOf({ startedAt: at(13, 19), date: '2026-10-13' }, { date: '2026-10-13', place: 'o' } as Day, undefined, settings);
    expect(tags).toContain('post-office');
    expect(contextOf({ startedAt: at(13, 15), date: '2026-10-13' }, { date: '2026-10-13', place: 'o' } as Day, undefined, settings)).not.toContain('post-office');
    expect(contextOf({ startedAt: at(11, 9), date: '2026-10-11' }, undefined, { nightOut: true } as Day, settings)).toEqual(expect.arrayContaining(['morning', 'weekend', 'after-night-out']));
  });

  it('comparable only when the key tags match', () => {
    expect(comparable(['post-office', 'place:o'], ['post-office', 'weekend'])).toBe(true);
    expect(comparable(['post-office'], [])).toBe(false);
    expect(comparable(['short'], ['short', 'morning'])).toBe(false);
  });
});

describe('short session by time', () => {
  const session = DEFAULT_PLAN.sessions[1];
  const statuses = new Map(session.exercises.map((e) => [e.id, exerciseStatus(e, undefined, DEFAULT_EQUIPMENT, [])]));

  it('shortPlan fits 30 min, main lifts first, each with a reason', () => {
    const { picks } = shortPlan(session.exercises, 30, statuses);
    const total = picks.reduce((n, p) => n + estMinutes(session.exercises.find((e) => e.id === p.exId)!), 0);
    expect(total).toBeLessThanOrEqual(30);
    expect(picks[0]).toEqual({ exId: 'floor-press', reason: 'Main lift' });
    expect(picks.length).toBeGreaterThanOrEqual(2);
    for (const p of picks) expect(p.reason.length).toBeGreaterThan(0);
  });
});

describe('lighter week', () => {
  const s = (date: string, readiness?: number): TrainingSession => ({ id: date, date, session: 'A', planName: 'x', startedAt: 0, status: 'done', exercises: [], readiness }) as unknown as TrainingSession;

  it('6 weeks alone no longer makes the case: the coach asks for 2 of 5 rules (O21)', () => {
    const steady = ['2026-09-01', '2026-09-08', '2026-09-15', '2026-09-22', '2026-09-29', '2026-10-06', '2026-10-12'].map((d) => s(d, 75));
    const c = lighterCase({ sessions: steady, sets: [], days: [] }, '2026-10-13');
    expect(c.evidence[0]).toMatch(/6 weeks/);
    expect(c.due).toBe(false);
    const sick = lighterCase({ sessions: steady, sets: [], days: [{ date: '2026-10-12', status: 'sick' }, { date: '2026-10-13', status: 'sick' }] }, '2026-10-13');
    expect(sick.due).toBe(true);
    expect(lighterCase({ sessions: steady, sets: [], days: [], lighterWeek: { from: '2026-09-25', to: '2026-10-01' } }, '2026-10-13').evidence).toEqual([]);
  });
});

describe('trip workout', () => {
  it('trip session has no loaded exercises', () => {
    const trip = tripSession(DEFAULT_PLAN);
    expect(trip.exercises.length).toBeGreaterThanOrEqual(4);
    expect(trip.exercises.every((e) => e.load === 'body')).toBe(true);
    expect(new Set(trip.exercises.map((e) => e.id)).size).toBe(trip.exercises.length);
  });
});
