import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MomentCard, type MomentData } from '../src/screens/today/MomentCard';
import type { NextKind as MomentKind } from '../src/screens/today/MomentCard';

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
  it('perfect: "All four closed", gold, with a gold Close the day', () => {
    const html = render('perfect');
    expect(html).toContain('All four closed');
    expect(html).toContain('td-moment gold');
    expect(buttons(html)).toEqual(['Close the day']);
  });
  it('close: "Ready to close the day?" with the gap add as its one action', () => {
    const html = render('close');
    expect(html).toContain('Ready to close the day?');
    expect(html).toContain('2 of 4 rings');
    expect(buttons(html)).toEqual(['Add both · 24 g']);
  });
  it('close with no protein gap glows "Close the day"; with a gap, a small way down to the moon button', () => {
    expect(buttons(render('close', { proteinGapG: 0, gapFoods: '' }))).toEqual(['Close the day']);
    const html = renderToStaticMarkup(<MomentCard kind="close" data={data} actions={{ ...actions, toClose: noop }} />);
    expect(buttons(html)).toEqual(['Add both · 24 g', 'Close the day ↓']);
    expect(html.match(/k-act/g)).toHaveLength(1);
  });
  it('weigh-in to come: "Add it", as drawn', () => {
    const html = render('weighin');
    expect(html).toContain('Weigh-in to come');
    expect(buttons(html)).toEqual(['Add it']);
  });
  it('every button on the panel is the one glowing action', () => {
    for (const k of ['morning', 'weighin', 'protein', 'steps', 'stepsMissing', 'close', 'perfect'] as const) expect(render(k).match(/k-act/g), k).toHaveLength(1);
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
  it('glance: nothing, unless the next meal is known; then Add food', () => {
    expect(render('glance')).toBe('');
    const html = renderToStaticMarkup(<MomentCard kind="glance" data={{ ...data, food: { meal: 'Dinner', usual: 'Test dal' } }} actions={{ ...actions, addFood: noop }} />);
    expect(html).toContain('Dinner next');
    expect(buttons(html)).toEqual(['Add food']);
    const done = renderToStaticMarkup(<MomentCard kind="glance" data={{ ...data, food: { meal: 'Dinner', usual: '', logged: true } }} actions={{ ...actions, addFood: noop }} />);
    expect(done).toContain('Dinner is in');
    expect(done.match(/k-act/g)).toHaveLength(1);
  });
});
