// Cup runs, layer 1: the match rules (spec §4, §5). Clubs here are made up; ratings are round numbers.
import { describe, expect, it } from 'vitest';
import { CARD } from '../../../src/football/cup/cards';
import { clubSpec, cupStyleOf, SIGNATURE_OF, type ClubSpec } from '../../../src/football/cup/clubs';
import {
  canPlay, endSpell, lineNow, newMatch, play, recycle, shownIntents, threatNow, TUNE, type MatchState,
} from '../../../src/football/cup/match';
import type { Card, CardKind, CupStyle, Level, Signature } from '../../../src/football/cup/types';
import { SLOTS } from '../../../src/football/cup/deck';
import { AXES } from '../../../src/football/types';

let n = 0;
const card = (kind: CardKind, level: Level = 'basic', axis: Card['axis'] = AXIS[kind]): Card => ({ id: `c${n++}`, kind, level, axis });
const AXIS: Record<CardKind, Card['axis']> = {
  'one-two': 'Pace', overlap: 'Pace', strike: 'Power', header: 'Power', thunderbolt: 'Power', 'second-wind': 'Fuel', fuelled: 'Fuel',
  hold: 'Rest', 'fresh-legs': 'Rest', drilled: 'Routine', system: 'Shape', total: null, punt: null, loan: 'Power',
};
const deck = (level: Level = 'basic'): Card[] => AXES.flatMap((a) => SLOTS[a].map((k) => card(k, level, a)));
const club = (o: Partial<ClubSpec> = {}): ClubSpec => ({ id: 'x', name: 'Test Town', short: 'TT', rating: 60, tier: 4, style: 'keep', scouted: false, colours: ['#fff', '#000'], ...o });

function start(o: { style?: CupStyle; sig?: Signature; scouted?: boolean; level?: Level; line?: number; seed?: number } = {}): MatchState {
  const s = newMatch({ seed: o.seed ?? 7, deck: deck(o.level), club: club({ style: o.style ?? 'keep', elite: o.sig, scouted: o.scouted ?? false }) });
  if (o.line) { s.line = o.line; s.line0 = o.line; }
  return s;
}
/** Puts exactly these cards in hand (the rest of the deck stays to draw from). */
function hand(s: MatchState, ...cs: Card[]): Card[] { s.hand = cs; return cs; }
const fin = (s: MatchState) => s.feed.slice(-6).map((f) => f.kind);

describe('kick-off', () => {
  it('six spells, a hand of five, three stamina, the ball in your own third', () => {
    const s = start({ style: 'deep' });
    expect(s.spell).toBe(1);
    expect(s.hand).toHaveLength(5);
    expect(s.stamina).toBe(3);
    expect(s.zone).toBe(0);
    expect(s.build).toBe(1);
    expect(s.score).toEqual([0, 0]);
    expect(s.intents).toHaveLength(6);
    expect(s.fitness).toBe(TUNE.fitness);
  });
  it('a club that keeps the ball deals you four cards, not five', () => {
    expect(start({ style: 'keep' }).hand).toHaveLength(4);
  });
  it('the same seed plays the same match; a saved match resumes exactly', () => {
    const d = deck();
    const a = newMatch({ seed: 3, deck: d, club: club() }), b = newMatch({ seed: 3, deck: d, club: club() });
    expect(a).toEqual(b);
    const saved = JSON.parse(JSON.stringify(a)) as MatchState;
    expect(endSpell(saved)).toEqual(endSpell(a));
  });
});

