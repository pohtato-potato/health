// Cup runs, layer 3: pool cards, the new combinations, heirlooms and the cup's twists in a match. Made-up clubs.
import { describe, expect, it } from 'vitest';
import { fxShort, longText, roleOf, shortText, titleOf } from '../../../src/football/cup/cards';
import type { ClubSpec } from '../../../src/football/cup/clubs';
import { HEIRLOOMS, type HeirloomId } from '../../../src/football/cup/heirlooms';
import { canPlay, endSpell, newMatch, play, recycle, shownIntents, threatNow, TUNE, type MatchMods, type MatchState } from '../../../src/football/cup/match';
import { POOL } from '../../../src/football/cup/pool';
import type { AnyKind, Card, Level } from '../../../src/football/cup/types';
import { AXES } from '../../../src/football/types';

let n = 0;
const card = (kind: AnyKind, level: Level = 'basic'): Card => ({ id: `p${n++}`, kind, level, axis: POOL.find((d) => d.id === kind)?.axis ?? (kind === 'one-two' || kind === 'overlap' ? 'Pace' : kind === 'strike' || kind === 'header' ? 'Power' : kind === 'hold' ? 'Rest' : null) });
const filler = (): Card[] => Array.from({ length: 12 }, () => card('hold'));
const club = (o: Partial<ClubSpec> = {}): ClubSpec => ({ id: 'x', name: 'Test Town', short: 'TT', rating: 60, tier: 4, style: 'keep', scouted: false, colours: ['#fff', '#000'], ...o });
function start(o: { heir?: HeirloomId[]; mods?: MatchMods; style?: ClubSpec['style']; line?: number } = {}): MatchState {
  const s = newMatch({ seed: 11, deck: filler(), club: club({ style: o.style ?? 'keep' }), mods: { heir: o.heir ?? [], ...o.mods } });
  if (o.line) { s.line = o.line; s.line0 = o.line; }
  return s;
}
function hand(s: MatchState, ...cs: Card[]): Card[] { s.hand = cs; return cs; }
const combos = (s: MatchState) => s.feed.filter((f) => f.kind === 'combo').map((f) => f.text.split(':')[0]);

describe('the pool', () => {
  it('holds about sixty cards beyond the starting set, across all six axes, with unique ids', () => {
    expect(POOL.length).toBeGreaterThanOrEqual(58);
    expect(new Set(POOL.map((d) => d.id)).size).toBe(POOL.length);
    for (const a of AXES) expect(POOL.filter((d) => d.axis === a).length).toBeGreaterThanOrEqual(8);
    for (const r of ['pass', 'carry', 'finish', 'cover', 'system', 'stamina', 'recycle'] as const) expect(POOL.some((d) => d.role === r)).toBe(true);
  });
  it('every card has short words that fit a card face and full words for press and hold, at every level', () => {
    for (const d of POOL) for (const lv of ['basic', 'good', 'great'] as Level[]) {
      const s = shortText(d.id, lv);
      expect(s.length).toBeGreaterThan(2);
      expect(s.length).toBeLessThanOrEqual(46);
      expect(longText({ id: 'x', kind: d.id, level: lv, axis: d.axis }).length).toBeGreaterThan(20);
    }
    expect(titleOf('give-and-go')).toBe('Give and go');
    expect(roleOf('power-drive')).toBe('finish');
    expect(fxShort('finish', { shot: 5, fromMid: true })).toBe('Shot 5, from midfield');
  });
  it('a pass card moves the ball and builds; a quick one counts towards a One-two', () => {
    let s = start();
    const [a, b] = hand(s, card('first-time'), card('give-and-go'));
    s = play(play(s, a.id), b.id);
    expect(s.zone).toBe(2);
    expect(combos(s)).toContain('One-two');
  });
  it('a long carry moves two zones; a keep-it pass leaves the ball where it is', () => {
    let s = start();
    const [c] = hand(s, card('in-behind'));
    s = play(s, c.id);
    expect(s.zone).toBe(2);
    let t = start();
    const [k] = hand(t, card('tiki-taka'));
    t = play(t, k.id);
    expect(t.zone).toBe(0);
    expect(t.build).toBe(1.5);
  });
  it('a curler may be hit from midfield; a long-range effort from anywhere', () => {
    const s = start();
    const [p, c, l] = hand(s, card('one-two'), card('curler'), card('long-range'));
    expect(canPlay(s, c.id)).toBe(false);
    expect(canPlay(s, l.id)).toBe(true);
    const t = play(s, p.id);
    expect(canPlay(t, c.id)).toBe(true);
  });
  it('a rebound finish that misses keeps the ball in the final third and the build-up', () => {
    let s = start({ line: 100 });
    const [a, b, f] = hand(s, card('one-two'), card('one-two'), card('follow-up'));
    s = play(play(s, a.id), b.id);
    const build = s.build;
    s = play(s, f.id);
    expect(s.zone).toBe(2);
    expect(s.build).toBe(build);
  });
  it('cover that is kept counts next spell too; their attack can be made smaller', () => {
    let s = start();
    const [k, t] = hand(s, card('compact'), card('track-back'));
    const threat = threatNow(s);
    s = play(play(s, k.id), t.id);
    expect(threatNow(s)).toBe(Math.max(0, threat - 4));
    s = endSpell(s);
    expect(s.cover).toBe(5);
  });
  it('a pool system stays in play and pays each spell', () => {
    let s = start();
    const [b] = hand(s, card('back-four'));
    s = play(s, b.id);
    expect(s.inPlay.map((c) => c.kind)).toEqual(['back-four']);
    s = endSpell(s);
    expect(s.cover).toBe(3);
  });
});

