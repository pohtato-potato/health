import { useState } from 'react';
import { addDays, dayRange, weekStart, type DayKey } from '../domain/dates';
import { fmtDayMonth } from '../domain/format';
import { HEAT_INK, heatmapLevel, type HeatMetric } from '../domain/heatmap';
import { placeFor } from '../domain/places';
import { realSets } from '../domain/plan';
import { sleepMinutes } from '../domain/rings';
import type { Day, FoodEntry, SetEntry, Settings, TrainingSession } from '../domain/types';
import { targetsFor } from '../state/derived';

const METRICS: { id: HeatMetric; label: string }[] = [
  { id: 'steps', label: 'Steps' },
  { id: 'protein', label: 'Protein' },
  { id: 'sleep', label: 'Sleep' },
  { id: 'training', label: 'Training' },
  { id: 'readiness', label: 'Readiness' },
  { id: 'form', label: 'Form' },
];

const WEEKS = 8;
const OPACITY = { 1: 0.22, 2: 0.45, 3: 0.7, 4: 1 } as const;

/** Every day of the last eight weeks for one measure; office and status days carry a dot. */
export function Heatmap({ settings, today, days, entries, sessions, sets }: { settings: Settings; today: DayKey; days: Day[]; entries: FoodEntry[]; sessions: TrainingSession[]; sets: SetEntry[] }) {
  const [metric, setMetric] = useState<HeatMetric>('steps');
  const start = addDays(weekStart(today), -7 * (WEEKS - 1));
  const range = dayRange(start, addDays(weekStart(today), 6));
  const byDate = new Map(days.map((d) => [d.date, d]));
  const protein = new Map<DayKey, number>();
  for (const e of entries) protein.set(e.date, (protein.get(e.date) ?? 0) + e.protein);
  const done = sessions.filter((s) => s.status === 'done');
  const real = realSets(sets);

  const valueOf = (d: DayKey): { v?: number; target?: number } => {
    const day = byDate.get(d);
    const t = targetsFor(settings, d);
    switch (metric) {
      case 'steps':
        return { v: day?.steps, target: t.steps };
      case 'protein':
        return { v: protein.get(d), target: t.proteinG };
      case 'sleep':
        return { v: day?.sleep ? sleepMinutes(day.sleep.asleep, day.sleep.woke) : undefined, target: t.sleepMin };
      case 'training':
        return { v: d <= today ? done.filter((s) => s.date === d).length : undefined };
      case 'readiness':
        return { v: done.find((s) => s.date === d)?.readiness };
      case 'form': {
        const rated = real.filter((x) => x.date === d && x.form !== undefined);
        return { v: rated.length ? rated.reduce((n, x) => n + x.form!, 0) / rated.length : undefined };
      }
    }
  };

  return (
    <div className="card">
      <div className="row base">
        <div className="lbl">Every day</div>
        <div className="t12 q">{fmtDayMonth(start)} to today</div>
      </div>
      <div className="chiprow" role="radiogroup" aria-label="Measure">
        {METRICS.map((m) => (
          <button key={m.id} type="button" role="radio" aria-checked={metric === m.id} className={`chip sm${metric === m.id ? ' on' : ''}`} onClick={() => setMetric(m.id)}>
            {m.label}
          </button>
        ))}
      </div>
      <div className="heatmap" role="img" aria-label={`${METRICS.find((m) => m.id === metric)!.label} for the last ${WEEKS} weeks`}>
        {range.map((d) => {
          if (d > today) return <span key={d} className="heat future" />;
          const { v, target } = valueOf(d);
          const lvl = heatmapLevel(metric, v, target);
          const day = byDate.get(d);
          const marked = !!day?.status || (day && placeFor(day, settings).kind === 'office');
          return (
            <span key={d} className={`heat${lvl === null ? ' empty' : ''}`} style={lvl ? { background: HEAT_INK[metric], opacity: OPACITY[lvl] } : undefined} title={d}>
              {marked && <i />}
            </span>
          );
        })}
      </div>
      <div className="t12 q">Outlined squares: not logged. A dot: an office or status day.</div>
    </div>
  );
}
