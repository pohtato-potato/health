// Step 4's content (the desk, the cast, the fogged world, the congress, the coaching course) is well
// formed: every club covered, every job and axis voiced, every question with exactly one answer, and
// the standing rules hold in every line.
import { describe, expect, it } from 'vitest';
import { ABROAD } from '../../src/football/data/continental';
import { CLUBS, LEAGUE } from '../../src/football/data/load';
import { AXES } from '../../src/football/types';
import * as D from '../../src/football/content/desk';

const unique = (xs: string[]) => new Set(xs).size === xs.length;
/** Every string value in the desk content (keys and code comments are not shown to anyone). */
const strings = (v: unknown): string[] =>
  typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : [];
const allText = strings(Object.fromEntries(Object.entries(D).filter(([, v]) => typeof v !== 'function'))).join('\n');

describe('the cast', () => {
  it('is today\'s four staff plus two or three new faces', () => {
    expect(unique(D.CAST.map((c) => c.id))).toBe(true);
    expect(D.CAST.filter((c) => c.existing).map((c) => c.id).sort()).toEqual(['academy', 'chairman', 'kitman', 'physio']);
    const fresh = D.CAST.filter((c) => !c.existing).length;
    expect(fresh).toBeGreaterThanOrEqual(2);
    expect(fresh).toBeLessThanOrEqual(3);
  });
  it('has ten rank scenes each, in order, with a perk at some ranks but not all', () => {
    for (const c of D.CAST) {
      expect(c.ranks.map((r) => r.rank), c.id).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      for (const r of c.ranks) expect(r.scene.length, `${c.id} ${r.rank}`).toBeGreaterThan(40);
      const perks = c.ranks.filter((r) => r.perk).length;
      expect(perks, c.id).toBeGreaterThanOrEqual(2);
      expect(perks, c.id).toBeLessThanOrEqual(5);
      for (const r of c.ranks) if (r.perk) {
        expect(r.perk.value, `${c.id} ${r.rank}`).toBeGreaterThan(0);
        if (r.perk.key === 'clock-head-start') expect(D.DESK_JOBS).toContain(r.perk.job);
        if (r.perk.key === 'heirloom') expect(r.perk.item).toBeTruthy();
      }
    }
  });
  it('cares about a real habit, greets warm and cool, and asks for something measurable', () => {
    for (const c of D.CAST) {
      expect(c.cares.metrics.length, c.id).toBeGreaterThan(0);
      expect(c.greet.warm.length).toBeGreaterThan(0);
      expect(c.greet.cool.length).toBeGreaterThan(0);
      expect(c.parcel.warm.length).toBeGreaterThan(0);
      expect(c.parcel.cool.length).toBeGreaterThan(0);
      expect(c.asks.length).toBeGreaterThan(0);
      for (const a of c.asks) {
        expect(c.cares.metrics, `${c.id} asks for its own habit`).toContain(a.trigger.what);
        expect(a.trigger.count).toBeGreaterThan(0);
      }
    }
  });
  it('perks never touch a rating or a match\'s odds', () => {
    const perkText = D.CAST.flatMap((c) => c.ranks.flatMap((r) => (r.perk ? [r.perk.text] : []))).join(' ');
    expect(perkText).not.toMatch(/\brating\b|\bodds\b|\+\d+ (Pace|Power|Fuel|Rest|Routine|Shape)\b/);
  });
});

describe('axis voices', () => {
  it('every job has lines for every axis at every band, using only {value}', () => {
    for (const job of D.DESK_JOBS) for (const axis of AXES) for (const band of D.BANDS) {
      const lines = D.VOICES[job][axis][band];
      expect(lines.length, `${job} ${axis} ${band}`).toBeGreaterThanOrEqual(2);
      for (const l of lines) {
        expect(l.startsWith(`${axis}:`), l).toBe(true);
        expect(l.match(/\{(\w+)\}/g)?.every((p) => p === '{value}') ?? true, l).toBe(true);
      }
    }
    expect(Object.keys(D.VOICES).sort()).toEqual([...D.DESK_JOBS].sort());
  });
  it('maps a die to its band', () => {
    expect([1, 2, 3, 4, 5, 6].map(D.bandOfDie)).toEqual(['low', 'low', 'mid', 'mid', 'high', 'high']);
  });
});

