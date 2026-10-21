import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BeforeScreen } from '../src/screens/live/BeforeScreen';

const noop = () => {};
const blocks = [
  { kg: 10, items: [{ name: 'Romanian deadlift', light: false }, { name: 'Goblet squat', light: true }] },
  { kg: 5, items: [{ name: 'Lateral raise', light: false }] },
];
const before = (p: Partial<Parameters<typeof BeforeScreen>[0]> = {}) =>
  renderToStaticMarkup(<BeforeScreen name="Session C" usual={{ min: 92, fromHistory: true }} startedAt={0} blocks={blocks} changes={1} legs onSoreness={noop} warmup="Arm circles" onStart={noop} saver={false} {...p} />);

describe('before the session', () => {
  it('says how long it usually takes', () => {
    expect(before()).toContain('usually <b>92 min</b>');
    expect(before({ usual: { min: 60, fromHistory: false } })).toContain('about <b>60 min</b>');
  });
  it('asks about legs only when there is leg work', () => {
    expect(before()).toContain('Legs sore');
    expect(before({ legs: false })).not.toContain('Legs sore');
  });
  it('drops leg work to one set at 4 or 5', () => {
    const h = before({ soreness: 4 });
    expect(h).toContain('leg work drops to 1 set');
    expect(h).toContain('1 set</span>');
  });
  it('leaves the warm-up out when the plan has none', () => {
    expect(before()).toContain('Warm-up');
    expect(before({ warmup: undefined })).not.toContain('Warm-up');
  });
  it('marks the plate change between blocks', () => {
    expect(before()).toMatch(/Goblet squat[\s\S]*Plates change · 10 → 5 kg[\s\S]*Lateral raise/);
    expect(before()).toContain('one plate change');
  });
});
