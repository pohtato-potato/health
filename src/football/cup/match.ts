// How a cup match plays (spec §4, "build the move"). Pure: every action takes a state and returns a new one, and the
// random source lives in the state (`rs`), so a match saved after any card resumes exactly where it was.
// Layer 3: pool cards (pool.ts) play through the same rules as the starting cards; heirlooms (heirlooms.ts) and the
// cup's twists arrive as `mods`; four more combinations; each finish carries the move's steps for the goal tally.
import type { Axis } from '../types';
import { actsAs, baseCost, CARD, roleOf, titleOf, type Role } from './cards';
import { ATTACK_KIND, baseLine, baseThreat, CLUB_TUNE, SIGNATURE, type ClubSpec } from './clubs';
import type { HeirloomId } from './heirlooms';
import { newPens, type Pens } from './pens';
import { fxOf, isPool, poolDef } from './pool';
import type { AnyKind, Card, CardKind, Level } from './types';

/** Every number the match uses that the spec marks (tune). Set by tests/football/cup/cup-sim.test.ts. */
export const TUNE = {
  /** Build-up each pass adds, and what a One-two combination adds on top. */
  pass: 0.5, oneTwo: 1,
  /** A goal: the line re-forms this much stronger (Bayern: machine). Spec start 20% and 40%; the simulation needed 60% and 80%. */
  reform: 0.6, machine: 0.8,
  /** A near miss lowers the line by this share of the chance (spec start: a quarter), never below this share of where it started. */
  nearDrop: 0.1, lineFloor: 0.8,
  overlap: 3, through: 2.5, thirdDraw: 2, patientBuild: 1, patientCover: 4,
  /** Layer 3's combinations: Driving run (two carries), Tiki-taka (four passes), Cross and head, Double bank (two cover cards). */
  drivingRun: 1, tikiTaka: 1, crossHead: 3, doubleBank: 2,
  /** Fitness at the start of a run; short by up to shortMax costs fitness, more is a goal and goalFit fitness. */
  fitness: 60, shortMax: 7, goalFit: 8,
  hand: 5, keepHand: 4, stamina: 3, recycleCost: 1, spells: 6,
  controlBuild: 0.5, bus: 0.5, wide: 0.25, setpiece: 2, metal: 2, oldlady: 3,
  /** Heirlooms' numbers. */
  rake: 0.5, turnstile: 5, stopwatch: 2, floodlight: 0.5, cornerFlag: 0.5, heavyPitch: 0.9, programme: 4, linesman: 2, studs: 2,
};

/** What the run brings into a match: heirlooms, the cup's twists, and a bonus from an event. */
export interface MatchMods {
  heir?: HeirloomId[];
  /** Every attack is this much bigger (DFB-Pokal on). */
  threatPlus?: number;
  /** Their defence starts this much higher (elite clubs from the Coupe de Belgique on). */
  lineMul?: number;
  /** An event's gift: the first finish gets more shot, the first spell more cover, or their attacks are seen ahead. */
  firstShot?: number; firstCover?: number; see?: boolean;
}