describe('the fogged world', () => {
  const whens = new Set(CLUBS.flatMap((c) => [...c.known, ...(c.hidden ? [c.hidden] : [])]).flatMap((a) => (a.fx ? [a.fx.when] : [])));
  const fogged = [...CLUBS.filter((c) => c.id !== 'bra'), ...ABROAD];

  it('has lore for every club in the league data and abroad, and none for unknown ids', () => {
    for (const c of fogged) expect(D.CLUB_LORE[c.id], c.id).toBeDefined();
    const known = new Set(fogged.map((c) => c.id));
    expect(Object.keys(D.CLUB_LORE).filter((id) => !known.has(id))).toEqual([]);
  });
  it('gives a new hidden ability exactly where the data has none, in shapes the engine already reads', () => {
    for (const c of fogged) {
      const lore = D.CLUB_LORE[c.id];
      expect(Boolean(lore.hiddenNew), c.id).toBe(!c.hidden);
      expect(lore.manager.name.length).toBeGreaterThan(2);
      expect(lore.history.length).toBeGreaterThan(20);
      expect(lore.hiddenTease.length).toBeGreaterThan(10);
      const fx = lore.hiddenNew?.fx;
      if (fx) {
        expect(whens.has(fx.when), `${c.id} ${fx.when}`).toBe(true);
        for (const m of fx.mods) {
          expect(AXES).toContain(m.axis);
          expect(m.d === -1 || m.d === -2, c.id).toBe(true);
        }
      }
    }
    const names = fogged.map((c) => D.CLUB_LORE[c.id].hiddenNew?.name).filter(Boolean) as string[];
    expect(unique(names)).toBe(true);
  });
  it('has scout lines for every finding', () => {
    for (const f of ['rating', 'style', 'weak-side', 'manager', 'hidden', 'history', 'kit', 'loan-target', 'nothing-new'] as const)
      expect(D.SCOUT_REPORT[f].length, f).toBeGreaterThanOrEqual(3);
    expect(D.DIVISION_REPORTS.length).toBeGreaterThan(0);
  });
});

describe('owners, regions and the congress', () => {
  const kinds = new Set(D.OWNER_KINDS.map((k) => k.id));
  const regions = new Set(D.REGIONS.map((r) => r.id));
  it('seats every club in the league data with a known owner kind and region', () => {
    for (const c of CLUBS) {
      const s = D.SEATS[c.id];
      expect(s, c.id).toBeDefined();
      expect(kinds.has(s.owner), c.id).toBe(true);
      expect(regions.has(s.region), c.id).toBe(true);
    }
    expect(Object.keys(D.SEATS).length).toBe(LEAGUE.clubs.length);
    for (const k of ['fan-owned', 'state-fund', 'old-family', 'data-company'] as const)
      expect(Object.values(D.SEATS).some((s) => s.owner === k), k).toBe(true);
    for (const r of regions) expect(Object.values(D.SEATS).some((s) => s.region === r), r).toBe(true);
  });
  it('has twenty motions, each a distinct twist, with valid leans', () => {
    expect(D.MOTIONS).toHaveLength(20);
    expect(unique(D.MOTIONS.map((m) => m.id))).toBe(true);
    expect(unique(D.MOTIONS.map((m) => m.twist.key))).toBe(true);
    for (const m of D.MOTIONS) {
      expect(m.plays.length, m.id).toBeGreaterThan(20);
      expect(Object.keys(m.leans).length, m.id).toBeGreaterThan(1);
      for (const [k, v] of Object.entries(m.leans)) {
        expect(kinds.has(k as D.OwnerKind), `${m.id} ${k}`).toBe(true);
        expect(Math.abs(v)).toBeLessThanOrEqual(2);
      }
      for (const r of Object.keys(m.regions ?? {})) expect(regions.has(r as D.RegionId), `${m.id} ${r}`).toBe(true);
      // some clubs for, some against: no motion is a foregone conclusion
      expect(Object.values(m.leans).some((v) => v > 0) && Object.values(m.leans).some((v) => v < 0), m.id).toBe(true);
    }
  });
});

