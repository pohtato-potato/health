// The morning parcel and the ground at night (matchday spec §4, k-parcel, p3-shut, d-closed B, 12 Nov).
// The first Football open after 4 am shows the parcel: up to six tiles, each edged in its own colour, opened one at a
// time. After Close the day only packs and results are held for the morning; the table, squad and cup runs stay open.
// The desk's dice and the cast's message are seams: their tiles have a place in the order, nothing fills them yet.
import type { DayKey } from '../domain/dates';

export type TileKind = 'result' | 'table' | 'talks' | 'scout' | 'academy' | 'cast' | 'dice' | 'pack';
/** The order tiles open in. The result always leads. */
export const TILE_ORDER: TileKind[] = ['result', 'table', 'talks', 'scout', 'academy', 'cast', 'dice', 'pack'];
export const PARCEL_MAX = 6;

/** Each tile's own edge colour (p3-shut) and its title. */
export const TILE: Record<TileKind, { ink: string; title: string }> = {
  result: { ink: '#ff7a1a', title: 'Last night' },
  table: { ink: '#7fd8c8', title: 'The treatment table' },
  talks: { ink: '#c8e86a', title: 'Target talks' },
  scout: { ink: '#8fdcb6', title: 'A scout is back' },
  academy: { ink: '#c2b2ff', title: 'The academy' },
  cast: { ink: '#f4aedb', title: 'A note for you' },
  dice: { ink: '#93c3dc', title: "Today's dice" },
  pack: { ink: '#f2c46d', title: 'A pack is due' },
};

/** What came in overnight. `cast` and `dice` arrive with the desk (step 4). */
export type ParcelInput = Partial<Record<TileKind, boolean>>;

export function parcelTiles(i: ParcelInput): TileKind[] {
  return TILE_ORDER.filter((k) => i[k]).slice(0, PARCEL_MAX);
}

/** The parcel shows once a logging day, on the first open after 4 am, and never while the ground is shut. */
export function parcelDue(opened: DayKey | undefined, today: DayKey, shut: boolean, tiles: TileKind[]): boolean {
  return opened !== today && !shut && tiles.length > 0;
}

/** The ground shuts from Close the day until the 4 am roll-over (the logging day is sealed). */
export function groundShut(day: { seal?: unknown } | undefined): boolean {
  return Boolean(day?.seal);
}

/** Held at night: packs and results only (d-closed B). Everything else stays open. */
export const HELD_AT_NIGHT = ['packs', 'results'] as const;
export function heldAtNight(what: string): boolean {
  return (HELD_AT_NIGHT as readonly string[]).includes(what);
}

/** "Six things came in" / "One thing came in". */
const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'];
export const cameIn = (n: number) => `${WORDS[n] ?? n} ${n === 1 ? 'thing' : 'things'} came in`;
export const forTheMorning = (n: number) => (n <= 0 ? 'Packs and results wait for the morning' : `${WORDS[n] ?? n} ${n === 1 ? 'thing' : 'things'} for the morning`);
