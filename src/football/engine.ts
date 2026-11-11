// One match from stored inputs to stored events (spec §7.2–7.3). Pure and seeded.
import type { AbilityDef } from './data/load';
import { capChance, type CondCap } from './squadCare';
import { CAL, type Opponent } from './opponent';
import { coverage, edgeDistance, hexagon, inside, polygon, radii, randomIn, LIT, type Pt } from './radar';
import { hashSeed, rng, shuffle } from './rng';
import { AXES, clamp, type Axis, type AxisValues, type BraboAbility, type CallPick, type CallRecord, type ChanceEvent, type Comp, type MatchEvents, type Mod, type RivalTwist, type Side } from './types';
export type { CallPick, CallRecord } from './types';

export interface MatchCtx {
  comp?: Comp; derby?: boolean; vsHigher?: boolean; last5?: boolean; matchday?: number; auto?: boolean;
  /** A final (cup, playoff or continental), for the tree's 'final' situations. */
  final?: boolean;
  firstMeeting?: boolean; familiarAxis?: Axis; prevBest?: Axis;
}
export interface MatchInput {
  seed: number;
  values: AxisValues;
  opp: Opponent;
  home: boolean;
  captain?: Axis;
  /** Abilities earned this week (0–4) feed the weekly stack. */
  stack: number;
  abilities: BraboAbility[];
  /** Promoted youngsters whose habit was done today. */
  bench: { axis: Axis; plus: number }[];
  /** Knocks, cards and Harmony: applied to the whole match before kick-off. */
  pre: Mod[];
  rival?: RivalTwist;
  /** Data conditions true today, e.g. 'protein-hit'. */
  conds: string[];
  /** Release 1 (R7 q-cond A): squad condition caps how high a chance can lift Power and Pace, never below `values`. */
  condCap?: CondCap;
  ctx?: MatchCtx;
  /** On neutral ground (finals): neither side has the home edge. */
  neutral?: boolean;
  /**
   * Fog of war (R8 q-unlogged A): axes not logged tonight. Each plays low, between FOG[0] and FOG[1], drawn afresh
   * for every chance, so it does worse on average than an honestly logged bad day and swings more. Never "no data".
   */
  fog?: Axis[];
  /**
   * A night out logged as ranges (l-away): Fuel is drawn afresh for each chance within this many points either side
   * of its logged value, evenly, so it swings more but averages the same. 0 or absent: Fuel plays as logged.
   */
  fuelSpread?: number;
  /** Your typical shape (`typicalFor`): chances are sized against it, so a better night than usual scores and saves more. */
  typical?: AxisValues;
  /**
   * Matchday (spec §2.4): tempo, and mods for the whole match (the read, a tactic card) or one half (the plan per
   * half: a change at half-time counts from the next chance). Each applies on the side whose axes it names.
   */
  plan?: MatchPlan;
  /**
   * Matchday (spec §2.3): present on a league night, the match has one to three calls. These are the owner's picks so
   * far, in order; a call beyond them goes to the assistant, or stops the match when `watch` is set.
   */
  calls?: CallPick[];
  /** Being watched: stop at a call with no pick yet, and at half-time unless `halfSeen`. */
  watch?: boolean;
  halfSeen?: boolean;
}
export type Tempo = 'patient' | 'normal' | 'quick';
export interface MatchPlan { tempo?: Tempo; all?: Mod[]; first?: Mod[]; second?: Mod[] }
/** Keep the ball: their next attack is this much easier to stop. */
export const KEEP_STOP = 0.15;
/** The atk kind each axis takes a chance on when the owner says "take it on" at a long-range moment. */
export const TAKE_KIND: Record<'Pace' | 'Power' | 'Fuel', string> = { Pace: 'Counter-attack', Power: 'Set piece', Fuel: 'Through ball' };
/** One option at a call, with the odds exactly as they will be used. */
export interface CallOption { pick: CallPick; pct: number; axis?: Axis; type?: string }
export interface CallOffer { slot: number; minute: number; n: number; of: number; score: [number, number]; options: CallOption[]; best: CallPick }
export type MatchStop = { kind: 'half' } | { kind: 'call'; offer: CallOffer };
/** Each chance's own random stream (spec §2.2): a call never shifts the luck of a later chance. */
export const subSeed = (seed: number, i: number, part = 'chance') => hashSeed(String(seed), part, String(i));
/**
 * How many calls a league match gets: one to three, set by the seed, more of them when the two sides are close
 * (the damped rating gap near zero).
 */
export function callCount(seed: number, gap: number): number {
  const r = rng(subSeed(seed, 0, 'calls'));
  const tight = 1 / (1 + Math.abs(gap) / 6);
  return 1 + (r() < 0.25 + 0.6 * tight ? 1 : 0) + (r() < 0.55 * tight ? 1 : 0);
}

/**
 * The kinds of chance on each side. `axis` gets +2 on that kind (null: nothing helps), `q` is the shooter's chance of
 * scoring at an even match against your typical shape, and `w` is how often the kind comes. A tap-in goes in about
 * three times in four, a long shot about once in ten; the rating gap and the night's modifiers move each from there.
 */
