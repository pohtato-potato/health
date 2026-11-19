import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { fmtDuration } from '../domain/format';
import { sleepMinutes } from '../domain/rings';

const DAY = 1440;
const SIZE = 260;
const C = SIZE / 2;
const R = 100;

/** Degrees round the dial for a time of day, midnight at the top, clockwise. */
export const dialAngle = (m: number) => (((m % DAY) + DAY) % DAY) / DAY * 360;
/** The time (five-minute steps) under a point on the dial. */
export function minutesAt(x: number, y: number, cx: number, cy: number): number {
  const deg = ((Math.atan2(x - cx, -(y - cy)) * 180) / Math.PI + 360) % 360;
  return (Math.round((deg / 360) * DAY / 5) * 5) % DAY;
}
/** A time moved by some minutes, wrapping round midnight. */
export const nudge = (m: number, by: number) => (((m + by) % DAY) + DAY) % DAY;

export function clock(m: number): string {
  const h = Math.floor(m / 60);
  return `${h % 12 || 12}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}

const at = (m: number, r = R) => {
  const t = (dialAngle(m) * Math.PI) / 180;
  return { x: C + r * Math.sin(t), y: C - r * Math.cos(t) };
};

type End = 'asleep' | 'woke';

/**
 * The night dial (board 5 `s5-a`): a 24-hour dial, the moon handle at lights out and the sun handle at waking,
 * the arc between them and the hours asleep in the middle; −10 / +10 under each time. An unset end sits greyed
 * at last night's time until it is touched: nothing is saved unless it is set.
 */
export function NightDial({ asleep, woke, hintAsleep, hintWoke, onAsleep, onWoke }: { asleep?: number; woke?: number; hintAsleep: number; hintWoke: number; onAsleep: (m: number) => void; onWoke: (m: number) => void }) {
  const svg = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<End | null>(null);
  const shown = { asleep: asleep ?? hintAsleep, woke: woke ?? hintWoke };
  const set = { asleep: onAsleep, woke: onWoke };
  const len = sleepMinutes(shown.asleep, shown.woke);
  const both = asleep !== undefined && woke !== undefined;

  const move = (e: PointerEvent<SVGSVGElement>) => {
    if (!drag || !svg.current) return;
    const r = svg.current.getBoundingClientRect();
    set[drag](minutesAt(((e.clientX - r.left) * SIZE) / r.width, ((e.clientY - r.top) * SIZE) / r.height, C, C));
  };
  const key = (end: End) => (e: KeyboardEvent) => {
    const by = { ArrowUp: 5, ArrowRight: 5, ArrowDown: -5, ArrowLeft: -5, PageUp: 60, PageDown: -60 }[e.key];
    if (by === undefined) return;
    e.preventDefault();
    set[end](nudge(shown[end], by));
  };

  const handle = (end: End, label: string, value: number | undefined) => {
    const p = at(shown[end]);
    return (
      <g
        className={`nd-h nd-${end}${value === undefined ? ' unset' : ''}`}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={DAY - 5}
        aria-valuenow={shown[end]}
        aria-valuetext={value === undefined ? 'not set' : clock(value)}
        onKeyDown={key(end)}
        onPointerDown={(e) => {
          svg.current?.setPointerCapture(e.pointerId);
          setDrag(end);
        }}
      >
        <circle cx={p.x} cy={p.y} r={22} className="nd-hbg" />
        {end === 'asleep' ? (
          <>
            <circle cx={p.x} cy={p.y} r={10} className="nd-cut" />
            <circle cx={p.x + 4.5} cy={p.y - 3.5} r={9} className="nd-hbg-fill" />
          </>
        ) : (
          <>
            <circle cx={p.x} cy={p.y} r={6} className="nd-cut" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((d) => {
              const t = (d * Math.PI) / 180;
              return <line key={d} x1={p.x + 9 * Math.sin(t)} y1={p.y - 9 * Math.cos(t)} x2={p.x + 13 * Math.sin(t)} y2={p.y - 13 * Math.cos(t)} className="nd-ray" />;
            })}
          </>
        )}
      </g>
    );
  };

  const time = (end: End, label: string, value: number | undefined) => (
    <div className={`nd-time nd-t-${end}`}>
      <span className="nd-tl">{label}</span><b className="tn">{value === undefined ? '—' : clock(value)}</b>
      <span className="nd-nudge">
        <button type="button" aria-label={`${label} 10 minutes earlier`} onClick={() => set[end](nudge(shown[end], -10))}>−10</button>
        <button type="button" aria-label={`${label} 10 minutes later`} onClick={() => set[end](nudge(shown[end], 10))}>+10</button>
      </span>
    </div>
  );

  return (
    <div className="nd">
      <svg ref={svg} className={`nd-dial${drag ? ' dragging' : ''}`} viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} onPointerMove={move} onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)}>
        <circle cx={C} cy={C} r={R} className="nd-track" />
        {Array.from({ length: 24 }, (_, h) => {
          const a = at(h * 60, R - 15);
          const b = at(h * 60, R - (h % 6 ? 11 : 9));
          return <line key={h} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="nd-tick" aria-hidden="true" />;
        })}
        {([[0, '12 am', 'middle'], [360, '6 am', 'end'], [720, '12 pm', 'middle'], [1080, '6 pm', 'start']] as const).map(([m, l, anchor]) => {
          const p = at(m, anchor === 'middle' ? R - 32 : R - 20);
          return <text key={m} x={p.x} y={p.y} className="nd-hr" textAnchor={anchor} dominantBaseline="central" aria-hidden="true">{l}</text>;
        })}
        <circle cx={C} cy={C} r={R} pathLength={DAY} className={`nd-arc${both ? '' : ' unset'}`} strokeDasharray={`${len} ${DAY}`} transform={`rotate(${dialAngle(shown.asleep) - 90} ${C} ${C})`} style={{ '--len': len } as React.CSSProperties} aria-hidden="true" />
        {handle('asleep', 'Lights out', asleep)}
        {handle('woke', 'Woke', woke)}
        <text x={C} y={C - 8} className="nd-len" textAnchor="middle" dominantBaseline="central">{both ? fmtDuration(len).replace(/ m$/, '') : '—'}</text>
        <text x={C} y={C + 20} className="nd-lenl" textAnchor="middle" dominantBaseline="central">asleep</text>
      </svg>
      <div className="nd-times">
        {time('asleep', 'Lights out', asleep)}
        {time('woke', 'Woke', woke)}
      </div>
    </div>
  );
}
