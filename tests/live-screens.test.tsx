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
const html = (p: Partial<typeof base> & { c: LiveCounter; leadSide?: 'L' | 'R'; firstAtLoad?: boolean }) => renderToStaticMarkup(<SetScreen {...base} {...p} />);

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
  it('shows no best at a new load', () => {
    const h = html({ c: counted(10), bar: 9, firstAtLoad: true });
    expect(h).not.toContain('best');
    expect(h).toContain('new record · first time at this load');
  });
  it('keeps the nudge space after the first rep, so the count stays put', () => {
    expect(html({ nudge: true, c: counted(1) })).toContain('lv-nudge');
  });
  it('nudges through the burn before the first rep', () => {
    expect(html({ nudge: true, c: counted(0) })).toContain('Last set ended with 2+ left. Go through the burn this time.');
    expect(html({ nudge: true, c: counted(1) })).toMatch(/class="lv-nudge"[^>]*visibility:hidden/);
  });
});

import { CheckScreen } from '../src/screens/live/CheckScreen';

describe('the check screen', () => {
  const checks = [
    { id: 'tuck', text: 'Elbows tucked', kind: 'do' as const },
    { id: 'swing', text: 'No swing', kind: 'avoid' as const },
    { id: 'slow', text: 'Slow lowering', kind: 'do' as const },
  ];
  const check = (p: Partial<Parameters<typeof CheckScreen>[0]> = {}) =>
    renderToStaticMarkup(<CheckScreen reps={11} unit="reps" state="burn" checks={checks} onSave={noop} saver={false} {...p} />);
  it('says "Same as last set" while the answers match the last set', () => {
    expect(check({ prev: { checks: { tuck: 'ok' }, rir: 1 } })).toContain('Same as last set');
    expect(check()).toContain('>Save<');
  });
  it('shows a check that went well in words, not colour alone', () => {
    const h = check({ prev: { checks: { tuck: 'ok' } } });
    expect(h).toContain('went well');
    expect(h).toMatch(/class="lv-check ok"/);
    expect(h).toContain('aria-label="Elbows tucked: went well"');
  });
  it('has one button per check', () => {
    expect(check().match(/class="lv-check[ "]/g)).toHaveLength(3);
  });
  it('leaves the list out when the plan has no checks', () => {
    const h = check({ checks: [] });
    expect(h).not.toMatch(/class="lv-check[ "]/);
    expect(h).toContain('Left in the tank');
  });
  it('keeps the set colour', () => expect(check()).toMatch(/class="lv [^"]*st-burn/));
  it('a slipped check takes back a record, in words', () => {
    const h = check({ state: 'record', bar: 10, clean: true, unrecord: 'burn', prev: { checks: { tuck: 'slip' } } });
    expect(h).toContain('not a record · 1 check slipped');
    expect(h).toMatch(/class="lv [^"]*st-burn/);
  });
});

import { RestLive } from '../src/screens/live/RestLive';
import { justTags, restoreCounter } from '../src/domain/liveSet';

describe('rest', () => {
  const rest = (p: Partial<Parameters<typeof RestLive>[0]> = {}) =>
    renderToStaticMarkup(<RestLive endsAt={NOW + 45_000} total={90} now={NOW} from="burn" just={['record']} next={{ label: 'Set 3', kg: 10, aim: '10–15', tempo: false }} onMore={noop} onReady={noop} saver={false} rings={['#111111', '#222222', '#333333']} {...p} />);
  it('tags the set just done', () => {
    expect(justTags({ mark: '!!', burnAt: 9, checks: { a: 'ok', b: 'ok', c: 'slip' } })).toEqual(['record', 'burn from 10', '2 went well', '1 slipped']);
    expect(justTags({})).toEqual([]);
  });
  it('fades from the set colour as it runs down', () => {
    const h = rest();
    expect(h).toContain('--fade:0.5');
    expect(h).toMatch(/class="lv [^"]*st-rest[^"]*from-burn/);
    expect(h).toContain('0:45');
  });
  it('is black and still in battery saver, with the next set readable', () => {
    const h = rest({ saver: true });
    expect(h).not.toContain('blob');
    expect(h).toContain('Set 3');
  });
});

describe('a counter saved on the session', () => {
  const saved = { key: 'curl:2:both', taps: [1, 2, 3], burnAt: 2, startedAt: 1 };
  it('comes back for the same row', () => expect(restoreCounter(saved, 'curl:2:both')).toEqual(saved));
  it('starts fresh for another row', () => expect(restoreCounter(saved, 'curl:3:both')).toEqual({ key: 'curl:3:both', taps: [] }));
  it('starts fresh with nothing saved', () => expect(restoreCounter(null, 'curl:3:both')).toEqual({ key: 'curl:3:both', taps: [] }));
});
