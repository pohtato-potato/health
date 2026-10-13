import type { DayKey } from './dates';

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  // A final mix, so dates a day apart land far apart rather than side by side.
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
};

/**
 * A star for every perfect day, placed by the date itself so it never moves: each month gets
 * its own patch of sky, and days scatter within it.
 */
export function skyStars(perfectDays: DayKey[]): { date: DayKey; x: number; y: number; r: number }[] {
  return [...perfectDays].sort().map((date) => {
    const month = Number(date.slice(5, 7)) - 1;
    const cx = 40 + (month % 4) * 90;
    const cy = 50 + Math.floor(month / 4) * 110;
    return { date, x: Math.round((cx + (hash(`${date}x`) - 0.5) * 70) * 10) / 10, y: Math.round((cy + (hash(`${date}y`) - 0.5) * 80) * 10) / 10, r: 1.2 + hash(`${date}r`) * 1.4 };
  });
}

const NAMES = ['The Kettle', 'The Lantern', 'The Kite', 'The Dumbbell', 'The Chai Glass', 'The Bicycle', 'The Umbrella', 'The Tiffin', 'The Peacock', 'The Rickshaw', 'The Mango', 'The Ladder', 'The Banyan', 'The Ferry', 'The Spinning Top', 'The Diya', 'The Harmonium', 'The Pressure Cooker', 'The Cricket Bat', 'The Tabla', 'The Bullock Cart', 'The Ceiling Fan', 'The Tea Garden', 'The Signal'];

/** A month's constellation: the same name every time it is asked for, different month to month. */
export function constellationFor(month: string): { name: string } {
  const [y, m] = month.split('-').map(Number);
  return { name: NAMES[((y - 2026) * 12 + (m - 1) + NAMES.length * 10) % NAMES.length] };
}
