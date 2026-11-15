// LG-4 (ledger O38): every made-up club named in world 2 is replaced by a real one; world 1 is unchanged.
import { afterEach, describe, expect, it } from 'vitest';
import { BOARD } from '../../src/football/content/season';
import { CAST } from '../../src/football/content/desk/cast';
import { FAN_MAIL } from '../../src/football/content/desk/paper';
import { bidFor } from '../../src/football/contracts';
import { newClubWorld } from '../../src/football/continental';
import { WORLD_CHAMPS, WORLD_CHAMPS_2 } from '../../src/football/data/continental';
import { clubById, setClubWorld } from '../../src/football/data/load';
import { WORLD_CLUBS } from '../../src/football/data/world';
import { loreOf } from '../../src/football/fog/words';
import { homeGround } from '../../src/football/ground';
import { howText, legendId, rivalList, rivalTwist } from '../../src/football/rivals';
import { fogClubs } from '../../src/football/store/fog';

afterEach(() => setClubWorld(1));
const MADE_UP = /Antigoon|Zurenborg|Stadion aan de Stroom|Schachmatt|Los Panaderos|Duivenbond/;
const allText = () => JSON.stringify([BOARD.map((o) => [o.text, o.met, o.missed]), CAST.map((c) => [c.who, c.ranks?.map((r) => [r.title, r.scene])]), FAN_MAIL.map((l) => [l.from, l.letter])]);

describe('world 1 keeps every word', () => {
  it('Antigoon, Zurenborg and the old ground as before', () => {
    setClubWorld(1);
    expect(legendId()).toBe('ant');
    expect(homeGround(false)).toBe('Stadion aan de Stroom');
    expect(BOARD.find((o) => o.id === 'o-derby')!.text).toBe('Beat Antigoon at least once.');
    expect(rivalTwist('ant', 'legend').name).toBe("Giant's hand");
    expect(allText()).toMatch(/Zurenborg/);
    expect(newClubWorld(3).rounds[0].ties.flatMap((t) => [t.home, t.away]).filter((id) => id !== 'bra').sort()).toEqual(WORLD_CHAMPS.map((c) => c.id).sort());
    expect(bidFor('steps', 2).buyer).toMatch(/FC|XI|Ramblers|Dockers|Ferrymen/);
  });
});

describe('world 2 names only real clubs', () => {
  it('Royal Antwerp is the legend rival, with its own name for the legend twist', () => {
    setClubWorld(2);
    expect(clubById(legendId()).name).toBe('Royal Antwerp');
    expect(rivalList([])[0].clubId).toBe(legendId());
    expect(rivalTwist(legendId(), 'legend').name).toBe('The Great Old');
    expect(howText({ clubId: legendId(), how: 'legend', since: '' })).toMatch(/Royal Antwerp/);
  });
  it('Brabo rent Het Rooi from Berchem Sport', () => {
    setClubWorld(2);
    expect(homeGround(false)).toBe('Het Rooi');
    expect(homeGround(true)).toBe('Kaai 42');
  });
  it('no board objective, cast line or letter names a made-up club', () => {
    setClubWorld(2);
    expect(allText()).not.toMatch(MADE_UP);
    expect(BOARD.find((o) => o.id === 'o-derby')!.text).toBe('Beat Royal Antwerp at least once.');
  });
  it('a sold habit goes to a real club from outside the league', () => {
    setClubWorld(2);
    const names = WORLD_CLUBS.filter((c) => c.place === 'pool').map((c) => c.name);
    for (const h of ['steps', 'sleep', 'food'] as const) for (let s = 1; s < 6; s++) expect(names).toContain(bidFor(h, s).buyer);
  });
  it('the Club World Cup is played against seven real champions of other continents', () => {
    setClubWorld(2);
    expect(WORLD_CHAMPS_2).toHaveLength(7);
    const ids = newClubWorld(3, 2).rounds[0].ties.flatMap((t) => [t.home, t.away]).filter((id): id is string => !!id && id !== 'bra');
    expect(ids.sort()).toEqual(WORLD_CHAMPS_2.map((c) => c.id).sort());
    for (const id of ids) expect(clubById(id).kind).toBe('real');
    expect(new Set(WORLD_CHAMPS_2.map((c) => c.country)).size).toBe(7);
  });
  it('the clubs abroad are real: the pool and the champions, none of the invented six', () => {
    setClubWorld(2);
    const abroad = fogClubs({ ars: 1 }).filter((c) => c.tier === 0).map((c) => c.id);
    expect(abroad).not.toContain('ct-fjo');
    expect(abroad).toContain('whu');
    expect(abroad).toContain('cw2-fla');
    expect(abroad).not.toContain('kbs');
  });
  it('lore comes from world.json, with true lines', () => {
    setClubWorld(2);
    const w = WORLD_CLUBS.find((c) => c.id === 'rafc')!;
    expect(loreOf('rafc')!.history).toBe(w.lore.history);
    expect(loreOf('rafc')!.lines!.length).toBeGreaterThan(0);
  });
  it("Real Betis's short code is RBB", () => {
    setClubWorld(2);
    expect(clubById('bet').short).toBe('RBB');
  });
});