export type FeedKind = 'spell' | 'combo' | 'goal' | 'near' | 'break' | 'disallowed' | 'dealt' | 'fitness' | 'conceded' | 'signature' | 'pens' | 'full';
/** One line of the goal tally: a card in the move or a combination it landed. */
export interface Step { label: string; axis: Axis | null; val: string; combo?: boolean }
export interface Feed {
  kind: FeedKind; text: string; spell: number; chance?: number; line?: number;
  /** A finish: its shot and the build-up it met, the finisher's axis, and the move that made it. */
  shot?: number; build?: number; axis?: Axis | null; steps?: Step[]; title?: string;
}
export interface Intent { spell: number; threat: number; kind: string }
interface Move {
  passes: number; axes: (Axis | null)[]; lastKind: AnyKind | null; lastRole: Role | null; lastAxis: Axis | null;
  /** One-twos in a row since the last combination. */
  streak: number; carry: boolean; shotBonus: number; third: boolean;
  /** Layer 3. */
  carries?: number; lastQuickPace?: boolean; cross?: boolean; steps?: Step[];
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
  basics: AnyKind[];
  feed: Feed[];
  /** What the latest action did, for the screen's motion and haptics. */
  last: Feed[];
  pens?: Pens;
  // Layer 3 (optional so a layer-2 save still loads)
  mods?: MatchMods;
  /** Cover that carries into next spell. */
  keepNext?: number;
  passedSpell?: boolean; recycledSpell?: boolean; coverCards?: number; firstFinish?: boolean; scarfUsed?: boolean; bootsUsed?: boolean;
  /** Cards played this match, for the record book. */
  played?: number;
  /** Fitness at kick-off, for full time. */
  fit0?: number;
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
const axisOf = (k: AnyKind): Axis | null => (isPool(k) ? poolDef(k)!.axis : AXIS_OF[k as CardKind] ?? null);
const NOT_WILD: AnyKind[] = ['total', 'loan', 'punt', 'thunderbolt'];
const newMove = (): Move => ({ passes: 0, axes: [], lastKind: null, lastRole: null, lastAxis: null, streak: 0, carry: false, shotBonus: 0, third: false, carries: 0, steps: [] });
export const has = (s: { mods?: MatchMods }, h: HeirloomId) => !!s.mods?.heir?.includes(h);
const startBuild = (s: MatchState) => (s.club.elite === 'control' ? TUNE.controlBuild : 1) + (has(s, 'floodlight') && s.spell === TUNE.spells ? TUNE.floodlight : 0);

export function intentsFor(club: ClubSpec, s: { rs: number }, plus = 0): Intent[] {
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
    if (threat > 0) threat += plus;
    return { spell, threat, kind: threat ? kind : 'No attack' };
  });
}

