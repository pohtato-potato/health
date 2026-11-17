// Numbers that roll (motion board two, take two; O44): a changing figure spins past its value, snaps back, and
// glows as it lands. One component for money, points, steps, ratings and the like. It ends still on the exact value.
import { useRef, type CSSProperties } from 'react';
import { easeOut, useChange, useTween } from './motion';

/** Where the figure is at `p` (0 → 1): out past the new value by `over`, then back onto it. */
export function rollAt(from: number, to: number, p: number, over: number): number {
  if (p >= 1) return to;
  const past = to + Math.sign(to - from) * over;
  if (p < 0.6) return from + (past - from) * easeOut(p / 0.6);
  const q = (p - 0.6) / 0.4;
  return past + (to - past) * (q * q * (3 - 2 * q));
}

export function Roll({ value, format = (n) => String(Math.round(n)), id, step = 1, ms = 1100, countIn = false, replay = 0, delay = 0, className, style }: {
  /** Wait this long before rolling (it shows where it starts until then). */
  delay?: number;
  value: number;
  format?: (n: number) => string;
  /** Remember the value here between visits, so a change made elsewhere rolls once on return. */
  id?: string;
  /** The smallest step the figure shows: it always spins past by at least one. */
  step?: number;
  ms?: number;
  /** Count up from 0 when it first shows (and each time `replay` changes). */
  countIn?: boolean;
  replay?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const ch = useChange(id, value);
  const run = useRef<{ n: number; replay: number; k: number; from: number } | null>(null);
  if (run.current === null) run.current = { n: ch.n, replay, k: ch.n || countIn ? 1 : 0, from: ch.n ? (ch.from as number) : 0 };
  else if (ch.n !== run.current.n) run.current = { ...run.current, n: ch.n, k: run.current.k + 1, from: ch.from as number };
  else if (replay !== run.current.replay) run.current = { ...run.current, replay, k: run.current.k + 1, from: 0 };
  const { k, from } = run.current;
  const p = useTween(k, ms, delay);
  const over = Math.max(Math.abs(value - from) * 0.12, step);
  const shown = k && p < 1 && Number.isFinite(from) ? rollAt(from, value, p, over) : value;
  return (
    <span key={k} className={`mo-roll${k ? ' mo-landed' : ''}${className ? ` ${className}` : ''}`} style={{ ...style, ['--mo-ms' as string]: `${ms + delay}ms` }}>
      {format(shown)}
    </span>
  );
}
