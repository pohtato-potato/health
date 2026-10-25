import type { RouteLine } from '../geo';
import type { RouteDef } from './types';

/**
 * What's wrong between a route and its drawn line, in words; empty when they agree. The dot is pinned to the
 * places (fracAtKm), so places must climb the line in step with their km, the last km must be the line's end,
 * and a round trip's turn must be one of its places.
 */
export function lineProblems(def: RouteDef, line: RouteLine | undefined): string[] {
  if (!line) return ['no line'];
  const out: string[] = [];
  const last = line.line.length - 1;
  for (const p of def.places) if (!Number.isInteger(p.at) || p.at < 0 || p.at > last) out.push(`place at a point that isn’t on the line: ${p.name}`);
  if (def.places.some((p, i) => i > 0 && p.at <= def.places[i - 1].at)) out.push('places out of line order');
  const end = def.places.find((p) => p.km === def.km);
  if (def.places.length && (!end || end.at !== last)) out.push('the last km isn’t at the end of the line');
  if (def.turn !== undefined && !def.places.some((p) => p.km === def.turn)) out.push('turn isn’t at a place');
  if (def.region !== line.region) out.push('region differs from its line');
  return out;
}
