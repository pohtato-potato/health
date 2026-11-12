// The one place the desk's words come from. When the writing chat's files land on `feat/desk-content`, point these
// three imports at `../content/desk/` (voices, column lines, the question bank) and delete `placeholder.ts`.
import { COLUMN_LINES, QUESTIONS, VOICES } from './placeholder';
import type { ColumnLine, DeskVoices, Question, VoiceSet } from './content';
import type { Axis } from '../types';
import type { Die, JobId } from './types';

export const DESK_VOICES: DeskVoices = VOICES;
export const DESK_COLUMN: ColumnLine[] = COLUMN_LINES;
export const DESK_QUESTIONS: Question[] = QUESTIONS;

const band = (v: number): keyof VoiceSet => (v >= 5 ? 'high' : v >= 3 ? 'mid' : 'low');

/** One axis's line on a job, with yesterday's numbers in it. Undefined when nobody wrote one. */
export function voiceLine(job: JobId, die: Die, pick = 0, voices: DeskVoices = DESK_VOICES): string | undefined {
  const set = voices[job]?.[die.axis] ?? voices['*']?.[die.axis];
  const lines = set?.[band(die.value)];
  if (!lines?.length) return undefined;
  return lines[pick % lines.length].replaceAll('{reason}', die.reason).replaceAll('{value}', String(die.value));
}

/**
 * The two axes that speak when you pick up a die (k2-voices A, d3-spend): the die's own axis, and the axis whose die
 * is furthest from it (the loudest disagreement), first in axis order on a tie. One voice when it is the only die.
 */
export function speakers(held: Die, dice: Die[]): Axis[] {
  const others = dice.filter((d) => d.axis !== held.axis);
  if (!others.length) return [held.axis];
  const far = others.reduce((b, d) => (Math.abs(d.value - held.value) > Math.abs(b.value - held.value) ? d : b));
  return [far.axis, held.axis];
}
