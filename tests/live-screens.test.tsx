import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SetScreen } from '../src/screens/live/SetScreen';
import type { ExerciseDef } from '../src/domain/plan';
import type { LiveCounter } from '../src/domain/types';
import type { Row } from '../src/screens/session/SetTable';

const NOW = 1_000_000;
const ex: ExerciseDef = { id: 'curl', order: '1', name: 'Curl', sets: 3, reps: [10, 15], load: 'pair' };
const row: Row = { ex, setNo: 2, side: 'both', drop: false, key: 'curl:2:both' };
const counted = (n: number, burnAt?: number): LiveCounter => ({ key: row.key, taps: Array.from({ length: n }, (_, i) => NOW - (n - i) * 3000), burnAt, startedAt: n ? NOW - n * 3000 : undefined });
const noop = () => {};
const base = { row, name: 'Curl', kg: 10, aim: '10–15', bottom: 10, bar: 12, tempo: false, timed: false, nudge: false, onCounter: noop, onDone: noop, onSkip: noop, saver: false, theme: 'dusk' as const, buzz: false, now: NOW };
const html = (p: Partial<typeof base> & { c: LiveCounter; leadSide?: 'L' | 'R' }) => renderToStaticMarkup(<SetScreen {...base} {...p} />);

describe('the set screen', () => {
  it('shows the burn in words, and in colour', () => {
    const h = html({ c: counted(11, 9) });
    expect(h).toContain('in the burn');
    expect(h).toContain('Burn from rep 10 · 2 past it');
    expect(h).toMatch(/class="lv [^"]*st-burn/);
  });
  it('shows a record and the best it beat', () => {
    const h = html({ c: counted(13, 9) });
    expect(h).toContain('new record · best was 12');
    expect(h).toMatch(/class="lv [^"]*st-record/);
  });
  it('offers a skip instead of Set done before the first rep', () => {
    const h = html({ c: counted(0) });
    expect(h).toMatch(/<button[^>]*disabled=""[^>]*>Set done · 0/);
    expect(h).toContain('Skip this set');
  });
  it('badges the lead side', () => {
    const left: Row = { ...row, ex: { ...ex, perSide: true, lead: 'L' }, side: 'L', key: 'curl:2:L' };
    expect(html({ row: left, c: { key: left.key, taps: [] }, leadSide: 'L' })).toContain('LEFT FIRST');
  });
  it('counts seconds on a timed set', () => {
    expect(html({ timed: true, c: { key: row.key, taps: [NOW - 65_000], startedAt: NOW - 65_000 } })).toContain('1:05');
  });
  it('draws no aurora in battery saver', () => {
    expect(html({ saver: true, c: counted(3) })).not.toContain('blob');
  });
  it('nudges through the burn before the first rep', () => {
    expect(html({ nudge: true, c: counted(0) })).toContain('Last set ended with 2+ left. Go through the burn this time.');
    expect(html({ nudge: true, c: counted(1) })).not.toContain('Go through the burn');
  });
});
