// Matchday depth, the engine (spec 2026-11-12 §2): a league match that waits for you. Honest per-chance sub-seeds,
// one to three calls with one shared draw, the assistant taking the best odds, the plan per half and tempo.
import { describe, expect, it } from 'vitest';
import { callCount, nextChance, finishMatch, KEEP_STOP, playMatch, startMatch, type CallPick, type MatchInput, type MatchState } from '../../src/football/engine';
import type { Opponent } from '../../src/football/opponent';
import { allAxes, type MatchEvents } from '../../src/football/types';

const opp = (over: Partial<Opponent> = {}): Opponent => ({ id: 'tst', rating: 50, reach: 0.65, shrinks: { Pace: -1 }, presses: { Rest: -1 }, abilities: [], ...over });
const input = (over: Partial<MatchInput> = {}): MatchInput => ({
  seed: 42, values: allAxes(12), opp: opp(), home: true, stack: 0, abilities: [], bench: [], pre: [], conds: [], calls: [], ...over,
});
const seeds = (n: number) => Array.from({ length: n }, (_, i) => i * 7919 + 11);
const run = (st: MatchState) => { while (nextChance(st)) { /* until a stop or the end */ } return st; };
const callSlots = (ev: MatchEvents) => (ev.calls ?? []).map((c) => c.slot);

describe('honest dice with choices (§2.2)', () => {
  it('every chance draws from its own sub-seed: a call never shifts the luck of later chances', () => {
    let compared = 0;
    for (const seed of seeds(80)) {
      const a = playMatch(input({ seed, calls: ['take', 'take', 'take'] }));
      const b = playMatch(input({ seed, calls: ['shoot', 'shoot', 'shoot'] }));
      const first = callSlots(a)[0];
      expect(callSlots(b)[0]).toBe(first);
      // until the next call, every later chance lands on the same spot whichever option was taken
      const nextCall = Math.min(callSlots(a)[1] ?? 99, callSlots(b)[1] ?? 99);
      for (let i = first + 1; i < Math.min(nextCall, a.chances.length, b.chances.length); i++) {
        expect(b.chances[i].land).toEqual(a.chances[i].land);
        expect(b.chances[i].type).toBe(a.chances[i].type);
        compared++;
      }
    }
    expect(compared).toBeGreaterThan(50);
  });
  it('the options share one draw: shown odds are exactly the odds used', () => {
    let both = 0;
    for (const seed of seeds(150)) {
      const take = playMatch(input({ seed, calls: ['take'] }));
      const shoot = playMatch(input({ seed, calls: ['shoot'] }));
      const c = take.calls![0], s = shoot.calls![0];
      expect(c.odds).toEqual(s.odds);
      expect(take.chances[c.slot].pct).toBe(c.odds.take);
      expect(shoot.chances[s.slot].pct).toBe(s.odds.shoot);
      expect(shoot.chances[s.slot].type).toBe('Long shot');
      // one draw u: if the long shot (lower odds) went in, the better option would have too
      if (c.odds.take >= c.odds.shoot && shoot.chances[s.slot].ok) { expect(take.chances[c.slot].ok).toBe(true); both++; }
    }
    expect(both).toBeGreaterThan(0);
  });
  it('replaying a finished match gives the same events', () => {
    for (const seed of seeds(20)) expect(playMatch(input({ seed, calls: ['keep', 'shoot'] }))).toEqual(playMatch(input({ seed, calls: ['keep', 'shoot'] })));
  });
});

