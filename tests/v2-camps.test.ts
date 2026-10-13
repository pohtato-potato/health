import { describe, expect, it } from 'vitest';
import { buildFor, meetBuilt, nightCamp, structuresFrom } from '../src/walk/camps';
import { effectiveKm, PASSES, passOpen, strengthIndex } from '../src/walk/passes';
import { SOUVENIRS, souvenirFor } from '../src/walk/souvenirs';
import { detourKm, questCost, questOffer } from '../src/walk/quests';
import { ALL_STATES, TOTAL_KM } from '../src/domain/walk';
import type { Day, SetEntry, TrainingSession } from '../src/domain/types';

describe('camps and trail building', () => {
  it('bigger sessions and records build bigger things, named after the session', () => {
    expect(buildFor({ session: 'B', date: '2026-10-10' }, 40, false).kind).toBe('lamp post');
    expect(buildFor({ session: 'B', date: '2026-10-10' }, 92, false).kind).toBe('rest house');
    expect(buildFor({ session: 'B', date: '2026-10-10' }, 70, true).kind).toBe('shelter');
    expect(buildFor({ session: 'B', date: '2026-10-10' }, 92, false).name).toBe('Rest house · Session B · 10 Oct');
  });

  it('later chapter meets earlier structure at same km', () => {
    const days = [{ date: '2026-10-10', steps: 2000 }] as Day[];
    const sessions = [{ id: 's', date: '2026-10-10', session: 'B', status: 'done', quality: 92 }] as TrainingSession[];
    const built = structuresFrom(days, sessions, new Set());
    expect(built).toHaveLength(1);
    expect(built[0].km).toBeLessThan(5);
    const delhiAgain = TOTAL_KM + 3840;
    expect(meetBuilt(delhiAgain, built).map((b) => b.name)).toEqual(['Rest house · Session B · 10 Oct']);
    expect(meetBuilt(built[0].km + 1, built)).toEqual([]);
  });

  it('night camps are pictures, never penalties', () => {
    expect(nightCamp(450, 90)).toBe('starry');
    expect(nightCamp(420, 60)).toBe('calm');
    expect(nightCamp(300, 90)).toBe('rainy');
    expect(nightCamp(undefined, undefined)).toBe('calm');
  });
});

describe('passes', () => {
  it('pass gated by strength index', () => {
    const p = PASSES[0];
    expect(passOpen(p, p.need - 1)).toBe(false);
    expect(passOpen(p, p.need)).toBe(true);
    expect(effectiveKm(p.km + 100, p.need - 1)).toBe(p.km);
    expect(effectiveKm(p.km + 100, p.need)).toBe(p.km + 100);
    expect(effectiveKm(500, 0)).toBe(500);
  });
});

describe('strength index', () => {
  it('per cent above your first month, across lifts', () => {
    const set = (date: string, exerciseId: string, loadKg: number, reps: number) => ({ id: date + exerciseId, sessionId: date, date, session: 'A', exerciseId, exercise: exerciseId, setNo: 1, side: 'both', loadKg, reps, at: 0 }) as SetEntry;
    const sets = [set('2026-09-01', 'row', 10, 10), set('2026-09-01', 'press', 10, 10), set('2026-11-20', 'row', 12, 10), set('2026-11-20', 'press', 11, 10)];
    expect(strengthIndex(sets, '2026-11-25')).toBe(15);
    expect(strengthIndex(sets.slice(0, 2), '2026-09-05')).toBe(0);
  });
});

describe('souvenirs', () => {
  it('every state and territory gives one', () => {
    for (const s of new Set(ALL_STATES.map((x) => x.name))) expect(souvenirFor(s), s).toBeTruthy();
    expect(Object.keys(SOUVENIRS).length).toBeGreaterThanOrEqual(36);
  });
});

describe('side quests', () => {
  it('quest only for above-average weeks', () => {
    expect(questOffer(12000, 10000, 600, new Set())).toBeTruthy();
    expect(questOffer(9000, 10000, 600, new Set())).toBeUndefined();
    const q = questOffer(12000, 10000, 600, new Set())!;
    expect(questCost(q)).toBeGreaterThan(0);
    expect(questOffer(12000, 10000, 600, new Set([q.id]))?.id).not.toBe(q.id);
  });

  it('detours taken cost route kilometres; declined ones cost nothing', () => {
    expect(detourKm([{ id: 'quest:sanchi', data: { taken: true } }, { id: 'quest:hampi', data: { taken: false } }])).toBe(92);
    expect(detourKm([])).toBe(0);
  });
});
