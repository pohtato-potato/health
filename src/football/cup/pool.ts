// The card pool beyond the starting twelve (spec §10, about sixty at launch). Each card is data: its axis, its role in
// the move, its cost, and what it does at basic, good and great. match.ts plays every one of them through the same
// effect rules, so a new card is a new row here, not new code. Names are football's own words, nothing from anyone's
// data. Numbers are (tune), set by the run simulation (tests/football/cup/run-sim.test.ts).
import type { Axis } from '../types';
import type { Level } from './types';

export type Role = 'pass' | 'carry' | 'finish' | 'stamina' | 'cover' | 'recycle' | 'system' | 'wild';

/** What a card does when played. Every field is optional; the role decides how the ball moves. */
export interface Fx {
  /** Pass: build-up added (default the match's pass value). */
  pass?: number;
  /** A quick pass: counts towards the One-two combination. */
  quick?: boolean;
  /** Zones the ball moves (passes and carries move one unless this says otherwise; 0 keeps it where it is). */
  zones?: number;
  /** Build-up added without a pass. */
  build?: number;
  draw?: number;
  stamina?: number; nextStamina?: number; nextDraw?: number;
  freeRecycles?: number; freePass?: boolean; makeOneTwo?: number;
  cover?: number; coverPerPass?: number; fit?: number;
  /** Takes this much off their attack this spell. */
  threatDown?: number;
  /** Cover from this card also counts next spell. */
  keepCover?: boolean;
  /** Adds to the shot of this move's finish. */
  shotUp?: number;
  // Finishes
  shot?: number; perPass?: number; fromMid?: boolean; anywhere?: boolean;
  /** A finish that misses leaves the ball in the final third with the build-up kept. */
  rebound?: boolean;
  // Systems: stay in play all match
  sysRecycleCover?: number; sysPassBuild?: number; sysShot?: number; sysSpellCover?: number; sysSpellFit?: number;
  sysSpellDraw?: number; sysSpellStamina?: number; sysCarryDraw?: number;
}

export interface PoolDef { id: string; title: string; axis: Axis; role: Role; cost: number; fx: [Fx, Fx, Fx] }

const P = (id: string, title: string, axis: Axis, role: Role, cost: number, basic: Fx, good: Fx, great: Fx): PoolDef => ({ id, title, axis, role, cost, fx: [basic, good, great] });

