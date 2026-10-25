import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { parseSteps } from '../src/screens/today/RingsNumbers';
import { tickFor } from '../src/domain/checklist';
import { atOn } from '../src/domain/dates';
import { sameAsYesterday } from '../src/domain/usual';
import { doseBannerId, holdBanner } from '../src/domain/banners';
import { momentFor } from '../src/domain/todayMoment';
import { MomentCard } from '../src/screens/today/MomentCard';
import { LOG_ACTIONS } from '../src/sheets/LogSearch';
import type { FoodEntry, Settings } from '../src/domain/types';

const src = (p: string) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');

describe('final review fixes', () => {
  it('Critical 1: an empty steps box saves nothing, never 0', () => {
    expect(parseSteps('')).toBeUndefined();
    expect(parseSteps('   ')).toBeUndefined();
    expect(parseSteps('4321')).toBe(4321);
    expect(parseSteps('0')).toBe(0);
    expect(parseSteps('-5')).toBeUndefined();
  });

  it('Important 2: a late tick from Today is saved at the planned time and marked recorded late', () => {
    const settings = { places: [] } as unknown as Settings;
    const day = { date: '2026-10-21' } as never;
    const now = new Date(2026, 9, 21, 22, 0).getTime();
    const late = tickFor('2026-10-21', '9 am', settings, day, true, now);
    expect(late).toEqual({ at: atOn('2026-10-21', 9 * 60), recordedLate: now });
    const onTime = tickFor('2026-10-21', '9 pm', settings, day, true, new Date(2026, 9, 21, 21, 5).getTime());
    expect(onTime).toEqual({});
    expect(tickFor('2026-10-21', '9 am', settings, day, false, now)).toEqual({});
  });

  it('Important 3: Same as yesterday drops eatenAt and never copies a free meal', () => {
    const e = [
      { id: 'a', date: '2026-10-20', meal: 'lunch', at: 1, eatenAt: 1, kind: 'food', foodId: 'f', name: 'Test dal', amount: 1, portion: '1', kcal: 100, protein: 5 },
      { id: 'b', date: '2026-10-20', meal: 'lunch', at: 2, kind: 'free', name: 'Free meal', portion: '', kcal: 0, protein: 0 },
    ] as FoodEntry[];
    const out = sameAsYesterday(e, 'lunch', '2026-10-21', 99);
    expect(out).toHaveLength(1);
    expect('eatenAt' in out[0]).toBe(false);
  });

  it('Important 4: each dose has its own banner id, so dismissing one never hides the next', () => {
    expect(doseBannerId({ key: 'm1:0' } as never)).toBe('next-dose:m1:0');
    expect(doseBannerId({ key: 'm1:1' } as never)).not.toBe(doseBannerId({ key: 'm1:0' } as never));
  });

  it('Important 5: steps not logged never show as a deficit', () => {
    const base = { minutes: 14 * 60, morningDone: true, perfect: false, dayClosed: false, proteinGapG: 0, stepsLeft: 8000 };
    expect(momentFor({ ...base, stepsKnown: false })).toBe('stepsMissing');
    expect(momentFor({ ...base, stepsKnown: true })).toBe('steps');
    const html = renderToStaticMarkup(<MomentCard kind="stepsMissing" data={{ closedRings: 0, proteinGapG: 0, gapFoods: '', addLabel: '', stepsLeft: 8000 }} actions={{ logMorning() {}, closeDay() {}, addGap() {}, typeSteps() {} }} />);
    expect(html).toContain('Steps not logged yet');
    expect(html).not.toContain('8,000');
  });

  it('Important 6: the banner chosen on load is held; a new one never appears while reading', () => {
    const a = { id: 'backup', priority: 80 };
    const b = { id: 'update', priority: 100 };
    // Nothing was shown on load: a banner that becomes due later does not push the page down.
    expect(holdBanner(null, b, [a, b])).toBeUndefined();
    // The banner shown on load stays, even if a higher one becomes due.
    expect(holdBanner('backup', b, [a, b])).toBe(a);
    // Once it is dismissed or acted on (gone from the candidates), the slot stays empty.
    expect(holdBanner('backup', b, [b])).toBeUndefined();
    // Before the first decision, the pick is taken.
    expect(holdBanner(undefined, a, [a])).toBe(a);
  });

  it('Important 7: the season strip uses 14 px and no gold', () => {
    const theme = src('ui/Theme.tsx');
    const strip = theme.slice(theme.indexOf('export function SeasonStrip'), theme.indexOf('\n}\n', theme.indexOf('export function SeasonStrip')));
    expect(strip).toContain('Happy Diwali');
    expect(strip).not.toMatch(/\bt12\b/);
    expect(strip).not.toMatch(/className="[^"]*\bgold\b/);
    expect(strip).not.toContain("color: '#f7c96b' }}");
  });

  it('Important 8: Log anything on Today has no 12 px text and no gold icons', () => {
    expect(src('sheets/LogSearch.tsx')).not.toMatch(/\bt12\b/);
    expect(LOG_ACTIONS.every((a) => a.color !== 'var(--gold)')).toBe(true);
  });

  it('Important 9: no banner icon is gold', () => {
    expect(src('screens/Banners.tsx')).not.toContain("color=\"var(--gold)\"");
  });
});