describe('the paper', () => {
  it('has column lines for every aim and letters with replies', () => {
    for (const aim of ['morale', 'needle', 'fans', 'ambition', 'after-loss', 'congress'] as const)
      expect(D.COLUMN_LINES.filter((l) => l.aim === aim).length, aim).toBeGreaterThanOrEqual(5);
    expect(unique(D.FAN_MAIL.map((f) => f.id))).toBe(true);
    for (const f of D.FAN_MAIL) expect(f.replies.length, f.id).toBeGreaterThanOrEqual(2);
  });
});

describe('the coaching course bank', () => {
  const Q = D.CAT_QUESTIONS;
  const sets = new Map(D.CAT_SETS.map((s) => [s.id, s]));
  it('has 100 questions across all four sections, with TITA among them', () => {
    expect(Q).toHaveLength(100);
    expect(unique(Q.map((q) => q.id))).toBe(true);
    for (const s of ['quant', 'verbal', 'lr', 'di'] as const) expect(Q.filter((q) => q.section === s).length, s).toBeGreaterThanOrEqual(15);
    expect(Q.filter((q) => q.format === 'tita').length).toBeGreaterThanOrEqual(20);
    for (const s of ['quant', 'verbal', 'lr', 'di'] as const) expect(Q.some((q) => q.section === s && q.format === 'tita'), s).toBe(true);
  });
  it('gives every question exactly one answer and a worked explanation', () => {
    for (const q of Q) {
      expect(q.explain.length, q.id).toBeGreaterThan(30);
      expect(q.prompt.length, q.id).toBeGreaterThan(10);
      if (q.format === 'mcq') {
        expect(q.options, q.id).toHaveLength(4);
        expect(unique(q.options!), q.id).toBe(true);
        expect(Number.isInteger(q.answer) && (q.answer as number) >= 0 && (q.answer as number) <= 3, q.id).toBe(true);
      } else {
        expect(q.options, q.id).toBeUndefined();
        expect(typeof q.answer, q.id).toBe('string');
        expect(q.answer as string, q.id).toMatch(/^-?\d+(\.\d+)?$/);
      }
    }
  });
  it('spreads MCQ answers across the four options', () => {
    const counts = [0, 1, 2, 3].map((i) => Q.filter((q) => q.format === 'mcq' && q.answer === i).length);
    for (const c of counts) expect(c).toBeGreaterThanOrEqual(5);
  });
  it('points every set question at a set of its own section, and uses every set', () => {
    for (const q of Q) if (q.set) expect(sets.get(q.set)?.section, q.id).toBe(q.section);
    for (const s of D.CAT_SETS) expect(Q.filter((q) => q.set === s.id).length, s.id).toBeGreaterThanOrEqual(3);
  });
  it('para jumbles use each sentence number once', () => {
    for (const q of Q.filter((x) => x.topic === 'Para jumble')) expect([...(q.answer as string)].sort().join(''), q.id).toBe('1234');
  });
});

describe('the standing rules hold in every line', () => {
  it('no gendered pronouns, UK spelling', () => {
    expect(allText).not.toMatch(/\b(he|his|him|she|her|hers|himself|herself)\b/i);
    expect(allText).not.toMatch(/\b(color|center|favorite|organize|organization|program|defense|offense)\b/i);
  });
  it('nobody is shamed and nothing rewards eating less', () => {
    expect(allText).not.toMatch(/\b(lazy|failure|pathetic|shame|guilt|disappointing you)\b/i);
    expect(allText).not.toMatch(/eat less|eating less|fewer calories|under the range|below the range|skip(ped)? (a )?meal|fasting|cheat day/i);
  });
  it('no religious framing, betting or alcohol', () => {
    expect(allText).not.toMatch(/\b(god|gods|goddess|temple|church|mosque|cathedral|prayer|pray|blessed|zodiac|horoscope|astrolog\w*)\b/i);
    expect(allText).not.toMatch(/\b(bet|bets|betting|bookmakers?|wager|gamble|gambling|casino)\b/i);
    expect(allText).not.toMatch(/\b(beer|wine|pints?|lager|vodka|whisky|cocktails?|drunk|booze|pub|bar crawl)\b/i);
  });
  it('no generic gym lines', () => {
    expect(allText).not.toMatch(/no pain,? no gain|beast mode|grind never stops|the weights (silently )?judged/i);
  });
});
