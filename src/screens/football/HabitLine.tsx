// One thin football line on other tabs: what today's habit does for tonight's match. Tapping opens Football.
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { addDays, dayOfLogging, type DayKey } from '../../domain/dates';
import { fmtInt } from '../../domain/format';
import { tierName } from '../../football/data/load';
import { paceNext, ordinal, weekRecap } from '../../football/habitLines';
import { loadHealth, nightFor } from '../../football/store/gather';
import { OWN } from '../../football/store/season';
import { standings, position } from '../../football/table';
import type { Axis } from '../../football/types';
import { go } from '../../router';

export function HabitLineView({ text, sub }: { text: string; sub?: string }) {
  return (
    <button type="button" className="fb-hline" onClick={() => go('/football')}>
      <span className="fb-hline-k">Football</span>
      <span className="fb-hline-t">{text}</span>
      {sub && <span className="fb-hline-s">{sub}</span>}
    </button>
  );
}

export interface LineData { text: string; sub?: string }

/** "Power 12 → 15 for tonight". Nothing without a club, or while the axis is still settling in (no data yet). */
export async function habitLineFor(axis: Axis, date: DayKey): Promise<LineData | null> {
  if (!(await db.fbSave.get('save'))) return null;
  const h = await loadHealth();
  const night = nightFor(h, date);
  if (night.flags[axis] === 'no-data') return null;
  const to = night.values[axis];
  const last = (await db.fbMatches.where('date').below(date).toArray()).filter((m) => !m.rotation).pop();
  const text = last ? `${axis} ${last.values[axis]} → ${to} for tonight` : `${axis} ${to} for tonight`;
  if (axis !== 'Pace') return { text };
  const next = paceNext(h.days.get(date)?.steps ?? 0);
  return { text, sub: next ? `${fmtInt(next.more)} more steps makes it ${next.to}` : 'As high as Pace goes.' };
}

export function HabitLine({ axis, now = Date.now() }: { axis: Axis; now?: number }) {
  const date = dayOfLogging(now);
  const d = useLiveQuery(() => habitLineFor(axis, date), [axis, date]);
  return d ? <HabitLineView {...d} /> : null;
}

/** "Brabo United, 4th in Division Seven". */
export async function leagueLineFor(): Promise<LineData | null> {
  const save = await db.fbSave.get('save');
  const season = save && (await db.fbSeasons.get(save.season));
  if (!save || !season) return null;
  const t = season.tierOf[OWN];
  const ids = Object.keys(season.tierOf).filter((id) => season.tierOf[id] === t);
  const pos = position(standings(season.results[t], ids, season.deductions), OWN);
  return { text: `Brabo United, ${ordinal(pos)} in ${tierName(t)}` };
}
export function LeagueLine() {
  const d = useLiveQuery(leagueLineFor, []);
  return d ? <HabitLineView {...d} /> : null;
}

/** The week's results and the league move, for the weekly story. */
export async function weekLineFor(start: DayKey): Promise<LineData | null> {
  const save = await db.fbSave.get('save');
  if (!save) return null;
  const ms = await db.fbMatches.where('date').between(start, addDays(start, 6), true, true).toArray();
  if (!ms.length) return null;
  const season = await db.fbSeasons.get(save.season);
  let before: number | undefined, after: number | undefined;
  const league = ms.filter((m) => m.comp === 'league' && m.season === save.season).length;
  if (season && league) {
    const t = season.tierOf[OWN];
    const ids = Object.keys(season.tierOf).filter((id) => season.tierOf[id] === t);
    const all = season.results[t];
    after = position(standings(all, ids, season.deductions), OWN);
    before = position(standings(all.slice(0, Math.max(0, all.length - league * (ids.length / 2))), ids, season.deductions), OWN);
  }
  return { text: weekRecap(ms, before, after) };
}
export function WeekLine({ start }: { start: DayKey }) {
  const d = useLiveQuery(() => weekLineFor(start), [start]);
  return d ? <HabitLineView {...d} /> : null;
}
