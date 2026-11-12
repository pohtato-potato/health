// The manager's desk (desk-and-world spec §2–3, approved 12 Nov). Pure shapes: no React, no Dexie.
//
// THE JOB INTERFACE (settled in Fork 1; later forks add jobs without touching the desk itself):
// - A job is a `JobDef` in `jobs/index.ts`'s `JOBS` list. Adding a job = one file under `desk/jobs/` plus one line
//   in that list (and, if it needs a new kind of lasting result, one `Effect` kind and its fold in `fold.ts`).
// - Spending a die is pure: `preview()` says exactly what the die would do (shown before you commit), and
//   `spend()` returns the same `Effect`s, plus the outcome of any shown chance drawn from the seeded `r`.
// - Effects are kept in the desk's spend log (save.desk, a user key, so a tap is never lost to a match playing).
//   Some are read straight from the log (a watched opponent, the coaching course); the rest are folded into the
//   world when the day plays at 4 am (`fold.ts`): research, a youngster's growth, a project, a column in the paper.
// - Long jobs are clocks: `Clock` rows, filled only by `clock` effects. They never run backwards or expire.
import type { DayKey } from '../../domain/dates';
import type { Axis } from '../types';

export type DieValue = 1 | 2 | 3 | 4 | 5 | 6;
/** One die: an axis's score yesterday (1–20) as 1–6 by fixed bands, with the reason for its number. */
export interface Die {
  axis: Axis;
  value: DieValue;
  /** The 1–20 score it came from (the same the match used). */
  score: number;
  /** "16,400 steps", "Four and a half hours". */
  reason: string;
  /** A sick, injured or travel day: the axis's 28-day form, not the day. */
  form?: boolean;
}

/** Every job the spec names. Fork 1 builds watch, academy, column, project, course; the rest come later. */
export type JobId = 'watch' | 'academy' | 'column' | 'project' | 'course' | 'scout' | 'study' | 'negotiate' | 'lobby' | 'cast';

/** How well a die does a job (spec §3): 5–6 well, 3–4 does it, 1–2 badly or with a shown risk. */
export type Quality = 'well' | 'does' | 'badly';
export const qualityOf = (v: number): Quality => (v >= 5 ? 'well' : v >= 3 ? 'does' : 'badly');
/** Segments a die fills on a clock: 2 on a 5 or 6, else 1. Never fewer than 1, never backwards. */
export const segmentsFor = (v: number): 1 | 2 => (v >= 5 ? 2 : 1);

/**
 * A lasting result of spending a die. Later forks add kinds (and a fold for each in `fold.ts`, if the world must
 * change when the day plays). Kinds read straight from the spend log need no fold.
 */
export type Effect =
  /** Tonight's opponent scouted for the tactics board: its style, and its weak side on `full`. Read from the log. */
  | { kind: 'watch'; club: string; level: 'style' | 'full' }
  /** A youngster grows by `n` (folded at 4 am into the academy). */
  | { kind: 'grow'; youth: string; n: number }
  /** A line in tomorrow's paper (folded at 4 am into the news). Lines only, no points. */
  | { kind: 'column'; line: string; text: string; to?: string }
  /** Days added to a building project's least-finished need (folded at 4 am). */
  | { kind: 'project'; id: string; n: number }
  /** Research toward the next tech (folded at 4 am). */
  | { kind: 'research'; n: number }
  /** A coaching course started: five questions, and a lifeline on a high die. Answered later, from the log. */
  | { kind: 'course'; ids: string[]; lifeline: boolean }
  /** Segments added to a clock. */
  | { kind: 'clock'; clock: string; n: number };

/** A chance in a job, shown before you commit (honest dice: the odds shown are the odds used, seeded). */
export interface Risk { pct: number; line: string }

/** One die spent. Append-only: nothing earned is ever taken back. */
export interface Spend {
  id: string;
  /** The logging day the die belonged to. */
  day: DayKey;
  axis: Axis;
  value: DieValue;
  job: JobId;
  target?: string;
  effects: Effect[];
  /** A shown chance, and whether it came up. */
  risk?: Risk & { hit: boolean };
}

