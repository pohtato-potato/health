// The one place the desk's words come from: the writing chat's files under `src/football/content/desk/`, turned into
// the shapes Fork 1's jobs read (`content.ts`). Only what the five jobs use is wired here: the axis voices, the column
// and fan-mail lines, and the coaching-course bank. The rest of that folder is for later forks.
import { VOICES } from '../content/desk/voices';
import { COLUMN_LINES, FAN_MAIL } from '../content/desk/paper';
import { CAT_QUESTIONS, CAT_SETS } from '../content/desk/cat';
import { bandOfDie, type AxisVoices, type CatQuestion, type DeskJob } from '../content/desk/types';
import type { ColumnLine, Question } from './content';
import { hashSeed } from '../rng';
import type { Axis } from '../types';
import type { Die, JobId } from './types';

export const DESK_VOICES: AxisVoices = VOICES;

/** The desk's job ids where they differ from the writing chat's: a project is a build. */
const VOICE_JOB: Partial<Record<JobId, DeskJob>> = { project: 'build' };

/**
 * Column lines Fork 1 can run: every aim but the congress (its motions come in a later fork). Ids come from the
 * words, so a line added or moved in the file never takes over another's place in the save.
 */
export const DESK_COLUMN: ColumnLine[] = COLUMN_LINES.filter((l) => l.aim !== 'congress').map((l) => ({
  id: `col-${hashSeed('column', l.line).toString(36)}`, text: l.line, kind: l.aim as ColumnLine['kind'], headline: l.headline,
}));

/** Fan-mail replies: one letter, one of its answers. Run in the paper like a column line. */
export const DESK_FAN_MAIL: ColumnLine[] = FAN_MAIL.flatMap((f) => f.replies.map((r, i) => ({
  id: `fan-${f.id}-${i}`, text: r, kind: 'fans' as const, to: f.from, letter: f.letter,
})));

const SETS = new Map(CAT_SETS.map((s) => [s.id, s]));
function toQuestion(q: CatQuestion): Question {
  const set = q.set ? SETS.get(q.set) : undefined;
  return {
    id: q.id,
    prompt: q.prompt,
    options: q.format === 'mcq' ? q.options : undefined,
    answer: q.format === 'mcq' && typeof q.answer === 'number' ? q.options![q.answer] : String(q.answer),
    explanation: q.explain,
    section: q.section,
    passage: set?.text,
    passageTitle: set?.title,
    source: 'bank',
  };
}
/** The coaching course's bank: original questions in the shape of past CAT papers. The owner's own join it in the store. */
export const DESK_QUESTIONS: Question[] = CAT_QUESTIONS.map(toQuestion);

/** Names a column line may need: the club, tonight's opponent or a rival, one of ours. */
export interface LineNames { club: string; opp?: string; player?: string }
/** A line with its names filled in; undefined when it needs a name we don't have today. */
export function fillLine(text: string, n: LineNames): string | undefined {
  if (text.includes('{opp}') && !n.opp) return undefined;
  if (text.includes('{player}') && !n.player) return undefined;
  if (text.includes('{motion}')) return undefined;
  return text.replaceAll('{club}', n.club).replaceAll('{opp}', n.opp ?? '').replaceAll('{player}', n.player ?? '');
}

/**
 * One axis's line on a job, with yesterday's numbers in it (`{value}` is the reason under the die). The writer's
 * "Pace: " opening is dropped, since the screen names the axis itself. Undefined when nobody wrote one.
 */
export function voiceLine(job: JobId, die: Die, pick = 0, voices: AxisVoices = DESK_VOICES): string | undefined {
  const key = (VOICE_JOB[job] ?? job) as DeskJob;
  const lines = voices[key]?.[die.axis]?.[bandOfDie(die.value)];
  if (!lines?.length) return undefined;
  const line = lines[pick % lines.length].replaceAll('{value}', die.reason);
  const head = `${die.axis}: `;
  const said = line.startsWith(head) ? line.slice(head.length) : line;
  return said.charAt(0).toUpperCase() + said.slice(1);
}

/** A letter-writer named mid-sentence: "A tram driver" reads "a tram driver" after a verb; names stay as they are. */
export const inSentence = (who: string) => (/^(A|An|Someone) /.test(who) ? who.charAt(0).toLowerCase() + who.slice(1) : who);

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
