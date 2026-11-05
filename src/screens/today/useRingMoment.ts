import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { buzz, chime } from '../../audio';
import { db } from '../../db/db';
import type { DayKey } from '../../domain/dates';
import { ringMomentKey, ringMomentMarks, ringMomentsDue, type RingKey, type RingMoment } from '../../domain/ringMoments';
import { quietNow } from '../../ui/quiet';

export const RING_MS = 3600;
export const PERFECT_MS = 5200;

export type PlayingMoment = RingMoment & { id: number };

/** Plays what's owed, one at a time, each once a day. It holds while a sheet is open, and a rest day never celebrates. */
export function useRingMoment(i: { date: DayKey; closed: Record<RingKey, boolean>; hold: boolean; rest: boolean; momentsOn: boolean; ding: boolean; buzzOn: boolean; quiet: boolean }) {
  const [playing, setPlaying] = useState<PlayingMoment | null>(null);
  const [goldCount, setGoldCount] = useState<number | null>(null);
  const perfectPlayed = useLiveQuery(async () => !!(await db.seen.get(ringMomentKey(i.date, 'perfect'))), [i.date]);
  const busy = useRef(false);
  const nextId = useRef(1);
  const key = `${i.date}|${i.closed.kcal}|${i.closed.protein}|${i.closed.steps}|${i.hold}|${i.rest}|${i.momentsOn}`;

  useEffect(() => {
    if (i.hold || busy.current) return;
    let cancelled = false;
    // A beat first: a save that also earns a full-screen moment queues it now, and this one waits for it to close.
    const start = window.setTimeout(async () => {
      const seen = new Set((await db.seen.toArray()).map((s) => s.id));
      if (cancelled || busy.current) return;
      const due = ringMomentsDue(i.date, i.closed, (k) => seen.has(k));
      if (!due.length) return;
      const silent = i.rest || !i.momentsOn;
      for (const m of silent ? due : due.slice(0, 1)) await db.seen.bulkPut(ringMomentMarks(i.date, m).map((id) => ({ id, at: Date.now() })));
      if (silent || cancelled) return;
      const m = due[0];
      busy.current = true;
      setPlaying({ ...m, id: nextId.current++ });
      const loud = !quietNow(i.quiet, Date.now(), document.hidden);
      if (i.ding && loud) chime(m.kind === 'perfect');
      if (i.buzzOn && loud) buzz(m.kind === 'perfect' ? [60, 60, 60, 60, 160] : [40, 50, 80]);
      if (m.kind === 'perfect') {
        setGoldCount(0);
        [900, 1120, 1340].forEach((at, n) => window.setTimeout(() => setGoldCount(n + 1), at));
      }
      window.setTimeout(() => {
        busy.current = false;
        setPlaying(null);
        setGoldCount(null);
      }, m.kind === 'perfect' ? PERFECT_MS : RING_MS);
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(start);
    };
  }, [key, playing]); // eslint-disable-line react-hooks/exhaustive-deps

  return { playing, goldCount, perfectPlayed };
}
