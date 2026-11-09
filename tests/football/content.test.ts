// Football engine 2's content: counts, unique ids, valid links, and the rules that hold everywhere.
import { describe, expect, it } from 'vitest';
import { ABROAD } from '../../src/football/data/continental';
import { CLUBS } from '../../src/football/data/load';
import { BUNDLES } from '../../src/football/ground';
import { AXES, TIERS } from '../../src/football/types';
import * as C from '../../src/football/content';
import type { Effect, EraId } from '../../src/football/content';

const ids = (xs: { id: string }[]) => xs.map((x) => x.id);
const unique = (xs: string[]) => new Set(xs).size === xs.length;
const allText = JSON.stringify(C, (_k, v) => (v instanceof RegExp ? v.source : v));

const allEffects = (): { where: string; e: Effect }[] => [
  ...C.TECHS.flatMap((t) => t.effects.map((e) => ({ where: `tech ${t.id}`, e }))),
  ...C.STAFF.flatMap((s) => [...s.effects, ...(s.levels?.perLevel ?? [])].map((e) => ({ where: `staff ${s.id}`, e }))),
  ...C.BOONS.flatMap((b) => b.effects.map((e) => ({ where: `boon ${b.id}`, e }))),
  ...C.PROJECTS.flatMap((p) => p.effects.map((e) => ({ where: `project ${p.id}`, e }))),
  ...C.TRAITS.map((t) => ({ where: `trait ${t.id}`, e: t.effect })),
  ...C.LOANS.map((l) => ({ where: `loan ${l.id}`, e: l.trait.effect })),
  ...C.SIGNATURE_MOVES.map((m) => ({ where: `signature ${m.unit}`, e: m.effect })),
  ...C.BOOSTS.map((b) => ({ where: `boost ${b.id}`, e: b.effect })),
];

describe('content counts', () => {
  it('has 60 loans, ten per unit, Gold to Icon', () => {
    expect(C.LOANS).toHaveLength(60);
    for (const u of AXES) expect(C.LOANS.filter((l) => l.unit === u)).toHaveLength(10);
    for (const l of C.LOANS) expect(['gold', 'prism', 'icon']).toContain(l.tier);
    for (const u of AXES) expect(C.LOANS.some((l) => l.unit === u && l.tier === 'icon')).toBe(true);
  });
  it('draws loans by pose, kit and number, never a portrait', () => {
    for (const l of C.LOANS) {
      expect(l.drawing.face).toBe('line-art shading only');
      expect(l.drawing.pose.length).toBeGreaterThan(10);
      expect(l.drawing.number).toBeGreaterThan(0);
      expect(l.drawing.kit).not.toMatch(/logo|crest|badge/i);
      expect(l.arrival && l.farewell && l.style).toBeTruthy();
    }
  });
  it('has 11 album sets of 20–40 cards, each with a reward and a rarity spread', () => {
    expect(C.ALBUM).toHaveLength(11);
    for (const s of C.ALBUM) {
      expect(s.cards.length).toBeGreaterThanOrEqual(20);
      expect(s.cards.length).toBeLessThanOrEqual(40);
      expect(['kit-trim', 'stadium-detail', 'museum-piece']).toContain(s.reward.kind);
      const rar = new Set(s.cards.map((c) => c.rarity));
      for (const r of ['bronze', 'silver', 'gold', 'prism', 'icon', 'legend'] as const) expect(rar.has(r)).toBe(true);
      expect(s.cards.filter((c) => c.rarity === 'legend').length).toBeLessThanOrEqual(1);
    }
  });
  it('has 48 techs, eight an era, priced by era', () => {
    expect(C.TECHS).toHaveLength(48);
    for (const e of C.ERAS) {
      const ts = C.TECHS.filter((t) => t.era === e.id);
      expect(ts).toHaveLength(8);
      for (const t of ts) expect(t.cost).toBe(e.cost);
    }
    expect(C.ERAS.map((e) => e.cost)).toEqual([20, 35, 55, 80, 110, 150]);
    expect(C.ERAS.map((e) => e.name)).toEqual(['Sunday league', 'Semi-pro', 'Professional', 'Top flight', 'Renowned', 'Continental']);
  });
  it('has 12+ staff, about 24 boons, about 30 bounties, board objectives and a 42-step track', () => {
    expect(C.STAFF.length).toBeGreaterThanOrEqual(12);
    expect(C.BOONS).toHaveLength(24);
    expect(C.BOUNTIES).toHaveLength(30);
    expect(C.BOARD.length).toBeGreaterThanOrEqual(10);
    for (const s of ['low', 'mid', 'high'] as const) expect(C.BOARD.filter((o) => o.for.includes(s)).length).toBeGreaterThanOrEqual(C.BOARD_PER_SEASON);
    expect(C.TRACK).toHaveLength(42);
    for (const s of C.TRACK) if (s.step % 7 === 0) expect(s.reward).not.toBeNull();
  });
  it('has a signature move for every unit, and words for every unit', () => {
    expect(C.SIGNATURE_MOVES.map((m) => m.unit).sort()).toEqual([...AXES].sort());
    for (const u of AXES) {
      expect(C.SCOUT_LINES[u].length).toBeGreaterThanOrEqual(3);
      expect(C.GOAL_LINES[u].length).toBeGreaterThanOrEqual(3);
    }
    expect(Object.keys(C.ERA_INTROS)).toHaveLength(6);
    expect(C.FAREWELLS.length).toBeGreaterThanOrEqual(10);
  });
  it('records every limited pool for the running-low notice', () => {
    expect(C.POOLS.map((p) => p.pool)).toEqual(['loans', 'album', 'boons', 'bounties']);
    expect(C.POOLS.find((p) => p.pool === 'album')!.size).toBe(C.ALBUM_CARDS.length);
    expect(C.runningLow(47, 60)).toBe(false);
    expect(C.runningLow(48, 60)).toBe(true);
    expect(C.runningLow(50, 60, 60)).toBe(false);
  });
});