describe('the new combinations', () => {
  it('Driving run: two carries in one move, build-up +1', () => {
    let s = start();
    s.stamina = 5;
    const [a, b] = hand(s, card('overlap'), card('dribble'));
    s = play(play(s, a.id), b.id);
    expect(combos(s)).toContain('Driving run');
    expect(s.build).toBe(1 + TUNE.drivingRun);
  });
  it('Tiki-taka: four passes in one move, build-up +1', () => {
    let s = start();
    const cs = hand(s, card('tiki-taka'), card('tiki-taka'), card('tiki-taka'), card('tiki-taka'));
    for (const c of cs) s = play(s, c.id);
    expect(combos(s)).toContain('Tiki-taka');
  });
  it('Cross and head: a pass from the final third, then a header, shot +3', () => {
    let s = start({ line: 200 });
    const [a, b, c, h] = hand(s, card('one-two'), card('one-two'), card('switch-flank'), card('header'));
    s.stamina = 5;
    s = play(play(play(s, a.id), b.id), c.id);
    s = play(s, h.id);
    expect(combos(s)).toContain('Cross and head');
  });
  it('Double bank: two cover cards in one spell, cover +2', () => {
    let s = start();
    s.stamina = 5;
    const [a, b] = hand(s, card('hold'), card('hold'));
    s = play(play(s, a.id), b.id);
    expect(s.cover).toBe(7 + 7 + TUNE.doubleBank);
  });
});

