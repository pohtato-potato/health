import { isEased, pausedDays, placeFor, statusOn, statusRuns, targetsFor } from '../src/domain/places';
import { stepsGoal } from '../src/domain/rings';
import { DEFAULT_MEAL_TIMES, type Place } from '../src/domain/types';
import { describe, expect, it } from 'vitest';
import { addDays, dayRange } from '../src/domain/dates';
import { heldSteady, maintenanceKcal, pausedWeeks, stepStreakOf, trainingWeeksOf, withOccasion } from '../src/domain/occasions';
import type { Day, Occasion, Settings, Targets } from '../src/domain/types';

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

describe('v2 places and status', () => {
  const T2 = { kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 12000, waterMl: 0, sleepMin: 420, sessionsPerWeek: 4 };
  const office: Place = { id: 'o', name: 'Office', kind: 'office', meals: DEFAULT_MEAL_TIMES.office, eased: true, foodsFirst: 'outside' };
  const home: Place = { id: 'h', name: 'Home', kind: 'home', meals: DEFAULT_MEAL_TIMES.home, eased: false, foodsFirst: 'home' };
  const settings = { targets: [{ from: '2026-01-01', targets: T2 }], places: [home, office] } as unknown as Settings;

  it('office place eases steps to 10,000 from 12,000', () => {
    const day = { date: '2026-10-13', place: 'o' } as Day;
    expect(isEased(day, placeFor(day, settings))).toBe(true);
    expect(stepsGoal(T2, isEased(day, placeFor(day, settings)))).toBe(10000);
    expect(isEased({ date: '2026-10-13' } as Day, home)).toBe(false);
    expect(isEased({ date: '2026-10-13', eased: true } as Day, home)).toBe(true);
    expect(isEased({ date: '2026-10-13', status: 'sick' } as Day, home)).toBe(true);
  });

  it('status sick pauses training week and step streak', () => {
    const days: Day[] = [];
    for (const d of dayRange('2026-09-28', '2026-10-11')) days.push({ date: d, steps: 12500 } as Day);
    for (const d of dayRange('2026-10-05', '2026-10-08')) Object.assign(days.find((x) => x.date === d)!, { steps: 900, status: 'sick' });
    expect(pausedDays(days).size).toBe(4);
    expect(stepStreakOf(settings, days, '2026-10-12').current).toBeGreaterThanOrEqual(10);
    const sessions = ['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-09'];
    expect(trainingWeeksOf(settings, sessions, 4, '2026-10-13', days).streak).toBe(1);
    expect(trainingWeeksOf(settings, sessions, 4, '2026-10-13').streak).toBe(0);
    expect(stepStreakOf(settings, days.map((d) => ({ ...d, status: undefined })), '2026-10-12').current).toBeLessThan(10);
  });

  it('occasion status lifts calories to maintenance', () => {
    expect(statusOn({ date: '2026-10-13', status: 'occasion' } as Day)).toBe('occasion');
    expect(targetsFor({ date: '2026-10-13', status: 'occasion' } as Day, settings)!.kcalMax).toBe(maintenanceKcal(settings, T2));
    expect(targetsFor({ date: '2026-10-13' } as Day, settings)!.kcalMax).toBe(2300);
  });

  it('held steady report after status ends', () => {
    const days = dayRange('2026-10-05', '2026-10-08').map((d) => ({ date: d, status: 'travelling' }) as Day);
    const runs = statusRuns(days);
    expect(runs).toEqual([{ from: '2026-10-05', to: '2026-10-08', status: 'travelling' }]);
    const trend = [{ date: '2026-10-04', trend: 80 }, { date: '2026-10-10', trend: 80.3 }];
    expect(heldSteady(runs[0], trend, '2026-10-11')).toEqual({ change: 0.3 });
  });
});
