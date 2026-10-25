import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MomentCard, type MomentData } from '../src/screens/today/MomentCard';
import type { MomentKind } from '../src/domain/todayMoment';

const data: MomentData = { closedRings: 2, proteinGapG: 22, gapFoods: 'Test yogurt and two eggs', addLabel: 'Add both · 24 g', stepsLeft: 3880, laps: '5', easedTo: 4000 };
const noop = () => {};
const actions = { logMorning: noop, closeDay: noop, addGap: noop, typeSteps: noop };
const render = (kind: MomentKind, d: Partial<MomentData> = {}) => renderToStaticMarkup(<MomentCard kind={kind} data={{ ...data, ...d }} actions={actions} />);
const buttons = (html: string) => [...html.matchAll(/<button[^>]*>([^<]*)<\/button>/g)].map((m) => m[1]);

describe('MomentCard', () => {
  it('rest: "Rest is the plan", the eased steps in words, no button', () => {
    const html = render('rest');
    expect(html).toContain('Rest is the plan');
    expect(html).toContain('4,000');
    expect(buttons(html)).toEqual([]);
  });
  it('morning: "Last night is waiting" / Log the morning', () => {
    const html = render('morning');
    expect(html).toContain('Last night is waiting');
    expect(buttons(html)).toEqual(['Log the morning']);
  });
  it('perfect: "All three closed" / Close the day, gold', () => {
    const html = render('perfect');
    expect(html).toContain('All three closed');
    expect(html).toContain('td-moment gold');
    expect(buttons(html)).toEqual(['Close the day']);
  });
  it('close: "Ready to close the day?" / Close the day and the gap add', () => {
    const html = render('close');
    expect(html).toContain('Ready to close the day?');
    expect(html).toContain('2 of 3 rings');
    expect(buttons(html)).toEqual(['Close the day', 'Add both · 24 g']);
  });
  it('close with no protein gap offers only Close the day', () => {
    expect(buttons(render('close', { proteinGapG: 0, gapFoods: '' }))).toEqual(['Close the day']);
  });
  it('protein: "22 g protein to go" with the foods', () => {
    const html = render('protein');
    expect(html).toContain('22 g protein to go');
    expect(html).toContain('Test yogurt and two eggs');
    expect(buttons(html)).toEqual(['Add both · 24 g']);
  });
  it('steps: "3,880 steps to go" / Type steps', () => {
    const html = render('steps');
    expect(html).toContain('3,880 steps to go');
    expect(html).toContain('About 5 laps of the loop.');
    expect(buttons(html)).toEqual(['Type steps']);
  });
  it('closed: "Today, kept"', () => {
    expect(render('closed')).toContain('Today, kept');
  });
  it('glance: renders nothing', () => {
    expect(render('glance')).toBe('');
  });
});
