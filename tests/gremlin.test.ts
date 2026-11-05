import { describe, expect, it } from 'vitest';
import { defaultSettings } from '../src/db/actions';
import { gremlinLine, gremlinStage, GREMLIN_LINES, GREMLIN_MOMENTS, journeyDay, spokenLine } from '../src/domain/gremlin';
import { dayKey } from '../src/domain/dates';
import { returnedAfterGap } from '../src/domain/slowDay';

const all = GREMLIN_MOMENTS.flatMap((m) => GREMLIN_LINES[m].flat());

describe('the lines', () => {
  it('every moment has 12 lines, 4 at each stage', () => {
    expect(GREMLIN_MOMENTS.length).toBe(28);
    for (const m of GREMLIN_MOMENTS) {
      expect(GREMLIN_LINES[m].length, m).toBe(3);
      for (const stage of GREMLIN_LINES[m]) expect(stage.length, m).toBe(4);
    }
  });
  it('no line is written twice', () => {
    const dupes = all.filter((l, i) => all.indexOf(l) !== i);
    expect(dupes).toEqual([]);
  });
  it('no line admits to warming up', () => {
    const tells = /warm|fond|soft(er|en|ie)|growing on|grown on|i like you|love you|i care|attached to|i've changed|i have changed|used to be/i;
    expect(all.filter((l) => tells.test(l))).toEqual([]);
  });
  it('only the moments that get values use placeholders', () => {
    const may: Record<string, string[]> = { session: ['session'], shortNight: ['sleep'], stepsClose: ['steps', 'laps'], proteinClosed: ['protein'] };
    for (const m of GREMLIN_MOMENTS) for (const l of GREMLIN_LINES[m].flat()) {
      for (const [, k] of l.matchAll(/\{(\w+)\}/g)) expect(may[m] ?? [], `${m}: ${l}`).toContain(k);
    }
  });
  it('no line carries a dash or a religious or star-sign reference', () => {
    expect(all.filter((l) => /—|–|\b(god|gods|pray|prayer|blessed|horoscope|zodiac|karma|destiny)\b/i.test(l))).toEqual([]);
  });
});

describe('gremlinLine', () => {
  it('a day repeats the same line', () => {
    expect(gremlinLine('morning', '2026-11-05', 10)).toBe(gremlinLine('morning', '2026-11-05', 10));
  });
  it('different days can differ', () => {
    const seen = new Set(Array.from({ length: 40 }, (_, i) => gremlinLine('morning', `s${i}`, 10)));
    expect(seen.size).toBeGreaterThan(2);
  });
  it('fills in values', () => {
    const l = Array.from({ length: 40 }, (_, i) => gremlinLine('stepsClose', `s${i}`, 1, { steps: '900', laps: '2' }));
    expect(l.join()).toContain('900');
    expect(l.join()).not.toContain('{');
  });
  it('warmth rises with the day: day 1 stays cool and a late day has left the cool lines', () => {
    const cool = new Set(GREMLIN_LINES.morning[0]);
    const warmest = new Set(GREMLIN_LINES.morning[2]);
    const at = (day: number) => Array.from({ length: 80 }, (_, i) => gremlinLine('morning', `s${i}`, day));
    expect(at(1).every((l) => cool.has(l))).toBe(true);
    expect(at(400).some((l) => cool.has(l))).toBe(false);
    expect(at(400).some((l) => warmest.has(l))).toBe(true);
  });
  it('stages step up with the journey', () => {
    expect([gremlinStage(0), gremlinStage(45), gremlinStage(200)]).toEqual([0, 1, 2]);
  });
});

describe('journeyDay', () => {
  it('counts from when the app began, and never below zero', () => {
    const created = new Date(2026, 9, 1, 12).getTime();
    expect(journeyDay({ ...defaultSettings(), createdAt: created }, dayKey(new Date(2026, 9, 11, 12)))).toBe(10);
    expect(journeyDay({ ...defaultSettings(), createdAt: created }, '2020-01-01')).toBe(0);
  });
});

describe('spokenLine', () => {
  const today = '2026-11-05';
  it('speaks by default', () => {
    expect(spokenLine(defaultSettings(), today, 'night', today)).toBeTruthy();
  });
  it('the switch quiets it', () => {
    const s = defaultSettings();
    expect(spokenLine({ ...s, prefs: { ...s.prefs, gremlin: false } }, today, 'night', today)).toBe('');
  });
  it.each(['zen', 'coach', 'comm', 'gremlin'] as const)('an old backup holding the %s voice still gets the Gremlin', (voice) => {
    const s = { ...defaultSettings(), voice };
    expect(GREMLIN_LINES.night.flat()).toContain(spokenLine(s, today, 'night', today));
  });
});

describe('returnedAfterGap', () => {
  it('is true when the last logged day before today is three or more days back', () => {
    expect(returnedAfterGap([{ date: '2026-11-01', steps: 5 }], '2026-11-05')).toBe(true);
    expect(returnedAfterGap([{ date: '2026-11-04', steps: 5 }], '2026-11-05')).toBe(false);
  });
  it('is false on a first day, with nothing to return from', () => {
    expect(returnedAfterGap([], '2026-11-05')).toBe(false);
  });
});
