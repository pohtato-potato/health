import { renderToStaticMarkup } from 'react-dom/server';
import { ThemedRings } from '../src/ui/rings/ThemedRings';
import { RING_STYLES } from '../src/ui/rings/styles';
import { describe, expect, it } from 'vitest';
import { ringMomentKey, ringMomentMarks, ringMomentsDue, ringsGold } from '../src/domain/ringMoments';
import { LiveRings } from '../src/screens/today/LiveRings';
import { RingsNumbers } from '../src/screens/today/RingsNumbers';

const D = '2026-11-05';
const none = () => false;

describe('ring moments: each plays once a day', () => {
  it('owes a moment for a ring that closed and has not played', () => {
    expect(ringMomentsDue(D, { kcal: false, protein: true, steps: false }, none)).toEqual([{ kind: 'ring', ring: 'protein' }]);
  });
  it('owes nothing once it has played', () => {
    const seen = (k: string) => k === ringMomentKey(D, 'protein');
    expect(ringMomentsDue(D, { kcal: false, protein: true, steps: false }, seen)).toEqual([]);
  });
  it('turns the last ring into the perfect day, not a ring moment', () => {
    expect(ringMomentsDue(D, { kcal: true, protein: true, steps: true, sleep: true }, none)).toEqual([{ kind: 'perfect' }]);
    expect(ringMomentsDue(D, { kcal: false, protein: false, steps: false, sleep: true }, none)).toEqual([{ kind: 'ring', ring: 'sleep' }]);
  });
  it('a perfect day marks every ring as played too, so none plays after it', () => {
    const marks = ringMomentMarks(D, { kind: 'perfect' });
    expect(marks).toContain(ringMomentKey(D, 'perfect'));
    expect(marks).toContain(ringMomentKey(D, 'steps'));
    expect(ringMomentsDue(D, { kcal: true, protein: true, steps: true, sleep: true }, (k) => marks.includes(k))).toEqual([]);
  });
  it('a new day owes its own', () => {
    const seen = (k: string) => k === ringMomentKey(D, 'kcal');
    expect(ringMomentsDue('2026-11-06', { kcal: true, protein: false, steps: false }, seen)).toHaveLength(1);
  });
});

describe('the living rings', () => {
  const base = { progress: [1, 0.5, 0, 0.2], label: 'Rings: 1 of 4 closed', design: 'solid' as const, inks: ['#a00001', '#a00002', '#a00003', '#a00004'], goldCount: 0, spin: 0, play: 0, onTap: () => {} };
  it('is a button with words, and draws the true progress on first render, with nothing in the middle', () => {
    const html = renderToStaticMarkup(<LiveRings {...base} />);
    expect(html).toContain('<button');
    expect(html).toContain('Rings: 1 of 4 closed. Tap to spin them.');
    expect(html).not.toContain('1/4');
    expect(html).not.toContain('<text');
  });
  it('glows in each band\'s ink, and a closed ring gets its bright edge', () => {
    const html = renderToStaticMarkup(<LiveRings {...base} />);
    for (const ink of base.inks) expect(html).toContain(ink);
    expect(html).toContain('feGaussianBlur');
    expect(html.match(/gr-edge/g)).toHaveLength(1);
  });
  it('wears gold only as told, and draws the star chain only on a perfect day', () => {
    expect(renderToStaticMarkup(<LiveRings {...base} />)).not.toContain('#ffd257');
    expect(renderToStaticMarkup(<LiveRings {...base} />)).not.toContain('lr-chain');
    const perfect = renderToStaticMarkup(<LiveRings {...base} progress={[1, 1, 1, 1]} goldCount={4} chain="still" />);
    expect(perfect).toContain('#ffd257');
    for (const ink of base.inks) expect(perfect).not.toContain(ink);
    expect(perfect).toContain('lr-chain');
  });
  it('draws every theme\'s ring design', async () => {
    const { THEMES } = await import('../src/domain/themes');
    for (const t of THEMES) {
      const html = renderToStaticMarkup(<LiveRings {...base} design={t.look.ring.design} inks={t.look.ring.inks} />);
      expect(html, t.id).toContain(t.look.ring.inks[0]);
    }
  });
  it('the numbers start at their true value before they count up', () => {
    const html = renderToStaticMarkup(<RingsNumbers rows={[{ key: 'kcal', name: 'Calories', value: '1,640', unit: 'kcal', target: 't', ink: 'x', known: true }]} rings={null} closed={0} onLogFood={() => {}} onSaveSteps={() => {}} showCopyHint={false} />);
    expect(html).toContain('1,640');
  });
});

describe('ringsGold', () => {
  it('stays plain until the perfect day has played, then stays gold', () => {
    expect(ringsGold({ counting: null, perfect: true, played: false })).toBe(0);
    expect(ringsGold({ counting: 2, perfect: true, played: true })).toBe(2);
    expect(ringsGold({ counting: null, perfect: true, played: true })).toBe(4);
    expect(ringsGold({ counting: null, perfect: true, played: undefined })).toBe(4);
    expect(ringsGold({ counting: null, perfect: false, played: true })).toBe(0);
  });
});

describe('a worn ring style on a perfect day', () => {
  it('turns gold ring by ring, in every style', () => {
    for (const style of RING_STYLES) {
      const html = (gold: boolean[]) => renderToStaticMarkup(<ThemedRings style={style} progress={[1, 1, 1]} label="" gold={gold} />);
      expect(html([false, false, false])).not.toContain('var(--gold)');
      const one = html([true, false, false]);
      expect(one).toContain('var(--gold)');
      expect(one).toContain('var(--steps)');
      const all = html([true, true, true]);
      for (const ink of ['var(--kcal)', 'var(--protein)', 'var(--steps)']) expect(all).not.toContain(ink);
    }
  });
});