describe('calls (§2.3)', () => {
  it('one to three a match, set by the seed, on your own chances', () => {
    const counts = [0, 0, 0, 0];
    for (const seed of seeds(300)) {
      const ev = playMatch(input({ seed }));
      const n = ev.calls!.length;
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(3);
      counts[n]++;
      for (const c of ev.calls!) { expect(ev.chances[c.slot].side).toBe('atk'); expect(c.of).toBe(n); }
    }
    expect(counts[1] && counts[2] && counts[3]).toBeTruthy();
    expect(callCount(1, 0)).toBe(callCount(1, 0));
  });
  it('tight matches get more calls, and the closest late moments weigh most', () => {
    const avg = (rating: number) => { let n = 0; for (const seed of seeds(300)) n += playMatch(input({ seed, opp: opp({ rating }) })).calls!.length; return n / 300; };
    expect(avg(48)).toBeGreaterThan(avg(95));
    let late = 0, total = 0;
    for (const seed of seeds(300)) for (const c of playMatch(input({ seed })).calls!) { total++; if (c.minute >= 55 && Math.abs(c.score[0] - c.score[1]) <= 1) late++; }
    expect(late / total).toBeGreaterThan(0.4);
  });
  it('without calls in the input there are none (cups, continental nights and other matches)', () => {
    expect(playMatch(input({ calls: undefined })).calls).toBeUndefined();
  });
  it('left to the assistant, a call takes the best odds (owner, 12 Nov)', () => {
    for (const seed of seeds(200)) {
      for (const c of playMatch(input({ seed })).calls!) {
        expect(c.by).toBe('assistant');
        const worth: Record<CallPick, number> = { take: c.odds.take, shoot: c.odds.shoot, keep: c.odds.keep ?? 0 };
        expect(worth[c.pick]).toBe(Math.max(...Object.values(worth)));
      }
    }
  });
  it('a strong axis makes its option better: take it on goes to the axis the moment favours', () => {
    const ev = playMatch(input({ values: { ...allAxes(10), Fuel: 18 }, calls: ['take'] }));
    expect(ev.calls![0].takeAxis).toBe('Fuel');
    expect(ev.chances[ev.calls![0].slot].type).toBe('Through ball');
    // against the same typical shape, a stronger Fuel night makes the option better
    const weak = playMatch(input({ values: { ...allAxes(10), Fuel: 12 }, typical: allAxes(11), calls: ['take'] }));
    const strong = playMatch(input({ values: { ...allAxes(10), Fuel: 18 }, typical: allAxes(11), calls: ['take'] }));
    expect(strong.calls![0].odds.take).toBeGreaterThan(weak.calls![0].odds.take);
  });
  it('keep the ball: no chance now, and their next attack is 15 points easier to stop', () => {
    let checked = 0;
    for (const seed of seeds(120)) {
      const keep = playMatch(input({ seed, calls: ['keep'] }));
      const take = playMatch(input({ seed, calls: ['take'] }));
      const slot = keep.calls![0].slot;
      const kept = keep.chances[slot];
      expect(kept.kept).toBe(true);
      expect(kept.ok).toBe(false);
      expect(keep.calls![0].odds.keep === undefined || keep.calls![0].odds.keep === KEEP_STOP * 100).toBe(true);
      const nextDef = keep.chances.findIndex((c, i) => i > slot && c.side === 'def');
      if (nextDef < 0 || callSlots(take).slice(1).some((s) => s < nextDef)) continue;
      expect(Math.abs(keep.chances[nextDef].pct - Math.min(99, take.chances[nextDef].pct + 15))).toBeLessThanOrEqual(1);
      expect(keep.chances[nextDef].mods.some((m) => m.kind === 'call')).toBe(true);
      checked++;
    }
    expect(checked).toBeGreaterThan(20);
  });
});

describe('pause and resume (§2.1)', () => {
  it('a watched match stops at each call and at half-time, and resumes from data to the same match', () => {
    for (const seed of seeds(40)) {
      const picks: CallPick[] = [];
      let halfSeen = false, stops = 0;
      for (;;) {
        const st = run(startMatch(input({ seed, calls: picks, watch: true, halfSeen })));
        if (!st.stop) break;
        stops++;
        if (st.stop.kind === 'half') { expect(st.chances.every((c) => c.minute <= 45)).toBe(true); halfSeen = true; continue; }
        expect(st.stop.offer.n).toBe(picks.length + 1);
        picks.push(st.stop.offer.options[seed % 3].pick);
      }
      const watched = finishMatch(run(startMatch(input({ seed, calls: picks, watch: true, halfSeen }))));
      expect(watched).toEqual(playMatch(input({ seed, calls: picks })));
      expect(watched.calls!.every((c) => c.by === 'you')).toBe(true);
      expect(stops).toBe(picks.length + 1);
    }
  });
  it('skipping lets the assistant make the calls left', () => {
    const st = run(startMatch(input({ seed: 9, watch: true, halfSeen: true })));
    expect(st.stop?.kind).toBe('call');
    const skipped = playMatch(input({ seed: 9, calls: [] }));
    expect(skipped.calls!.every((c) => c.by === 'assistant')).toBe(true);
    expect(skipped.chances.slice(0, st.chances.length)).toEqual(st.chances);
  });
});

describe('the plan per half and tempo (§2.4)', () => {
  it('a half-time change counts from the next chance only', () => {
    const a = playMatch(input({ seed: 5 }));
    const b = playMatch(input({ seed: 5, plan: { second: [{ axis: 'Pace', d: 2, why: 'Half-time: Press', kind: 'plan' }] } }));
    for (let i = 0; i < a.chances.length; i++) {
      if (a.chances[i].minute > 45) break;
      expect(b.chances[i]).toEqual(a.chances[i]);
    }
    const late = b.chances.find((c) => c.minute > 45 && c.side === 'atk' && !c.kept)!;
    expect(late.mods.some((m) => m.why === 'Half-time: Press')).toBe(true);
  });
  it('quick adds one chance for each side and patient removes one', () => {
    for (const seed of seeds(30)) {
      const n = playMatch(input({ seed, calls: undefined }));
      const q = playMatch(input({ seed, calls: undefined, plan: { tempo: 'quick' } }));
      const p = playMatch(input({ seed, calls: undefined, plan: { tempo: 'patient' } }));
      const side = (ev: MatchEvents, s: 'atk' | 'def') => ev.chances.filter((c) => c.side === s).length;
      expect(side(q, 'atk')).toBe(side(n, 'atk') + 1);
      expect(side(q, 'def')).toBe(side(n, 'def') + 1);
      expect(side(p, 'atk')).toBe(side(n, 'atk') - 1);
      expect(side(p, 'def')).toBe(side(n, 'def') - 1);
    }
  });
  it('mods for the whole match apply to every chance on the lit side', () => {
    const ev = playMatch(input({ plan: { all: [{ axis: 'Fuel', d: 1, why: 'Good read', kind: 'plan' }] } }));
    for (const c of ev.chances) if (c.side === 'atk' && !c.kept) expect(c.mods.some((m) => m.why === 'Good read')).toBe(true);
  });
});
