import type { CSSProperties } from 'react';
import { addDays, dayRange } from '../../domain/dates';
import { fmtClock } from '../../domain/format';
import { keptPledgeNight, pledgeFor } from '../../domain/pledge';
import type { Day } from '../../domain/types';
import type { DayKey } from '../../domain/dates';

const NIGHTS = 14;
const LAVENDER = '#b79bff';
const MINT = '#5ff0b0';
const BLUE = '#6cc8ff';

/** Minutes after midnight, with the evening before as negative, so 11 pm sits just before 1 am. */
const rel = (m: number) => (m > 720 ? m - 1440 : m);

/**
 * Board five, "Sleep: the counts, tidied": lights out as dots (higher is earlier) against your pledge, the pledge and
 * the sleepy window as strips of fourteen squares lined up under the charts, and rested as a marker on a scale.
 * A strip only shows once there is something on it, so a new phone shows nothing empty.
 */
export function SleepCounts({ days, today }: { days: Map<DayKey, Day>; today: DayKey }) {
  const range = dayRange(addDays(today, -(NIGHTS - 1)), today);
  const asleep = range.map((d) => days.get(d)?.sleep?.asleep);
  const pledges = range.map((d) => pledgeFor(days, d)).filter((p): p is number => p !== undefined);
  const pledge = pledges.length ? pledges[pledges.length - 1] : undefined;
  const madeAny = range.some((d) => days.get(addDays(d, -1))?.pledge);
  const kept = range.map((d) => keptPledgeNight(days, d));
  const caught = range.map((d) => days.get(d)?.caughtWindow);
  const rested = range.map((d) => days.get(d)?.sleep?.rested).filter((r): r is number => r !== undefined);
  const restedAvg = rested.length ? rested.reduce((a, b) => a + b, 0) / rested.length : undefined;
  return (
    <>
      {asleep.some((a) => a !== undefined) && <LightsOut asleep={asleep} pledge={pledge} />}
      {madeAny && <Strip name="Pledge kept" on={kept} ink={MINT} />}
      {caught.some((c) => c !== undefined) && <Strip name="Sleepy window caught" on={caught.map((c) => c === true)} none={caught.map((c) => c === undefined)} ink={BLUE} />}
      {restedAvg !== undefined && (
        <div className="k-strip">
          <span className="k-row"><b>Rested, on waking</b><b style={{ font: '600 20px/1 var(--serif)' }}>{restedAvg.toFixed(1)} of 5</b></span>
          <span className="k-scale" role="img" aria-label={`Rested ${restedAvg.toFixed(1)} of 5 on average`}><i style={{ left: `${((restedAvg - 1) / 4) * 100}%` }} /></span>
        </div>
      )}
      {(madeAny || caught.some((c) => c !== undefined)) && <span className="k-q">Each square is a night, oldest on the left, lined up under the charts above.</span>}
    </>
  );
}

function Strip({ name, on, none, ink }: { name: string; on: boolean[]; none?: boolean[]; ink: string }) {
  const n = on.filter(Boolean).length;
  return (
    <div className="k-strip" style={{ '--ink': ink } as CSSProperties}>
      <span className="k-row"><b>{name}</b><b>{n} of {on.length}</b></span>
      <span className="k-sq" role="img" aria-label={`${name}: ${n} of ${on.length} nights`} style={{ '--n': on.length } as CSSProperties}>
        {on.map((x, i) => <i key={i} className={x ? 'on' : none?.[i] ? 'none' : ''} />)}
      </span>
    </div>
  );
}

/** Lights out, night by night: higher is earlier; the dashed line is your latest pledge. */
function LightsOut({ asleep, pledge }: { asleep: (number | undefined)[]; pledge?: number }) {
  const W = 336;
  const H = 74;
  const vals = asleep.filter((a): a is number => a !== undefined).map(rel);
  const all = pledge !== undefined ? [...vals, rel(pledge)] : vals;
  const early = Math.min(...all) - 20;
  const late = Math.max(...all) + 20;
  const y = (m: number) => 8 + ((rel(m) - early) / (late - early || 1)) * (H - 16);
  const x = (i: number) => 10 + (i * (W - 20)) / (asleep.length - 1);
  const pts = asleep.map((a, i) => (a === undefined ? null : [x(i), y(a)] as const)).filter((p): p is readonly [number, number] => p !== null);
  return (
    <div className="k-chart">
      <b>Lights out</b>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`When you fell asleep, the last ${asleep.length} nights${pledge !== undefined ? `, against your ${fmtClock(pledge)} pledge` : ''}`} style={{ display: 'block' }}>
        {pledge !== undefined && <line x1="0" x2={W} y1={y(pledge)} y2={y(pledge)} stroke="#fff" strokeWidth="2" strokeDasharray="5 5" opacity=".85" />}
        <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={LAVENDER} strokeOpacity=".55" strokeWidth="2" />
        {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="5.5" fill={LAVENDER} />)}
      </svg>
      <span className="k-q">{pledge !== undefined ? `dashed: your ${fmtClock(pledge)} pledge · higher is earlier` : 'higher is earlier'}</span>
    </div>
  );
}