describe('heirlooms in a match', () => {
  it('there are twenty-five, each with one rule', () => {
    expect(HEIRLOOMS).toHaveLength(25);
    expect(new Set(HEIRLOOMS.map((h) => h.id)).size).toBe(25);
    for (const h of HEIRLOOMS) expect(h.rule.split('. ').length).toBeLessThanOrEqual(2);
  });
  it('the old match ball: the first pass each spell adds double', () => {
    let s = start({ heir: ['match-ball'] });
    const [a, b] = hand(s, card('first-time'), card('switch-flank'));
    s.stamina = 4;
    s = play(s, a.id);
    expect(s.build).toBe(1 + 2 * TUNE.pass);
    s = play(s, b.id);
    expect(s.build).toBe(1 + 2 * TUNE.pass + 1);
  });
  it('the rake: a near miss lowers their defence by half the chance', () => {
    let s = start({ heir: ['rake'], line: 20 });
    const [a, b, f] = hand(s, card('one-two'), card('one-two'), card('strike'));
    s = play(play(play(s, a.id), b.id), f.id);
    expect(s.feed.some((x) => x.kind === 'near' || x.kind === 'goal')).toBe(true);
    const near = s.feed.find((x) => x.kind === 'near');
    if (near) expect(s.line).toBe(Math.max(16, Math.round(20 - near.chance! * TUNE.rake)));
  });
  it('the lucky scarf: once a match, a goal they would score costs fitness instead', () => {
    let s = start({ heir: ['scarf'] });
    s.intents[0].threat = 30; s.intents[1].threat = 30;
    s = endSpell(s);
    expect(s.score[1]).toBe(0);
    expect(s.fitness).toBe(TUNE.fitness - TUNE.goalFit);
    s = endSpell(s);
    expect(s.score[1]).toBe(1);
  });
  it('the napkin: a single One-two lands the combination', () => {
    let s = start({ heir: ['napkin'] });
    const [a] = hand(s, card('one-two'));
    s = play(s, a.id);
    expect(combos(s)).toContain('One-two');
  });
  it('the turnstile, armband and boot bag help the first spell only', () => {
    const s = start({ heir: ['turnstile', 'armband', 'boot-bag'] });
    expect(s.cover).toBe(TUNE.turnstile);
    expect(s.stamina).toBe(TUNE.stamina + 1);
    expect(s.hand).toHaveLength(TUNE.keepHand + 1);
    const t = endSpell(s);
    expect(t.cover).toBe(0);
    expect(t.stamina).toBe(TUNE.stamina);
  });
  it('the needle: the first recycle each spell is free', () => {
    let s = start({ heir: ['needle'] });
    const st = s.stamina;
    s = recycle(s, s.hand[0].id);
    expect(s.stamina).toBe(st);
    s = recycle(s, s.hand[0].id);
    expect(s.stamina).toBe(st - 1);
  });
  it('the chalkboard shows attacks ahead for a club you have not scouted', () => {
    expect(shownIntents(start())).toHaveLength(1);
    expect(shownIntents(start({ heir: ['chalkboard'] }))).toHaveLength(3);
  });
  it('the stopwatch takes 2 off each fitness loss', () => {
    let s = start({ heir: ['stopwatch'] });
    s.intents[0].threat = 5;
    s = endSpell(s);
    expect(s.fitness).toBe(TUNE.fitness - 3);
  });
  it('the heavy pitch starts their defence 10% lower; elite clubs can start higher', () => {
    const plain = start().line;
    expect(start({ heir: ['heavy-pitch'] }).line).toBe(Math.round(plain * TUNE.heavyPitch));
    expect(start({ mods: { lineMul: 1.15 } }).line).toBe(Math.round(plain * 1.15));
  });
  it('the programme: the first finish each match gets +4', () => {
    let s = start({ heir: ['programme'], line: 200 });
    const [a, b, f] = hand(s, card('one-two'), card('one-two'), card('strike'));
    s = play(play(play(s, a.id), b.id), f.id);
    const shot = s.feed.find((x) => x.shot != null)!.shot!;
    expect(shot).toBe(7 + TUNE.overlap + TUNE.programme);
  });
  it('spare boots: once a match, a finish that breaks down comes back', () => {
    let s = start({ heir: ['spare-boots'], line: 200 });
    const [a, b, f] = hand(s, card('one-two'), card('one-two'), card('strike'));
    s = play(play(play(s, a.id), b.id), f.id);
    expect(s.hand.some((c) => c.id === f.id)).toBe(true);
  });
  it('the linesman\'s flag: a through ball at ×2', () => {
    let s = start({ heir: ['linesman-flag'] });
    const [a, f] = hand(s, card('switch-flank'), card('strike'));
    s = play(s, a.id);
    expect(s.build).toBe(2);
    expect(canPlay(s, f.id)).toBe(true);
  });
});

describe('the cup and the run in a match', () => {
  it('every attack grows by the cup\'s twist; an event can add shot or cover or show their attacks', () => {
    const a = start(), b = start({ mods: { threatPlus: 1 } });
    a.intents.forEach((x, i) => expect(b.intents[i].threat).toBe(x.threat ? x.threat + 1 : 0));
    expect(start({ mods: { firstCover: 6 } }).cover).toBe(6);
    expect(shownIntents(start({ mods: { see: true } }))).toHaveLength(3);
  });
  it('every finish carries the move\'s steps for the goal tally', () => {
    let s = start({ line: 5 });
    const [a, b, f] = hand(s, card('one-two'), card('one-two'), card('strike'));
    s = play(play(play(s, a.id), b.id), f.id);
    const g = s.feed.find((x) => x.kind === 'goal')!;
    expect(g.steps!.map((x) => x.label)).toEqual(['One-two', 'One-two', 'One-two', 'Overlap', 'Strike']);
    expect(g.shot).toBe(7 + TUNE.overlap);
    expect(g.build).toBe(1 + 2 * TUNE.pass + TUNE.oneTwo);
  });
});