export const POOL: PoolDef[] = [
  // Pace: passes and carries, cheap and many
  P('give-and-go', 'Give and go', 'Pace', 'pass', 0, { quick: true, draw: 1 }, { quick: true, draw: 1, pass: 0.75 }, { quick: true, draw: 2 }),
  P('first-time', 'First-time ball', 'Pace', 'pass', 0, { quick: true }, { quick: true, pass: 0.75 }, { quick: true, pass: 1 }),
  P('wall-pass', 'Wall pass', 'Pace', 'pass', 0, { quick: true, makeOneTwo: 1 }, { quick: true, makeOneTwo: 1, draw: 1 }, { quick: true, makeOneTwo: 2 }),
  P('tiki-taka', 'Tiki-taka', 'Pace', 'pass', 0, { quick: true, zones: 0, pass: 0.5 }, { quick: true, zones: 0, pass: 0.5, draw: 1 }, { quick: true, zones: 0, pass: 0.75, draw: 1 }),
  P('quick-throw', 'Quick throw', 'Pace', 'pass', 0, { zones: 0, pass: 0.5, cover: 1 }, { zones: 0, pass: 0.5, cover: 2 }, { zones: 0, pass: 0.75, cover: 3 }),
  P('burst', 'Burst of pace', 'Pace', 'carry', 0, {}, { draw: 1 }, { draw: 1, freePass: true }),
  P('in-behind', 'Run in behind', 'Pace', 'carry', 1, { zones: 2 }, { zones: 2, draw: 1 }, { zones: 2, draw: 2 }),
  P('dribble', 'Take him on', 'Pace', 'carry', 1, { draw: 1, shotUp: 1 }, { draw: 1, shotUp: 2 }, { draw: 2, shotUp: 3 }),
  P('cut-back', 'Cut-back', 'Pace', 'pass', 1, { shotUp: 2 }, { shotUp: 3 }, { shotUp: 4, draw: 1 }),
  P('switch-flank', 'Switch the flank', 'Pace', 'pass', 1, { pass: 1 }, { pass: 1, draw: 1 }, { pass: 1.5, draw: 1 }),

  // Power: finishes
  P('tap-in', 'Tap-in', 'Power', 'finish', 0, { shot: 4 }, { shot: 5 }, { shot: 6 }),
  P('volley', 'Volley', 'Power', 'finish', 1, { shot: 5, perPass: 1 }, { shot: 6, perPass: 1 }, { shot: 6, perPass: 2 }),
  P('curler', 'Curler', 'Power', 'finish', 1, { shot: 5, fromMid: true }, { shot: 6, fromMid: true }, { shot: 7, fromMid: true }),
  P('diving-header', 'Diving header', 'Power', 'finish', 1, { shot: 3, perPass: 2 }, { shot: 4, perPass: 3 }, { shot: 5, perPass: 3 }),
  P('long-range', 'Long-range effort', 'Power', 'finish', 2, { shot: 5, anywhere: true }, { shot: 6, anywhere: true }, { shot: 8, anywhere: true }),
  P('power-drive', 'Power drive', 'Power', 'finish', 2, { shot: 10 }, { shot: 11 }, { shot: 13 }),
  P('follow-up', 'Follow-up', 'Power', 'finish', 0, { shot: 3, rebound: true }, { shot: 4, rebound: true }, { shot: 5, rebound: true }),
  P('near-post', 'Near post', 'Power', 'finish', 1, { shot: 6, rebound: true }, { shot: 7, rebound: true }, { shot: 8, rebound: true, draw: 1 }),
  P('bicycle', 'Bicycle kick', 'Power', 'finish', 3, { shot: 13 }, { shot: 15 }, { shot: 17 }),
  P('chip', 'Chip the keeper', 'Power', 'finish', 1, { shot: 4, perPass: 1, fromMid: true }, { shot: 5, perPass: 1, fromMid: true }, { shot: 6, perPass: 2, fromMid: true }),

  // Fuel: stamina
  P('orange-slices', 'Orange slices', 'Fuel', 'stamina', 0, { stamina: 1, fit: 1 }, { stamina: 1, fit: 2, draw: 1 }, { stamina: 2, fit: 2 }),
  P('energy-gel', 'Energy gel', 'Fuel', 'stamina', 1, { stamina: 2 }, { stamina: 2, draw: 1 }, { stamina: 3 }),
  P('carb-load', 'Big lunch', 'Fuel', 'stamina', 0, { nextStamina: 2 }, { nextStamina: 3 }, { nextStamina: 3, nextDraw: 1 }),
  P('water-break', 'Water break', 'Fuel', 'stamina', 0, { fit: 3 }, { fit: 4, draw: 1 }, { fit: 6, draw: 1 }),
  P('recovery-shake', 'Recovery shake', 'Fuel', 'stamina', 1, { fit: 6 }, { fit: 8 }, { fit: 10, stamina: 1 }),
  P('banana', 'Banana on the bench', 'Fuel', 'stamina', 0, { stamina: 1 }, { stamina: 1, draw: 1 }, { stamina: 1, draw: 2 }),
  P('pre-match-meal', 'Pre-match meal', 'Fuel', 'system', 2, { sysSpellStamina: 1 }, { sysSpellStamina: 1, sysSpellFit: 1 }, { sysSpellStamina: 1, sysSpellFit: 2 }),
  P('second-half', 'Second-half legs', 'Fuel', 'stamina', 1, { stamina: 1, nextStamina: 1 }, { stamina: 2, nextStamina: 1 }, { stamina: 2, nextStamina: 2 }),
  P('half-time-tea', 'Half-time tea', 'Fuel', 'stamina', 0, { nextStamina: 1, fit: 2 }, { nextStamina: 1, fit: 3, draw: 1 }, { nextStamina: 2, fit: 4 }),
  P('third-lung', 'Third lung', 'Fuel', 'stamina', 0, { stamina: 1, cover: 2 }, { stamina: 1, cover: 3 }, { stamina: 2, cover: 3 }),

  // Rest: cover and fresh legs
  P('last-ditch', 'Last-ditch tackle', 'Rest', 'cover', 2, { cover: 10 }, { cover: 12 }, { cover: 14 }),
  P('body-on-line', 'Body on the line', 'Rest', 'cover', 0, { cover: 3 }, { cover: 4 }, { cover: 5 }),
  P('sweeper', 'Sweeper keeper', 'Rest', 'cover', 1, { cover: 5, draw: 1 }, { cover: 6, draw: 1 }, { cover: 7, draw: 2 }),
  P('track-back', 'Track back', 'Rest', 'cover', 1, { threatDown: 4 }, { threatDown: 5 }, { threatDown: 7 }),
  P('power-nap', 'Power nap', 'Rest', 'cover', 1, { cover: 2, fit: 4 }, { cover: 3, fit: 6 }, { cover: 4, fit: 8 }),
  P('compact', 'Stay compact', 'Rest', 'cover', 1, { cover: 5, keepCover: true }, { cover: 6, keepCover: true }, { cover: 7, keepCover: true }),
  P('recovery-run', 'Recovery run', 'Rest', 'cover', 1, { cover: 3, coverPerPass: 1 }, { cover: 4, coverPerPass: 1 }, { cover: 4, coverPerPass: 2 }),
  P('offside-trap', 'Offside trap', 'Rest', 'cover', 0, { threatDown: 2 }, { threatDown: 3 }, { threatDown: 4 }),
  P('cool-head', 'Cool head', 'Rest', 'cover', 1, { cover: 4, stamina: 1 }, { cover: 5, stamina: 1 }, { cover: 6, stamina: 1, draw: 1 }),
  P('early-night', 'Early night', 'Rest', 'cover', 0, { fit: 3 }, { fit: 4, cover: 2 }, { fit: 5, cover: 3 }),

  // Routine: drilled moves, draw and recycle
  P('rondo-warmup', 'Rondo warm-up', 'Routine', 'recycle', 0, { freeRecycles: 1 }, { freeRecycles: 2 }, { freeRecycles: 2, draw: 1 }),
  P('training-move', 'Training-ground move', 'Routine', 'recycle', 1, { build: 1 }, { build: 1, draw: 1 }, { build: 1.5, draw: 1 }),
  P('video-session', 'Video session', 'Routine', 'recycle', 1, { draw: 2 }, { draw: 3 }, { draw: 3, stamina: 1 }),
  P('notes-at-break', 'Notes at the break', 'Routine', 'recycle', 0, { nextDraw: 1 }, { nextDraw: 2 }, { nextDraw: 2, nextStamina: 1 }),
  P('same-as-tuesday', 'Same as Tuesday', 'Routine', 'recycle', 0, { draw: 1 }, { draw: 1, freeRecycles: 1 }, { draw: 2, freeRecycles: 1 }),
  P('back-to-keeper', 'Back to the keeper', 'Routine', 'pass', 0, { zones: 0, pass: 0.25, draw: 1, cover: 1 }, { zones: 0, pass: 0.5, draw: 1, cover: 2 }, { zones: 0, pass: 0.5, draw: 2, cover: 2 }),
  P('checklist', 'The checklist', 'Routine', 'recycle', 1, { freeRecycles: 2, cover: 2 }, { freeRecycles: 3, cover: 2 }, { freeRecycles: 3, cover: 4 }),
  P('set-piece', 'Set-piece routine', 'Routine', 'recycle', 1, { shotUp: 3, zones: 1 }, { shotUp: 4, zones: 1 }, { shotUp: 5, zones: 1, draw: 1 }),
  P('pre-match-routine', 'Pre-match routine', 'Routine', 'system', 2, { sysSpellDraw: 1 }, { sysSpellDraw: 1, sysRecycleCover: 1 }, { sysSpellDraw: 2 }),
  P('kit-laid-out', 'Kit laid out', 'Routine', 'recycle', 0, { freeRecycles: 1, cover: 2 }, { freeRecycles: 1, cover: 3 }, { freeRecycles: 2, cover: 3 }),

  // Shape: systems that stay in play
  P('back-four', 'Flat back four', 'Shape', 'system', 2, { sysSpellCover: 3 }, { sysSpellCover: 4 }, { sysSpellCover: 5 }),
  P('false-nine', 'False nine', 'Shape', 'system', 2, { sysShot: 1 }, { sysShot: 2 }, { sysShot: 3 }),
  P('wing-backs', 'Wing-backs', 'Shape', 'system', 2, { sysCarryDraw: 1 }, { sysCarryDraw: 1, sysSpellCover: 1 }, { sysCarryDraw: 2 }),
  P('high-line', 'High line', 'Shape', 'system', 2, { sysPassBuild: 0.25 }, { sysPassBuild: 0.25, sysShot: 1 }, { sysPassBuild: 0.5 }),
  P('double-pivot', 'Double pivot', 'Shape', 'system', 2, { sysSpellFit: 2, sysSpellCover: 1 }, { sysSpellFit: 3, sysSpellCover: 1 }, { sysSpellFit: 3, sysSpellCover: 3 }),
  P('hold-shape', 'Hold the shape', 'Shape', 'cover', 1, { cover: 4, build: 0.5 }, { cover: 5, build: 0.5 }, { cover: 6, build: 1 }),
  P('inverted-fullback', 'Inverted full-back', 'Shape', 'pass', 0, { cover: 2 }, { cover: 3 }, { cover: 3, draw: 1 }),
  P('diamond', 'The diamond', 'Shape', 'system', 2, { sysRecycleCover: 1, sysPassBuild: 0.25 }, { sysRecycleCover: 2, sysPassBuild: 0.25 }, { sysRecycleCover: 2, sysPassBuild: 0.5 }),
  P('mirror-image', 'Mirror image', 'Shape', 'cover', 1, { threatDown: 2, cover: 2 }, { threatDown: 3, cover: 3 }, { threatDown: 4, cover: 4 }),
  P('blackboard', 'The blackboard', 'Shape', 'recycle', 1, { build: 0.5, draw: 1 }, { build: 0.5, draw: 2 }, { build: 1, draw: 2 }),
];

export type PoolId = string;
const BY = new Map(POOL.map((d) => [d.id, d]));
export const poolDef = (id: string): PoolDef | undefined => BY.get(id);
export const isPool = (kind: string) => BY.has(kind);
export const LV_INDEX: Record<Level, 0 | 1 | 2> = { basic: 0, good: 1, great: 2 };
export const fxOf = (id: string, lv: Level): Fx => BY.get(id)!.fx[LV_INDEX[lv]];
