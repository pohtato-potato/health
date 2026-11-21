import type { CSSProperties } from 'react';
import type { DayKey } from '../../domain/dates';
import { fmtInt } from '../../domain/format';

const LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const INKS = ['#ffb27a', '#c2b2ff', '#5fe3a1', '#8fd8ff', '#ffd36b', '#f4aedb'];
const name = (m: string) => LONG[Number(m.slice(5, 7)) - 1];

/** One achievement: earned on a date, or not yet. A secret found shows as a rainbow. */
export interface WallCell { id: string; date?: DayKey; secret?: boolean }

/** The months something was earned in, oldest first, with how many and the colour they take. */
export function wallMonths(cells: WallCell[]) {
  const by = new Map<string, number>();
  for (const c of cells) if (c.date) by.set(c.date.slice(0, 7), (by.get(c.date.slice(0, 7)) ?? 0) + 1);
  return [...by].sort(([a], [b]) => a.localeCompare(b)).map(([month, n], k) => ({ month, n, c: INKS[k % INKS.length] }));
}

/** The wall (board 23): every achievement as a cell popping in, the earned ones coloured by the month they came, oldest first. */
export function AchWall({ cells, today }: { cells: WallCell[]; today: DayKey }) {
  const months = wallMonths(cells);
  const ink = new Map(months.map((m) => [m.month, m.c]));
  const earned = cells.filter((c) => c.date).sort((a, b) => a.date!.localeCompare(b.date!));
  const order = [...earned, ...cells.filter((c) => !c.date)];
  const now = today.slice(0, 7);
  const shown = months.slice(-3);
  const before = months.slice(0, -3).reduce((n, m) => n + m.n, 0);
  const parts = [
    ...(before ? [`${fmtInt(before)} before ${name(shown[0].month)}`] : []),
    ...shown.map((m) => `${fmtInt(m.n)} ${m.month === now ? 'so far ' : ''}in ${name(m.month)}`),
  ];
  return (
    <div className="aw">
      <div className="aw-h">{earned.length ? `${fmtInt(earned.length)} earned` : 'Nothing earned yet'}</div>
      <p className="aw-s">{earned.length ? `Every achievement as a cell, coloured by when you earned it: ${parts.join(', ')}.` : 'Every achievement is a cell here. They fill in with colour as you earn them.'}</p>
      <div className="aw-w" role="img" aria-label={`${fmtInt(earned.length)} earned of ${fmtInt(cells.length)}`}>
        {order.map((c, k) => (
          <i key={c.id} className={`aw-c${c.secret && c.date ? ' s' : c.date ? '' : ' n'}`} style={{ '--c': c.date ? ink.get(c.date.slice(0, 7)) : undefined, '--d': `${Math.min(k * 0.008, 1.2).toFixed(3)}s` } as CSSProperties} />
        ))}
      </div>
      {earned.length > 0 && (
        <div className="aw-k">
          {months.map((m) => <span key={m.month}><i style={{ background: m.c }} aria-hidden="true" />{name(m.month).slice(0, 3)} · {fmtInt(m.n)}</span>)}
          {earned.some((c) => c.secret) && <span><i className="s" aria-hidden="true" />Secret found</span>}
        </div>
      )}
    </div>
  );
}
