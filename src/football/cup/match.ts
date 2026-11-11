// How a cup match plays (spec §4, "build the move"). Pure: every action takes a state and returns a new one, and the
// random source lives in the state (`rs`), so a match saved after any card resumes exactly where it was.
import type { Axis } from '../types';
import { actsAs, CARD, ROLE, TITLE, type Role } from './cards';
import { ATTACK_KIND, baseLine, baseThreat, CLUB_TUNE, SIGNATURE, type ClubSpec } from './clubs';
import { newPens, type Pens } from './pens';
import type { Card, CardKind, Level } from './types';

/** Every number the match uses that the spec marks (tune). Set by tests/football/cup/cup-sim.test.ts. */
export const TUNE = {
  /** Build-up each pass adds, and what a One-two combination adds on top. */
  pass: 0.5, oneTwo: 1,
  /** A goal: the line re-forms this much stronger (Bayern: machine). Spec start 20% and 40%; the simulation needed 60% and 80%. */
  reform: 0.6, machine: 0.8,
  /** A near miss lowers the line by this share of the chance (spec start: a quarter), never below this share of where it started. */
  nearDrop: 0.1, lineFloor: 0.8,
  overlap: 3, through: 2.5, thirdDraw: 2, patientBuild: 1, patientCover: 4,
  /** Fitness at the start of a run; short by up to shortMax costs fitness, more is a goal and goalFit fitness. */
  fitness: 60, shortMax: 7, goalFit: 8,
  hand: 5, keepHand: 4, stamina: 3, recycleCost: 1, spells: 6,
  controlBuild: 0.5, bus: 0.5, wide: 0.25, setpiece: 2, metal: 2, oldlady: 3,
};

export type FeedKind = 'spell' | 'combo' | 'goal' | 'near' | 'break' | 'disallowed' | 'dealt' | 'fitness' | 'conceded' | 'signature' | 'pens' | 'full';
export interface Feed { kind: FeedKind; text: string; spell: number; chance?: number; line?: number }
export interface Intent { spell: number; threat: number; kind: string }
interface Move {
  passes: number; axes: (Axis | null)[]; lastKind: CardKind | null; lastRole: Role | null; lastAxis: Axis | null;
  /** One-twos in a row since the last combination. */
  streak: number; carry: boolean; shotBonus: number; third: boolean;
}
export interface MatchState {
  v: 1;
  /** The random source's state. */
  rs: number;
  club: ClubSpec;
  spell: number;
  phase: 'play' | 'pens' | 'done';
  /** [you, them]. */
  score: [number, number];
  draw: Card[]; hand: Card[]; discard: Card[]; inPlay: Card[];
  stamina: number; nextStamina: number; nextDraw: number;
  /** 0 own third, 1 midfield, 2 final third. */
  zone: 0 | 1 | 2;
  build: number;
  move: Move;
  freePass: boolean; freeRecycles: number; recycles: number; patient: boolean;
  cover: number;
  /** Belongs to the run; a one-off match starts at TUNE.fitness. */
  fitness: number;
  line: number; line0: number;
  intents: Intent[];
  /** Added to this spell's threat (pressing, a broken-down move against a deep side). */
  threatAdd: number;
  /** Added to next spell's threat (a set-piece side's near miss). */
  carryThreat: number;
  /** Juventus: the first goal has been checked. */
  checked: boolean;
  tempN: number;
  /** Basic kinds in the deck, which Total football may play as. */
  basics: CardKind[];
  feed: Feed[];
  /** What the latest action did, for the screen's motion and haptics. */
  last: Feed[];
  pens?: Pens;
}

