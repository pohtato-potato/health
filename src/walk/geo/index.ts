import { INDIA_AREA_KM2, REGIONS, type Region, type RegionKey } from './regions';
import { MAIN_CITIES, ROUTE_LINES as GENERATED, type RouteLine } from './routes';

/**
 * The walk's land and route lines. Everything reads them from here rather than from the generated files, so
 * tests can swap in a line of their own.
 */
export { INDIA_AREA_KM2, MAIN_CITIES, REGIONS, type Region, type RegionKey, type RouteLine };

export let ROUTE_LINES: Record<string, RouteLine> = GENERATED;

/** Tests only: run `fn` with these route lines in place of the generated ones. */
export function withLines<T>(lines: Record<string, RouteLine>, fn: () => T): T {
  const before = ROUTE_LINES;
  ROUTE_LINES = lines;
  try {
    return fn();
  } finally {
    ROUTE_LINES = before;
  }
}
