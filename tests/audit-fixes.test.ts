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

