import { lowerFirst } from './format';
import { hourBreakdown } from './muscles';
import { bottomOfRange, valueOfSet, type ExerciseDef, type FormCheck } from './plan';
import type { SetEntry, TrainingSession } from './types';
import type { RecordPage } from '../ui/Moments';

/**
 * Where the time went: lifting by the set timers, resting by the rest spans, and the gap
 * between a rest ending and the next first rep. Sets logged without timers fall back to the
 * old split, where everything outside a rest counts as lifting.
 */
export function hourSplit(
  session: Pick<TrainingSession, 'startedAt' | 'endedAt' | 'restLog'>,
  sets: Pick<SetEntry, 'startedAt' | 'endedAt' | 'skipped'>[],
): { total: number; lift: number; rest: number; between: number; longestRest: number } {
  const old = hourBreakdown(session);
  const done = sets.filter((s) => !s.skipped);
  const timed = done.filter((s) => s.startedAt !== undefined && s.endedAt !== undefined);
  // Timers only tell the whole story when every set had one: a set logged in the list has none.
  if (!timed.length || timed.length < done.length) return { ...old, between: 0 };
  const lift = timed.reduce((n, s) => n + Math.max(0, s.endedAt! - s.startedAt!), 0);
  return { total: old.total, lift, rest: old.rest, between: Math.max(0, old.total - lift - old.rest), longestRest: old.longestRest };
}

export interface FormReport {
  /** Share of all ticked checks that went well. */
  share?: number;
  /** Per check, worst first. */
  rows: { text: string; ok: number; of: number }[];
  slip?: { text: string; times: number };
  /** Left against right, when both sides of a set were logged. */
  sides?: string;
}

/** The form page: how the checks went, the most common slip, and left against right. */
export function formReport(sets: SetEntry[], checksOf: (exId: string) => FormCheck[]): FormReport {
  const done = sets.filter((s) => !s.skipped && !s.drop);
  const tally = new Map<string, { ok: number; slip: number }>();
  for (const s of done) {
    const texts = new Map(checksOf(s.exerciseId).map((c) => [c.id, c.text]));
    for (const [id, mark] of Object.entries(s.checks ?? {})) {
      // A check no longer in the plan has no words to show.
      const text = texts.get(id);
      if (!text) continue;
      const t = tally.get(text) ?? { ok: 0, slip: 0 };
      t[mark === 'ok' ? 'ok' : 'slip']++;
      tally.set(text, t);
    }
  }
  const out: FormReport = { rows: [] };
  const all = [...tally.entries()];
  if (all.length) {
    const ok = all.reduce((n, [, t]) => n + t.ok, 0);
    const of = all.reduce((n, [, t]) => n + t.ok + t.slip, 0);
    out.share = ok / of;
    out.rows = all
      .map(([text, t]) => ({ text, ok: t.ok, of: t.ok + t.slip }))
      .sort((a, b) => a.ok / a.of - b.ok / b.of || b.of - a.of)
      .slice(0, 5);
    const worst = all.filter(([, t]) => t.slip > 0).sort((a, b) => b[1].slip - a[1].slip)[0];
    if (worst) out.slip = { text: worst[0], times: worst[1].slip };
  }
  const pairs = new Map<string, { L?: SetEntry; R?: SetEntry }>();
  for (const s of done) if (s.side !== 'both') pairs.set(`${s.exerciseId}:${s.setNo}`, { ...pairs.get(`${s.exerciseId}:${s.setNo}`), [s.side]: s });
  const both = [...pairs.values()].filter((p): p is { L: SetEntry; R: SetEntry } => !!p.L && !!p.R);
  if (both.length) {
    const gap = (p: { L: SetEntry; R: SetEntry }) => Math.abs((valueOfSet(p.L) ?? 0) - (valueOfSet(p.R) ?? 0));
    const widest = [...both].sort((a, b) => gap(b) - gap(a))[0];
    const held = both.every((p) => p.L.reps === undefined && p.L.seconds !== undefined);
    const unit = (s: SetEntry) => (s.reps === undefined && s.seconds !== undefined ? ' s' : '');
    out.sides =
      gap(widest) <= 1
        ? held
          ? 'Left and right were within a second on every per-side hold.'
          : 'Left and right were within one rep on every per-side set.'
        : `Biggest gap: ${lowerFirst(widest.L.exercise)} set ${widest.L.setNo}, left ${valueOfSet(widest.L)}${unit(widest.L)}, right ${valueOfSet(widest.R)}${unit(widest.R)}.`;
  }
  return out;
}

/** The three recap rings: exercises done, working sets in range, and form checks that went well. */
export function recapRings(sets: SetEntry[], exs: ExerciseDef[]): { exercises: [number, number]; inRange: [number, number]; checks?: number } {
  const done = sets.filter((s) => !s.skipped);
  const working = done.filter((s) => !s.drop);
  const ranged = working.filter((s) => {
    const ex = exs.find((e) => e.id === s.exerciseId);
    return ex && bottomOfRange(ex) !== undefined;
  });
  const inRange = ranged.filter((s) => (valueOfSet(s) ?? 0) >= bottomOfRange(exs.find((e) => e.id === s.exerciseId)!)!);
  const marks = working.flatMap((s) => Object.values(s.checks ?? {}));
  return {
    exercises: [exs.filter((e) => done.some((s) => s.exerciseId === e.id)).length, exs.length],
    inRange: [inRange.length, ranged.length],
    ...(marks.length ? { checks: marks.filter((m) => m === 'ok').length / marks.length } : {}),
  };
}

/** Tonight's best: a heavier load beats more reps; then the bigger number. */
export function bestMoment(pages: RecordPage[]): RecordPage | undefined {
  const num = (p: RecordPage) => parseFloat(p.big) || 0;
  return [...pages].sort((a, b) => Number(b.bigLabel === 'KG') - Number(a.bigLabel === 'KG') || num(b) - num(a))[0];
}

/** A colour tile for a track: two hues from its name, the same every time. */
export function trackArt(name: string): string {
  let h = 2166136261;
  for (const ch of name) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const a = Math.abs(h) % 360;
  const b = (a + 60 + (Math.abs(h >> 8) % 120)) % 360;
  return `linear-gradient(135deg, hsl(${a} 75% 62%), hsl(${b} 70% 45%))`;
}

export type FinalePage = 'flags' | 'records' | 'music' | 'time' | 'form' | 'recap' | 'best';

export interface FinaleData {
  name: string;
  pages: RecordPage[];
  /** The song each record was set to, by exercise name. */
  recordSongs: Record<string, string>;
  songs: { name: string; record: boolean }[];
  topArtist?: string;
  hour: ReturnType<typeof hourSplit>;
  /** This session's usual length, to compare tonight with. */
  usualMin?: number;
  form: FormReport;
  /** The old 1–5 average in words, for sessions logged before checks. */
  formWord?: string;
  rings: ReturnType<typeof recapRings>;
  quality: number;
  best?: RecordPage;
}

/** The finale's pages in order; one with nothing to say is left out. */
export function pagesFor(d: FinaleData): FinalePage[] {
  const all: [FinalePage, boolean][] = [
    ['flags', true],
    ['records', d.pages.length > 0],
    ['music', d.songs.length > 0],
    ['time', true],
    ['form', d.form.rows.length > 0 || !!d.formWord],
    ['recap', true],
    ['best', !!d.best],
  ];
  return all.filter(([, on]) => on).map(([p]) => p);
}
