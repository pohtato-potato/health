/** Protein in a few words for the drawer handle: closed, short once the day is closed, or still to go. */
export function proteinState(i: { gapG: number; closed: boolean; dayClosed: boolean }): string {
  if (i.closed) return 'Protein closed';
  return i.dayClosed ? `${i.gapG} g short` : `${i.gapG} g to go`;
}