// --- the random source -------------------------------------------------------------------------------------------
/** mulberry32, one step, with its state kept in the match. */
export function next(s: { rs: number }): number {
  s.rs = (s.rs + 0x6d2b79f5) >>> 0;
  let t = s.rs;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function shuffle<T>(s: { rs: number }, xs: T[]): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(next(s) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const clone = (s: MatchState): MatchState => JSON.parse(JSON.stringify(s)) as MatchState;

// --- setting up ---------------------------------------------------------------------------------------------------
const AXIS_OF: Partial<Record<CardKind, Axis>> = {
  'one-two': 'Pace', overlap: 'Pace', strike: 'Power', header: 'Power', thunderbolt: 'Power', 'second-wind': 'Fuel', fuelled: 'Fuel',
  hold: 'Rest', 'fresh-legs': 'Rest', drilled: 'Routine', system: 'Shape',
};
const NOT_WILD: CardKind[] = ['total', 'loan', 'punt', 'thunderbolt'];
const newMove = (): Move => ({ passes: 0, axes: [], lastKind: null, lastRole: null, lastAxis: null, streak: 0, carry: false, shotBonus: 0, third: false });
const startBuild = (s: MatchState) => (s.club.elite === 'control' ? TUNE.controlBuild : 1);

export function intentsFor(club: ClubSpec, s: { rs: number }): Intent[] {
  const base = baseThreat(club.rating, club.style);
  const [lo, hi] = CLUB_TUNE.spread;
  const kinds = ATTACK_KIND[club.style];
  return Array.from({ length: TUNE.spells }, (_, i): Intent => {
    const spell = i + 1;
    const roll = lo + (hi - lo) * next(s);
    const kind = kinds[Math.floor(next(s) * kinds.length)];
    let threat: number;
    if (club.elite === 'metal') threat = Math.round(base) + TUNE.metal * i;
    else if (club.style === 'direct') threat = spell % 2 ? 0 : Math.round(base * CLUB_TUNE.directBig * roll);
    else threat = Math.round(base * roll);
    return { spell, threat, kind: threat ? kind : 'No attack' };
  });
}

export function newMatch(o: { seed: number; deck: Card[]; club: ClubSpec; fitness?: number }): MatchState {
  const line = baseLine(o.club.rating, o.club.style);
  const s: MatchState = {
    v: 1, rs: o.seed >>> 0, club: o.club, spell: 1, phase: 'play', score: [0, 0],
    draw: [], hand: [], discard: [], inPlay: [], stamina: TUNE.stamina, nextStamina: 0, nextDraw: 0,
    zone: 0, build: 1, move: newMove(), freePass: false, freeRecycles: 0, recycles: 0, patient: false, cover: 0,
    fitness: o.fitness ?? TUNE.fitness, line, line0: line, intents: [], threatAdd: 0, carryThreat: 0, checked: false, tempN: 0,
    basics: [...new Set(o.deck.map((c) => c.kind).filter((k) => !NOT_WILD.includes(k)))],
    feed: [], last: [],
  };
  s.intents = intentsFor(o.club, s);
  s.draw = shuffle(s, o.deck.map((c) => ({ ...c })));
  if (o.club.elite) say(s, 'signature', `${o.club.name}: ${SIGNATURE[o.club.elite].name}. ${SIGNATURE[o.club.elite].text}`);
  startSpell(s);
  return s;
}

function say(s: MatchState, kind: FeedKind, text: string, more: Partial<Feed> = {}) {
  const f: Feed = { kind, text, spell: s.spell, ...more };
  s.feed.push(f);
  s.last.push(f);
}
function drawN(s: MatchState, n: number) {
  for (let k = 0; k < n; k++) {
    if (!s.draw.length) {
      if (!s.discard.length) return;
      s.draw = shuffle(s, s.discard);
      s.discard = [];
    }
    s.hand.push(s.draw.shift()!);
  }
}
const toDiscard = (s: MatchState, c: Card) => { if (!c.temp) s.discard.push(c); };
const RANK: Record<Level, number> = { basic: 0, good: 1, great: 2 };

function startSpell(s: MatchState) {
  s.stamina = TUNE.stamina + s.nextStamina;
  const extra = s.nextDraw;
  s.nextStamina = 0; s.nextDraw = 0;
  s.zone = 0; s.build = startBuild(s); s.move = newMove();
  s.recycles = 0; s.patient = false; s.freeRecycles = 0; s.freePass = false; s.cover = 0;
  s.threatAdd = s.carryThreat; s.carryThreat = 0;
  say(s, 'spell', `Spell ${s.spell} of ${TUNE.spells}`);
  drawN(s, (s.club.style === 'keep' ? TUNE.keepHand : TUNE.hand) + extra);
  if (s.club.elite === 'rondo') {
    const passes = s.hand.filter((c) => ROLE[actsAs(c).kind] === 'pass').sort((a, b) => RANK[b.level] - RANK[a.level]);
    if (passes[0]) {
      s.hand = s.hand.filter((c) => c.id !== passes[0].id);
      toDiscard(s, passes[0]);
      say(s, 'signature', `The rondo: they took your ${TITLE[passes[0].kind]}.`);
    }
  }
}

// --- what you can see --------------------------------------------------------------------------------------------
export const threatNow = (s: MatchState) => (s.intents[s.spell - 1]?.threat ?? 0) + s.threatAdd;
export function lineNow(s: MatchState): number {
  let k = 1;
  if (s.club.elite === 'bus' && s.spell >= 5) k *= 1 + TUNE.bus;
  if (s.club.style === 'wide' && s.move.carry) k *= 1 - TUNE.wide;
  return Math.round(s.line * k);
}
/** This spell's intention, and two more when the club is scouted (spec §5.3). */
export function shownIntents(s: MatchState): Intent[] {
  const now = s.intents.slice(s.spell - 1, s.spell + (s.club.scouted ? 2 : 0));
  return now.map((x, i) => (i === 0 ? { ...x, threat: threatNow(s) } : x));
}
/** Cover as it will count: halved when the squad is spent. */
export const coverNow = (s: MatchState) => (s.fitness <= 0 ? Math.floor(s.cover / 2) : s.cover);

/** The kinds a wild card may play as. */
export const wildOptions = (s: MatchState) => s.basics;

export function costOf(s: MatchState, c: Card, as?: CardKind): number {
  const k = actsAs(c, as).kind;
  if (ROLE[k] === 'pass' && s.freePass) return 0;
  return c.kind === 'total' ? CARD.cost.total : CARD.cost[k];
}

/** Why a card cannot be played now, or null when it can. */
export function blocked(s: MatchState, id: string, as?: CardKind): string | null {
  if (s.phase !== 'play') return 'The spells are over.';
  const c = s.hand.find((x) => x.id === id);
  if (!c) return 'Not in your hand.';
  if (c.kind === 'total') {
    if (!as) return s.basics.length ? null : 'Nothing to copy.';
    if (!s.basics.includes(as)) return 'Not a basic card in your deck.';
  }
  if (costOf(s, c, as) > s.stamina) return 'Not enough stamina.';
  const k = actsAs(c, as).kind;
  if (ROLE[k] === 'finish') {
    if (k === 'punt') return null;
    if (s.zone === 2) return null;
    if (s.zone === 1 && (k === 'thunderbolt' || s.build >= TUNE.through)) return null;
    return s.zone === 1 ? `Finish from here needs build-up ×${TUNE.through}.` : 'Get the ball to the final third first.';
  }
  return null;
}
export const canPlay = (s: MatchState, id: string, as?: CardKind) => blocked(s, id, as) === null;

// --- playing a card ----------------------------------------------------------------------------------------------
function makeTemp(s: MatchState, n: number) {
  for (let k = 0; k < n; k++) s.hand.push({ id: `t${s.tempN++}`, kind: 'one-two', level: 'basic', axis: 'Pace', temp: true });
}
function combo(s: MatchState, name: string, what: string) { say(s, 'combo', `${name}: ${what}`); }

function track(s: MatchState, kind: CardKind, axis: Axis | null) {
  const m = s.move;
  m.axes.push(axis);
  if (!m.third && new Set(m.axes.filter(Boolean)).size >= 3) {
    m.third = true;
    combo(s, 'Third-man run', `draw ${TUNE.thirdDraw}`);
    drawN(s, TUNE.thirdDraw);
  }
  m.lastKind = kind; m.lastRole = ROLE[kind]; m.lastAxis = axis;
}

export function play(s0: MatchState, id: string, as?: CardKind): MatchState {
  if (!canPlay(s0, id, as)) return s0;
  const s = clone(s0);
  s.last = [];
  const c = s.hand.find((x) => x.id === id)!;
  s.hand = s.hand.filter((x) => x.id !== id);
  const cost = costOf(s, c, as);
  const { kind, level } = actsAs(c, as);
  const role = ROLE[kind];
  if (role === 'pass' && s.freePass && CARD.cost[kind] > 0) s.freePass = false;
  s.stamina -= cost;
  const axis = c.axis ?? AXIS_OF[kind] ?? null;
  const m = s.move;
  if (kind !== 'one-two') m.streak = 0;
  switch (kind) {
    case 'one-two': {
      const afterCarry = m.lastRole === 'carry';
      s.zone = Math.min(2, s.zone + 1) as 0 | 1 | 2;
      s.build += TUNE.pass;
      m.passes++;
      m.streak++;
      for (const p of s.inPlay) if (p.kind === 'system') m.shotBonus += CARD.systemShot[p.level];
      if (m.streak >= 2) { m.streak = 0; s.build += TUNE.oneTwo; combo(s, 'One-two', `build-up +×${TUNE.oneTwo}`); }
      if (afterCarry) { s.freePass = true; combo(s, 'Switch of play', 'next pass costs nothing'); }
      makeTemp(s, CARD.oneTwoMakes[level]);
      break;
    }
    case 'overlap':
      s.zone = Math.min(2, s.zone + 1) as 0 | 1 | 2;
      m.carry = true;
      drawN(s, CARD.overlapDraw[level]);
      if (level === 'great') s.freePass = true;
      break;
    case 'second-wind': s.stamina += CARD.secondWind[level]; drawN(s, CARD.secondWindDraw[level]); break;
    case 'fuelled': s.nextStamina += CARD.fuelled[level]; s.nextDraw += CARD.fuelledDraw[level]; break;
    case 'hold': s.cover += CARD.hold[level]; break;
    case 'fresh-legs': s.cover += CARD.freshCover[level]; s.fitness = Math.min(TUNE.fitness, s.fitness + CARD.freshFit[level]); break;
    case 'drilled': s.freeRecycles += CARD.drilled[level]; drawN(s, CARD.drilledDraw[level]); break;
    case 'system': s.inPlay.push(c); break;
    case 'strike': case 'header': case 'thunderbolt': case 'punt': {
      let shot = kind === 'strike' ? CARD.strike[level] : kind === 'header' ? CARD.header[level] + CARD.headerPerPass[level] * m.passes
        : kind === 'thunderbolt' ? CARD.thunderbolt : CARD.punt;
      shot += m.shotBonus;
      if (m.lastKind === 'one-two' && kind !== 'punt') { shot += TUNE.overlap; combo(s, 'Overlap', `shot +${TUNE.overlap}`); }
      if (s.zone === 1 && (kind === 'strike' || kind === 'header')) combo(s, 'Through ball', 'a finish from midfield');
      track(s, kind, axis);
      toDiscard(s, c);
      finish(s, shot, c);
      return s;
    }
    default: break;
  }
  track(s, kind, axis);
  if (kind !== 'system') toDiscard(s, c);
  return s;
}

function finish(s: MatchState, shot: number, c: Card) {
  const chance = Math.round(shot * s.build);
  const line = lineNow(s);
  const name = c.name ? `${c.name}: ` : '';
  if (chance >= line) {
    if (s.club.elite === 'oldlady' && !s.checked) {
      s.checked = true;
      if (chance < line + TUNE.oldlady) {
        say(s, 'disallowed', `${name}${chance} against ${line}. Checked, and ruled out: it had to beat the line by ${TUNE.oldlady}.`, { chance, line });
        endMove(s);
        return;
      }
    }
    s.checked = true;
    s.score[0]++;
    s.line = Math.round(s.line * (1 + (s.club.elite === 'machine' ? TUNE.machine : TUNE.reform)));
    say(s, 'goal', `${name}Goal! ${chance} against ${line}.`, { chance, line });
  } else if (chance * 2 >= line) {
    s.line = Math.max(Math.round(s.line0 * TUNE.lineFloor), Math.round(s.line - chance * TUNE.nearDrop));
    say(s, 'near', `${name}Near miss, ${chance} against ${line}. Their line drops to ${lineNowAfter(s)}.`, { chance, line });
  } else {
    if (s.club.style === 'deep') s.threatAdd += Math.round(s.build);
    say(s, 'break', `${name}The move breaks down, ${chance} against ${line}.${s.club.style === 'deep' ? ` They break: threat +${Math.round(s.build)}.` : ''}`, { chance, line });
  }
  endMove(s);
}
const lineNowAfter = (s: MatchState) => lineNow({ ...s, move: newMove() });
function endMove(s: MatchState) { s.zone = 0; s.build = startBuild(s); s.move = newMove(); }

export function recycle(s0: MatchState, id: string): MatchState {
  if (s0.phase !== 'play') return s0;
  const free = s0.freeRecycles > 0;
  if (!free && s0.stamina < TUNE.recycleCost) return s0;
  if (!s0.hand.some((x) => x.id === id)) return s0;
  const s = clone(s0);
  s.last = [];
  const c = s.hand.find((x) => x.id === id)!;
  s.hand = s.hand.filter((x) => x.id !== id);
  if (free) s.freeRecycles--; else s.stamina -= TUNE.recycleCost;
  toDiscard(s, c);
  drawN(s, 1);
  s.recycles++;
  s.move.streak = 0;
  for (const p of s.inPlay) if (p.kind === 'system') s.cover += CARD.systemCover[p.level];
  if (s.club.style === 'press') s.threatAdd += 1;
  if (s.recycles >= 3 && !s.patient) {
    s.patient = true;
    s.build += TUNE.patientBuild;
    s.cover += TUNE.patientCover;
    combo(s, 'Patient build-up', `build-up +×${TUNE.patientBuild} and ${TUNE.patientCover} cover`);
  }
  return s;
}
export const canRecycle = (s: MatchState) => s.phase === 'play' && s.hand.length > 0 && (s.freeRecycles > 0 || s.stamina >= TUNE.recycleCost);

// --- their attack and the end of a spell -----------------------------------------------------------------------------
function attack(s: MatchState) {
  const threat = threatNow(s);
  const cover = coverNow(s);
  const twice = s.club.elite === 'comeback' && s.spell === TUNE.spells && s.score[1] < s.score[0];
  const k = s.club.elite === 'murderball' ? 2 : 1;
  for (let n = 0; n < (twice ? 2 : 1); n++) {
    if (twice && n === 1) say(s, 'signature', 'The comeback: they go again.');
    const short = threat - cover;
    if (threat <= 0) say(s, 'dealt', 'They do not attack this spell.');
    else if (short <= 0) say(s, 'dealt', `Their attack, ${threat}, meets your cover, ${cover}. Dealt with.`);
    else if (short <= TUNE.shortMax) {
      s.fitness = Math.max(0, s.fitness - short * k);
      if (s.club.style === 'setpiece') s.carryThreat += TUNE.setpiece;
      say(s, 'fitness', `Their attack, ${threat}, gets past your cover, ${cover}. You lose ${short * k} fitness.${s.fitness === 0 ? ' Your squad is spent: cover counts half.' : ''}`);
    } else {
      s.score[1]++;
      s.fitness = Math.max(0, s.fitness - TUNE.goalFit * k);
      say(s, 'conceded', `They score. Their attack, ${threat}, against your cover, ${cover}.`);
    }
  }
}

export function endSpell(s0: MatchState): MatchState {
  if (s0.phase !== 'play') return s0;
  const s = clone(s0);
  s.last = [];
  attack(s);
  for (const c of s.hand) toDiscard(s, c);
  s.hand = [];
  s.cover = 0;
  if (s.spell >= TUNE.spells) {
    if (s.score[0] === s.score[1]) {
      s.phase = 'pens';
      s.pens = newPens(s.club.id);
      say(s, 'pens', `Full time, ${s.score[0]}–${s.score[1]}. Penalties.`);
    } else {
      s.phase = 'done';
      say(s, 'full', `Full time, ${s.score[0]}–${s.score[1]}.`);
    }
    return s;
  }
  s.spell++;
  startSpell(s);
  return s;
}

/** 'W' or 'L' once it is over (penalties included), otherwise null. */
export function outcome(s: MatchState): 'W' | 'L' | null {
  if (s.phase !== 'done') return null;
  if (s.score[0] !== s.score[1]) return s.score[0] > s.score[1] ? 'W' : 'L';
  return s.pens?.winner === 'us' ? 'W' : s.pens?.winner === 'them' ? 'L' : null;
}

/** What a finish would do now, for the card's preview: the chance and the line it meets. */
export function preview(s: MatchState, id: string, as?: CardKind): { chance: number; line: number; kind: FeedKind } | null {
  if (!canPlay(s, id, as)) return null;
  const c = s.hand.find((x) => x.id === id)!;
  if (ROLE[actsAs(c, as).kind] !== 'finish') return null;
  const f = play(s, id, as).last.find((x) => x.chance != null);
  return f ? { chance: f.chance!, line: f.line!, kind: f.kind } : null;
}
