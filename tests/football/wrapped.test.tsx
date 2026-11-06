import './helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { bestAxisOf, summarise, upsets } from '../../src/football/seasonStory';
import type { FbSeason, StoredMatch } from '../../src/football/store/tables';
import { allAxes, type AxisValues } from '../../src/football/types';
import { MomentsView } from '../../src/screens/football/story/Moments';
import { WrappedView } from '../../src/screens/football/moments/Wrapped';

const m = (id: string, opp: string, result: 'W' | 'D' | 'L', values: AxisValues = allAxes(10)): StoredMatch => ({
  id, date: id, season: 1, day: 3, comp: 'league', home: 'bra', away: opp, opp, braboHome: true, values, flags: {},
  events: { seed: 1, chances: [], score: [1, 0], xg: [1, 1], moments: result === 'W' ? ['Clean sheet'] : [] }, score: [1, 0], result, watched: true, rotation: false, auto: false,
});
const season = { id: 1, tierOf: { bra: 5, up1: 4, up2: 3, down1: 6, same: 5 }, bigcup: { id: 'bigcup', name: 'The Big Cup', size: 128, rounds: [] }, tiercups: {} } as unknown as FbSeason;

describe('Moments', () => {
  it('hold upsets both for and against you', () => {
    const ms = [m('2026-10-01', 'up2', 'W'), m('2026-10-02', 'down1', 'L'), m('2026-10-03', 'same', 'W'), m('2026-10-04', 'up1', 'L')];
    const u = upsets(ms, [season]);
    expect(u.map((x) => [x.dir, x.gap])).toEqual([['for', 2], ['against', 1]]);
    const out = html(<MomentsView upsets={u} seasons={[]} />);
    expect(out).toContain('Upsets for you · 1');
    expect(out).toContain('Upsets against you · 1');
    expect(out).toContain('Beat a side 2 tiers up');
    expect(out).toContain('Lost to a side 1 tier down');
  });
});

describe('Season Wrapped', () => {
  it('the best axis is the highest season average', () => {
    const ms = [m('a', 'same', 'W', { ...allAxes(10), Rest: 14, Pace: 15 }), m('b', 'same', 'W', { ...allAxes(10), Rest: 16, Pace: 11 })];
    expect(bestAxisOf(ms)).toEqual({ axis: 'Rest', avg: 15 });
  });
  it('has five cards, and the dots say the position in words', () => {
    const s = summarise(season, [m('2026-10-01', 'up2', 'W'), m('2026-10-02', 'same', 'D')], [season]);
    const out = html(<WrappedView s={s} />);
    expect(out.match(/class="fb-wcard /g)).toHaveLength(5);
    for (let k = 1; k <= 5; k++) expect(out).toContain(`aria-label="Card ${k} of 5:`);
    expect(out).toContain('aria-current="step"');
    expect(out).toContain('Card 1 of 5');
    expect(out).toContain('The gremlin’s verdict');
  });
});