export function newMatch(o: { seed: number; deck: Card[]; club: ClubSpec; fitness?: number; mods?: MatchMods }): MatchState {
  const mul = (o.mods?.lineMul ?? 1) * (o.mods?.heir?.includes('heavy-pitch') ? TUNE.heavyPitch : 1);
  const line = Math.round(baseLine(o.club.rating, o.club.style) * mul);
  const s: MatchState = {
    v: 1, rs: o.seed >>> 0, club: o.club, spell: 1, phase: 'play', score: [0, 0],
    draw: [], hand: [], discard: [], inPlay: [], stamina: TUNE.stamina, nextStamina: 0, nextDraw: 0,
    zone: 0, build: 1, move: newMove(), freePass: false, freeRecycles: 0, recycles: 0, patient: false, cover: 0,
    fitness: o.fitness ?? TUNE.fitness, line, line0: line, intents: [], threatAdd: 0, carryThreat: 0, checked: false, tempN: 0,
    basics: [...new Set(o.deck.map((c) => c.kind).filter((k) => !NOT_WILD.includes(k)))],
    feed: [], last: [],
    ...(o.mods ? { mods: o.mods } : {}),
    played: 0, fit0: o.fitness ?? TUNE.fitness,
  };
  s.intents = intentsFor(o.club, s, o.mods?.threatPlus ?? 0);
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
/** The sum of a system field over the pool systems in play. */
const sys = (s: MatchState, k: 'sysRecycleCover' | 'sysPassBuild' | 'sysShot' | 'sysSpellCover' | 'sysSpellFit' | 'sysSpellDraw' | 'sysSpellStamina' | 'sysCarryDraw') =>
  s.inPlay.reduce((t, c) => t + (isPool(c.kind) ? fxOf(c.kind, c.level)[k] ?? 0 : 0), 0);

function startSpell(s: MatchState) {
  const first = s.spell === 1;
  s.stamina = TUNE.stamina + s.nextStamina + sys(s, 'sysSpellStamina') + (first && has(s, 'armband') ? 1 : 0);
  const extra = s.nextDraw + sys(s, 'sysSpellDraw') + (first && has(s, 'boot-bag') ? 1 : 0);
  s.nextStamina = 0; s.nextDraw = 0;
  s.zone = 0; s.build = startBuild(s); s.move = newMove();
  s.recycles = 0; s.patient = false; s.freeRecycles = 0; s.freePass = false;
  s.cover = (s.keepNext ?? 0) + sys(s, 'sysSpellCover') + (first && has(s, 'turnstile') ? TUNE.turnstile : 0) + (first ? s.mods?.firstCover ?? 0 : 0);
  s.keepNext = 0; s.passedSpell = false; s.recycledSpell = false; s.coverCards = 0;
  const fit = sys(s, 'sysSpellFit');
  if (fit) s.fitness = Math.min(TUNE.fitness, s.fitness + fit);
  s.threatAdd = s.carryThreat; s.carryThreat = 0;
  say(s, 'spell', `Spell ${s.spell} of ${TUNE.spells}`);
  drawN(s, (s.club.style === 'keep' ? TUNE.keepHand : TUNE.hand) + extra);
  if (s.club.elite === 'rondo') {
    const passes = s.hand.filter((c) => roleOf(actsAs(c).kind) === 'pass').sort((a, b) => RANK[b.level] - RANK[a.level]);
    if (passes[0]) {
      s.hand = s.hand.filter((c) => c.id !== passes[0].id);
      toDiscard(s, passes[0]);
      say(s, 'signature', `The rondo: they took your ${titleOf(passes[0].kind)}.`);
    }
  }
}

// --- what you can see --------------------------------------------------------------------------------------------
export const threatNow = (s: MatchState) => Math.max(0, (s.intents[s.spell - 1]?.threat ?? 0) + s.threatAdd);
export function lineNow(s: MatchState): number {
  let k = 1;
  if (s.club.elite === 'bus' && s.spell >= 5) k *= 1 + TUNE.bus;
  if (s.club.style === 'wide' && s.move.carry) k *= 1 - TUNE.wide;
  return Math.round(s.line * k);
}
/** Whether their attacks show two spells ahead: a scouted club, the chalkboard, or an event's tip-off. */
export const seesAhead = (s: MatchState) => s.club.scouted || has(s, 'chalkboard') || !!s.mods?.see;
/** Whether a shoot-out shows their habits. */
export const seesHabits = (s: MatchState) => s.club.scouted || has(s, 'notebook');
/** This spell's intention, and two more when you can see ahead (spec §5.3). */
export function shownIntents(s: MatchState): Intent[] {
  const now = s.intents.slice(s.spell - 1, s.spell + (seesAhead(s) ? 2 : 0));
  return now.map((x, i) => (i === 0 ? { ...x, threat: threatNow(s) } : x));
}
/** Cover as it will count: halved when the squad is spent. */
export const coverNow = (s: MatchState) => (s.fitness <= 0 ? Math.floor(s.cover / 2) : s.cover);

/** The kinds a wild card may play as. */
export const wildOptions = (s: MatchState) => s.basics;
const through = (s: MatchState) => (has(s, 'linesman-flag') ? TUNE.linesman : TUNE.through);

export function costOf(s: MatchState, c: Card, as?: AnyKind): number {
  const k = actsAs(c, as).kind;
  if (roleOf(k) === 'pass' && s.freePass) return 0;
  return c.kind === 'total' ? CARD.cost.total : baseCost(k);
}

/** Why a card cannot be played now, or null when it can. */
export function blocked(s: MatchState, id: string, as?: AnyKind): string | null {
  if (s.phase !== 'play') return 'The spells are over.';
  const c = s.hand.find((x) => x.id === id);
  if (!c) return 'Not in your hand.';
  if (c.kind === 'total') {
    if (!as) return s.basics.length ? null : 'Nothing to copy.';
    if (!s.basics.includes(as)) return 'Not a basic card in your deck.';
  }
  if (costOf(s, c, as) > s.stamina) return 'Not enough stamina.';
  const k = actsAs(c, as).kind;
  if (roleOf(k) === 'finish') {
    const f = isPool(k) ? fxOf(k, actsAs(c, as).level) : undefined;
    if (k === 'punt' || f?.anywhere) return null;
    if (s.zone === 2) return null;
    const mid = k === 'thunderbolt' || !!f?.fromMid;
    if (s.zone === 1 && (mid || s.build >= through(s))) return null;
    if (mid) return 'Get the ball to midfield first.';
    return s.zone === 1 ? `Finish from here needs build-up ×${through(s)}.` : 'Get the ball to the final third first.';
  }
  return null;
}
export const canPlay = (s: MatchState, id: string, as?: AnyKind) => blocked(s, id, as) === null;

// --- playing a card ----------------------------------------------------------------------------------------------
function makeTemp(s: MatchState, n: number) {
  for (let k = 0; k < n; k++) s.hand.push({ id: `t${s.tempN++}`, kind: 'one-two', level: 'basic', axis: 'Pace', temp: true });
}
function combo(s: MatchState, name: string, what: string, val = '') {
  say(s, 'combo', `${name}: ${what}`);
  s.move.steps?.push({ label: name, axis: null, val, combo: true });
  if (has(s, 'drum')) s.cover += 1;
}
const step = (s: MatchState, label: string, axis: Axis | null, val: string) => s.move.steps?.push({ label, axis, val });
const fmt = (x: number) => (Number.isInteger(x) ? `${x}` : x.toFixed(2).replace(/0$/, ''));

function track(s: MatchState, kind: AnyKind, axis: Axis | null, quickPace = false) {
  const m = s.move;
  m.axes.push(axis);
  if (!m.third && new Set(m.axes.filter(Boolean)).size >= 3) {
    m.third = true;
    combo(s, 'Third-man run', `draw ${TUNE.thirdDraw}`, `draw ${TUNE.thirdDraw}`);
    drawN(s, TUNE.thirdDraw);
  }
  m.lastKind = kind; m.lastRole = roleOf(kind); m.lastAxis = axis; m.lastQuickPace = quickPace;
}

/** A pass of any kind: up the pitch (or not), build-up, and the combinations passes land. */
function pass(s: MatchState, o: { quick: boolean; add: number; zones: number; makes: number; title: string; axis: Axis | null }) {
  const m = s.move;
  const afterCarry = m.lastRole === 'carry';
  if (s.zone === 2) m.cross = true;
  s.zone = Math.min(2, s.zone + o.zones) as 0 | 1 | 2;
  let add = o.add + sys(s, 'sysPassBuild');
  if (has(s, 'match-ball') && !s.passedSpell) add += o.add;
  s.passedSpell = true;
  s.build += add;
  m.passes++;
  step(s, o.title, o.axis, `+×${fmt(add)}`);
  if (o.quick) {
    m.streak += has(s, 'napkin') ? 2 : 1;
    for (const p of s.inPlay) if (p.kind === 'system') m.shotBonus += CARD.systemShot[p.level];
    if (m.streak >= 2) { m.streak = 0; s.build += TUNE.oneTwo; combo(s, 'One-two', `build-up +${TUNE.oneTwo}`, `+×${TUNE.oneTwo}`); }
  }
  if (afterCarry) { s.freePass = true; combo(s, 'Switch of play', 'next pass costs nothing', 'free pass'); }
  if (m.passes === 4) { s.build += TUNE.tikiTaka; combo(s, 'Tiki-taka', `four passes: build-up +${TUNE.tikiTaka}`, `+×${TUNE.tikiTaka}`); }
  makeTemp(s, o.makes);
}

function carry(s: MatchState, zones: number, title: string, axis: Axis | null) {
  const m = s.move;
  s.zone = Math.min(2, s.zone + zones) as 0 | 1 | 2;
  m.carry = true;
  m.carries = (m.carries ?? 0) + 1;
  const flag = has(s, 'corner-flag') ? TUNE.cornerFlag : 0;
  s.build += flag;
  step(s, title, axis, flag ? `+×${flag}` : 'carry');
  if (m.carries === 2) { s.build += TUNE.drivingRun; combo(s, 'Driving run', `two carries: build-up +${TUNE.drivingRun}`, `+×${TUNE.drivingRun}`); }
  drawN(s, sys(s, 'sysCarryDraw'));
}

function addCover(s: MatchState, n: number, title: string, axis: Axis | null, keep = false) {
  s.cover += n;
  if (keep) s.keepNext = (s.keepNext ?? 0) + n;
  s.coverCards = (s.coverCards ?? 0) + 1;
  if (s.coverCards === 2) { s.cover += TUNE.doubleBank; say(s, 'combo', `Double bank: two cover cards, cover +${TUNE.doubleBank}`); if (has(s, 'drum')) s.cover += 1; }
  void title; void axis;
}

export function play(s0: MatchState, id: string, as?: AnyKind): MatchState {
  if (!canPlay(s0, id, as)) return s0;
  const s = clone(s0);
  s.last = [];
  const c = s.hand.find((x) => x.id === id)!;
  s.hand = s.hand.filter((x) => x.id !== id);
  const cost = costOf(s, c, as);
  const { kind, level } = actsAs(c, as);
  const role = roleOf(kind);
  if (role === 'pass' && s.freePass && baseCost(kind) > 0) s.freePass = false;
  s.stamina -= cost;
  s.played = (s.played ?? 0) + 1;
  const axis = c.axis ?? axisOf(kind) ?? null;
  const m = s.move;
  const quick = kind === 'one-two' || (isPool(kind) && !!fxOf(kind, level).quick);
  if (!quick) m.streak = 0;
  const title = titleOf(kind);
  if (isPool(kind)) return playPool(s, c, kind, level, axis, title);
  switch (kind as CardKind) {
    case 'one-two':
      pass(s, { quick: true, add: TUNE.pass, zones: 1, makes: CARD.oneTwoMakes[level], title, axis });
      break;
    case 'overlap':
      carry(s, 1, title, axis);
      drawN(s, CARD.overlapDraw[level]);
      if (level === 'great') s.freePass = true;
      break;
    case 'second-wind': s.stamina += CARD.secondWind[level]; drawN(s, CARD.secondWindDraw[level] + (has(s, 'water-crate') ? 1 : 0)); break;
    case 'fuelled': s.nextStamina += CARD.fuelled[level]; s.nextDraw += CARD.fuelledDraw[level]; if (has(s, 'water-crate')) drawN(s, 1); break;
    case 'hold': addCover(s, CARD.hold[level], title, axis); break;
    case 'fresh-legs': addCover(s, CARD.freshCover[level], title, axis); s.fitness = Math.min(TUNE.fitness, s.fitness + CARD.freshFit[level]); break;
    case 'drilled': s.freeRecycles += CARD.drilled[level]; drawN(s, CARD.drilledDraw[level]); step(s, title, axis, 'kept the ball'); break;
    case 'system': s.inPlay.push(c); break;
    case 'strike': case 'header': case 'thunderbolt': case 'punt': {
      const shot = kind === 'strike' ? CARD.strike[level] : kind === 'header' ? CARD.header[level] + CARD.headerPerPass[level] * m.passes
        : kind === 'thunderbolt' ? CARD.thunderbolt : CARD.punt;
      shoot(s, c, kind, axis, shot, { header: kind === 'header', punt: kind === 'punt', mid: kind === 'thunderbolt' });
      return s;
    }
    default: break;
  }
  track(s, kind, axis, quick && axis === 'Pace');
  if (kind !== 'system') toDiscard(s, c);
  return s;
}

function playPool(s: MatchState, c: Card, kind: AnyKind, level: Level, axis: Axis | null, title: string): MatchState {
  const d = poolDef(kind)!;
  const f = fxOf(kind, level);
  const m = s.move;
  if (d.role === 'finish') {
    const shot = (f.shot ?? 0) + (f.perPass ?? 0) * m.passes;
    shoot(s, c, kind, axis, shot, { header: !!f.perPass, punt: false, mid: !!f.fromMid || !!f.anywhere, rebound: f.rebound });
    if (f.draw) drawN(s, f.draw);
    return s;
  }
  if (d.role === 'pass') pass(s, { quick: !!f.quick, add: f.pass ?? TUNE.pass, zones: f.zones ?? 1, makes: f.makeOneTwo ?? 0, title, axis });
  else if (d.role === 'carry') carry(s, f.zones ?? 1, title, axis);
  else if (d.role === 'recycle' && f.zones) { s.zone = Math.min(2, s.zone + f.zones) as 0 | 1 | 2; step(s, title, axis, 'up a zone'); }
  else if (d.role === 'recycle') step(s, title, axis, f.build ? `+×${fmt(f.build)}` : 'kept the ball');
  if (d.role !== 'pass' && d.role !== 'carry' && f.makeOneTwo) makeTemp(s, f.makeOneTwo);
  if (f.build) s.build += f.build;
  if (f.shotUp) m.shotBonus += f.shotUp;
  if (f.cover || f.coverPerPass) addCover(s, (f.cover ?? 0) + (f.coverPerPass ?? 0) * m.passes, title, axis, f.keepCover);
  if (f.threatDown) s.threatAdd -= f.threatDown;
  if (f.stamina) s.stamina += f.stamina;
  if (f.nextStamina) s.nextStamina += f.nextStamina;
  if (f.nextDraw) s.nextDraw += f.nextDraw;
  if (f.fit) s.fitness = Math.min(TUNE.fitness, s.fitness + f.fit);
  if (f.freeRecycles) s.freeRecycles += f.freeRecycles;
  if (f.freePass) s.freePass = true;
  const draw = (f.draw ?? 0) + (d.role === 'stamina' && has(s, 'water-crate') ? 1 : 0);
  if (draw) drawN(s, draw);
  track(s, kind, axis, !!f.quick && axis === 'Pace');
  if (d.role === 'system') s.inPlay.push(c); else toDiscard(s, c);
  return s;
}

/** Every finish: the move's bonuses, the combinations a finish lands, then the chance against their defence. */
function shoot(s: MatchState, c: Card, kind: AnyKind, axis: Axis | null, shot0: number, o: { header: boolean; punt: boolean; mid: boolean; rebound?: boolean }) {
  const m = s.move;
  let shot = shot0 + m.shotBonus + sys(s, 'sysShot');
  if (!s.firstFinish) {
    s.firstFinish = true;
    shot += (has(s, 'programme') ? TUNE.programme : 0) + (s.mods?.firstShot ?? 0);
  }
  if (m.lastQuickPace && !o.punt) { shot += TUNE.overlap; combo(s, 'Overlap', `shot +${TUNE.overlap}`, `shot +${TUNE.overlap}`); }
  if (m.cross && o.header) { shot += TUNE.crossHead; combo(s, 'Cross and head', `shot +${TUNE.crossHead}`, `shot +${TUNE.crossHead}`); }
  if (s.zone === 1 && !o.mid && !o.punt) combo(s, 'Through ball', 'a finish from midfield');
  step(s, titleOf(kind), axis, `shot ${shot}`);
  track(s, kind, axis);
  finish(s, shot, c, axis, o.rebound);
}

function finish(s: MatchState, shot: number, c: Card, axis: Axis | null, rebound?: boolean) {
  const chance = Math.round(shot * s.build);
  const line = lineNow(s);
  const name = c.name ? `${c.name}: ` : '';
  const more: Partial<Feed> = { chance, line, shot, build: s.build, axis, steps: s.move.steps, title: c.name ?? titleOf(c.kind) };
  let broke = false;
  if (chance >= line) {
    if (s.club.elite === 'oldlady' && !s.checked) {
      s.checked = true;
      if (chance < line + TUNE.oldlady) {
        say(s, 'disallowed', `${name}${chance} against ${line}. Checked, and ruled out: it had to beat their defence by ${TUNE.oldlady}.`, more);
        toDiscard(s, c);
        endMove(s);
        return;
      }
    }
    s.checked = true;
    s.score[0]++;
    s.line = Math.round(s.line * (1 + (s.club.elite === 'machine' ? TUNE.machine : TUNE.reform)));
    say(s, 'goal', `${name}Goal! ${chance} against ${line}.`, more);
  } else if (chance * 2 >= line) {
    const drop = has(s, 'rake') ? TUNE.rake : TUNE.nearDrop;
    s.line = Math.max(Math.round(s.line0 * TUNE.lineFloor), Math.round(s.line - chance * drop));
    if (has(s, 'studs')) s.cover += TUNE.studs;
    say(s, 'near', `${name}Near miss, ${chance} against ${line}. Their defence drops to ${lineNowAfter(s)}.`, more);
    broke = true;
  } else {
    if (s.club.style === 'deep') s.threatAdd += Math.round(s.build);
    say(s, 'break', `${name}The move breaks down, ${chance} against ${line}.${s.club.style === 'deep' ? ` They break: their attack +${Math.round(s.build)}.` : ''}`, more);
    broke = true;
  }
  if (broke && has(s, 'spare-boots') && !s.bootsUsed && !c.temp) {
    s.bootsUsed = true;
    s.hand.push(c);
    say(s, 'combo', `Spare boots: ${titleOf(c.kind)} comes back to your hand`);
  } else toDiscard(s, c);
  if (broke && rebound) {
    s.zone = 2;
    s.move.lastKind = null; s.move.lastRole = null; s.move.lastQuickPace = false;
    say(s, 'combo', 'Rebound: the ball stays in the final third');
    return;
  }
  endMove(s);
}
const lineNowAfter = (s: MatchState) => lineNow({ ...s, move: newMove() });
function endMove(s: MatchState) { s.zone = 0; s.build = startBuild(s); s.move = newMove(); }

export function recycle(s0: MatchState, id: string): MatchState {
  if (s0.phase !== 'play') return s0;
  const needle = has(s0, 'needle') && !s0.recycledSpell;
  const free = s0.freeRecycles > 0 || needle;
  if (!free && s0.stamina < TUNE.recycleCost) return s0;
  if (!s0.hand.some((x) => x.id === id)) return s0;
  const s = clone(s0);
  s.last = [];
  const c = s.hand.find((x) => x.id === id)!;
  s.hand = s.hand.filter((x) => x.id !== id);
  if (s.freeRecycles > 0) s.freeRecycles--; else if (!needle) s.stamina -= TUNE.recycleCost;
  s.recycledSpell = true;
  toDiscard(s, c);
  drawN(s, 1);
  s.recycles++;
  s.move.streak = 0;
  for (const p of s.inPlay) if (p.kind === 'system') s.cover += CARD.systemCover[p.level];
  s.cover += sys(s, 'sysRecycleCover');
  if (s.club.style === 'press') s.threatAdd += 1;
  if (s.recycles >= 3 && !s.patient) {
    s.patient = true;
    s.build += TUNE.patientBuild;
    s.cover += TUNE.patientCover;
    combo(s, 'Patient build-up', `build-up +${TUNE.patientBuild} and ${TUNE.patientCover} cover`, `+×${TUNE.patientBuild}`);
  }
  return s;
}
export const canRecycle = (s: MatchState) => s.phase === 'play' && s.hand.length > 0 && (s.freeRecycles > 0 || (has(s, 'needle') && !s.recycledSpell) || s.stamina >= TUNE.recycleCost);

// --- their attack and the end of a spell -----------------------------------------------------------------------------
function attack(s: MatchState) {
  const threat = threatNow(s);
  const cover = coverNow(s);
  const twice = s.club.elite === 'comeback' && s.spell === TUNE.spells && s.score[1] < s.score[0];
  const k = s.club.elite === 'murderball' ? 2 : 1;
  const watch = has(s, 'stopwatch') ? TUNE.stopwatch : 0;
  const lose = (n: number) => { s.fitness = Math.max(0, s.fitness - Math.max(0, n * k - watch)); };
  for (let n = 0; n < (twice ? 2 : 1); n++) {
    if (twice && n === 1) say(s, 'signature', 'The comeback: they go again.');
    const short = threat - cover;
    const scarf = short > TUNE.shortMax && has(s, 'scarf') && !s.scarfUsed;
    if (scarf) s.scarfUsed = true;
    if (threat <= 0) say(s, 'dealt', 'They do not attack this spell.');
    else if (short <= 0) say(s, 'dealt', `Their attack, ${threat}, meets your cover, ${cover}. Dealt with.`);
    else if (short <= TUNE.shortMax || scarf) {
      const was = s.fitness;
      lose(scarf ? TUNE.goalFit : short);
      if (s.club.style === 'setpiece') s.carryThreat += TUNE.setpiece;
      const note = scarf ? ' The lucky scarf: it would have been a goal.' : '';
      say(s, 'fitness', `Their attack, ${threat}, gets past your cover, ${cover}. You lose ${was - s.fitness} fitness.${note}${s.fitness === 0 ? ' Your squad is spent: cover counts half.' : ''}`);
    } else {
      s.score[1]++;
      lose(TUNE.goalFit);
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

/** What a finish would do now, for the card's preview: the shot, the build-up, the chance and the line it meets. */
export function preview(s: MatchState, id: string, as?: AnyKind): { chance: number; line: number; kind: FeedKind; shot: number; build: number } | null {
  if (!canPlay(s, id, as)) return null;
  const c = s.hand.find((x) => x.id === id)!;
  if (roleOf(actsAs(c, as).kind) !== 'finish') return null;
  const f = play(s, id, as).last.find((x) => x.chance != null);
  return f ? { chance: f.chance!, line: f.line!, kind: f.kind, shot: f.shot!, build: f.build! } : null;
}

/** The combinations a match landed, by name. */
export const combosOf = (s: MatchState): string[] => s.feed.filter((f) => f.kind === 'combo' && !/^(Spare boots|Rebound)/.test(f.text)).map((f) => f.text.split(':')[0]);
