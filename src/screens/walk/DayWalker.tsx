import type { CSSProperties } from 'react';
import type { DayWalk } from '../../walk/dayWalk';

const X0 = 10;
const X1 = 290;

/** Close the day's walk: the walker walks the day's kilometres from the morning towards the next stop, which is named. */
export function DayWalker({ d, line }: { d: DayWalk; line: string }) {
  const end = X0 + (X1 - X0) * Math.min(1, d.frac);
  return (
    <div className="day-walker" style={{ textAlign: 'left' }}>
      <div className="row" style={{ gap: 8 }}>
        <span className="t14 q">Walk</span>
        <span className="t14 right grow">{line}</span>
      </div>
      <svg viewBox="0 0 300 28" width="100%" aria-hidden="true">
        <line x1={X0} y1="14" x2={X1} y2="14" stroke="var(--faint)" strokeWidth="2" strokeDasharray="2 5" strokeLinecap="round" />
        <line className="day-walker-done" x1={X0} y1="14" x2={end} y2="14" stroke="var(--sage)" strokeWidth="3" strokeLinecap="round" pathLength={1} />
        <circle cx={X0} cy="14" r="3.5" fill="none" stroke="var(--sage)" strokeWidth="1.5" />
        {d.next && <circle cx={X1} cy="14" r="4.5" fill="var(--text)" />}
        <circle className="day-walker-dot" cx={X0} cy="14" r="6" fill="var(--sage)" style={{ '--to': `${(end - X0).toFixed(1)}px` } as CSSProperties} />
      </svg>
      <div className="row t14 q" style={{ gap: 8 }}>
        <span className="grow">{d.passed.length ? `Passed ${d.passed.join(', ')}` : 'This morning'}</span>
      </div>
    </div>
  );
}
