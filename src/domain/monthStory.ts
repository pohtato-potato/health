import { addDays, type DayKey } from './dates';
import { fmtDayMonth, fmtDuration, fmtInt } from './format';
import { dosesAllowPerfect } from './medicines';
import { assessment, monthSpread, tryNext, weakest, type Grade, type MonthInput } from './monthReport';
import { kmFromSteps, positionAt, setStride } from './walk';
import { dayRings } from '../state/derived';

/**
 * The month's story (board W8, y8-story): a longer Wrapped for the month, up to nine slides you tap through.
 * Each slide is one big number and one plain line, with its own picture. A slide with nothing stored to say is left out.
 */
export type StorySlide =
  | { kind: 'days'; big: string; say: string; cal: DayCell[] }
  | { kind: 'perfect'; big: string; say: string; chips: string[] }
  | { kind: 'road'; big: string; say: string; chips: string[] }
  | { kind: 'gym'; big: string; say: string; bests: { name: string; kg: number | null; up?: number }[] }
  | { kind: 'versus'; big: string; say: string; rows: { area: string; now: string; was: string; up: boolean }[] }
  | { kind: 'shape'; big: string; say: string }
  | { kind: 'club'; big: string; say: string; chips: string[] }
  | { kind: 'best'; big: string; say: string }
  | { kind: 'next'; big: string; say: string; grades: Grade[] };
