import { INDIA_AREA_KM2, REGIONS, type Region, type RegionKey } from './regions';
import { CITY_POINTS, MAIN_CITIES, ROUTE_LINES as GENERATED, type RouteLine } from './routes';

/**
 * The walk's land and route lines. Everything reads them from here rather than from the generated files, so
 * tests can swap in a line of their own.
 */
export { CITY_POINTS, INDIA_AREA_KM2, MAIN_CITIES, REGIONS, type Region, type RegionKey, type RouteLine };

export let ROUTE_LINES: Record<string, RouteLine> = GENERATED;

/** Tests only: run `fn` with these route lines in place of the generated ones (until its promise settles, if it returns one). */
export function withLines<T>(lines: Record<string, RouteLine>, fn: () => T): T {
  const before = ROUTE_LINES;
  ROUTE_LINES = lines;
  let out: T;
  try {
    out = fn();
  } catch (e) {
    ROUTE_LINES = before;
    throw e;
  }
  if (out instanceof Promise) return out.finally(() => (ROUTE_LINES = before)) as T;
  ROUTE_LINES = before;
  return out;
}
