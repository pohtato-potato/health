/** Something that could take the whole screen today. */
export interface MomentCandidate {
  kind: 'finish' | 'arrival' | 'state';
  /** Its seen id. */
  key: string;
  /** Where it plays, as a hash path. */
  path: string;
}

const ORDER: MomentCandidate['kind'][] = ['finish', 'arrival', 'state'];

/** The seen id that says today has had its full-screen moment. */
export const momentKey = (day: string) => `walk-moment:${day}`;

/**
 * A day's budget is one full-screen moment: a finish, or else an arrival, or else a state line. The rest, and
 * everything once the day has had its moment, wait as a banner.
 */
export function momentToday(candidates: MomentCandidate[], seen: Set<string>, today: string): { play?: MomentCandidate; later: MomentCandidate[] } {
  const sorted = [...candidates].sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
  if (seen.has(momentKey(today))) return { play: undefined, later: sorted };
  return { play: sorted[0], later: sorted.slice(1) };
}

/** The seen id for a moment that waited, kept with its day and where it plays, so the banner can offer it. */
export const laterKey = (day: string, path: string) => `walk-later:${day}:${path}`;

/**
 * What to do with today's candidates: the page to open (if the day has room) and the seen ids to write, so that
 * nothing plays twice and whatever waited is offered as a banner.
 */
export function planWalkMoments(candidates: MomentCandidate[], seen: Set<string>, today: string): { open?: string; seen: string[] } {
  if (!candidates.length) return { open: undefined, seen: [] };
  const { play, later } = momentToday(candidates, seen, today);
  return {
    open: play?.path,
    seen: [...(play ? [play.key, momentKey(today)] : []), ...later.flatMap((c) => [c.key, laterKey(today, c.path)])],
  };
}
