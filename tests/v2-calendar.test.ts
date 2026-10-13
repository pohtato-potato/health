import { describe, expect, it } from 'vitest';
import { CALENDAR, themeDayOn } from '../src/domain/calendar';
import { RING_STYLES } from '../src/ui/rings/styles';
import { dayRange } from '../src/domain/dates';

describe('the theme calendar', () => {
  it('no kind exceeds a third of the year’s days', () => {
    for (const year of [2026, 2027, 2028]) {
      const days = dayRange(`${year}-01-01`, `${year}-12-31`);
      const byKind = new Map<string, Set<string>>();
      for (const e of CALENDAR) for (const d of dayRange(e.from, e.to)) if (d.startsWith(String(year))) byKind.set(e.kind, (byKind.get(e.kind) ?? new Set()).add(d));
      for (const [kind, set] of byKind) expect(set.size, `${year} ${kind}`).toBeLessThanOrEqual(days.length / 3);
    }
  });

  it('every entry has why-today and a known ring style', () => {
    for (const e of CALENDAR) {
      expect(e.why.length, e.name).toBeGreaterThan(20);
      expect(RING_STYLES, e.name).toContain(e.ring);
      expect(e.from <= e.to, e.name).toBe(true);
    }
    expect(CALENDAR.length).toBeGreaterThan(60);
  });

  it('walk-region festival preferred when inside region', () => {
    const onam = CALENDAR.find((e) => e.id.startsWith('onam') && e.from.startsWith('2027'))!;
    const d = onam.from;
    const clash = { ...CALENDAR.find((e) => e.region === undefined)!, from: d, to: d, id: 'clash' };
    expect(themeDayOn(d, 'ghats', {}, [...CALENDAR, clash])?.id).toBe(onam.id);
    expect(themeDayOn(d, 'plains', {}, [clash])?.id).toBe('clash');
  });

  it('the birthday wins, and ordinary days have no theme', () => {
    expect(themeDayOn('2027-06-06', 'plains', { birthday: '06-06' })?.ring).toBe('candles');
    expect(themeDayOn('2027-06-30', 'plains', {})).toBeUndefined();
    expect(themeDayOn('2026-11-08', 'plains', {})?.ring).toBe('scallop');
    expect(themeDayOn('2026-12-25', 'plains', {})?.ring).toBe('cane');
  });
});
