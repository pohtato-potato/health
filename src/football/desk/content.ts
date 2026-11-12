// The shapes the desk's words come in. The writing chat fills them on `feat/desk-content` under
// `src/football/content/desk/`; until that lands, `placeholder.ts` holds a few lines behind the same shapes, and
// `words.ts` is the one file that says which is used.
import type { Axis } from '../types';
import type { JobId } from './types';

/** Lines for one axis on one job, by the die it gave: low 1–2, mid 3–4, high 5–6. */
export interface VoiceSet { low: string[]; mid: string[]; high: string[] }
/**
 * What each axis says about each job. Tokens filled in: `{reason}` (yesterday's numbers, as under the die:
 * "16,400 steps"), `{value}` (the die). A job or axis without lines falls back to `'*'`, then to no voice.
 */
export type DeskVoices = Partial<Record<JobId | '*', Partial<Record<Axis, VoiceSet>>>>;

/** A line for your column or the fan mail (spec §3). Lines only, no points. */
export interface ColumnLine { id: string; text: string; kind: 'morale' | 'needle' }

/** A coaching-course question: a choice from options, or a typed answer (TITA) when there are no options. */
export interface Question {
  id: string;
  prompt: string;
  /** Two to five options; none for a typed answer. */
  options?: string[];
  /** The right option's text, or the typed answer. */
  answer: string;
  explanation: string;
  /** "quant", "verbal", "lr", "di", or whatever the owner's file says. */
  section?: string;
  year?: string;
  /** A passage or table the question reads from. */
  passage?: string;
  /** 'bank' (in the app) or 'mine' (the owner's private import, kept on the phone only). */
  source: 'bank' | 'mine';
}
