import { describe, expect, it } from 'vitest';
import { logHour } from '../src/domain/dates';
import { mealForTime } from '../src/domain/foods';
import { pinnedLine } from '../src/domain/voice';

const at = (h: number, m = 0) => new Date(2026, 9, 14, h, m);

describe('after midnight is still the evening before', () => {
  it('counts hours on the logging day, so 1 am is hour 25', () => {
    expect(logHour(at(1).getTime())).toBe(25);
    expect(logHour(at(4).getTime())).toBe(4);
    expect(logHour(at(23, 30).getTime())).toBe(23);
  });

  it('puts a 1 am snack in dinner, not breakfast', () => {
    expect(mealForTime(at(1, 15))).toBe('dinner');
    expect(mealForTime(at(8))).toBe('breakfast');
  });
});

describe("Today's line", () => {
  it('stays the same through the day, but changes when the moment changes', () => {
    const first = pinnedLine(null, '2026-10-13', 'session', 'Session B awaits.');
    expect(first.line).toBe('Session B awaits.');
    expect(pinnedLine(first.keep, '2026-10-13', 'session', 'Another session line').line).toBe('Session B awaits.');
    expect(pinnedLine(first.keep, '2026-10-13', 'trained', 'Done. Well lifted.').line).toBe('Done. Well lifted.');
    expect(pinnedLine(first.keep, '2026-10-14', 'session', 'New day').line).toBe('New day');
  });
});

describe('walk journal day numbers', () => {
  it('counts from the journey start, the same as Today', async () => {
    const { journal } = await import('../src/walk/journal');
    const days = [{ date: '2026-09-29', steps: 9000 }, { date: '2026-09-30', steps: 9000 }];
    expect(journal(days, [], '2026-09-30', new Map(), '2026-09-27')[0].head).toMatch(/^Day 4 ·/);
    expect(journal(days, [], '2026-09-30')[0].head).toMatch(/^Day 2 ·/);
  });
});
