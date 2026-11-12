// The shapes Fork 1's jobs read the desk's words in. The words themselves are the writing chat's, under
// `src/football/content/desk/`; `words.ts` is the one file that turns them into these shapes.

/** A line for your column or a fan-mail reply (spec §3). Lines only, no points. Names in it (`{club}`, `{opp}`, `{player}`) are filled when offered. */
export interface ColumnLine {
  id: string;
  text: string;
  kind: 'morale' | 'needle' | 'fans' | 'ambition' | 'after-loss';
  headline?: string;
  /** A fan-mail reply: who wrote in, and what they said. */
  to?: string;
  letter?: string;
}

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
  /** A passage or table the question reads from (tables in Markdown), and its title. */
  passage?: string;
  passageTitle?: string;
  /** 'bank' (in the app) or 'mine' (the owner's private import, kept on the phone only). */
  source: 'bank' | 'mine';
}
