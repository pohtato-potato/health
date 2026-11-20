import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { RecordsStrip } from '../../src/screens/today/NextStrip';
import { recordGains } from '../../src/domain/trainView';
import type { SetEntry } from '../../src/domain/types';

// Invented sets: two nights of an invented lift.
let n = 0;
const set = (sessionId: string, at: number, loadKg: number | null, reps: number, extra: Partial<SetEntry> = {}): SetEntry =>
  ({ id: `s${n++}`, sessionId, date: '2026-01-01', session: 'A', exerciseId: 'row', exercise: 'Test row', setNo: 1, side: 'both', loadKg, reps, at, ...extra }) as SetEntry;

describe('A record night (s8-record)', () => {
  it('gains kilos for a heavier load, and says what the best was', () => {
    const rec = set('b', 20, 45, 12, { mark: '!!' });
    const [g] = recordGains([rec], [set('a', 10, 40, 12), set('a', 11, 35, 15), rec]);
    expect(g.gain).toBe('+5 kg');
    expect(g.was).toBe('40 kg × 12');
    expect(g.from).toBeCloseTo(40 / 45);
  });

  it('gains reps at the same load', () => {
    const rec = set('b', 20, 10, 16, { mark: '!!' });
    const [g] = recordGains([rec], [set('a', 10, 10, 13), rec]);
    expect(g.gain).toBe('+3 reps');
    expect(g.was).toBe('10 kg × 13');
  });

  it('shows one row per lift: its best set', () => {
    const a = set('b', 20, 10, 14, { mark: '!!' });
    const b = set('b', 21, 10, 16, { mark: '!!' });
    const rows = recordGains([a, b], [set('a', 10, 10, 13), a, b]);
    expect(rows).toHaveLength(1);
    expect(rows[0].now).toBe('10 kg × 16');
  });

  it('names each lift with its record, the gain as a chip and the old best in words', () => {
    const rows = [{ key: 'k', name: 'Test row', now: '45 kg × 12', was: '40 kg × 12', gain: '+5 kg', from: 0.9 }];
    const html = renderToStaticMarkup(<RecordsStrip rows={rows} onFinale={() => {}} />);
    expect(html).toMatch(/<span class="td-rec-name">Test row<\/span><span class="td-rec-gain">\+5 kg<\/span><b class="td-rec-now tn">45 kg × 12<\/b><span class="td-rec-was">was 40 kg × 12<\/span>/);
    expect(html).toMatch(/class="td-rec-bar" aria-hidden="true"/);
  });

  it('lands the rows once; no reduced-motion variant', () => {
    const css = readFileSync('src/styles/today.css', 'utf8');
    const rule = css.slice(css.indexOf('.td-rec {'));
    expect(rule.slice(0, rule.indexOf('}'))).not.toMatch(/infinite/);
    expect(css).not.toContain('prefers-reduced-motion'); // no reduced-motion variants (PRODUCT.md)
  });

  it('renders with no data: a first-ever set has no best before', () => {
    const rec = set('b', 20, 45, 12, { mark: '!!' });
    const [g] = recordGains([rec], [rec]);
    expect(g.gain).toBe('First time');
    expect(g.was).toBeUndefined();
    expect(recordGains([], [])).toEqual([]);
    const html = renderToStaticMarkup(<RecordsStrip rows={[{ ...g }]} onFinale={() => {}} />);
    expect(html).toContain('no best before');
  });
});
