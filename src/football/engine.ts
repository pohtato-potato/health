// One match from stored inputs to stored events (spec §7.2–7.3). Pure and seeded.
import type { AbilityDef } from './data/load';
import { CAL, type Opponent } from './opponent';
import { coverage, edgeDistance, hexagon, inside, polygon, radii, randomIn, LIT, type Pt } from './radar';
import { rng, shuffle } from './rng';
import { clamp, type Axis, type AxisValues, type BraboAbility, type ChanceEvent, type Comp, type MatchEvents, type Mod, type RivalTwist, type Side } from './types';

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
  ctx?: MatchCtx;
}

export const TYPES: Record<Side, [string, Axis | null][]> = {
  atk: [['Counter-attack', 'Pace'], ['Set piece', 'Power'], ['Through ball', 'Fuel'], ['Long shot', null]],
  def: [['Cross into the box', 'Rest'], ['Corner', 'Routine'], ['Break through the middle', 'Shape'], ['Long-range effort', null]],
};
export const STACK_STEPS = [1, 0.75, 0.5, 0.25];
export const GOAL_LINE = 7 / 112;
const FULL = hexagon(1);

export const chanceCount = (atkAvg: number, coin: number) => clamp(5 + Math.floor((atkAvg - 10) / 4) + coin, 5, 8);
/** Your share of the chances. `coin` in [0, 1) rounds the share up or down fairly (0.5 = ordinary rounding). */
export const splitChances = (total: number, atkAvg: number, reach: number, coin = 0.5) =>
  clamp(Math.floor(total * (0.5 + (atkAvg - 13) / 30 - (reach - 0.75)) + coin), 2, total - 2);
