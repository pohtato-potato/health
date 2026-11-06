import { describe, expect, it } from 'vitest';
import { axisValues, fuelScore, paceFromSteps, powerFromTraining, restFromSleep, routineFromShare, shapeFromLogs, type AxisInput } from '../../src/football/axes';
import type { ChecklistItem, Targets, TrainingSession } from '../../src/domain/types';

const t: Targets = { kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 8000, waterMl: 0, sleepMin: 450, sessionsPerWeek: 4 };
const sess = (over: Partial<TrainingSession> = {}): TrainingSession =>
  ({ id: 's', date: '2026-11-04', session: 'A', planName: 'p', startedAt: 0, status: 'done', short: false, exercises: [], ...over }) as TrainingSession;
const full = { Pace: 30, Power: 30, Fuel: 30, Rest: 30, Routine: 30, Shape: 30 };
const base = (over: Partial<AxisInput> = {}): AxisInput => ({
  day: { date: '2026-11-04', steps: 10000, sleep: { asleep: 1380, woke: 420 } },
  kcal: 2100, protein: 140, foodLogged: true, sessionsToday: [], weekDoneBefore: 2, weekdayMon1: 3,
  targets: t, checklist: [], weighIns7: 0, waist7: false, trendTowardGoal: false, history: full, ...over,
});

describe('Pace', () => {
  it('follows the step table', () => {
    const rows: [number, number][] = [[0, 1], [2000, 3], [10000, 12], [15000, 16], [18000, 19], [20000, 20], [30000, 20], [9000, 11]];
    for (const [s, v] of rows) expect(paceFromSteps(s)).toBe(v);
  });
});
describe('Rest', () => {
  it('follows the sleep table and the rested rating', () => {
    expect(restFromSleep(4)).toBe(4);
    expect(restFromSleep(7)).toBe(13);
    expect(restFromSleep(7, 5)).toBe(15);
    expect(restFromSleep(9, 1)).toBe(16);
    expect(restFromSleep(10)).toBe(18);
  });
});
describe('Fuel', () => {
  it('scores the range and protein, and never rewards eating less', () => {
    expect(fuelScore(2100, 140, t)).toBe(20);
    expect(fuelScore(1700, 140, t)).toBe(14);
    expect(fuelScore(2400, 140, t)).toBe(16);
    expect(fuelScore(2600, 140, t)).toBe(12);
    expect(fuelScore(1700, 140, t)).toBeLessThan(fuelScore(2100, 140, t));
    expect(fuelScore(2100, 70, t)).toBe(15);
  });
});
describe('Routine and Shape', () => {
  it('Routine follows the share table', () => {
    expect(routineFromShare(0)).toBe(3);
    expect(routineFromShare(0.5)).toBe(10);
    expect(routineFromShare(0.8)).toBe(15);
    expect(routineFromShare(1)).toBe(19);
  });
  it('Shape counts logs, the waist and the trend', () => {
    expect(shapeFromLogs(5, true, true)).toBe(18.5);
    expect(shapeFromLogs(0, false, false)).toBe(6);
    expect(axisValues(base({ weighIns7: 5, waist7: true, trendTowardGoal: true })).values.Shape).toBe(19);
  });
});
describe('Power', () => {
  it('reads the plan', () => {
    expect(powerFromTraining([sess()], 2, 3, 4)).toBe(16);
    expect(powerFromTraining([sess({ short: true })], 2, 3, 4)).toBe(11);
    expect(powerFromTraining([sess(), sess({ id: 't' })], 2, 3, 4)).toBe(18);
    expect(powerFromTraining([sess()], 4, 3, 4)).toBe(18);
    expect(powerFromTraining([], 2, 3, 4)).toBe(13);
    expect(powerFromTraining([], 0, 3, 4)).toBe(4);
  });
});
describe('axisValues', () => {
  it('plays 10 marked no-data with under a week of history', () => {
    const r = axisValues(base({ history: { ...full, Pace: 3 } }));
    expect(r.values.Pace).toBe(10);
    expect(r.flags.Pace).toBe('no-data');
  });
  it('plays 5 marked not-logged when a known habit was not logged', () => {
    const r = axisValues(base({ day: { date: '2026-11-04' } }));
    expect(r.values.Pace).toBe(5);
    expect(r.flags.Pace).toBe('not-logged');
    expect(r.values.Rest).toBe(5);
  });
  it('leaves medicines out of Routine', () => {
    const checklist: ChecklistItem[] = [
      { id: 'a', name: 'x', slots: ['am'], active: true },
      { id: 'm', name: 'y', slots: ['am', 'pm'], active: true, med: {} as never },
    ];
    const r = axisValues(base({ checklist, day: { date: '2026-11-04', steps: 1, sleep: { asleep: 0, woke: 420 }, ticks: { 'a:0': 1 } } }));
    expect(r.values.Routine).toBe(19);
  });
  it('every value is a whole number from 1 to 20', () => {
    const r = axisValues(base());
    for (const v of Object.values(r.values)) { expect(Number.isInteger(v)).toBe(true); expect(v).toBeGreaterThanOrEqual(1); expect(v).toBeLessThanOrEqual(20); }
  });
});
