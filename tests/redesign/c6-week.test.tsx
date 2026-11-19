import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { WeekCard, weekRange } from '../../src/screens/close/WeekCard';
import { dayTier } from '../../src/screens/close/DayCard';
import type { BinderDay } from '../../src/screens/close/MonthBinder';

// Invented week: Monday 5 to Sunday 11 January 2026.
const week = (closed: number): BinderDay[] =>
  Array.from({ length: 7 }, (_, i) => ({ date: `2026-01-${String(5 + i).padStart(2, '0')}`, ...(i < closed ? { tier: dayTier(4, 4), rings: [1, 1, 1, 1] } : {}) }));
const stats = [{ name: 'Calories', value: '14,000', ink: 'var(--kcal)' }];
const card = (closed: number) => renderToStaticMarkup(<WeekCard days={week(closed)} week={2} stats={stats} today="2026-01-11" onOpen={() => {}} />);

describe('Close, Sunday (c6-week)', () => {
  it('names the week, its dates, its totals and how many days closed', () => {
    const html = card(6);
    expect(html).toMatch(/<b class="dc-tier">The week<\/b><span class="dc-date">5–11 Jan<\/span>/);
    expect(html).toContain('Week 2');
    expect(html).toMatch(/<span>Calories<\/span><b[^>]*>14,000<\/b>/);
    expect(html).toMatch(/<span>Closed<\/span><b[^>]*>6 of 7<\/b>/);
  });

  it('keeps the stacked depth as decoration only', () => {
    const html = card(6);
    expect((html.match(/class="cw-depth[^"]*" aria-hidden="true"/g) ?? []).length).toBe(2);
  });

  it('puts the Perfect week ribbon on the week card only when all seven closed', () => {
    expect(card(7)).toMatch(/<div class="dc-rib"[^>]*>Perfect week<\/div>/);
    expect(card(6)).not.toContain('Perfect week');
  });

  it('deals the seven days with a button', () => {
    expect(card(6)).toMatch(/<button type="button" class="k-act quiet cw-deal">Deal the seven days<\/button>/);
    const css = readFileSync('src/styles/food.css', 'utf8');
    expect(css).toMatch(/prefers-reduced-motion: reduce\) \{ \.cw-dealt > \* \{ animation: none/);
  });

  it('writes a range across two months', () => {
    expect(weekRange('2026-09-28', '2026-10-04')).toBe('28 Sep – 4 Oct');
  });

  it('renders with no data: a week with nothing closed', () => {
    const html = card(0);
    expect(html).toContain('0 of 7');
    expect(html).not.toContain('dc-rib');
  });
});
