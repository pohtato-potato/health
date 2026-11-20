import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { changeTitle, SeasonChange } from '../../src/screens/football/moments/SeasonChange';
import type { SeasonChange as Change } from '../../src/football/seasonChange';
import { tierName } from '../../src/football/data/load';

const up3: Change = { season: 1, from: 6, to: 3, move: 'up', level: 'up', pos: 1, up: [], down: [], ratings: [{ axis: 'Pace', before: 16, after: 12 }, { axis: 'Fuel', before: 15, after: 11 }] };

describe('Season change (s23-change)', () => {
  it('the step count and the target division are text', () => {
    expect(changeTitle(up3)).toEqual(['Up three', `On to ${tierName(3)}`]);
    expect(changeTitle({ ...up3, to: 5 })[0]).toBe('Promoted');
    expect(changeTitle({ ...up3, move: 'down', to: 7 })[0]).toBe('Relegated');
    expect(changeTitle({ ...up3, move: 'stay', to: 6 })).toEqual(['Another season', `in ${tierName(6)}`]);
    const out = renderToStaticMarkup(<SeasonChange c={up3} crest="<svg></svg>" onDone={() => {}} />);
    expect(out).toContain(`Up three<br/><span>On to ${tierName(3)}</span>`);
    expect(out).toMatch(/<div class="sc-stairs" aria-hidden="true"/);
    expect(out.match(/<i class="on"/g)).toHaveLength(1);
  });
  it('shows each axis before and after only from the stored ratings', () => {
    const out = renderToStaticMarkup(<SeasonChange c={up3} onDone={() => {}} />);
    expect(out).toContain('<em>16 → 12</em>');
    expect(out).toContain('<em>15 → 11</em>');
    expect(renderToStaticMarkup(<SeasonChange c={{ ...up3, ratings: [] }} onDone={() => {}} />)).not.toContain('sc-rt');
    expect(out).toContain(`>On to ${tierName(3)}</button>`);
  });
});
