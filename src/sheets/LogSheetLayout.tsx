import type { ReactNode } from 'react';

/** The + sheet's order, the same as Today's: search first, your usual foods, the tiles, then More. */
export function LogSheetLayout(p: { date: ReactNode; search: ReactNode; usual: ReactNode; tiles: ReactNode; more: ReactNode }) {
  return (
    <>
      {p.date}
      {p.search}
      {p.usual}
      {p.tiles}
      {p.more}
    </>
  );
}
