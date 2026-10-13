/** Rest, measured from the clock: a rest that ran with the screen off still ends on time. */
export function restState(rest: { endsAt: number; total: number }, now: number): { left: number; endedAgo?: number } {
  const left = Math.ceil((rest.endsAt - now) / 1000);
  if (left > 0) return { left };
  return { left: 0, endedAgo: Math.floor((now - rest.endsAt) / 1000) };
}

export interface Span {
  from: number;
  to: number;
  kind: 'lift' | 'rest';
}

/** The session split into lifting and resting, end to end, for "where the hour went". */
export function restSpans(startedAt: number, endedAt: number, rests: { from: number; to: number }[]): Span[] {
  const out: Span[] = [];
  let t = startedAt;
  for (const r of [...rests].sort((a, b) => a.from - b.from)) {
    const from = Math.max(t, Math.min(r.from, endedAt));
    const to = Math.max(from, Math.min(r.to, endedAt));
    if (from > t) out.push({ from: t, to: from, kind: 'lift' });
    if (to > from) out.push({ from, to, kind: 'rest' });
    t = to;
  }
  if (t < endedAt) out.push({ from: t, to: endedAt, kind: 'lift' });
  return out;
}

/** Battery saver: below 30 % when the browser reports it, or switched on by hand. */
export const LOW_BATTERY = 0.3;
export function batteryMode(level: number | undefined, manual: boolean): boolean {
  return manual || (level !== undefined && level < LOW_BATTERY);
}
