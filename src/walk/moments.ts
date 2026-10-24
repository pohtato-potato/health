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
