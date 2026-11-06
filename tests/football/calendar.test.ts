import { describe, expect, it } from 'vitest';
import { leagueFixtures, seasonDays } from '../../src/football/calendar';
import { advance, bracketFrom16, drawBigCup, drawTierCup, type CupClub } from '../../src/football/cups';
import { CLUBS } from '../../src/football/data/load';
import { calledUp, EVENTS, INVENTED, nextEvent, NATIONS, worldCupGroups, type EventState } from '../../src/football/events';
import { rng } from '../../src/football/rng';

describe('the 42-day season', () => {
  const days = seasonDays();
  it('has 34 league days, 4 Big Cup days, 2 tier-cup days and finals weekend', () => {
    expect(days).toHaveLength(42);
    expect(days.filter((d) => d.kind === 'league')).toHaveLength(34);
    expect(days.filter((d) => d.kind === 'bigcup')).toHaveLength(4);
    expect(days.filter((d) => d.kind === 'tiercup')).toHaveLength(2);
    expect(days[40].kind).toBe('finals1');
    expect(days[41].kind).toBe('finals2');
    expect(days.filter((d) => d.window).map((d) => d.day)).toEqual([21, 22, 23]);
    expect(days.filter((d) => d.kind === 'league').map((d) => d.matchday)).toEqual(Array.from({ length: 34 }, (_, i) => i + 1));
  });
  it('spaces cup days about every fifth day', () => {
    const cups = days.filter((d) => d.kind === 'bigcup' || d.kind === 'tiercup').map((d) => d.day);
    for (let i = 1; i < cups.length; i++) { expect(cups[i] - cups[i - 1]).toBeGreaterThanOrEqual(4); expect(cups[i] - cups[i - 1]).toBeLessThanOrEqual(6); }
  });
  it('fixtures: 34 rounds of 9, each pair home and away, nobody twice in a round', () => {
    const ids = CLUBS.filter((c) => c.tier === 6).map((c) => c.id);
    const fx = leagueFixtures(ids, 7);
    expect(fx).toHaveLength(34);
    const seen = new Set<string>();
    for (const rd of fx) {
      expect(rd).toHaveLength(9);
      const inRound = rd.flat();
      expect(new Set(inRound).size).toBe(18);
      for (const [h, a] of rd) seen.add(`${h}>${a}`);
    }
    expect(seen.size).toBe(18 * 17);
  });
});

describe('cups', () => {
  const clubs: CupClub[] = CLUBS.map((c) => ({ id: c.id, tier: c.tier, rating: c.rating ?? 40 }));
  it('the Big Cup takes all 108, the top 20 skip the first round', () => {
    const b = drawBigCup(clubs, rng(3));
    const r1 = b.rounds[0].ties;
    expect(r1).toHaveLength(64);
    expect(r1.filter((t) => t.away === null)).toHaveLength(20);
    expect(new Set(r1.flatMap((t) => [t.home, t.away]).filter(Boolean)).size).toBe(108);
    const byeIds = r1.filter((t) => !t.away).map((t) => t.home);
    for (const id of byeIds) expect(CLUBS.find((c) => c.id === id)!.tier).toBeLessThanOrEqual(2);
  });
  it('advances winners in order, and the bracket from the last 16 has 16 clubs', () => {
    let b = drawBigCup(clubs, rng(4));
    for (let i = 0; i < b.rounds.length; i++) {
      const res: Record<string, { score: [number, number] }> = {};
      for (const t of b.rounds[i].ties) if (t.away) res[`${t.home}-${t.away}`] = { score: [1, 0] };
      b = advance(b, i, res);
    }
    expect(b.rounds[1].ties).toHaveLength(32);
    expect(bracketFrom16(b)[0].ties).toHaveLength(8);
    expect(b.winner).toBeTruthy();
  });
  it("Brabo is always in its tier band's cup", () => {
    const b = drawTierCup(6, clubs, 'bra', rng(5));
    expect(b.name).toBe('The Underdog Shield');
    expect(b.rounds[0].ties.flatMap((t) => [t.home, t.away])).toContain('bra');
    expect(b.rounds[0].ties).toHaveLength(8);
  });
});

describe('events and the World Cup', () => {
  it('rotates the World Cup and the Nations Cup every fourth season, offset by 2', () => {
    let st: EventState = { used: [], clubWorldDue: false };
    const seen: string[] = [];
    for (let s = 1; s <= 8; s++) { const e = nextEvent(s, st, rng(s)); st = e.state; seen.push(e.id); }
    expect(seen[3]).toBe('worldcup'); expect(seen[7]).toBe('worldcup');
    expect(seen[1]).toBe('nations'); expect(seen[5]).toBe('nations');
  });
  it('draws invented events without repeats until all 12 have run', () => {
    let st: EventState = { used: [], clubWorldDue: false };
    const got: string[] = [];
    for (let s = 1; got.length < 12; s++) { const e = nextEvent(s, st, rng(s)); st = e.state; if (INVENTED.includes(e.id)) got.push(e.id); }
    expect(new Set(got).size).toBe(12);
    expect(EVENTS.supercup.days).toBe(1);
    expect(EVENTS.worldcup.days).toBe(7);
  });
  it('48 nations, 16 groups of 3, group day 1 a double-header for the first nation', () => {
    expect(NATIONS).toHaveLength(48);
    const wc = worldCupGroups(NATIONS, rng(1), 'bel');
    expect(wc.groups).toHaveLength(16);
    for (const g of wc.groups) expect(g).toHaveLength(3);
    expect(wc.days[0].matches.filter((m) => m.includes('bel'))).toHaveLength(2);
    expect(wc.days[1].matches.filter((m) => m.includes('bel'))).toHaveLength(0);
    expect(wc.days).toHaveLength(7);
  });
  it('call-ups need about Crown League level for the strongest nations', () => {
    expect(calledUp(12, 95)).toBe(false);
    expect(calledUp(18.2, 95)).toBe(true);
    expect(calledUp(12, 58)).toBe(true);
    expect(calledUp(8, 40)).toBe(true);
  });
});