/** One day of the month: rings closed out of how many, `null` when nothing was logged, `'later'` for days still to come. */
export type DayCell = { closed: number; of: number } | null | 'later';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthName = (m: string) => MONTHS[Number(m.slice(5)) - 1];
const daysIn = (m: string) => new Date(Number(m.slice(0, 4)), Number(m.slice(5)), 0).getDate();
const previous = (m: string) => {
  const [y, n] = m.split('-').map(Number);
  return n === 1 ? `${y - 1}-12` : `${y}-${String(n - 1).padStart(2, '0')}`;
};
const plural = (n: number, w: string, ws = `${w}s`) => `${fmtInt(n)} ${n === 1 ? w : ws}`;
const signed = (n: number, unit: string) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmtInt(Math.abs(n))}${unit}`;
const MAX_BESTS = 3;

/** Each day of the month: its rings closed, not logged (null), or still to come. */
export function monthCells(month: string, i: MonthInput): DayCell[] {
  const food = new Map<DayKey, MonthInput['entries']>();
  for (const e of i.entries) if (e.date.startsWith(month)) food.set(e.date, [...(food.get(e.date) ?? []), e]);
  const dayBy = new Map(i.days.filter((d) => d.date.startsWith(month)).map((d) => [d.date, d]));
  return Array.from({ length: daysIn(month) }, (_, n) => {
    const date = `${month}-${String(n + 1).padStart(2, '0')}`;
    if (date > i.today) return 'later';
    const day = dayBy.get(date);
    if (!day && !food.has(date)) return null;
    const r = dayRings(i.settings, date, day, food.get(date) ?? []).rings;
    return { closed: r.closed, of: r.of };
  });
}

function perfectDates(month: string, i: MonthInput): DayKey[] {
  const food = new Map<DayKey, MonthInput['entries']>();
  for (const e of i.entries) if (e.date.startsWith(month)) food.set(e.date, [...(food.get(e.date) ?? []), e]);
  return i.days.filter((d) => d.date.startsWith(month) && d.date < i.today && food.has(d.date)
    && dayRings(i.settings, d.date, d, food.get(d.date)!).rings.perfect && dosesAllowPerfect(i.settings, d)).map((d) => d.date).sort();
}

function longestRun(dates: DayKey[]): number {
  let best = 0;
  let run = 0;
  for (let n = 0; n < dates.length; n++) {
    run = n && addDays(dates[n - 1], 1) === dates[n] ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}

export function storySlides(month: string, i: MonthInput): StorySlide[] {
  setStride(i.settings.strideM);
  const name = monthName(month);
  const was = previous(month);
  const wasName = monthName(was);
  const days = i.days.filter((d) => d.date.startsWith(month));
  const done = i.sessions.filter((s) => s.date.startsWith(month) && s.status === 'done');
  const cal = monthCells(month, i);
  const logged = cal.filter((c) => c && c !== 'later').length;
  if (!logged && !done.length) return [];
  const out: StorySlide[] = [];
  const soFar = month >= i.today.slice(0, 7);
  out.push({ kind: 'days', big: fmtInt(logged), say: `day${logged === 1 ? '' : 's'} logged in ${name}${soFar ? ', so far' : ''}. Here is how they went.`, cal });

  const perfect = perfectDates(month, i);
  if (perfect.length) {
    const before = perfectDates(was, i).length;
    const run = longestRun(perfect);
    out.push({ kind: 'perfect', big: fmtInt(perfect.length), say: `day${perfect.length === 1 ? '' : 's'} with every ring closed. ${wasName} had ${fmtInt(before)}.`,
      chips: run > 1 ? [`Best run: ${run} days`] : [] });
  }

  const before = i.days.filter((d) => d.date < `${month}-01`).reduce((n, d) => n + (d.steps ?? 0), 0);
  const steps = days.reduce((n, d) => n + (d.steps ?? 0), 0);
  const [fromKm, toKm] = [kmFromSteps(before), kmFromSteps(before + steps)];
  if (toKm - fromKm >= 1) {
    const [a, b] = [positionAt(fromKm).from.name, positionAt(toKm).from.name];
    out.push({ kind: 'road', big: fmtInt(toKm - fromKm), say: a === b ? `km walked this month, around ${b}.` : `km walked this month, ${a} to ${b}.`,
      chips: [`${fmtInt(steps)} steps`] });
  }

  if (done.length) {
    const recs = i.sets.filter((s) => s.date.startsWith(month) && s.mark === '!!' && !s.skipped);
    const top = new Map<string, number | null>();
    for (const s of recs) top.set(s.exercise, Math.max(top.get(s.exercise) ?? 0, s.loadKg ?? 0) || null);
    out.push({ kind: 'gym', big: fmtInt(done.length), say: `session${done.length === 1 ? '' : 's'}${recs.length ? `, and ${plural(recs.length, 'new best')}` : ''}.`,
      bests: [...top].slice(0, MAX_BESTS).map(([n, kg]) => {
        // How much it beat the heaviest load before this month; a first best has nothing to beat.
        const before = Math.max(0, ...i.sets.filter((s) => s.exercise === n && s.date < `${month}-01` && !s.skipped).map((s) => s.loadKg ?? 0));
        return { name: n, kg, ...(kg !== null && before > 0 && kg > before ? { up: Math.round((kg - before) * 10) / 10 } : {}) };
      }) });
  }

  const [now, then] = [monthSpread(month, i), monthSpread(was, i)];
  const rows: { area: string; now: string; was: string; up: boolean; d: number }[] = [];
  if (now.proteinAvg !== undefined && then.proteinAvg !== undefined)
    rows.push({ area: 'Protein', now: `${fmtInt(now.proteinAvg)} g`, was: `${fmtInt(then.proteinAvg)} g`, up: now.proteinAvg >= then.proteinAvg, d: Math.round(now.proteinAvg - then.proteinAvg) });
  if (now.stepsAvg !== undefined && then.stepsAvg !== undefined)
    rows.push({ area: 'Steps', now: fmtInt(now.stepsAvg), was: fmtInt(then.stepsAvg), up: now.stepsAvg >= then.stepsAvg, d: Math.round(now.stepsAvg - then.stepsAvg) });
  if (now.sleepAvg !== undefined && then.sleepAvg !== undefined)
    rows.push({ area: 'Sleep', now: fmtDuration(Math.round(now.sleepAvg)), was: fmtDuration(Math.round(then.sleepAvg)), up: now.sleepAvg >= then.sleepAvg, d: Math.round(now.sleepAvg - then.sleepAvg) });
  if (rows.length) {
    const lead = rows[0];
    const unit = lead.area === 'Protein' ? ' g' : lead.area === 'Sleep' ? ' min' : '';
    const what = lead.area === 'Protein' ? 'protein a day' : lead.area === 'Steps' ? 'steps a day' : 'of sleep a night';
    out.push({ kind: 'versus', big: signed(lead.d, unit), say: `${what}, against ${wasName}.`, rows: rows.map(({ d: _d, ...r }) => r) });
  }

  const waist = (i.measurements ?? []).filter((m) => m.waistStanding !== undefined).sort((a, b) => a.date.localeCompare(b.date) || a.at - b.at);
  const inMonth = waist.filter((m) => m.date.startsWith(month)).pop();
  const prior = inMonth && waist.filter((m) => m.date < inMonth.date).pop();
  if (inMonth && prior) {
    const d = Math.round((inMonth.waistStanding! - prior.waistStanding!) * 10) / 10;
    out.push({ kind: 'shape', big: `${d > 0 ? '+' : d < 0 ? '−' : ''}${Math.abs(d)} in`, say: `waist, against ${fmtDayMonth(prior.date)}.` });
  }

  const games = (i.results ?? []).filter((r) => r.date.startsWith(month));
  if (games.length) {
    const n = (k: 'W' | 'D' | 'L') => games.filter((g) => g.result === k).length;
    out.push({ kind: 'club', big: fmtInt(n('W')), say: `win${n('W') === 1 ? '' : 's'} for the club, from ${plural(games.length, 'match', 'matches')}.`,
      chips: [plural(n('D'), 'draw'), plural(n('L'), 'loss', 'losses')] });
  }

  const best = days.filter((d) => d.steps).sort((a, b) => b.steps! - a.steps! || a.date.localeCompare(b.date))[0];
  if (best) out.push({ kind: 'best', big: fmtInt(best.steps!), say: `steps on ${fmtDayMonth(best.date)}, your best day of the month.` });

  const grades = assessment(month, i);
  const one = tryNext(grades);
  const worst = weakest(grades);
  if (worst) out.push({ kind: 'next', big: worst.area, say: one ?? 'Keep the month as it went.', grades });
  return out;
}