describe('building the move', () => {
  it('a pass moves the ball up a zone and adds build-up', () => {
    const s = start();
    const [p] = hand(s, card('one-two'));
    const t = play(s, p.id);
    expect(t.zone).toBe(1);
    expect(t.build).toBe(1 + TUNE.pass);
    expect(s.zone).toBe(0); // pure: the old state is untouched
  });
  it('two quick passes in a row land a One-two: build-up +1', () => {
    let s = start();
    const [a, b] = hand(s, card('one-two'), card('one-two'));
    s = play(play(s, a.id), b.id);
    expect(s.zone).toBe(2);
    expect(s.build).toBe(1 + 2 * TUNE.pass + TUNE.oneTwo);
    expect(s.last.some((e) => e.kind === 'combo' && e.text.startsWith('One-two'))).toBe(true);
  });
  it('a good One-two puts another One-two in your hand; great puts two', () => {
    let s = start();
    const [g] = hand(s, card('one-two', 'good'));
    s = play(s, g.id);
    expect(s.hand.filter((c) => c.kind === 'one-two' && c.temp)).toHaveLength(1);
    let t = start();
    const [gr] = hand(t, card('one-two', 'great'));
    t = play(t, gr.id);
    expect(t.hand.filter((c) => c.temp)).toHaveLength(2);
  });
  it('a carry moves the ball and draws, with no build-up', () => {
    let s = start();
    const [c] = hand(s, card('overlap'));
    s = play(s, c.id);
    expect(s.zone).toBe(1);
    expect(s.build).toBe(1);
    expect(s.hand).toHaveLength(CARD.overlapDraw.basic);
    expect(s.stamina).toBe(2);
  });
  it('a pass straight after a carry is a Switch of play: the next pass is free', () => {
    let s = start();
    const [c, p] = hand(s, card('overlap'), card('one-two'));
    s = play(play(s, c.id), p.id);
    expect(s.last.some((e) => e.text.startsWith('Switch of play'))).toBe(true);
    expect(s.freePass).toBe(true);
  });
  it('a finish needs the final third', () => {
    const s = start();
    const [f] = hand(s, card('strike'));
    expect(canPlay(s, f.id)).toBe(false);
    s.zone = 2;
    expect(canPlay(s, f.id)).toBe(true);
  });
  it('cards cost stamina; a card you cannot pay for cannot be played', () => {
    const s = start();
    s.stamina = 0;
    const [h, p] = hand(s, card('hold'), card('one-two'));
    expect(canPlay(s, h.id)).toBe(false);
    expect(canPlay(s, p.id)).toBe(true);
  });
});

describe('the chance against their line', () => {
  it('at or above the line is a goal; the line re-forms stronger and the ball goes back', () => {
    let s = start({ line: 10 });
    s.zone = 2; s.build = 2;
    const [f] = hand(s, card('strike'));
    s = play(s, f.id); // 6 × 2 = 12
    expect(s.score).toEqual([1, 0]);
    expect(s.line).toBe(Math.round(10 * (1 + TUNE.reform)));
    expect(s.zone).toBe(0);
    expect(s.build).toBe(1);
  });
  it('half the line or more is a near miss: the line drops by a share of the chance', () => {
    let s = start({ line: 20 });
    s.zone = 2; s.build = 2;
    const [f] = hand(s, card('strike'));
    s = play(s, f.id); // 14 against 20
    expect(s.score).toEqual([0, 0]);
    expect(s.line).toBe(Math.round(20 - 14 * TUNE.nearDrop));
    expect(fin(s)).toContain('near');
  });
  it('less than half breaks down and nothing changes', () => {
    let s = start({ line: 30 });
    s.zone = 2;
    const [f] = hand(s, card('strike'));
    s = play(s, f.id);
    expect(s.line).toBe(30);
    expect(fin(s)).toContain('break');
  });
  it('a Pace pass then a Power finish is an Overlap: shot +3', () => {
    let s = start({ line: 100 });
    s.zone = 1;
    const [p, f] = hand(s, card('one-two'), card('strike'));
    s = play(play(s, p.id), f.id);
    expect(s.last.find((e) => e.kind === 'combo')?.text).toMatch(/^Overlap/);
    expect(s.feed.find((e) => e.chance != null)?.chance).toBe(Math.round((CARD.strike.basic + TUNE.overlap) * (1 + TUNE.pass)));
  });
  it('a Through ball: a finish from midfield once build-up is ×2.5', () => {
    const s = start();
    s.zone = 1; s.build = 2;
    const [f] = hand(s, card('strike'));
    expect(canPlay(s, f.id)).toBe(false);
    s.build = 2.5;
    expect(canPlay(s, f.id)).toBe(true);
    const t = play(s, f.id);
    expect(t.last.some((e) => e.text.startsWith('Through ball'))).toBe(true);
  });
  it('a header adds for every pass in the move', () => {
    let s = start({ line: 999 });
    const [a, b, h] = hand(s, card('one-two'), card('one-two'), card('header'));
    s = play(play(play(s, a.id), b.id), h.id);
    const build = 1 + 2 * TUNE.pass + TUNE.oneTwo;
    expect(s.feed.find((e) => e.chance != null)?.chance).toBe(Math.round((CARD.header.basic + CARD.headerPerPass.basic * 2 + TUNE.overlap) * build));
  });
  it('a Thunderbolt can be hit from midfield; a hopeful punt from anywhere, and it ends the move', () => {
    const s = start();
    s.zone = 1; s.stamina = 3;
    const [t] = hand(s, { ...card('thunderbolt', 'great'), name: 'X' });
    expect(canPlay(s, t.id)).toBe(true);
    const u = start({ line: 999 });
    const [p] = hand(u, card('punt'));
    expect(canPlay(u, p.id)).toBe(true);
    const v = play(u, p.id);
    expect(v.zone).toBe(0);
  });
  it('cards from three axes in one move are a Third-man run: draw two', () => {
    let s = start({ line: 999 });
    const [h, p, w] = hand(s, card('hold'), card('one-two'), card('second-wind'));
    s = play(play(play(s, h.id), p.id), w.id);
    expect(s.last.some((e) => e.text.startsWith('Third-man run'))).toBe(true);
    expect(s.hand).toHaveLength(2);
  });
});