const shapeOf = (v: AxisValues, side: Side) => polygon(radii(v, side));

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
/** The region radius at which your shape covers `target` of it. */
export function evenRegion(v: AxisValues, side: Side, target: number): number {
  const shape = shapeOf(v, side);
  let lo = 0.02, hi = 1.6;
  for (let k = 0; k < 26; k++) { const mid = (lo + hi) / 2; if (coverage(hexagon(mid), shape) > target) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
/**
 * Landing regions and modifier size for this opponent against this night (Task 1.7 ruling).
 * At an even match each side converts CAL.t of its chances; the rating gap widens both regions.
 */
export function matchup(v: AxisValues, opp: Opponent): { gap: number; atk: number; def: number; k: number } {
  const raw = opp.rating - parityRating(v);
  const bent = raw > 0 && CAL.C ? (raw * raw) / CAL.C : raw;
  const gap = CAL.G ? CAL.G * Math.tanh(bent / CAL.G) : bent;
  return {
    gap,
    atk: clamp(evenRegion(v, 'atk', CAL.t) * (1 + CAL.s * gap), 0.1, 1.6),
    def: clamp(evenRegion(v, 'def', 1 - CAL.t) * (1 + CAL.s * gap), 0.1, 1.6),
    k: CAL.floor + CAL.per * Math.max(0, gap),
  };
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
  if (b.side && b.side !== side) return false;
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

export function playMatch(m: MatchInput): MatchEvents {
  const r = rng(m.seed);
  const ctx = m.ctx ?? {};
  const conds = new Set(m.conds);
  if (m.opp.abilities.some((a) => a.name === 'Midnight Sun')) conds.add('midnight-sun');
  const has = (n: string) => m.opp.abilities.some((a) => a.name === n);
  const base = { ...m.values };
  for (const p of m.pre) base[p.axis] = clamp(base[p.axis] + p.d, 1, 20);
  if (has('Mistral') && conds.has('windy')) [base.Pace, base.Power] = [base.Power, base.Pace];
  const atkAvg = (base.Pace + base.Power + base.Fuel) / 3;
  const total = chanceCount(atkAvg, r() < 0.5 ? 1 : 0);
  const mu = matchup(base, m.opp);
  let reach0 = mu.def;
  if (has('Slow and Sure')) reach0 = Math.min(reach0, 0.6);
  // the club's modifiers keep their shape (weights) and take their size from the gap
  const weights = (t: Partial<AxisValues>) => {
    const tot = Object.values(t).reduce((a, b) => a + Math.abs(b ?? 0), 0) || 1;
    const o: Partial<AxisValues> = {};
    for (const [a, d] of Object.entries(t) as [Axis, number][]) o[a] = (Math.abs(d) / tot) * 3;
    return o;
  };
  const wS = weights(m.opp.shrinks), wP = weights(m.opp.presses);
  const yours = splitChances(total, atkAvg, m.opp.reach, r());
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
  const live: Live = { mine: 0, theirs: 0, lastMiss: false, afterGoal: 0, defCount: 0, atkCount: 0, theyConceded: false, iScored: false, used: new Set() };
  const chances: ChanceEvent[] = [];
  const moments: string[] = [];
  const xg: [number, number] = [0, 0];
  let wind = m.abilities.some((a) => a.id === 'second-wind');
  const retakes = m.abilities.filter((a) => a.retake);
  let scrappy = has('Scrappy') || has('Rekordmeister');
  let flip = has('Beach Wind') ? Math.floor(r() * total) : -1;
  let foul = has('Dirty Leeds') || has('Dark arts') ? Math.floor(r() * Math.max(1, yours)) : -1;
  const eruption = has('Eruption') && r() < 0.1 ? Math.floor(r() * Math.max(1, total - yours)) : -1;

  for (let i = 0; i < total; i++) {
    const side = order[i], minute = minutes[i];
    const [type, boost] = TYPES[side][Math.floor(r() * 4)];
    const v = { ...base };
    const mods: Mod[] = m.pre.map((p) => ({ ...p }));
    const add = (mod: Mod) => { v[mod.axis] = clamp(v[mod.axis] + mod.d, 1, 20); mods.push(mod); };
    // 1. chance type
    if (boost) add({ axis: boost, d: 2, why: type, kind: 'type' });
    // 2. captain and equipped abilities
    if (m.captain && LIT[side].includes(m.captain)) add({ axis: m.captain, d: 2, why: 'Captain', kind: 'captain' });
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
    const w = side === 'atk' ? wS : wP;
    for (const a of LIT[side]) {
      const d = -(w[a] ?? 0) * mu.k * (CAL.ref ? v[a] / CAL.ref : 1) - (m.opp.extra ?? 0);
      const q = Math.round(d * 4) / 4;
      if (q) add({ axis: a, d: q, why: m.opp.id.toUpperCase(), kind: 'opp' });
    }
    // 5. hidden, known and rivalry abilities
    let reach: number = side === 'def' ? reach0 : mu.atk;
    for (const a of m.opp.abilities) {
      const fx = abilityFx(a, side, minute, type, m.home, live, ctx, conds, r);
      for (const mod of fx.mods) add({ ...mod, kind: isHidden(m, a) ? 'hidden' : 'opp' });
      if (side === 'def') reach += fx.reach;
    }
    if (m.rival) for (const mod of m.rival.mods(minute, side, Boolean(ctx.auto))) if (LIT[side].includes(mod.axis)) add({ ...mod, kind: 'rival' });
    // 6. late tiredness
    if (minute >= 75 && base.Rest < 15) for (const a of LIT[side]) add({ axis: a, d: -1, why: 'Tired legs', kind: 'tired' });
    // 7. the weekly stack, capped at 15 points of chance
    if (side === 'atk' && m.stack > 0) {
      const before = pctOf(v, side, reach);
      let lift = 0;
      for (let k = 0; k < Math.min(m.stack, STACK_STEPS.length); k++) {
        const next = lift + STACK_STEPS[k];
        const trial = { ...v };
        for (const a of LIT.atk) trial[a] = clamp(trial[a] + next, 1, 20);
        if (pctOf(trial, side, reach) - before > 0.15) break;
        lift = next;
      }
      if (lift) for (const a of LIT.atk) add({ axis: a, d: lift, why: 'Weekly stack', kind: 'stack' });
    }
    reach = clamp(eruption >= 0 && side === 'def' && live.defCount === eruption ? 1.6 : reach, 0.1, 1.6);
    if (side === 'atk' && foul === live.atkCount) {
      while (pctOf(v, side, reach) > 0.4 && LIT.atk.some((a) => v[a] > 1)) for (const a of LIT.atk) v[a] = clamp(v[a] - 0.5, 1, 20);
      mods.push({ axis: 'Pace', d: 0, why: has('Dirty Leeds') ? 'Dirty Leeds: fouled down to 40%' : 'Dark arts', kind: 'opp' });
      foul = -1;
    }
    const pctF = pctOf(v, side, reach);
    const pct = Math.round(pctF * 100);
    const shape = shapeOf(v, side);
    const region = hexagon(reach);
    let land = randomIn(region, r) as Pt;
    let ok = inside(land, shape);
    const ev: ChanceEvent = { minute, side, type, mods, values: v, reach, pct, land, ok, glDist: null };
    // second wind, and rebounds for Scrappy-type clubs
    const tr = side === 'atk' && !ok && pct >= 30 && !wind ? retakes.find((a) => !live.used.has(a.id) && braboOk(a, side, minute, type, m.home, live, ctx)) : undefined;
    if (side === 'atk' && !ok && wind && pct >= 30) {
      wind = false;
      land = randomIn(region, r); ok = inside(land, shape);
      ev.retake = { land, ok, why: 'Second wind' };
    } else if (tr) {
      live.used.add(tr.id);
      land = randomIn(region, r); ok = inside(land, shape);
      ev.retake = { land, ok, why: tr.name };
    } else if (side === 'def' && ok && scrappy) {
      scrappy = false;
      land = randomIn(region, r); ok = inside(land, shape);
      ev.retake = { land, ok, why: has('Scrappy') ? 'Scrappy' : 'Rekordmeister' };
    }
    if (flip === i) { ok = !ok; ev.retake = { land, ok, why: 'Beach Wind' }; flip = -1; }
    if (side === 'atk' && ok && has('Iron') && live.mine >= 3) { ok = false; ev.retake = { land, ok, why: 'Iron' }; }
    if (side === 'def' && ok && has('Homing') && !m.home && live.theirs === 0 && order.slice(i + 1).every((s) => s === 'atk')) { ok = false; ev.retake = { land, ok, why: 'Homing' }; }
    ev.ok = ok;
    const d = edgeDistance(land, shape);
    ev.glDist = d < GOAL_LINE ? d : null;
    if (side === 'atk') {
      xg[0] += pctF;
      live.atkCount++;
      if (ok) { live.mine++; live.iScored = true; live.theyConceded = true; if (pct <= 20) { ev.tag = 'SCREAMER'; moments.push(`SCREAMER: ${pct}% and in, ${minute}'`); } }
      else if (pct >= 70) { ev.tag = 'HEARTBREAK'; moments.push(`HEARTBREAK: ${pct}% and missed, ${minute}'`); }
      live.lastMiss = !ok;
      if (live.afterGoal > 0) live.afterGoal--;
    } else {
      xg[1] += 1 - pctF;
      live.defCount++;
      if (ok) { live.saved = true; if (pct <= 25) { ev.tag = 'WONDER SAVE'; moments.push(`WONDER SAVE: ${pct}% to stop it, ${minute}'`); } }
      else { live.theirs++; live.afterGoal = 2; if (pct >= 70) moments.push(`Conceded with ${pct}% to save, ${minute}'`); }
      live.lastMiss = false;
    }
    chances.push(ev);
  }
  const hidden = m.opp.abilities.find((a) => isHidden(m, a));
  return {
    seed: m.seed, chances, score: [live.mine, live.theirs],
    xg: [Math.round(xg[0] * 100) / 100, Math.round(xg[1] * 100) / 100], moments,
    revealed: ctx.firstMeeting && hidden ? hidden.name : undefined,
  };
}
/** The last ability of a quirky or Old Self club is its hidden one. */
function isHidden(m: MatchInput, a: AbilityDef) { return m.opp.hidden === a.name; }
