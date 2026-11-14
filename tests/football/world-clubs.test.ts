// The rebuilt league's clubs (O38, LG-2): world.json is complete, consistent with spec §5, keeps the old
// real clubs' ids, never reuses a made-up club's id, and follows the content rules.
import { describe, expect, it } from 'vitest';
import { CONT_INVENTED, CONT_REAL, WORLD_CHAMPS } from '../../src/football/data/continental';
import { CLUBS, STYLES, type AbilityDef } from '../../src/football/data/load';
import { WORLD, WORLD_CLUBS, type Division, type WorldClub } from '../../src/football/data/world';
import { AXES } from '../../src/football/types';

const pyramid = WORLD_CLUBS.filter((c) => c.place === 'pyramid');
const unique = (xs: unknown[]) => new Set(xs).size === xs.length;
const OWNERS = ['fan-owned', 'state-fund', 'old-family', 'data-company', 'billionaire', 'investment-fund', 'works-team', 'celebrity', 'municipal'];
const CONGRESS_REGIONS = ['flanders', 'netherlands', 'london', 'north-england', 'south-england', 'wales', 'castile', 'catalonia', 'basque',
  'andalusia', 'spain-east', 'spain-north', 'canaries', 'bavaria', 'rhine-ruhr', 'germany-north', 'germany-east', 'germany-south-west',
  'italy-north', 'italy-centre-south', 'paris', 'france-south', 'france-north', 'rhone-alps', 'alps-danube', 'nordic', 'portugal'];
// Opponent `when` values engine.ts whenOk reads.
const WHENS = new Set(['always', 'home', 'away', 'first-half', 'level', 'they-lead', 'until-concede', 'until-score', 'after-their-goal',
  'after-miss', 'cup', 'derby', 'vs-higher', 'last5', 'crosses', 'corners', 'counters', 'long']);
const whenOk = (w: string) => WHENS.has(w) || /^(home-)?(first|after)-\d+$/.test(w);
const abilities = (c: WorldClub): AbilityDef[] => [...c.known, c.hidden];

/** Every word a player can read: names, facts, ability names and texts, lore. */
const text = (c: WorldClub) => [c.name, c.short, c.nickname, c.city, c.ground, ...abilities(c).flatMap((a) => [a.name, a.text]),
  c.lore.manager.name, c.lore.manager.line, c.lore.history, c.lore.hiddenTease, ...c.lore.lines];
const allText = WORLD_CLUBS.flatMap(text).join('\n') + '\n' + WORLD.newRegions.map((r) => `${r.name} ${r.pride}`).join('\n');