describe('recycling', () => {
  it('a recycle drops a card, draws one, costs a stamina and keeps the ball', () => {
    let s = start();
    const [a] = hand(s, card('hold'), card('hold'));
    s.zone = 1;
    s = recycle(s, a.id);
    expect(s.hand).toHaveLength(2);
    expect(s.hand.some((c) => c.id === a.id)).toBe(false);
    expect(s.stamina).toBe(2);
    expect(s.zone).toBe(1);
  });
  it('Drilled makes the next recycles free', () => {
    let s = start();
    const [d, x, y] = hand(s, card('drilled'), card('hold'), card('hold'));
    s = play(s, d.id);
    s = recycle(recycle(s, x.id), y.id);
    expect(s.stamina).toBe(2);
  });
  it('three recycles in a spell are a Patient build-up: build-up +1 and 4 cover', () => {
    let s = start();
    s.stamina = 5;
    const [a, b, c] = hand(s, card('hold'), card('hold'), card('hold'));
    s = recycle(recycle(recycle(s, a.id), b.id), c.id);
    expect(s.last.some((e) => e.text.startsWith('Patient build-up'))).toBe(true);
    expect(s.build).toBe(1 + TUNE.patientBuild);
    expect(s.cover).toBe(TUNE.patientCover);
  });
  it('The system stays in play and pays cover for each recycle', () => {
    let s = start();
    const [sys, x] = hand(s, card('system', 'good'), card('hold'));
    s = play(s, sys.id);
    expect(s.inPlay).toHaveLength(1);
    s.stamina = 1;
    s = recycle(s, x.id);
    expect(s.cover).toBe(2);
    s = endSpell(s);
    expect(s.inPlay).toHaveLength(1);
  });
  it('a pressing club adds 1 to this spell\'s threat for each recycle', () => {
    let s = start({ style: 'press' });
    const before = threatNow(s);
    const [x] = hand(s, card('hold'));
    s = recycle(s, x.id);
    expect(threatNow(s)).toBe(before + 1);
  });
});

