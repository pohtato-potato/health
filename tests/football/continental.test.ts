import { describe, expect, it } from 'vitest';
import { seasonDays } from '../../src/football/calendar';
import { CONT, contPrize, drawField, koFromTable, newContinental, phaseTable, CWC_DAYS, newClubWorld } from '../../src/football/continental';
import { CONT_INVENTED, CONT_REAL, WORLD_CHAMPS } from '../../src/football/data/continental';
import { clubById } from '../../src/football/data/load';
import { advance } from '../../src/football/cups';
import { EVENTS } from '../../src/football/events';

const top4 = ['bay', 'mci', 'rma', 'bar'];

describe('the Continental Cup', () => {
  it('every abroad club resolves, and real clubs outnumber invented ones in the pool', () => {
    for (const c of [...CONT_REAL, ...CONT_INVENTED, ...WORLD_CHAMPS]) expect(clubById(c.id).name).toBe(c.name);
    expect(CONT_REAL.length).toBeGreaterThan(CONT_INVENTED.length * 2);
  });

  it('the field is the top 4 plus 12 drawn, mostly real, the same every time for a season', () => {
    const f = drawField(3, top4);
    expect(f).toHaveLength(16);
    expect(f.slice(0, 4)).toEqual(top4);
    expect(new Set(f).size).toBe(16);
    const drawn = f.slice(4);
    expect(drawn.filter((id) => CONT_REAL.some((c) => c.id === id)).length).toBe(9);
    expect(drawn.filter((id) => CONT_INVENTED.some((c) => c.id === id)).length).toBe(3);
    expect(drawField(3, top4)).toEqual(f);
    expect(drawField(4, top4)).not.toEqual(f);
  });

  it('the league phase: 8 rounds, each club meets 8 different opponents, 4 at home', () => {
    const c = newContinental(2, top4);
    expect(c.rounds).toHaveLength(8);
    for (const id of c.field) {
      const mine = c.rounds.flat().filter(([h, a]) => h === id || a === id);
      expect(mine).toHaveLength(8);
      expect(new Set(mine.map(([h, a]) => (h === id ? a : h))).size).toBe(8);
      expect(mine.filter(([h]) => h === id)).toHaveLength(4);
    }
  });

  it('continental nights are league nights, one continental match each, then QF, SF and final', () => {
    const days = seasonDays();
    for (const d of [...CONT.phase, CONT.qf, CONT.sf, CONT.final]) expect(days[d - 1].kind).toBe('league');
    expect(CONT.phase).toHaveLength(8);
    expect(days.filter((d) => d.cont).map((d) => d.day)).toEqual([...CONT.phase, CONT.qf, CONT.sf, CONT.final]);
    expect(days[CONT.phase[0] - 1].cont).toEqual({ stage: 'phase', round: 1 });
    expect(days[CONT.final - 1].cont).toEqual({ stage: 'final', round: 0 });
  });

  it('the top 8 of the phase table play 1v8, 4v5, 2v7, 3v6, so 1 and 2 can only meet in the final', () => {
    const c = newContinental(2, top4);
    // Club i beats everyone below it in the field order.
    c.results = c.rounds.map((r) => r.map(([h, a]) => ({ home: h, away: a, score: (c.field.indexOf(h) < c.field.indexOf(a) ? [2, 0] : [0, 2]) as [number, number] })));
    const t = phaseTable(c);
    expect(t).toHaveLength(16);
    expect(t[0].pts).toBeGreaterThanOrEqual(t[15].pts);
    const ko = koFromTable(c);
    const f = t.map((r) => r.id);
    expect(ko.rounds[0].ties.map((x) => [x.home, x.away])).toEqual([[f[0], f[7]], [f[3], f[4]], [f[1], f[6]], [f[2], f[5]]]);
    expect(ko.rounds.map((r) => [r.name, r.day])).toEqual([['Quarter-final', CONT.qf], ['Semi-final', CONT.sf], ['Final', CONT.final]]);
  });

  it('prize money runs from 2 to 15 by how far you go', () => {
    expect(contPrize('phase')).toBe(2);
    expect(contPrize('winner')).toBe(15);
    expect(contPrize('qf')).toBeLessThan(contPrize('sf'));
    expect(contPrize('sf')).toBeLessThan(contPrize('final'));
  });
});

describe('the Club World Cup', () => {
  it('Brabo and the seven champions, quarter-final, semi-final, a third night, final over the event’s 4 days', () => {
    expect(EVENTS.clubworld.days).toBe(4);
    const b = newClubWorld(5);
    const ids = b.rounds[0].ties.flatMap((t) => [t.home, t.away]);
    expect(new Set(ids)).toEqual(new Set(['bra', ...WORLD_CHAMPS.map((c) => c.id)]));
    expect(b.rounds.map((r) => r.day)).toEqual([CWC_DAYS.qf, CWC_DAYS.sf, CWC_DAYS.final]);
    expect(CWC_DAYS).toEqual({ qf: 1, sf: 2, third: 3, final: 4 });
    let x = advance(b, 0, Object.fromEntries(b.rounds[0].ties.map((t) => [`${t.home}-${t.away}`, { score: [1, 0] as [number, number] }])));
    x = advance(x, 1, Object.fromEntries(x.rounds[1].ties.map((t) => [`${t.home}-${t.away}`, { score: [1, 0] as [number, number] }])));
    expect(x.rounds[2].ties).toHaveLength(1);
  });
});