describe('the world’s clubs: complete', () => {
  it('has every field on every club', () => {
    for (const c of WORLD_CLUBS) {
      for (const k of ['id', 'name', 'short', 'nickname', 'city', 'country', 'ground'] as const) expect(c[k].trim().length, `${c.id} ${k}`).toBeGreaterThan(0);
      expect(c.short.length, c.id).toBeLessThanOrEqual(4);
      expect(c.country, c.id).toMatch(/^[A-Z]{2}$/);
      expect(Number.isInteger(c.founded) && c.founded >= 1850 && c.founded <= 2026, `${c.id} founded`).toBe(true);
      expect(c.colours.length, c.id).toBeGreaterThanOrEqual(2);
      for (const h of c.colours) expect(h, c.id).toMatch(/^#[0-9a-f]{6}$/i);
      expect(Object.keys(STYLES), c.id).toContain(c.style);
      expect(c.known.length, c.id).toBeGreaterThanOrEqual(1);
      expect(c.known.length, c.id).toBeLessThanOrEqual(3);
      expect(c.hidden, c.id).toBeTruthy();
      expect(Number.isFinite(c.rating), c.id).toBe(true);
      expect(c.lore.manager.name.length, c.id).toBeGreaterThan(2);
      expect(c.lore.manager.line.length, c.id).toBeGreaterThan(10);
      expect(c.lore.history.length, c.id).toBeGreaterThan(20);
      expect(c.lore.hiddenTease.length, c.id).toBeGreaterThan(10);
      expect(c.lore.lines.length, c.id).toBeGreaterThanOrEqual(3);
      for (const l of c.lore.lines) expect(l.length, c.id).toBeGreaterThan(15);
      expect(OWNERS, c.id).toContain(c.seat.owner);
      expect([...CONGRESS_REGIONS, ...WORLD.newRegions.map((r) => r.id)], c.id).toContain(c.seat.region);
    }
  });
  it('writes abilities in the engine’s shapes', () => {
    for (const c of WORLD_CLUBS) for (const a of abilities(c)) {
      expect(a.name.length && a.text.length, `${c.id} ${a.name}`).toBeTruthy();
      if (!a.fx) continue;
      expect(whenOk(a.fx.when), `${c.id} ${a.name} ${a.fx.when}`).toBe(true);
      for (const m of a.fx.mods) {
        expect(AXES, `${c.id} ${a.name}`).toContain(m.axis);
        expect(m.d, `${c.id} ${a.name}`).toBeLessThan(0);
        expect(m.d, `${c.id} ${a.name}`).toBeGreaterThanOrEqual(-2);
      }
    }
    for (const c of WORLD_CLUBS) if (c.hidden.fx) expect(c.hidden.fx.mods.length + Math.abs(c.hidden.fx.reach), c.id).toBeGreaterThan(0);
    expect(unique(WORLD_CLUBS.map((c) => c.hidden.name))).toBe(true);
  });
  it('lists only regions the congress lacks as new', () => {
    for (const r of WORLD.newRegions) expect(CONGRESS_REGIONS).not.toContain(r.id);
    expect(unique(WORLD.newRegions.map((r) => r.id))).toBe(true);
  });
});

describe('the world’s clubs: ids', () => {
  it('has unique ids, none of them an old made-up club’s', () => {
    expect(unique(WORLD_CLUBS.map((c) => c.id))).toBe(true);
    const madeUp = [...CLUBS.filter((c) => c.kind !== 'real').map((c) => c.id), ...CONT_INVENTED.map((c) => c.id), ...WORLD_CHAMPS.map((c) => c.id)];
    expect(madeUp.length).toBeGreaterThan(70);
    expect(WORLD_CLUBS.map((c) => c.id).filter((id) => madeUp.includes(id))).toEqual([]);
  });
  it('keeps the id of every real club the game already has', () => {
    const ids = new Set(WORLD_CLUBS.map((c) => c.id));
    for (const c of [...CLUBS.filter((x) => x.kind === 'real'), ...CONT_REAL]) expect(ids.has(c.id), c.id).toBe(true);
    for (const c of WORLD_CLUBS) {
      const was = CLUBS.some((x) => x.kind === 'real' && x.id === c.id) ? 'league' : CONT_REAL.some((x) => x.id === c.id) ? 'continental' : 'new';
      expect(c.was, c.id).toBe(was);
    }
  });
  it('has no club twice', () => {
    expect(unique(WORLD_CLUBS.map((c) => c.name))).toBe(true);
    expect(unique(WORLD_CLUBS.flatMap((c) => (c.opta ? [c.opta.name] : [])))).toBe(true);
    expect(unique(WORLD_CLUBS.map((c) => c.order))).toBe(true);
  });
});

describe('the world’s clubs: the pyramid (spec §5)', () => {
  it('puts exactly 94 real clubs in eight divisions, leaving places for Brabo and the October club', () => {
    expect(pyramid).toHaveLength(94);
    for (const d of [1, 2, 3, 4, 5, 6, 7, 8] as Division[])
      expect(pyramid.filter((c) => c.division === d), `division ${d}`).toHaveLength(12 - (WORLD.openPlaces[String(d)] ?? 0));
    expect(WORLD.openPlaces).toEqual({ '3': 1, '8': 1 });
    for (const c of WORLD_CLUBS.filter((x) => x.place !== 'pyramid')) expect(c.division, c.id).toBeNull();
  });
  it('keeps every rating inside its division’s band, the bands of spec §5', () => {
    expect(WORLD.bands).toEqual({ '1': [99, 104], '2': [94, 99], '3': [88, 93], '4': [83, 88], '5': [77, 82], '6': [72, 77], '7': [67, 72], '8': [62, 67] });
    for (const c of pyramid) {
      const [lo, hi] = WORLD.bands[String(c.division)];
      expect(c.rating >= lo && c.rating <= hi, `${c.id} ${c.rating}`).toBe(true);
    }
    for (const c of WORLD_CLUBS.filter((x) => x.place !== 'pyramid')) expect(c.rating, c.id).toBeLessThan(62);
  });
  it('orders the pyramid strongest first, as drafted', () => {
    const ps = [...pyramid].sort((a, b) => a.order - b.order);
    for (let i = 1; i < ps.length; i++) {
      expect(ps[i].division! >= ps[i - 1].division!, ps[i].id).toBe(true);
      expect(ps[i].rating <= ps[i - 1].rating, ps[i].id).toBe(true);
    }
    expect(ps[0].id).toBe('ars');
    expect(ps[5].id).toBe('rma');
  });
  it('has a pool of about 26 or more outside, and Brabo’s two real neighbours', () => {
    expect(WORLD_CLUBS.filter((c) => c.place === 'pool').length).toBeGreaterThanOrEqual(26);
    const rival = WORLD_CLUBS.filter((c) => c.role === 'rival');
    const landlords = WORLD_CLUBS.filter((c) => c.role === 'landlords');
    expect(rival.map((c) => c.id)).toEqual(['rafc']);
    expect(rival[0].division).toBe(8);
    expect(landlords.map((c) => c.id)).toEqual(['kbs']);
    expect(landlords[0].place).toBe('neighbour');
    for (const c of [...rival, ...landlords]) expect(c.city).toBe('Antwerp');
  });
});

describe('the world’s clubs: the standing rules hold in every line', () => {
  it('no gendered pronouns, UK spelling', () => {
    expect(allText).not.toMatch(/\b(he|his|him|she|her|hers|himself|herself)\b/i);
    expect(allText).not.toMatch(/\b(color|center|favorite|organize|organization|program|defense|offense)\b/i);
  });
  it('no religious framing, betting or alcohol', () => {
    expect(allText).not.toMatch(/\b(god|gods|goddess|temple|church|chapel|mosque|cathedral|prayer|pray|blessed|miracle|zodiac|horoscope|astrolog\w*)\b/i);
    expect(allText).not.toMatch(/\b(bet|bets|betting|bookmakers?|wager|gamble|gambling|casino|lottery|lotto)\b/i);
    expect(allText).not.toMatch(/\b(beer|wine|pints?|lager|vodka|whisky|cocktails?|drunk|booze|pub|bar crawl|brewery|grolsch)\b/i);
  });
  it('nobody is shamed', () => {
    expect(allText).not.toMatch(/\b(lazy|failure|pathetic|shame|guilt)\b/i);
  });
});