describe('their attack', () => {
  const at = (threat: number, cover: number, o: Parameters<typeof start>[0] = {}) => {
    const s = start(o);
    s.intents[0].threat = threat; s.cover = cover; s.hand = [];
    return endSpell(s);
  };
  it('cover at or above the threat deals with it', () => {
    const s = at(8, 8);
    expect(s.score).toEqual([0, 0]);
    expect(s.fitness).toBe(TUNE.fitness);
  });
  it('short by 1 to 7 costs that much fitness', () => {
    expect(at(10, 3).fitness).toBe(TUNE.fitness - 7);
  });
  it('short by 8 or more is a goal, and 8 fitness', () => {
    const s = at(12, 4);
    expect(s.score).toEqual([0, 1]);
    expect(s.fitness).toBe(TUNE.fitness - TUNE.goalFit);
  });
  it('at zero fitness, cover counts for half', () => {
    const s = start();
    s.fitness = 0; s.intents[0].threat = 10; s.hand = [];
    const [h] = hand(s, card('hold', 'great'));
    const t = endSpell(play(s, h.id));
    expect(t.score).toEqual([0, 0]); // cover 10 halves to 5: short by 5
    expect(t.feed.some((e) => e.kind === 'fitness')).toBe(true);
  });
  it('Fresh legs recovers fitness, never above the start', () => {
    let s = start();
    s.fitness = 50;
    const [f] = hand(s, card('fresh-legs', 'great'));
    s = play(s, f.id);
    expect(s.fitness).toBe(54);
    expect(s.cover).toBe(6);
  });
  it('a direct club has no threat in odd spells and a large one in even spells', () => {
    const s = start({ style: 'direct' });
    expect(s.intents.filter((x) => x.spell % 2 === 1).every((x) => x.threat === 0)).toBe(true);
    expect(s.intents.filter((x) => x.spell % 2 === 0).every((x) => x.threat > 0)).toBe(true);
  });
  it('a set-piece side: a near miss of theirs adds 2 to their next threat', () => {
    const s = start({ style: 'setpiece' });
    s.intents[0].threat = 5; s.hand = [];
    const next = s.intents[1].threat;
    const t = endSpell(s);
    expect(threatNow(t)).toBe(next + 2);
  });
  it('a side that sits deep: after your move breaks down, its threat rises by your build-up', () => {
    let s = start({ style: 'deep', line: 100 });
    s.zone = 2; s.build = 2;
    const before = threatNow(s);
    const [f] = hand(s, card('strike'));
    s = play(s, f.id);
    expect(threatNow(s)).toBe(before + 2);
  });
  it('a wide side\'s line is 25% lower against a move with a carry', () => {
    let s = start({ style: 'wide', line: 40 });
    const [c] = hand(s, card('overlap'));
    expect(lineNow(s)).toBe(40);
    s = play(s, c.id);
    expect(lineNow(s)).toBe(30);
  });
});

describe('spells and full time', () => {
  it('Fuelled adds stamina next spell', () => {
    let s = start();
    const [f] = hand(s, card('fuelled', 'good'));
    s = endSpell(play(s, f.id));
    expect(s.stamina).toBe(3 + 2);
  });
  it('unplayed cards are discarded and cover does not carry over', () => {
    let s = start();
    s.cover = 5;
    s = endSpell(s);
    expect(s.spell).toBe(2);
    expect(s.cover).toBe(0);
    expect(s.zone).toBe(0);
  });
  it('after six spells a decided score is full time; a level one goes to penalties', () => {
    let s = start();
    for (let i = 0; i < 6; i++) { s.intents[s.spell - 1].threat = 0; s = endSpell(s); }
    expect(s.phase).toBe('pens');
    let t = start();
    t.score = [2, 1];
    for (let i = 0; i < 6; i++) { t.intents[t.spell - 1].threat = 0; t = endSpell(t); }
    expect(t.phase).toBe('done');
  });
  it('a temporary One-two is gone once the spell ends', () => {
    let s = start();
    const [g] = hand(s, card('one-two', 'good'));
    s = endSpell(play(s, g.id));
    expect([...s.hand, ...s.draw, ...s.discard].some((c) => c.temp)).toBe(false);
  });
  it('Total football plays as any basic card in your deck', () => {
    let s = start();
    const [w] = hand(s, card('total'));
    expect(canPlay(s, w.id, 'hold')).toBe(true);
    expect(canPlay(s, w.id, 'thunderbolt')).toBe(false); // not in this deck
    s = play(s, w.id, 'hold');
    expect(s.cover).toBe(CARD.hold.basic);
  });
});

describe('what you can see', () => {
  it('a scouted club shows its intentions two spells ahead', () => {
    expect(shownIntents(start({ scouted: true }))).toHaveLength(3);
    expect(shownIntents(start({ scouted: false }))).toHaveLength(1);
  });
});