describe('content ids and links', () => {
  it('uses unique ids in every kind', () => {
    for (const xs of [C.LOANS, C.ALBUM, C.ALBUM_CARDS, C.TECHS, C.STAFF, C.PROJECTS, C.BOONS, C.BOUNTIES, C.BOARD, C.TRAITS, C.BOOSTS, C.NATIONS.map((n) => ({ id: n.code }))]) expect(unique(ids(xs))).toBe(true);
    expect(unique([...ids(C.TRAITS), ...C.LOANS.map((l) => l.trait.id)])).toBe(true);
  });
  it('has valid, acyclic prerequisites from the same or an earlier era', () => {
    const order = (e: EraId) => C.ERA_IDS.indexOf(e);
    const byId = new Map(C.TECHS.map((t) => [t.id, t]));
    for (const t of C.TECHS) for (const p of t.prereqs) {
      expect(byId.has(p), `${t.id} needs ${p}`).toBe(true);
      expect(order(byId.get(p)!.era)).toBeLessThanOrEqual(order(t.era));
    }
    const seen = new Set<string>();
    const visit = (id: string, path: string[]) => {
      expect(path).not.toContain(id);
      if (seen.has(id)) return;
      for (const p of byId.get(id)!.prereqs) visit(p, [...path, id]);
      seen.add(id);
    };
    for (const t of C.TECHS) visit(t.id, []);
  });
  it('lets every era be entered: six of the era before are reachable without it', () => {
    for (let i = 1; i < C.ERA_IDS.length; i++) {
      const prev = C.TECHS.filter((t) => t.era === C.ERA_IDS[i - 1]);
      const ok = prev.filter((t) => t.prereqs.every((p) => C.ERA_IDS.indexOf(C.techById(p)!.era) <= i - 1));
      expect(ok.length).toBeGreaterThanOrEqual(C.ERA_ENTRY_TECHS);
    }
  });
  it('links staff and techs both ways', () => {
    for (const s of C.STAFF) {
      const t = C.techById(s.tech);
      expect(t, s.id).toBeTruthy();
      expect(t!.effects.some((e) => e.kind === 'staff' && e.staff === s.id)).toBe(true);
    }
    for (const { e, where } of allEffects()) if (e.kind === 'staff') expect(C.staffById(e.staff), where).toBeTruthy();
  });
  it('the club doctor levels on medicine days and never touches a rating', () => {
    const doc = C.staffById('club-doctor')!;
    expect(doc.levels?.xp).toBe('meds');
    expect([...doc.effects, ...doc.levels!.perLevel].every((e) => e.kind === 'rule')).toBe(true);
  });
  it('links projects, techs and ground bundles', () => {
    for (const { e, where } of allEffects()) if (e.kind === 'project') expect(C.projectById(e.project), where).toBeTruthy();
    for (const p of C.PROJECTS) {
      if (p.tech) expect(C.techById(p.tech), p.id).toBeTruthy();
      for (const a of p.after ?? []) expect(C.projectById(a), `${p.id} after ${a}`).toBeTruthy();
      if (p.source !== 'ground') expect(C.TECHS.some((t) => t.effects.some((e) => e.kind === 'project' && e.project === p.id)), p.id).toBe(true);
    }
    for (const b of BUNDLES) expect(C.PROJECTS.filter((p) => p.source === 'ground' && p.id === b.id)).toHaveLength(1);
    for (const place of ['kaai', 'shop', 'cafe', 'academy', 'training', 'museum', 'ferry']) expect(C.PROJECTS.some((p) => p.place === place)).toBe(true);
    expect(C.projectById('long-road')!.needs).toEqual([{ what: 'km', count: 1000 }]);
    expect(C.projectById('night-school')!.place).toBeNull();
  });
  it('maps nations from names, and draws the rest from the league and continental data', () => {
    expect(C.nationInName('Romanian deadlift')).toBe('RO');
    expect(C.nationInName('Bulgarian split squat')).toBe('BG');
    expect(C.nationInName('Turkish get-up')).toBe('TR');
    expect(C.nationInName('Goblet squat')).toBeUndefined();
    const countries = new Set([...CLUBS, ...ABROAD].map((c) => c.country).filter(Boolean));
    for (const n of C.NATION_POOL) expect(countries.has(n), n).toBe(true);
    for (const l of C.LOANS) expect(C.nationByCode(l.nation), l.id).toBeTruthy();
    for (const w of C.NATION_WORDS) expect(C.nationByCode(w.nation)).toBeTruthy();
  });
});

