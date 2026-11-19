import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TodayLayout } from '../../src/screens/today/TodayLayout';
import { TodayLine } from '../../src/screens/today/TodayLine';
import { RingsNumbers, type RingRow } from '../../src/screens/today/RingsNumbers';

const slot = (name: string) => <div data-section={name}>{name}</div>;
const noop = () => {};
const rows: RingRow[] = [
  { key: 'kcal', name: 'Calories', value: '1,200', unit: 'kcal', target: '', ink: '#f95', known: true, progress: 0.6 },
  { key: 'protein', name: 'Protein', value: '70', unit: 'g', target: '', ink: '#b9f', known: true, progress: 0.5 },
  { key: 'steps', name: 'Steps', value: '—', unit: '', target: '', ink: '#5e9', known: false, progress: 0 },
  { key: 'sleep', name: 'Sleep', value: '7 h 05', unit: '', target: '', ink: '#7cf', known: true, progress: 1.3, done: true },
];

describe('Home C: the desk header bars on the aurora (h6-c)', () => {
  const page = () =>
    renderToStaticMarkup(
      <TodayLayout walk={slot('walk')} line={slot('line')} rings={slot('rings')} dayChip="2 of 4 closed" moment={slot('moment')} next={slot('next')} nextChip="40 g to go" log={slot('log')} handle={slot('handle')} />,
    );

  it('puts the rings under The day and the moment with training under Next, in that order', () => {
    const html = page();
    const bars = [...html.matchAll(/<h2 class="td-panel-title"[^>]*>([^<]+)<\/h2>/g)].map((m) => m[1]);
    expect(bars).toEqual(['The day', 'Next']);
    const order = [...html.matchAll(/data-section="(\w+)"/g)].map((m) => m[1]);
    expect(order).toEqual(['walk', 'line', 'rings', 'moment', 'next', 'log', 'handle']);
  });

  it('shows each bar’s status chip as words', () => {
    const html = page();
    expect(html).toContain('2 of 4 closed');
    expect(html).toContain('40 g to go');
  });

  it('leaves out a chip that has nothing to say', () => {
    const html = renderToStaticMarkup(<TodayLayout walk={null} line={null} rings={slot('rings')} moment={slot('moment')} next={slot('next')} log={null} handle={null} />);
    expect(html).not.toContain('td-pchip');
  });

  it('draws the aurora as decoration only', () => {
    expect(page()).toMatch(/<div class="td-aur" aria-hidden="true"><\/div>/);
  });

  it('gives each ring a named bar filled to its share, capped at full', () => {
    const html = renderToStaticMarkup(<RingsNumbers rows={rows} rings={null} closed={1} onLogFood={noop} onSaveSteps={noop} showCopyHint={false} />);
    expect(html).toContain('Calories');
    expect(html).toContain('--p:60%');
    expect(html).toContain('--p:100%');
  });

  it('renders with no data: an empty bar and a dash, not 0', () => {
    const html = renderToStaticMarkup(<RingsNumbers rows={rows} rings={null} closed={0} onLogFood={noop} onSaveSteps={noop} showCopyHint={false} />);
    expect(html).toMatch(/Steps<\/span><b class="tn">—<\/b>/);
    expect(html).toContain('--p:0%');
  });

  it('makes the page heading the level-one heading when asked', () => {
    expect(renderToStaticMarkup(<TodayLine head="Today" level={1} text="" kind="glance" clock="9:05" />)).toContain('<h1 class="td-head">Today</h1>');
  });
});