describe('clubs', () => {
  it('maps the league styles onto the six cup styles', () => {
    expect(cupStyleOf('low-block', 'a')).toBe('deep');
    expect(cupStyleOf('counter', 'a')).toBe('deep');
    expect(cupStyleOf('press', 'a')).toBe('press');
    expect(cupStyleOf('possession', 'a')).toBe('keep');
    expect(cupStyleOf('direct', 'a')).toBe('direct');
    expect(cupStyleOf('flair', 'a')).toBe('wide');
    expect(cupStyleOf('grit', 'a')).toBe('setpiece');
    expect(['deep', 'press', 'keep', 'direct', 'wide', 'setpiece']).toContain(cupStyleOf('chaos', 'a'));
  });
  it('the eight giants have their signature moves, and no one else does', () => {
    expect(Object.keys(SIGNATURE_OF).sort()).toEqual(['atm', 'bar', 'bay', 'juv', 'lee', 'liv', 'mci', 'rma']);
    const spec = clubSpec({ id: 'bar', name: 'B', short: 'B', rating: 92, tier: 1, style: 'possession', colours: ['#a', '#b'] }, false);
    expect(spec.elite).toBe('rondo');
    expect(clubSpec({ id: 'zzz', name: 'Z', short: 'Z', rating: 92, tier: 1, style: 'press', colours: ['#a', '#b'] }, false).elite).toBeUndefined();
  });
  it('a stronger club has a higher line and a bigger threat', () => {
    const lo = newMatch({ seed: 1, deck: deck(), club: club({ rating: 35, style: 'press' }) });
    const hi = newMatch({ seed: 1, deck: deck(), club: club({ rating: 90, style: 'press' }) });
    expect(hi.line).toBeGreaterThan(lo.line);
    expect(hi.intents.reduce((a, x) => a + x.threat, 0)).toBeGreaterThan(lo.intents.reduce((a, x) => a + x.threat, 0));
  });
});

describe('the giants', () => {
  it('Atlético, the bus: line 50% higher in spells five and six', () => {
    const s = start({ sig: 'bus', line: 20 });
    expect(lineNow(s)).toBe(20);
    s.spell = 5;
    expect(lineNow(s)).toBe(30);
  });
  it('Barcelona, the rondo: each spell they take the best pass from your hand', () => {
    const s = newMatch({ seed: 1, deck: Array.from({ length: 12 }, () => card('one-two', 'great')), club: club({ style: 'press', elite: 'rondo' }) });
    expect(s.hand).toHaveLength(4);
    expect(s.feed.some((e) => e.kind === 'signature')).toBe(true);
  });
  it('Liverpool, heavy metal: a threat every spell, growing by 2', () => {
    const s = start({ sig: 'metal', style: 'direct' });
    for (let i = 1; i < 6; i++) expect(s.intents[i].threat - s.intents[i - 1].threat).toBe(2);
  });
  it('Bayern, the machine: the line re-forms more strongly than anyone', () => {
    let s = start({ sig: 'machine', line: 10 });
    s.zone = 2; s.build = 2;
    const [f] = hand(s, card('strike'));
    s = play(s, f.id);
    expect(s.line).toBe(Math.round(10 * (1 + TUNE.machine)));
    expect(TUNE.machine).toBeGreaterThan(TUNE.reform);
  });
  it('Leeds, murderball: fitness loss doubled', () => {
    const s = start({ sig: 'murderball' });
    s.intents[0].threat = 5; s.hand = [];
    expect(endSpell(s).fitness).toBe(TUNE.fitness - 10);
  });
  it('Real Madrid, the comeback: behind in spell six, they attack twice', () => {
    const s = start({ sig: 'comeback' });
    s.spell = 6; s.score = [2, 0]; s.intents[5].threat = 12; s.hand = [];
    expect(endSpell(s).score).toEqual([2, 2]);
  });
  it('Manchester City, control: build-up starts each spell at ×0.5', () => {
    expect(start({ sig: 'control' }).build).toBe(0.5);
  });
  it('Juventus, the old lady: the first goal stands only if it beat the line by 3', () => {
    let s = start({ sig: 'oldlady', line: 13 });
    s.zone = 2; s.build = 2;
    const [f, g] = hand(s, card('strike'), card('strike'));
    s = play(s, f.id); // 14 v 13: checked, ruled out
    expect(s.score).toEqual([0, 0]);
    expect(s.feed.some((e) => e.kind === 'disallowed')).toBe(true);
    s.zone = 2; s.build = 2; s.stamina = 1;
    s = play(s, g.id); // the check is done: the next one stands
    expect(s.score).toEqual([1, 0]);
  });
});
