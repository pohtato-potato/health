import { ALL_STOPS, chapterAt, CHAPTERS, positionAt, type Chapter } from '../domain/walk';
import type { Structure, StructureKind } from './camps';
import { QUESTS } from './quests';

export interface Pt {
  x: number;
  y: number;
}

/** Everything the whole-walk map draws, from how far you have come. */
export function routeLayers(km: number, built: Structure[], questRecords: { id: string; data?: Record<string, unknown> }[]) {
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
  const taken = new Set(questRecords.filter((r) => r.data?.taken).map((r) => r.id.replace(/^quest:/, '')));
  const quests = QUESTS.map((q) => {
    const at = positionAt(q.nearKm);
    // A short spur to the west of the road, longer for longer detours.
    const len = Math.min(10, 3 + q.detourKm / 40);
    return { id: q.id, name: q.name, from: { x: at.x, y: at.y }, x: at.x - len, y: at.y - len * 0.4, taken: taken.has(q.id) };
  });
  return {
    you,
    done: pos.done,
    chapter: ch,
    walked,
    ahead,
    earlier,
    later,
    reached,
    quests,
    built: built.map((b) => ({ x: b.x, y: b.y, kind: b.kind as StructureKind, name: b.name })),
  };
}
