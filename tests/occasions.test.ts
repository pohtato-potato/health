import { describe, expect, it } from 'vitest';
import { addDays, dayRange } from '../src/domain/dates';
import { heldSteady, maintenanceKcal, pausedWeeks, stepStreakOf, trainingWeeksOf, withOccasion } from '../src/domain/occasions';
import type { Day, Occasion, Targets } from '../src/domain/types';

const T: Targets = { kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 10000, waterMl: 3000, sleepMin: 420, sessionsPerWeek: 4 };
const FEST: Occasion = { id: 'o1', kind: 'festival', name: 'Festival', from: '2026-11-06', to: '2026-11-10' };
const settings = { targets: [{ from: '2026-01-01', targets: T }], occasions: [FEST] };

describe('occasion mode', () => {
  it('raises the calorie ceiling to maintenance inside an occasion only', () => {
    expect(maintenanceKcal({}, T)).toBe(2650);
    expect(maintenanceKcal({ maintenance: { kcal: 2800, at: 0, weeks: 4 } }, T)).toBe(2800);
    expect(withOccasion(settings, '2026-11-08', T).kcalMax).toBe(2650);
    expect(withOccasion(settings, '2026-11-11', T).kcalMax).toBe(2300);
    expect(withOccasion(settings, '2026-11-08', T).kcalMin).toBe(2000);
  });

  it('pauses the step streak through an occasion', () => {
    const days: Day[] = dayRange('2026-10-25', '2026-11-14').map((date) => ({ date, steps: date >= '2026-11-06' && date <= '2026-11-10' ? 3000 : 11000 }));
    const paused = stepStreakOf(settings, days, '2026-11-14');
    const plain = stepStreakOf({ targets: settings.targets }, days, '2026-11-14');
    expect(paused.current).toBe(16);
    expect(paused.shieldsUsed).toHaveLength(0);
    expect(plain.current).toBeLessThan(16);
  });

  it('lets a short training week inside an occasion pass without breaking the run', () => {
    // Four sessions a week for three weeks, one in the festival week, four the week after.
    const weeks = ['2026-10-19', '2026-10-26', '2026-11-02', '2026-11-09', '2026-11-16'];
    const dates = weeks.flatMap((w, i) => (i === 3 ? [w] : [0, 1, 2, 3].map((n) => addDays(w, n))));
    expect(pausedWeeks([FEST]).has('2026-11-09')).toBe(true);
    expect(trainingWeeksOf(settings, dates, 4, '2026-11-20').streak).toBe(4);
    expect(trainingWeeksOf({}, dates, 4, '2026-11-20').streak).toBe(1);
  });

  it('says whether the trend held steady, two days after the end', () => {
    const trend = [
      { date: '2026-11-05', trend: 80.0 },
      { date: '2026-11-12', trend: 80.3 },
    ];
    expect(heldSteady(FEST, trend, '2026-11-11')).toBeUndefined();
    expect(heldSteady(FEST, trend, '2026-11-12')).toEqual({ change: 0.3 });
  });
});
