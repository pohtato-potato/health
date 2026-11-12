// The desk's results, folded into the world when a day plays at 4 am (desk spec §2–3). Pure: play.ts hands over the
// pieces of the world, and each day's spends are folded once (days play once, in order). Taps never write the
// engine's tables, so a match playing in the background can't lose a die spent at the same moment.
import type { DayKey } from '../../domain/dates';
import { addDays } from '../../domain/dates';
import type { TreeEngine } from '../tree/types';
import { spendsOn, unspentResearch } from './rules';
import type { DeskState, Die, Effect } from './types';

export interface FoldWorld {
  eng: TreeEngine;
  squad: { id: string; status: string; growth?: number; name: string }[];
  bundles: Map<string, { id: string; progress: Record<string, number>; done?: DayKey }>;
  /** The needs of every project and ground bundle, by id. */
  needs: (id: string) => { what: string; count: number }[] | undefined;
  news: { id: string; date: DayKey; kind: 'club' | 'press'; text: string }[];
}

/** Adds days to a project's least-finished need, capped at the need. Never takes anything away. */
export function pushProject(progress: Record<string, number>, needs: { what: string; count: number }[], n: number): Record<string, number> {
  const open = needs.filter((x) => (progress[x.what] ?? 0) < x.count);
  if (!open.length) return progress;
  const worst = open.reduce((b, x) => ((progress[x.what] ?? 0) / x.count < (progress[b.what] ?? 0) / b.count ? x : b));
  return { ...progress, [worst.what]: Math.min(worst.count, Math.round(((progress[worst.what] ?? 0) + n) * 10) / 10) };
}

function gain(eng: TreeEngine, on: DayKey, n: number, note: string) {
  if (n <= 0) return;
  eng.earned += n;
  eng.gains = [...eng.gains, { on, n, why: 'desk' as const, note }].slice(-60);
}

/** One effect into the world. Kinds read straight from the spend log (watch, course, clock) need nothing here. */
function foldEffect(w: FoldWorld, e: Effect, date: DayKey) {
  switch (e.kind) {
    case 'research': gain(w.eng, date, e.n, 'The desk'); break;
    case 'grow': {
      const i = w.squad.findIndex((y) => y.id === e.youth);
      if (i >= 0 && w.squad[i].status === 'growing') w.squad[i] = { ...w.squad[i], growth: Math.round(((w.squad[i].growth ?? 0) + e.n) * 100) / 100 };
      break;
    }
    case 'project': {
      const needs = w.needs(e.id);
      const cur = w.bundles.get(e.id) ?? { id: e.id, progress: {} };
      if (needs && !cur.done) w.bundles.set(e.id, { ...cur, progress: pushProject(cur.progress, needs, e.n) });
      break;
    }
    case 'column':
      w.news.push({ id: `${addDays(date, 1)}:column:${e.line}`, date: addDays(date, 1), kind: 'press', text: `From the manager's column: “${e.text}”` });
      break;
    case 'watch': case 'course': case 'clock': break;
  }
}

/** A day plays: its spends go into the world, and its unspent dice turn into a little research. */
export function deskFold(desk: DeskState | undefined, date: DayKey, dice: Die[], w: FoldWorld): void {
  const spent = desk ? spendsOn(desk, date) : [];
  for (const s of spent) for (const e of s.effects) foldEffect(w, e, date);
  const left = dice.filter((d) => !spent.some((s) => s.axis === d.axis)).length;
  gain(w.eng, date, unspentResearch(left), 'Dice left on the desk');
}
