import { seeded } from './creatures';
import { addDays, type DayKey } from './dates';
import { fmtInt } from './format';
import { weekdayPattern } from './insights';
import { sleepMinutes } from './rings';
import { formTrend } from './trackStats';
import type { Day, SetEntry } from './types';

export interface Finding { id: string; text: string; working: string }
export interface FindingInput { today: DayKey; days: Day[]; sets: SetEntry[] }

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const BIG_DAY = 10000;
const MIN_NIGHTS = 4;
const MIN_GAP_MIN = 10;

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

function sleepAfterSteps(i: FindingInput): Finding | undefined {
  const by = new Map(i.days.map((d) => [d.date, d]));
  const big: number[] = [];
  const small: number[] = [];
  for (const d of i.days) {
    if (d.steps === undefined || d.date >= i.today) continue;
    // Sleep is logged on the morning the night ends, so the night after a day sits on the next date.
    const night = by.get(addDays(d.date, 1))?.sleep;
    if (!night) continue;
    (d.steps >= BIG_DAY ? big : small).push(sleepMinutes(night.asleep, night.woke));
  }
  if (big.length < MIN_NIGHTS || small.length < MIN_NIGHTS) return undefined;
  const gap = Math.round(mean(big) - mean(small));
  if (Math.abs(gap) < MIN_GAP_MIN) return undefined;
  return {
    id: 'sleep-after-steps',
    text: `You sleep ${Math.abs(gap)} minutes ${gap > 0 ? 'longer' : 'less'} after a day over ${fmtInt(BIG_DAY)} steps.`,
    working: `From ${big.length} nights after a day over ${fmtInt(BIG_DAY)} steps, against ${small.length} nights after a smaller day.`,
  };
}

function bestStepDay(i: FindingInput): Finding | undefined {
  const steps = new Map(i.days.flatMap((d) => (d.steps === undefined ? [] : [[d.date, d.steps] as [DayKey, number]])));
  const p = weekdayPattern(steps, i.today);
  if (p.high === undefined) return undefined;
  const avg = p.avg[p.high];
  if (avg === null) return undefined;
  return {
    id: 'best-weekday',
    text: `${WEEKDAYS[p.high]}s are your best step days, about ${fmtInt(Math.round(avg / 100) * 100)}.`,
    working: `The average of each weekday's logged steps over the last 8 weeks, from ${p.counts[p.high]} ${WEEKDAYS[p.high]}s.`,
  };
}

function cleanReps(i: FindingInput): Finding | undefined {
  const { now, before } = formTrend(i.sets, i.today);
  if (now === undefined || before === undefined || now === before) return undefined;
  const pct = (v: number) => Math.round(v * 100);
  return {
    id: 'clean-reps',
    text: `${pct(now)}% of your reps were clean these two weeks, ${now > before ? 'up' : 'down'} from ${pct(before)}%.`,
    working: 'Clean reps as a share of all reps, in the last 14 days against the 14 before.',
  };
}

export function findingCandidates(i: FindingInput): Finding[] {
  return [sleepAfterSteps(i), bestStepDay(i), cleanReps(i)]
    .filter((f): f is Finding => !!f)
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** One finding, the same all day. None rather than filler. */
export function dailyFinding(today: DayKey, i: FindingInput): Finding | undefined {
  const all = findingCandidates(i);
  return all.length ? all[Math.floor(seeded(`finding:${today}`)() * all.length)] : undefined;
}
