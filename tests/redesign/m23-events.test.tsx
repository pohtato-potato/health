import '../football/helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CLUBS } from '../../src/football/data/load';
import { EVENTS } from '../../src/football/events';
import { Events } from '../../src/screens/football/league/Events';

const opp = CLUBS.find((c) => c.kind !== 'own')!.id;
const m = { id: 'e1', date: '2026-03-20', season: 1, day: 1, comp: 'event', round: 'Pre-season tour, day 1 of 3', home: 'bra', away: opp, opp, braboHome: true, values: {}, flags: {}, events: { chances: [] }, score: [2, 1], result: 'W', watched: true } as never;

describe('m23 Event nights', () => {
  it('a timeline with one night per day of the event, in order, played ones with their result', () => {
    const out = html(<Events event={{ id: 'tour', days: 3 }} matches={[m]} />);
    expect(out).toContain(EVENTS.tour.name);
    expect(out.match(/class="ev23-n/g)).toHaveLength(3);
    expect(out).toMatch(/class="ev23-n done"[\s\S]*?Day 1 of 3/);
    expect(out).toMatch(/class="ev23-n next"[\s\S]*?Day 2 of 3/);
    expect(out).toMatch(/Day 3 of 3/);
  });
});