export interface ChanceKind { type: string; axis: Axis | null; q: number; w: number }
export const KINDS: Record<Side, ChanceKind[]> = {
  atk: [
    { type: 'Tap-in', axis: 'Power', q: 0.62, w: 0.14 },
    { type: 'Counter-attack', axis: 'Pace', q: 0.22, w: 0.2 },
    { type: 'Set piece', axis: 'Power', q: 0.15, w: 0.2 },
    { type: 'Through ball', axis: 'Fuel', q: 0.19, w: 0.2 },
    { type: 'Long shot', axis: null, q: 0.095, w: 0.26 },
  ],
  def: [
    { type: 'Scramble in the box', axis: 'Rest', q: 0.76, w: 0.14 },
    { type: 'Cross into the box', axis: 'Rest', q: 0.28, w: 0.2 },
    { type: 'Corner', axis: 'Routine', q: 0.2, w: 0.2 },
    { type: 'Break through the middle', axis: 'Shape', q: 0.24, w: 0.2 },
    { type: 'Long-range effort', axis: null, q: 0.11, w: 0.26 },
  ],
};
/** Each kind's name and the axis it favours (for credits and situational abilities). */
export const TYPES: Record<Side, [string, Axis | null][]> = {
  atk: KINDS.atk.map((k) => [k.type, k.axis]),
  def: KINDS.def.map((k) => [k.type, k.axis]),
};
export const STACK_STEPS = [1, 0.75, 0.5, 0.25];
export const GOAL_LINE = 7 / 112;
/** The home side's edge: + on every axis in play at home, − away. None on neutral ground. */
export const HOME_EDGE = 0.5;
/** An unlogged axis plays between these values, drawn afresh for each chance. */
export const FOG: [number, number] = [1, 3];
/** With too little history, an unlogged axis is sized as if it were this honest bad value, so fog still costs. */
export const FOG_REF = 4;
/** Fewest real nights in 28 days before chances are sized against your typical shape instead of tonight's. */
export const TYPICAL_MIN = 7;
/** How strongly each side's average moves the share of chances (both sides alike). */
export const SPLIT = 60;
/** The average at which a side's own chances are neither more nor fewer than an even share. */
export const SPLIT_MID = 10.5;
/** Each side gets at least this many chances, so an underdog always has a few shots. */
export const MIN_SIDE = 3;
/** How much a stronger club (its nominal reach above 0.75) takes of the chances. */
export const REACH_SPLIT = 1;
/** A club ability's reach change is in old landing-region units; it scales with the region it acts on. */
const REACH_REF = 0.7;
const MAX_REACH = 3;
const FULL = hexagon(1);

/** Ten to twelve chances a match. `coin` in [0, 1). */
export const chanceCount = (coin: number) => 10 + Math.min(2, Math.floor(coin * 3));
/**
 * Your share of the chances: a higher attacking average makes more of yours, a higher defensive average leaves fewer
 * of theirs, and a stronger club (bigger reach) takes more. `coin` in [0, 1) rounds the share up or down fairly.
 */
export const splitChances = (total: number, atkAvg: number, defAvg: number, reach: number, coin = 0.5) =>
  clamp(Math.floor(total * (0.5 + (atkAvg - SPLIT_MID) / SPLIT + (defAvg - SPLIT_MID) / SPLIT - REACH_SPLIT * (reach - 0.75)) + coin), MIN_SIDE, total - MIN_SIDE);
const shapeOf = (v: AxisValues, side: Side) => polygon(radii(v, side));

/** Your typical shape: the median of each axis over the real (non-rotation) nights given, once there are TYPICAL_MIN. */
export function typicalFor(nights: AxisValues[]): AxisValues | undefined {
  if (nights.length < TYPICAL_MIN) return undefined;
  const out = {} as AxisValues;
  for (const a of AXES) {
    const xs = nights.map((v) => v[a]).sort((x, y) => x - y);
    const mid = xs.length >> 1;
    out[a] = xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
  }
  return out;
}

