import type { RouteDef } from './types';
import { dandi } from './routes/dandi';
import { meerut } from './routes/meerut';
import { kos } from './routes/kos';
import { rani } from './routes/rani';
import { forts } from './routes/forts';
import { indus } from './routes/indus';
import { spice } from './routes/spice';
import { deccan } from './routes/deccan';
import { shivaji } from './routes/shivaji';
import { hadrian } from './routes/hadrian';
import { tokaido } from './routes/tokaido';
import { hannibal } from './routes/hannibal';
import { sigeric } from './routes/sigeric';
import { harold } from './routes/harold';
import { piku } from './routes/piku';
import { frodo } from './routes/frodo';
import { rann } from './routes/rann';
import { xuanzang } from './routes/xuanzang';
import { gt } from './routes/gt';
import { arc } from './routes/arc';
import { humayun } from './routes/humayun';
import { bose } from './routes/bose';
import { hedge } from './routes/hedge';

export * from './types';

/** Every route, in shelf order. */
const ALL: RouteDef[] = [shivaji, dandi, kos, rani, meerut, forts, deccan, indus, spice, hadrian, tokaido, hannibal, sigeric, harold, piku, frodo, rann, xuanzang, gt, arc, humayun, bose, hedge];

let catalogue = ALL;

/** Every route, in shelf order (read through this, so tests can swap in their own). */
export const CATALOGUE: RouteDef[] = ALL;

export function routeById(id: string): RouteDef | undefined {
  return catalogue.find((r) => r.id === id);
}

/** The routes you can join: only those whose writing is done. */
export function shelfRoutes(): RouteDef[] {
  return catalogue.filter((r) => r.ready);
}

/** Up to 1,500 km is a challenge; longer routes are expeditions. */
export function kindOf(def: Pick<RouteDef, 'km'>): 'challenge' | 'expedition' {
  return def.km > 1500 ? 'expedition' : 'challenge';
}

/** Tests only: run `fn` with these routes in place of the catalogue (until its promise settles, if it returns one). */
export function withCatalogue<T>(defs: RouteDef[], fn: () => T): T {
  const before = catalogue;
  catalogue = defs;
  let out: T;
  try {
    out = fn();
  } catch (e) {
    catalogue = before;
    throw e;
  }
  if (out instanceof Promise) return out.finally(() => (catalogue = before)) as T;
  catalogue = before;
  return out;
}
