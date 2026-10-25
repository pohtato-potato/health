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

export interface ActiveRest {
  from: number;
  endsAt: number;
  total: number;
}

/** Coming back to a session: the rest that was running, and how long until its ding if it hasn't ended. */
export function resumeRest(active: ActiveRest | undefined, now: number): { rest: ActiveRest | null; dingSec?: number } {
  if (!active) return { rest: null };
  return active.endsAt > now ? { rest: active, dingSec: Math.ceil((active.endsAt - now) / 1000) } : { rest: active };
}