describe('the rules that hold everywhere', () => {
  it('no tech, staff, boon, trait or project adds flat rating points', () => {
    for (const { e, where } of allEffects()) {
      expect(['axis', 'retake', 'extra-chance', 'chemistry', 'rule', 'unlock', 'slot', 'money', 'project', 'staff', 'cosmetic'], where).toContain(e.kind);
      if (e.kind === 'axis') {
        expect(e.when, where).not.toBe('always');
        expect([1, 2], where).toContain(e.d);
      }
    }
    for (const t of C.TECHS) expect(t.text, t.id).not.toMatch(/\+\d+ (to )?(rating|overall)|overall \+|rating points/i);
  });
  it('a careful season affords one staff wage plus one building stage in every division', () => {
    const buildings = C.PROJECTS.filter((p) => p.place !== null);
    for (const tier of TIERS) {
      const income = C.carefulIncome(tier);
      const fits = buildings.filter((p) => (p.tier === undefined || tier <= p.tier) && p.money > 0
        && p.needs.every((n) => n.count <= ((C.CAREFUL_SEASON as Record<string, number>)[n.what] ?? 0))
        && p.money + C.wage(1, tier) <= income);
      expect(fits.length, `tier ${tier}`).toBeGreaterThan(0);
    }
  });
  it('nothing rewards eating less, nobody is shamed, and no religious or astrology motifs', () => {
    expect(allText).not.toMatch(/eat less|eating less|fewer calories|under the range|below the range|skip(ped)? (a )?meal|fasting|cheat day/i);
    expect(allText).not.toMatch(/\b(lazy|failure|pathetic|shame|guilt)\b/i);
    expect(allText).not.toMatch(/\b(god|gods|goddess|temple|church|mosque|prayer|zodiac|horoscope|astrolog\w*)\b/i);
  });
  it('writes no gendered pronouns and uses UK spelling', () => {
    expect(allText).not.toMatch(/\b(he|his|him|she|her|hers)\b/i);
    expect(allText).not.toMatch(/\b(color|center|favorite|organize|organization|program\b|defense|offense)\b/i);
  });
  it('keeps waist in inches', () => {
    expect(allText).not.toMatch(/waist[^"]{0,40}\bcm\b/i);
  });
});