/** A long job. `filled` comes from the spend log's clock effects, so a clock can never run backwards. */
export interface Clock {
  id: string;
  job: JobId;
  /** What it works on: a club, a division, a loan target. */
  target: string;
  name: string;
  size: number;
  opened: DayKey;
}

/** A finished coaching course: the answers given, in question order. */
export interface CourseResult { spend: string; on: DayKey; answers: (string | null)[]; right: number; passed: boolean }

/** save.desk: everything the desk keeps. A user key (play.ts never overwrites it). */
export interface DeskState {
  /** The dice handed over for a logging day, frozen once seen so a later edit to yesterday never reshuffles them. */
  dice: Record<DayKey, Die[]>;
  spends: Spend[];
  clocks: Clock[];
  courses: CourseResult[];
  /** A course left halfway: the answers so far and the question the lifeline was used on (kept, so it's used once). */
  drafts?: Record<string, CourseDraft>;
}
export interface CourseDraft { answers: (string | null)[]; helped?: string }
export const emptyDesk = (): DeskState => ({ dice: {}, spends: [], clocks: [], courses: [] });

/** A row on the desk (d3-home). */
export interface JobCard {
  title: string;
  /** The question at the top of the spend screen (d3-spend): "Watch Hull tonight?". */
  ask?: string;
  line: string;
  /** "New", "2 of 4", "Not today". */
  chip: string;
  /** For clocks: the ring. */
  ring?: { filled: number; size: number };
}
/** Something a job can work on (a youngster, a project, a column line). */
export interface Target { id: string; name: string; line?: string }

/** Exactly what this die would do, shown before you commit (d3-spend). */
export interface Preview {
  /** "Great." / "Done." / "Rough." and what happens, in plain words. */
  head: string;
  line: string;
  /** The big number on the right of the card: "+2", "Style", "+1.5". */
  gain: string;
  /** What other dice would do: "A 3 or 4 would fill one." */
  others: string;
  effects: Effect[];
  risk?: Risk;
}

/** What a job can see when it is drawn, previewed or spent. Built by the store; pure from here on. */
export interface DeskView {
  date: DayKey;
  /** Tonight's league opponent, if there is a league match tonight. */
  opp?: { id: string; name: string; style: string };
  /** How much is known of tonight's opponent already (met, a lead, or watched). */
  oppKnown: 'none' | 'style' | 'full';
  youth: { id: string; name: string; axis: Axis; growth: number; potential: 3 | 4 | 5 }[];
  projects: { id: string; name: string; worst: { what: string; have: number; count: number } }[];
  columnLines: { id: string; text: string; to?: string; letter?: string }[];
  /** Question ids in the course pool (bank plus the owner's import), and those already answered in a course. */
  questions: string[];
  answered: string[];
  /** Spends already made today on each job (a once-a-day job reads this). */
  spentToday: Partial<Record<JobId, number>>;
  clocks: (Clock & { filled: number })[];
}

export interface JobDef {
  id: JobId;
  /** Its colour on the desk. */
  ink: string;
  /** False: hidden from the desk today (a lobby outside the fortnight before a congress). */
  open(v: DeskView): boolean;
  card(v: DeskView): JobCard;
  /** Jobs that work on one of several things ask first. */
  targets?(v: DeskView): Target[];
  /** Why a job can't take a die right now ("Already watched"), or undefined when it can. */
  blocked?(v: DeskView): string | undefined;
  preview(die: Die, v: DeskView, target?: string): Preview;
  /**
   * The same effects as the preview; a shown chance is drawn from `r` (seeded by the spend). A long job opens its
   * clock here (`opens`) and fills it with a `clock` effect in the same spend.
   */
  spend(die: Die, v: DeskView, target: string | undefined, r: () => number): SpendOut;
}
export interface SpendOut { effects: Effect[]; risk?: Risk & { hit: boolean }; opens?: Omit<Clock, 'opened'>[] }

