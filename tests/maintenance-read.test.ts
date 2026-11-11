import { describe, expect, it } from 'vitest';
import { maintenanceRead } from '../src/domain/maintenanceRead';

const base = { maintenance: 2400, kcalMax: 2200, week: [] as number[] };

describe('the maintenance read (y-maint)', () => {
  it('says nothing on a day within the target', () => {
    expect(maintenanceRead({ ...base, yesterday: 2100 })).toEqual([]);
  });
  it('an over day: where it sits against maintenance', () => {
    const [l] = maintenanceRead({ ...base, yesterday: 2800 });
    expect(l).toMatch(/2,800 kcal/);
    expect(l).toMatch(/400 over your estimated maintenance of 2,400/);
  });
  it('over the target but under maintenance reads as a maintenance day', () => {
    expect(maintenanceRead({ ...base, yesterday: 2300 })[0]).toMatch(/maintenance day, not a gain/);
  });
  it('an over week gets its own line; at most two lines', () => {
    const r = maintenanceRead({ ...base, yesterday: 2800, week: [2500, 2600, 2500, 2550, 2600, 2500, 2700] });
    expect(r).toHaveLength(2);
    expect(r[1]).toMatch(/7 days average/);
  });
  it('never rewards eating less or asks for it to be made up', () => {
    const all = [
      ...maintenanceRead({ ...base, yesterday: 3500, week: [3000, 3000, 3000, 3000, 3000] }),
      ...maintenanceRead({ ...base, yesterday: 2300, week: [2300, 2300, 2300, 2300, 2300] }),
    ].join(' ');
    expect(all).not.toMatch(/less|cut|make up|compensate|skip|burn it off|should|too much|bad/i);
  });
  it('no estimate yet, nothing to say', () => {
    expect(maintenanceRead({ ...base, maintenance: undefined, yesterday: 3000 })).toEqual([]);
  });
});

// Owner, 12 Nov (choice D b): the read lives on Food only, to keep Today short.
import { readFileSync as readSrc } from 'node:fs';
describe('where the maintenance read shows', () => {
  const src = (f: string) => readSrc(new URL(`../src/screens/${f}`, import.meta.url), 'utf8');
  it('Food shows it; Today does not', () => {
    expect(src('FoodToday.tsx')).toMatch(/<MaintenanceRead \/>/);
    expect(src('Today.tsx')).not.toMatch(/MaintenanceRead/);
  });
});
