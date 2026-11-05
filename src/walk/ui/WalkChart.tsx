import { useId } from 'react';
import { dayRange, type DayKey } from '../../domain/dates';
import { fmtDayMonth } from '../../domain/format';
import { stretchBands } from '../../domain/trackRules';
import type { Day } from '../../domain/types';
import { Reveal } from '../../ui/you/Reveal';
import { smoothPath, type Point } from '../../ui/you/paths';

const W = 320;
const H = 170;
const TOP = 34;

/** Steps on the road's colours: each stretch is its own ground and the line takes that stretch's light. A missed day is a gap, not a zero. */
export function WalkChart({ from, to, days, usual, strideM }: { from: DayKey; to: DayKey; days: Pick<Day, 'date' | 'steps'>[]; usual: number; strideM?: number }) {
  const id = useId().replace(/:/g, '');
  const steps = new Map(days.flatMap((d) => (d.steps === undefined ? [] : [[d.date, d.steps] as const])));
  const range = dayRange(from, to);
  const hi = Math.max(usual * 1.2, ...range.map((d) => steps.get(d) ?? 0));
  const bw = W / range.length;
  const x = (n: number) => n * bw;
  const y = (v: number) => TOP + (H - TOP - 8) * (1 - v / hi);
  const bands = stretchBands(from, to, new Map(steps), strideM);
  const logged = range.some((d) => steps.has(d));
  if (!logged) return <div className="yu-card"><span className="yu-q">No steps logged in these 40 days.</span></div>;
  const pathsFor = (a: DayKey, b: DayKey) => {
    const runs: Point[][] = [[]];
    range.forEach((d, n) => {
      if (d < a || d > b) return;
      const s = steps.get(d);
      if (s === undefined) runs.push([]);
      else runs[runs.length - 1].push([x(n) + bw / 2, y(s)]);
    });
    return runs.filter((r) => r.length > 1);
  };
  return (
    <Reveal className="yu-walk">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Steps from ${fmtDayMonth(from)} to ${fmtDayMonth(to)}, against your usual, by stretch of road`}>
        <defs>
          {bands.map((b, i) => <linearGradient key={i} id={`${id}r${i}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={b.c} stopOpacity=".95" /><stop offset="1" stopColor={b.c} stopOpacity=".35" /></linearGradient>)}
          <clipPath id={`${id}c`}><rect width={W} height={H} rx="14" /></clipPath>
        </defs>
        <g clipPath={`url(#${id}c)`}>
          {bands.map((b, i) => {
            const a = range.indexOf(b.from);
            const e = range.indexOf(b.to) + 1;
            return <rect key={i} x={x(a)} width={x(e) - x(a)} height={H} fill={`url(#${id}r${i})`} />;
          })}
          <line x1="0" x2={W} y1={y(usual)} y2={y(usual)} stroke="#fff" strokeOpacity=".5" strokeDasharray="2 5" strokeLinecap="round" />
          {bands.flatMap((b, i) => pathsFor(b.from, b.to).map((run, k) => (
            <path key={`${i}${k}`} className="yu-draw2" pathLength={1} d={smoothPath(run)} fill="none" stroke={b.l} strokeWidth="3" strokeLinecap="round" style={{ animationDelay: `${i * 0.5}s` }} />
          )))}
        </g>
      </svg>
      <div className="yu-walk-top" aria-hidden="true">{bands.map((b) => <span key={b.from} style={{ flex: range.indexOf(b.to) - range.indexOf(b.from) + 1 }}>{b.name}</span>)}</div>
      <div className="yu-walk-key"><span>Dotted line: your goal</span><span>{fmtDayMonth(from)} to {fmtDayMonth(to)}</span></div>
    </Reveal>
  );
}