/** Your night as a club rating: typical tier values against each tier's middle rating. */
export function parityRating(v: AxisValues): number {
  const PARITY: [number, number][] = [[1, 10], [6, 28], [8, 37.5], [10, 48], [12, 56], [14, 66], [16, 76], [18, CAL.top], [20, CAL.top + 10]];
  const x = (v.Pace + v.Power + v.Fuel + v.Rest + v.Routine + v.Shape) / 6;
  for (let i = 1; i < PARITY.length; i++) if (x <= PARITY[i][0]) {
    const [x0, y0] = PARITY[i - 1], [x1, y1] = PARITY[i];
    return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return 95;
}
/** The region radius at which a shape covers `target` of it. */
export function evenRegion(v: AxisValues, side: Side, target: number): number {
  const shape = shapeOf(v, side);
  let lo = 0.02, hi = MAX_REACH;
  for (let k = 0; k < 26; k++) { const mid = (lo + hi) / 2; if (coverage(hexagon(mid), shape) > target) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
/**
 * Tonight against this club (Task 1.7 ruling, rebalanced 11 Nov). `gap` is the club's rating minus your night's
 * parity rating, squared and damped above zero. Each kind of chance lands in a region sized so that `ref` (your
 * typical shape; tonight's when there is no history) meets its quality at an even match, widened by s per point of
 * gap. `k` sizes the club's own modifiers: never below CAL.floor, so a weaker club still plays its own way.
 */
export function matchup(v: AxisValues, opp: Opponent, ref: AxisValues = v): { gap: number; k: number; widen: number; region: (side: Side, q: number) => number } {
  const raw = opp.rating - parityRating(v);
  const bent = raw > 0 && CAL.C ? (raw * raw) / CAL.C : raw;
  // A stronger club's lead is damped hard (G) so giant-killings stay possible; your own lead keeps a wider cap (Gd).
  const cap = bent > 0 ? CAL.G : CAL.Gd;
  const gap = cap ? cap * Math.tanh(bent / cap) : bent;
  const widen = 1 + CAL.s * gap;
  const cache = new Map<string, number>();
  const region = (side: Side, q: number) => {
    const key = `${side}:${q}`;
    if (!cache.has(key)) cache.set(key, clamp(evenRegion(ref, side, side === 'atk' ? q : 1 - q) * widen, 0.1, MAX_REACH));
    return cache.get(key)!;
  };
  return { gap, widen, region, k: Math.max(CAL.floor, CAL.per * Math.max(0, gap)) };
}
/** Share of the landing region (a hexagon of radius reach; the full radar when null) inside your shape. */
export const pctOf = (v: AxisValues, side: Side, reach: number | null) =>
  coverage(reach == null ? FULL : hexagon(reach), shapeOf(v, side));

interface Live { mine: number; theirs: number; lastMiss: boolean; afterGoal: number; defCount: number; atkCount: number; theyConceded: boolean; iScored: boolean; used: Set<string>; saved?: boolean }

function whenOk(when: string, side: Side, minute: number, type: string, home: boolean, live: Live, ctx: MatchCtx): boolean {
  const oppHome = !home;
  const m = when.match(/^(home-|)(first|after)-(\d+)$/);
  if (m) {
    if (m[1] && !oppHome) return false;
    return m[2] === 'first' ? minute <= +m[3] : minute >= +m[3];
  }
  switch (when) {
    case 'always': return true;
    case 'home': return oppHome;
    case 'away': return !oppHome;
    case 'first-half': return minute <= 45;
    case 'level': return live.mine === live.theirs;
    case 'they-lead': return live.theirs > live.mine;
    case 'until-concede': return !live.theyConceded;
    case 'until-score': return !live.iScored;
    case 'after-their-goal': return live.afterGoal > 0;
    case 'after-miss': return live.lastMiss && side === 'def';
    case 'cup': return ctx.comp === 'bigcup' || ctx.comp === 'tiercup' || ctx.comp === 'playoff' || ctx.comp === 'event' || ctx.comp === 'continental' || ctx.comp === 'clubworld';
    case 'derby': return Boolean(ctx.derby);
    case 'vs-higher': return Boolean(ctx.vsHigher);
    case 'last5': return Boolean(ctx.last5);
    case 'crosses': return type === 'Cross into the box';
    case 'corners': return type === 'Corner';
    case 'counters': return type === 'Counter-attack';
    case 'long': return type === 'Long shot' || type === 'Long-range effort';
    default: return false;
  }
}

/** Opponent ability effects for one chance: axis mods plus a reach change. */
function abilityFx(a: AbilityDef, side: Side, minute: number, type: string, home: boolean, live: Live, ctx: MatchCtx, conds: Set<string>, r: () => number): { mods: Mod[]; reach: number } {
  const out = { mods: [] as Mod[], reach: 0 };
  const push = (axis: Axis, d: number) => { if (LIT[side].includes(axis)) out.mods.push({ axis, d, why: a.name, kind: 'opp' }); };
  if (a.special) {
    switch (a.name) {
      case 'Familiar': if (ctx.familiarAxis) push(ctx.familiarAxis, -2); return out;
      case 'Projection': if (ctx.prevBest) push(ctx.prevBest, -2); return out;
      case 'Data department': if (ctx.prevBest) push(ctx.prevBest, -1); return out;
      case 'Man-marking': push(LIT[side][Math.floor(r() * 3)], -1); return out;
      case 'Every Door': if (side === 'def') push(LIT.def[live.defCount % 3], -1); return out;
      case 'Switchbacks': if (side === 'def') push(live.defCount % 2 ? 'Shape' : 'Rest', -1); return out;
      case 'Windmills': if (side === 'atk' && live.atkCount >= 3) for (const x of LIT.atk) push(x, -0.5 * (live.atkCount - 2)); return out;
      case 'Remontada': if (side === 'def' && minute >= 70 && live.theirs < live.mine) out.reach += 0.05; return out;
      case 'Spursy': if (side === 'def' && minute >= 80 && live.theirs > live.mine) out.reach -= 0.05; return out;
      case 'Fragile nights': if (side === 'def' && live.theyConceded && whenOk('cup', side, minute, type, home, live, ctx)) out.reach -= 0.05; return out;
      case 'Siesta': for (const x of LIT[side]) push(x, minute < 60 ? 1 : -2); return out;
      case 'Two Lakes': if (side === 'def' && minute <= 45) out.reach += 0.08; if (side === 'atk' && minute > 45) for (const x of LIT.atk) push(x, -2); return out;
      case 'Echolocation': if (side === 'def' && minute > 45) out.reach += 0.1; return out;
      case 'Slow and Sure': if (side === 'atk') for (const x of LIT.atk) push(x, -2); return out;
      case 'Peloton': case 'Gegenpress': if (side === 'def' && live.lastMiss) out.reach += 0.06; return out;
      case 'Marching On': if (side === 'def' && minute >= 70) out.reach += 0.06; return out;
      case 'Rondo': if (live.theirs > live.mine) push('Fuel', -1); return out;
      case 'Three-Four Time': if (side === 'def' && live.defCount % 3 === 2) out.reach += 0.1; return out;
      case 'Gambit': if (side === 'def' && live.defCount === 1) out.reach += 0.1; return out;
      default: break;
    }
  }
  const fx = a.fx;
  if (!fx) return out;
  if (fx.cond && !(conds.has(fx.cond) && !(conds.has('midnight-sun') && fx.cond.startsWith('bed')))) return out;
  if (fx.side && fx.side !== side) return out;
  if (!whenOk(fx.when, side, minute, type, home, live, ctx)) return out;
  for (const m of fx.mods) push(m.axis, m.d);
  if (fx.all) {
    const theirTests = /they take|their/.test(a.text);
    if (!theirTests || side === 'def') for (const x of LIT[side]) push(x, fx.all);
  }
  if (side === 'def') out.reach += fx.reach;
  return out;
}

/** The tree's limit on its situational bonuses: ±3 per axis in total (spec §1). */
export const TREE_CAP = 3;
const CUPS_COMP = new Set(['bigcup', 'tiercup', 'playoff', 'event', 'continental', 'clubworld']);
const braboOk = (b: BraboAbility, side: Side, minute: number, type: string, home: boolean, live: Live, ctx: MatchCtx = {}) => {
  if (b.side && b.side !== 'both' && b.side !== side) return false;
  switch (b.when ?? 'always') {
    case 'always': return true;
    case 'long': return type === 'Long shot' || type === 'Long-range effort';
    case 'late': return minute >= 75;
    case 'home': return home;
    case 'home-late': return home && minute >= 75;
    case 'away': return !home;
    case 'first-half': return minute <= 45;
    case 'after-concede': return live.theirs > 0;
    case 'level': return live.mine === live.theirs;
    case 'own-type': return TYPES[side].some(([t, ax]) => t === type && ax === b.axis);
    case 'second-half': return minute > 45;
    case 'behind': return live.mine < live.theirs;
    case 'ahead': return live.mine > live.theirs;
    case 'set-piece': return type === 'Set piece' || type === 'Corner';
    case 'derby': return Boolean(ctx.derby);
    case 'cup': return CUPS_COMP.has(ctx.comp ?? '');
    case 'final': return Boolean(ctx.final);
    case 'continental': return ctx.comp === 'continental' || ctx.comp === 'clubworld';
    case 'continental-home': return ctx.comp === 'continental' && home;
    case 'continental-away': return ctx.comp === 'continental' && !home;
    case 'auto': return Boolean(ctx.auto);
    case 'first-chance': return (side === 'atk' ? live.atkCount : live.defCount) === 0;
    case 'after-goal': return live.iScored;
    case 'after-save': return Boolean(live.saved);
    case 'vs-higher': return Boolean(ctx.vsHigher);
    case 'international': return ctx.comp === 'worldcup';
    default: return false;
  }
};

/**
 * A match in progress. `startMatch` sets it up, `nextChance` plays one chance and `finishMatch` reads the result, so a
 * later feature can stop between chances (the owner's calls during a match) without changing how a chance is played.
 */
export interface MatchState {
  m: MatchInput; r: () => number; ctx: MatchCtx; conds: Set<string>; has: (n: string) => boolean;
  base: AxisValues; mu: ReturnType<typeof matchup>; wS: Partial<AxisValues>; wP: Partial<AxisValues>;
  total: number; yours: number; minutes: number[]; order: Side[];
  live: Live; chances: ChanceEvent[]; moments: string[]; xg: [number, number];
  wind: boolean; retakes: BraboAbility[]; scrappy: boolean; flip: number; foul: number; eruption: number; slow: boolean;
  /** Index of the next chance; equal to `total` when the match is over. */
  i: number;
  /** Calls this match (0 without calls), the ones made so far, a kept ball waiting for their next attack. */
  callN: number; made: CallRecord[]; keep: boolean;
  /** Set when a watched match waits for the owner: at half-time, or at a call. */
  stop?: MatchStop;
}

export function startMatch(m: MatchInput): MatchState {
  const r = rng(m.seed);
  const ctx = m.ctx ?? {};
  const conds = new Set(m.conds);
  if (m.opp.abilities.some((a) => a.name === 'Midnight Sun')) conds.add('midnight-sun');
  const has = (n: string) => m.opp.abilities.some((a) => a.name === n);
  const base = { ...m.values };
  for (const p of m.pre) base[p.axis] = clamp(base[p.axis] + p.d, 1, 20);
  if (has('Mistral') && conds.has('windy')) [base.Pace, base.Power] = [base.Power, base.Pace];
  const atkAvg = (base.Pace + base.Power + base.Fuel) / 3, defAvg = (base.Rest + base.Routine + base.Shape) / 3;
  const tempo = m.plan?.tempo === 'quick' ? 1 : m.plan?.tempo === 'patient' ? -1 : 0;
  const total = chanceCount(r()) + 2 * tempo;
  // Sized against your typical shape; with too little history, tonight's, where an unlogged axis counts as no data.
  const ref = m.typical ?? { ...base, ...Object.fromEntries((m.fog ?? []).map((a) => [a, FOG_REF])) };
  const mu = matchup(base, m.opp, ref);
  // the club's modifiers keep their shape (weights) and take their size from the gap
  const weights = (t: Partial<AxisValues>) => {
    const tot = Object.values(t).reduce((a, b) => a + Math.abs(b ?? 0), 0) || 1;
    const o: Partial<AxisValues> = {};
    for (const [a, d] of Object.entries(t) as [Axis, number][]) o[a] = (Math.abs(d) / tot) * 3;
    return o;
  };
  const wS = weights(m.opp.shrinks), wP = weights(m.opp.presses);
  // Tempo (spec §2.4): quick adds one chance each way, patient takes one each way.
  const yours = splitChances(total - 2 * tempo, atkAvg, defAvg, m.opp.reach, r()) + tempo;
  const mins = new Set<number>();
  while (mins.size < total) mins.add(3 + Math.floor(r() * 87));
  const minutes = [...mins].sort((a, b) => a - b);
  if (has('The Edge') && minutes[minutes.length - 1] < 88) { minutes[minutes.length - 1] = 88 + (r() < 0.5 ? 1 : 0); }
  const order = shuffle(r, [...Array(yours).fill('atk'), ...Array(total - yours).fill('def')] as Side[]);
  if (has('Echolocation')) { // no attacks from them in the first half
    const firstHalf = minutes.filter((x) => x <= 45).length;
    const defs = order.filter((s) => s === 'def').length;
    const lateSlots = total - firstHalf;
    if (defs <= lateSlots) for (let i = 0; i < total; i++) order[i] = i < firstHalf ? 'atk' : i - firstHalf < lateSlots - defs ? 'atk' : 'def';
  }
  return {
    m, r, ctx, conds, has, base, mu, wS, wP, total, yours, minutes, order,
    live: { mine: 0, theirs: 0, lastMiss: false, afterGoal: 0, defCount: 0, atkCount: 0, theyConceded: false, iScored: false, used: new Set() },
    chances: [], moments: [], xg: [0, 0],
    wind: m.abilities.some((a) => a.id === 'second-wind'),
    retakes: m.abilities.filter((a) => a.retake),
    scrappy: has('Scrappy') || has('Rekordmeister'),
    flip: has('Beach Wind') ? Math.floor(r() * total) : -1,
    foul: has('Dirty Leeds') || has('Dark arts') ? Math.floor(r() * Math.max(1, yours)) : -1,
    eruption: has('Eruption') && r() < 0.1 ? Math.floor(r() * Math.max(1, total - yours)) : -1,
    slow: has('Slow and Sure'),
    i: 0,
    callN: m.calls ? callCount(m.seed, mu.gap) : 0, made: [], keep: false,
  };
}

/** Picks a kind of chance by its weight. */
function kindOf(side: Side, x: number): ChanceKind {
  let acc = 0;
  for (const k of KINDS[side]) { acc += k.w; if (x < acc) return k; }
  return KINDS[side][KINDS[side].length - 1];
}

interface Sized { side: Side; minute: number; type: string; v: AxisValues; mods: Mod[]; reach: number; pctF: number; r: () => number; fouled: boolean }

/**
 * Sizes chance `i` without playing it: its kind (or the forced one), every modifier and its odds. Pure: draws only
 * from the chance's own sub-seed, so sizing it twice (one call, several options) gives the same numbers.
 */
function sizeChance(st: MatchState, i: number, force?: string): Sized {
  const { m, ctx, conds, has, base, mu, live, order, minutes } = st;
  const r = rng(subSeed(m.seed, i));
  const side = order[i], minute = minutes[i];
  const drawn = kindOf(side, r() * KINDS[side].reduce((t, k) => t + k.w, 0));
  const kind = force ? KINDS[side].find((k) => k.type === force) ?? drawn : drawn;
  const type = kind.type, boost = kind.axis;
  const v = { ...base };
  const mods: Mod[] = m.pre.map((p) => ({ ...p }));
  const add = (mod: Mod) => { v[mod.axis] = clamp(v[mod.axis] + mod.d, 1, 20); mods.push(mod); };
  // 0. fog: an unlogged axis is drawn low for this chance (any knock or card on it still applies)
  for (const a of m.fog ?? []) {
    const d = Math.round((FOG[0] + r() * (FOG[1] - FOG[0]) - m.values[a]) * 4) / 4;
    if (d) add({ axis: a, d, why: 'Not logged', kind: 'fog' });
  }
  // 0b. a night out logged as ranges: Fuel rolls evenly either side of what was logged (never when it is in fog)
  if (m.fuelSpread && !(m.fog ?? []).includes('Fuel')) {
    const d = Math.round((r() * 2 - 1) * m.fuelSpread * 4) / 4;
    if (d) add({ axis: 'Fuel', d, why: 'Night out, logged as a range', kind: 'range' });
  }
  // 1. chance type
  if (boost) add({ axis: boost, d: 2, why: type, kind: 'type' });
  // 2. captain, the home crowd, the plan (the read, a tactic card, the plan for this half) and equipped abilities
  if (m.captain && LIT[side].includes(m.captain)) add({ axis: m.captain, d: 2, why: 'Captain', kind: 'captain' });
  if (!m.neutral) for (const a of LIT[side]) add({ axis: a, d: m.home ? HOME_EDGE : -HOME_EDGE, why: m.home ? 'Home crowd' : 'Away crowd', kind: 'home' });
  for (const p of [...(m.plan?.all ?? []), ...((minute <= 45 ? m.plan?.first : m.plan?.second) ?? [])]) if (p.d && LIT[side].includes(p.axis)) add({ ...p });
  const treeSum: Partial<Record<Axis, number>> = {};
  for (const b of m.abilities) {
    if (b.retake || !b.axis || !b.d || !LIT[side].includes(b.axis) || !braboOk(b, side, minute, type, m.home, live, ctx)) continue;
    let d = b.d;
    if (b.tree) { d = Math.min(d, TREE_CAP - (treeSum[b.axis] ?? 0)); treeSum[b.axis] = (treeSum[b.axis] ?? 0) + Math.max(0, d); }
    if (d > 0) add({ axis: b.axis, d, why: b.name, kind: 'ability' });
  }
  // 3. youth sub from 60'
  if (minute >= 60) for (const b of m.bench) if (LIT[side].includes(b.axis)) add({ axis: b.axis, d: b.plus, why: 'Off the bench', kind: 'sub' });
  // 4. the opponent's shrinks and presses
  const w = side === 'atk' ? st.wS : st.wP;
  for (const a of LIT[side]) {
    const d = -(w[a] ?? 0) * mu.k * (CAL.ref ? v[a] / CAL.ref : 1) - (m.opp.extra ?? 0);
    const q = Math.round(d * 4) / 4;
    if (q) add({ axis: a, d: q, why: m.opp.id.toUpperCase(), kind: 'opp' });
  }
  // 5. hidden, known and rivalry abilities
  const region = mu.region(side, kind.q);
  let reachAdd = 0;
  for (const a of m.opp.abilities) {
    const fx = abilityFx(a, side, minute, type, m.home, live, ctx, conds, r);
    for (const mod of fx.mods) add({ ...mod, kind: isHidden(m, a) ? 'hidden' : 'opp' });
    if (side === 'def') reachAdd += fx.reach;
  }
  if (m.rival) for (const mod of m.rival.mods(minute, side, Boolean(ctx.auto))) if (LIT[side].includes(mod.axis)) add({ ...mod, kind: 'rival' });
  // 6. late tiredness
  if (minute >= 75 && base.Rest < 15) for (const a of LIT[side]) add({ axis: a, d: -1, why: 'Tired legs', kind: 'tired' });
  let reach = region * (1 + reachAdd / REACH_REF);
  if (side === 'def' && st.slow) reach = Math.min(reach, region * 0.6 / REACH_REF);
  // 7. the weekly stack, on attack and defence alike, capped at 15 points of chance
  if (m.stack > 0) {
    const before = pctOf(v, side, reach);
    let lift = 0;
    for (let k = 0; k < Math.min(m.stack, STACK_STEPS.length); k++) {
      const next = lift + STACK_STEPS[k];
      const trial = { ...v };
      for (const a of LIT[side]) trial[a] = clamp(trial[a] + next, 1, 20);
      if (pctOf(trial, side, reach) - before > 0.15) break;
      lift = next;
    }
    if (lift) for (const a of LIT[side]) add({ axis: a, d: lift, why: 'Weekly stack', kind: 'stack' });
  }
  reach = clamp(st.eruption >= 0 && side === 'def' && live.defCount === st.eruption ? MAX_REACH : reach, 0.1, MAX_REACH);
  const fouled = side === 'atk' && st.foul === live.atkCount;
  if (fouled) {
    while (pctOf(v, side, reach) > 0.4 && LIT.atk.some((a) => v[a] > 1)) for (const a of LIT.atk) v[a] = clamp(v[a] - 0.5, 1, 20);
    mods.push({ axis: 'Pace', d: 0, why: has('Dirty Leeds') ? 'Dirty Leeds: fouled down to 40%' : 'Dark arts', kind: 'opp' });
  }
  for (const mod of capChance(v, base, m.condCap)) mods.push(mod);
  return { side, minute, type, v, mods, reach, pctF: pctOf(v, side, reach), r, fouled };
}

/** A landing spot that agrees with an outcome already decided by the shared draw (presentation only). */
function landFor(hex: Pt[], shape: Pt[], ok: boolean, r: () => number): Pt {
  let p = randomIn(hex, r) as Pt;
  for (let k = 0; k < 80 && inside(p, shape) !== ok; k++) p = randomIn(hex, r) as Pt;
  return p;
}

/** The atk axis the moment favours: tonight's strongest of Pace, Power and Fuel (ties in that order). */
const favoured = (st: MatchState): 'Pace' | 'Power' | 'Fuel' => (['Pace', 'Power', 'Fuel'] as const).reduce((b, a) => (st.base[a] > st.base[b] ? a : b), 'Pace');

/** Whether slot `i` (one of yours) is a call: the closest moments weigh most, and every call due is placed. */
function callHere(st: MatchState, i: number): boolean {
  if (!st.callN || st.made.length >= st.callN || st.order[i] !== 'atk') return false;
  const atkLeft = st.order.slice(i).filter((s) => s === 'atk').length;
  if (atkLeft <= st.callN - st.made.length) return true;
  const diff = Math.abs(st.live.mine - st.live.theirs);
  const close = diff === 0 ? 1 : diff === 1 ? 0.8 : 0.12;
  const late = st.minutes[i] >= 55 ? 1 : 0.3;
  return rng(subSeed(st.m.seed, i, 'call'))() < close * late * 0.75;
}

/** The three options at a call, with odds from tonight's numbers through the same sizing as any chance. */
export function offerAt(st: MatchState, i: number): CallOffer {
  // The moment's own chance, on its own axis; a long-range moment goes to tonight's strongest attacking axis instead.
  const drawn = kindOf('atk', rng(subSeed(st.m.seed, i))() * KINDS.atk.reduce((t, k) => t + k.w, 0));
  const ax = (drawn.axis as 'Pace' | 'Power' | 'Fuel' | null) ?? favoured(st);
  const takeType = drawn.axis ? drawn.type : TAKE_KIND[ax];
  const take = Math.round(sizeChance(st, i, takeType).pctF * 100);
  const shoot = Math.round(sizeChance(st, i, 'Long shot').pctF * 100);
  const theirsLeft = st.order.slice(i + 1).includes('def');
  const options: CallOption[] = [
    { pick: 'take', pct: take, axis: ax, type: takeType },
    { pick: 'shoot', pct: shoot, type: 'Long shot' },
    { pick: 'keep', pct: theirsLeft ? Math.round(KEEP_STOP * 100) : 0 },
  ];
  // The assistant takes the best odds (owner, 12 Nov): the option worth most, ties to taking it on.
  const best = options.reduce((b, o) => (o.pct > b.pct ? o : b), options[0]).pick;
  return { slot: i, minute: st.minutes[i], n: st.made.length + 1, of: st.callN, score: [st.live.mine, st.live.theirs], options, best };
}

/** Plays the next chance and returns it (undefined once all are played, or while the match waits for the owner). */
export function nextChance(st: MatchState): ChanceEvent | undefined {
  if (st.i >= st.total || st.stop) return undefined;
  const { m, has, live, order } = st;
  const i = st.i;
  // A watched match stops at half-time, so the plan can change before the second half.
  if (m.watch && !m.halfSeen && st.minutes[i] > 45 && !st.chances.some((c) => c.minute > 45)) { st.stop = { kind: 'half' }; return undefined; }
  let call: CallRecord | undefined;
  let force: string | undefined;
  if (callHere(st, i)) {
    const offer = offerAt(st, i);
    const k = st.made.length;
    let pick = m.calls?.[k], by: CallRecord['by'] = 'you';
    if (!pick) {
      if (m.watch) { st.stop = { kind: 'call', offer }; return undefined; }
      pick = offer.best; by = 'assistant';
    }
    const opt = (p: CallPick) => offer.options.find((o) => o.pick === p)!;
    call = {
      slot: i, minute: offer.minute, n: offer.n, of: offer.of, score: offer.score, pick, by,
      odds: { take: opt('take').pct, shoot: opt('shoot').pct, ...(opt('keep').pct ? { keep: opt('keep').pct } : {}) },
      takeAxis: opt('take').axis!, takeType: opt('take').type!,
    };
    st.made.push(call);
    if (pick === 'keep') {
      // No chance now: the slot passes without a shot, and their next attack is easier to stop.
      st.i++;
      st.keep = true;
      const ev: ChanceEvent = { minute: offer.minute, side: 'atk', type: 'Kept the ball', mods: [], values: { ...st.base }, reach: 0, pct: 0, land: [0, 0], ok: false, glDist: null, kept: true };
      st.chances.push(ev);
      return ev;
    }
    force = pick === 'take' ? call.takeType : 'Long shot';
  }
  st.i++;
  const sz = sizeChance(st, i, force);
  const { side, minute, type, v, mods, reach, r } = sz;
  if (sz.fouled) st.foul = -1;
  let pctF = sz.pctF;
  const keepBonus = side === 'def' && st.keep;
  if (keepBonus) { pctF = Math.min(0.99, pctF + KEEP_STOP); st.keep = false; mods.push({ axis: 'Rest', d: 0, why: 'Kept the ball: 15 points easier to stop', kind: 'call' }); }
  const pct = Math.round(pctF * 100);
  const shape = shapeOf(v, side);
  const hex = hexagon(reach);
  let land: Pt, ok: boolean;
  const ev: ChanceEvent = { minute, side, type, mods, values: v, reach, pct, land: [0, 0], ok: false, glDist: null };
  if (call || keepBonus) {
    // Honest dice with choices: one shared draw u decides it; the odds shown are exactly the odds used.
    const u = rng(subSeed(m.seed, i, 'u'))();
    ok = u < pctF;
    land = landFor(hex, shape, ok, r);
    ev.land = land;
  } else {
    land = randomIn(hex, r) as Pt;
    ok = inside(land, shape);
    ev.land = land;
    // second wind, and rebounds for Scrappy-type clubs
    const tr = side === 'atk' && !ok && pct >= 30 && !st.wind ? st.retakes.find((a) => !live.used.has(a.id) && braboOk(a, side, minute, type, m.home, live, st.ctx)) : undefined;
    if (side === 'atk' && !ok && st.wind && pct >= 30) {
      st.wind = false;
      land = randomIn(hex, r); ok = inside(land, shape);
      ev.retake = { land, ok, why: 'Second wind' };
    } else if (tr) {
      live.used.add(tr.id);
      land = randomIn(hex, r); ok = inside(land, shape);
      ev.retake = { land, ok, why: tr.name };
    } else if (side === 'def' && ok && st.scrappy) {
      st.scrappy = false;
      land = randomIn(hex, r); ok = inside(land, shape);
      ev.retake = { land, ok, why: has('Scrappy') ? 'Scrappy' : 'Rekordmeister' };
    }
    if (st.flip === i) { ok = !ok; ev.retake = { land, ok, why: 'Beach Wind' }; st.flip = -1; }
    if (side === 'atk' && ok && has('Iron') && live.mine >= 3) { ok = false; ev.retake = { land, ok, why: 'Iron' }; }
    if (side === 'def' && ok && has('Homing') && !m.home && live.theirs === 0 && order.slice(i + 1).every((s) => s === 'atk')) { ok = false; ev.retake = { land, ok, why: 'Homing' }; }
  }
  ev.ok = ok;
  const d = edgeDistance(land, shape);
  ev.glDist = d < GOAL_LINE ? d : null;
  if (side === 'atk') {
    st.xg[0] += pctF;
    live.atkCount++;
    if (ok) { live.mine++; live.iScored = true; live.theyConceded = true; if (pct <= 20) { ev.tag = 'SCREAMER'; st.moments.push(`SCREAMER: ${pct}% and in, ${minute}'`); } }
    else if (pct >= 70) { ev.tag = 'HEARTBREAK'; st.moments.push(`HEARTBREAK: ${pct}% and missed, ${minute}'`); }
    live.lastMiss = !ok;
    if (live.afterGoal > 0) live.afterGoal--;
  } else {
    st.xg[1] += 1 - pctF;
    live.defCount++;
    if (ok) { live.saved = true; if (pct <= 25) { ev.tag = 'WONDER SAVE'; st.moments.push(`WONDER SAVE: ${pct}% to stop it, ${minute}'`); } }
    else { live.theirs++; live.afterGoal = 2; if (pct >= 70) st.moments.push(`Conceded with ${pct}% to save, ${minute}'`); }
    live.lastMiss = false;
  }
  st.chances.push(ev);
  return ev;
}

export function finishMatch(st: MatchState): MatchEvents {
  const { m, ctx, live, xg } = st;
  const hidden = m.opp.abilities.find((a) => isHidden(m, a));
  return {
    seed: m.seed, chances: st.chances, score: [live.mine, live.theirs],
    xg: [Math.round(xg[0] * 100) / 100, Math.round(xg[1] * 100) / 100], moments: st.moments,
    ...(m.calls ? { calls: st.made } : {}),
    revealed: ctx.firstMeeting && hidden ? hidden.name : undefined,
  };
}

/** One whole match, start to finish. */
export function playMatch(m: MatchInput): MatchEvents {
  const st = startMatch(m);
  while (nextChance(st)) { /* every chance in order */ }
  return finishMatch(st);
}
/** The last ability of a quirky or Old Self club is its hidden one. */
function isHidden(m: MatchInput, a: AbilityDef) { return m.opp.hidden === a.name; }
