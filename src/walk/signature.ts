import type { RouteDef, RouteSignature } from './catalogue';

export type Signature = RouteSignature;

/**
 * The thing you collect on a route. A route without its own gets one from its kind of record: halts where the
 * record has them, chapters for a book or film, milestones otherwise, about one per 50 km and never fewer than six,
 * spaced evenly so the last one is at the end.
 */
export function signatureOf(def: RouteDef): Signature {
  if (def.signature) return def.signature;
  const count = Math.max(6, Math.round(def.km / 50));
  const marks = Array.from({ length: count }, (_, i) => ({ km: (def.km * (i + 1)) / count }));
  if (def.book) return { title: 'Chapters on the road', note: 'The story in chapters along the way, in our own words.', mark: 'chapter', marks };
  if (def.record === 'dated' || def.record === 'place') return { title: 'The halts', note: 'Where the original travellers stopped, from the record.', mark: 'stage', marks };
  return { title: 'Milestones', note: 'A stone for every stretch of the road.', mark: 'stone', marks };
}

/** How many of the marks you've reached: those at or before your km. */
export function marksReached(sig: Signature, km: number): number {
  return sig.marks.filter((m) => m.km <= km).length;
}
