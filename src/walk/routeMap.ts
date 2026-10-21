import { ALL_STOPS, chapterAt, CHAPTERS, positionAt, type Chapter } from '../domain/walk';

export interface Pt {
  x: number;
  y: number;
}

/** Everything the whole-walk map draws, from how far you have come. */
export function routeLayers(km: number) {
  const pos = positionAt(km);
  const ch = chapterAt(km);
  const you: Pt = { x: pos.x, y: pos.y };
  const inCh = ch.route.filter((s) => s.km <= km).map(({ x, y }) => ({ x, y }));
  const walked: Pt[] = pos.done ? ch.route.map(({ x, y }) => ({ x, y })) : [...inCh, you];
  const ahead: Pt[] = pos.done ? [] : [you, ...ch.route.filter((s) => s.km > km).map(({ x, y }) => ({ x, y }))];
  const earlier: Chapter[] = CHAPTERS.filter((c) => c.n < ch.n);
  const later: Chapter[] = CHAPTERS.filter((c) => c.n > ch.n);
  const seen = new Set<string>();
  const reached = ALL_STOPS.filter((s) => s.km <= km && !seen.has(s.name) && seen.add(s.name));
  return {
    you,
    done: pos.done,
    chapter: ch,
    walked,
    ahead,
    earlier,
    later,
    reached,
  };
}
