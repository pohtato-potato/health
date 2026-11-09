/** The plain line at the top of Today, when the voice is quiet. `minutes` are log-day minutes. */
export function glanceLine(i: { minutes: number; closedRings: number; ringsOf?: number; dayClosed: boolean; sessionTonight?: string; nextSession?: string; morningDone: boolean }): string {
  const of = i.ringsOf ?? 3;
  if (i.dayClosed) return `Day closed with ${i.closedRings} of ${of} rings.${i.nextSession ? ` ${i.nextSession}.` : ''}`;
  if (i.closedRings >= of) return of === 4 ? 'All four closed.' : 'All three closed.';
  if (i.minutes < 11 * 60 && !i.morningDone) return i.sessionTonight ? `${i.sessionTonight} tonight. Log the morning when you’re up.` : 'Log the morning when you’re up.';
  if (i.minutes >= 19 * 60) return i.closedRings === of - 1 ? `${of === 4 ? 'Three' : 'Two'} closed. One more before bed.` : i.closedRings > 1 ? `${i.closedRings === 2 ? 'Two' : 'Three'} closed so far.` : i.closedRings === 1 ? 'One ring closed so far.' : 'The rings are still open.';
  if (i.sessionTonight) return `${i.sessionTonight} tonight.`;
  return 'On track.';
}
