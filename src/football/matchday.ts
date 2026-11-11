// Matchday depth (spec 2026-11-12 §2.4–2.6). Pure: the plan (tactic, tempo, width), the read against a scouted club,
// what the engine is handed for the plan per half, and the pick of three after a win. Small by design.
import type { MatchPlan, Tempo } from './engine';
import { hashSeed, rng, shuffle } from './rng';
import { TACTIC_FX, TACTIC_NAME, type Tactic } from './rotation/night';
import { AXES, type Axis, type Mod } from './types';

export type Width = 'left' | 'middle' | 'right';
export const WIDTHS: Width[] = ['left', 'middle', 'right'];
export const WIDTH_NAME: Record<Width, string> = { left: 'Down the left', middle: 'Through the middle', right: 'Down the right' };
export const TEMPOS: Tempo[] = ['patient', 'normal', 'quick'];
export const TEMPO_NAME: Record<Tempo, string> = { patient: 'Patient', normal: 'Normal', quick: 'Quick' };

/** The plan for one match day. Tactic unset: the assistant's; tempo Normal; width Middle; no card played. */
export interface MatchdayPlan { tactic?: Tactic; tempo?: Tempo; width?: Width; card?: Axis }

/** Each league club's weak side, from its id: derived, never stored. */
export const weakSide = (clubId: string): Width => WIDTHS[hashSeed('weak-side', clubId) % 3];

/**
 * The tactic that answers each style: press beats possession and direct, hold beats counter and flair, counter beats
 * press and grit (spec §2.5). Low-block and chaos are this fork's call: a press unsettles a deep block, holding
 * shape outlasts chaos.
 */
export const ANSWER: Record<string, Tactic> = { possession: 'press', direct: 'press', counter: 'hold', flair: 'hold', press: 'counter', grit: 'counter', 'low-block': 'press', chaos: 'hold' };
/** The axis a right tactic read lifts: the tactic's own. */
export const READ_AXIS: Record<Tactic, Axis> = { press: 'Fuel', hold: 'Shape', counter: 'Pace' };
/** The axis a right width read lifts: wide on the left is pace, the middle is the pass, the right is the finish. */
export const WIDTH_AXIS: Record<Width, Axis> = { left: 'Pace', middle: 'Fuel', right: 'Power' };
/** Most tactic cards held at once. */
export const CARD_MAX = 3;

export interface Read { scouted: boolean; weak: Width; answer?: Tactic; tacticRight: boolean; widthRight: boolean; mods: Mod[]; line: string }
/** Your plan against what the scouts saw. +1 for each right read, +2 at most; a wrong read costs nothing. */
export function readOf(plan: MatchdayPlan, club: { id: string; style: string }, scouted: boolean): Read {
  const weak = weakSide(club.id), answer = ANSWER[club.style];
  if (!scouted) return { scouted, weak, tacticRight: false, widthRight: false, mods: [], line: 'Not scouted yet' };
  const tactic = plan.tactic, width = plan.width ?? 'middle';
  const tacticRight = Boolean(tactic && tactic === answer), widthRight = width === weak;
  const mods: Mod[] = [];
  if (tacticRight) mods.push({ axis: READ_AXIS[tactic!], d: 1, why: `Good read: ${TACTIC_NAME[tactic!]} answers them`, kind: 'plan' });
  if (widthRight) mods.push({ axis: WIDTH_AXIS[width], d: 1, why: 'Good read: into their weak side', kind: 'plan' });
  const line = tacticRight && widthRight ? 'Your plan plays into their weak side. Good read.'
    : tacticRight ? `${TACTIC_NAME[tactic!]} answers how they play. Their weak side is ${WIDTH_NAME[weak].toLowerCase()}.`
    : widthRight ? `Into their weak side, but ${TACTIC_NAME[answer] ?? 'another plan'} would answer how they play.`
    : `No edge tonight: ${TACTIC_NAME[answer] ?? 'another plan'}, ${WIDTH_NAME[weak].toLowerCase()}, would find one.`;
  return { scouted, weak, answer, tacticRight, widthRight, mods: mods.slice(0, 2), line };
}

/** The change from the tactic already in tonight's numbers to another one, axis by axis. */
export function tacticDelta(from: Tactic, to: Tactic, why: string): Mod[] {
  if (from === to) return [];
  const out: Mod[] = [];
  for (const a of AXES) {
    const d = (TACTIC_FX[to][a] ?? 0) - (TACTIC_FX[from][a] ?? 0);
    if (d) out.push({ axis: a, d, why, kind: 'plan' });
  }
  return out;
}

/**
 * What the engine is handed: tempo, the read and a played card for the whole match, and the plan per half as a
 * change from `baked` (the tactic in tonight's numbers), so a half-time change counts from the next chance.
 */
export function enginePlan(o: { baked: Tactic; plan: MatchdayPlan; half2?: Tactic; read: Mod[] }): MatchPlan {
  const first = o.plan.tactic ?? o.baked, second = o.half2 ?? first;
  return {
    tempo: o.plan.tempo ?? 'normal',
    all: [...o.read, ...(o.plan.card ? [{ axis: o.plan.card, d: 1, why: 'Tactic card', kind: 'plan' as const }] : [])],
    first: tacticDelta(o.baked, first, `Plan: ${TACTIC_NAME[first]}`),
    second: tacticDelta(o.baked, second, `Half-time: ${TACTIC_NAME[second]}`),
  };
}

/** One tile of the pick of three. A bond point joins the pool with the desk and the cast (step 4): the seam is here. */
export type PickTile = { kind: 'card'; axis: Axis } | { kind: 'scout'; club: string } | { kind: 'research'; n: number };
/**
 * Three tiles after a win, seeded by the day: a tactic card (+1 on a named axis in a later league match of your
 * choosing), a scouting lead (one club in your division marked scouted), research +2. Never league points.
 * `unscouted`: clubs in your division you have not scouted. `held`: tactic cards already held.
 */
export function pickOffer(seed: string, unscouted: string[], held: number): PickTile[] {
  const r = rng(hashSeed('pick-of-three', seed));
  const clubs = shuffle(r, unscouted);
  const axes = shuffle(r, AXES);
  const tiles: PickTile[] = [];
  if (held < CARD_MAX) tiles.push({ kind: 'card', axis: axes[0] });
  if (clubs[0]) tiles.push({ kind: 'scout', club: clubs[0] });
  tiles.push({ kind: 'research', n: 2 });
  // A full hand of cards: a second lead instead, if there is a club left to scout.
  if (tiles.length < 3 && held >= CARD_MAX && clubs[1]) tiles.splice(1, 0, { kind: 'scout', club: clubs[1] });
  return shuffle(r, tiles);
}
export const pickWords = (t: PickTile, name: (id: string) => string): { title: string; line: string } =>
  t.kind === 'card' ? { title: 'A tactic card', line: `+1 ${t.axis} in a league match of your choosing` }
    : t.kind === 'scout' ? { title: 'A scouting lead', line: `${name(t.club)}: their style and weak side` }
      : { title: 'Research', line: `+${t.n} toward your next tech` };
