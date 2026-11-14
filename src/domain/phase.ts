import { addDays, parseDay, type DayKey } from './dates';
import { fmtInt } from './format';
import type { TargetsRecord } from './types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const short = (d: DayKey) => { const x = parseDay(d); return `${x.getDate()} ${MONTHS[x.getMonth()]}`; };

/**
 * Food's phase line (board four, "Food, in the maintenance weeks"), read from the targets in settings, never
 * written into the page: the phase on now and until when, its aims, and when the next one starts and at about
 * what. Nothing when no targets are set.
 */
export function phaseLine(records: readonly TargetsRecord[], date: DayKey): { title: string; line: string } | undefined {
  const sorted = [...records].sort((a, b) => a.from.localeCompare(b.from));
  const cur = sorted.filter((r) => r.from <= date).pop();
  if (!cur) return undefined;
  const next = sorted.find((r) => r.from > date);
  const t = cur.targets;
  const name = cur.name?.trim() || 'These aims';
  const title = next ? `${name} until ${short(addDays(next.from, -1))}` : cur.name?.trim() || 'Your aims';
  let line = `Aim ${fmtInt(t.kcalMin)} to ${fmtInt(t.kcalMax)} and ${fmtInt(t.proteinG)} g of protein.`;
  if (next) {
    const mid = Math.round((next.targets.kcalMin + next.targets.kcalMax) / 2 / 50) * 50;
    line += ` ${next.name?.trim() ? `The ${next.name.trim().toLowerCase()} starts` : 'New aims start'} on ${short(next.from)} at about ${fmtInt(mid)}.`;
  }
  return { title, line };
}
