import '../football/helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { SeasonSummary } from '../../src/football/seasonStory';
import { Wrapped } from '../../src/screens/football/moments/Wrapped';

const s: SeasonSummary = {
  season: 3, tier: 5, pos: 2, move: 'up', cups: ['The Big Cup: out in the quarter-final'],
  best: { axis: 'Rest', avg: 15.2 }, avgs: { Pace: 11, Power: 9.5, Fuel: 12, Rest: 15.2, Routine: 10, Shape: 8 },
  record: { W: 20, D: 6, L: 4 }, moments: ['Clean sheet ×5', 'Late winner'], upsets: [], verdict: 'Up we go.', next: 'Season 4 in the next division.',
};

describe('s23 Wrapped', () => {
  it('slide 1: the record, the finish and the cups', () => {
    const out = html(<Wrapped s={s} />);
    expect(out).toContain('20–6–4');
    expect(out).toContain('2nd, promoted');
    expect(out).toContain('30 matches in all');
    expect(out).toContain('The Big Cup: out in the quarter-final');
  });
  it('slide 2: the best axis named, all six averages as numbers', () => {
    const out = html(<Wrapped s={s} start={1} />);
    expect(out).toContain('class="wr-mega wr-axis wr-slam">Rest<');
    for (const v of ['11', '9.5', '12', '15.2', '10', '8']) expect(out).toContain(`<span class="fb-num">${v}</span>`);
    expect(out).toContain('<em> best</em>');
  });
  it('slide 3: moments as tickets, the verdict, what is next and Done', () => {
    const out = html(<Wrapped s={s} start={2} onDone={() => {}} />);
    expect(out).toContain('Clean sheet ×5');
    expect(out).toContain('<q>Up we go.</q>');
    expect(out).toContain('Season 4 in the next division.');
    expect(out).toContain('>Done</button>');
    expect(out).toContain('>Back</button>');
  });
});
