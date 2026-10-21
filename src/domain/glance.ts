/** The plain line at the top of Today, when the voice is quiet. `minutes` are log-day minutes. */
export function glanceLine(i: { minutes: number; closedRings: number; dayClosed: boolean; sessionTonight?: string; nextSession?: string; morningDone: boolean }): string {
  if (i.dayClosed) return `Day closed with ${i.closedRings} of 3 rings.${i.nextSession ? ` ${i.nextSession}.` : ''}`;
  if (i.closedRings >= 3) return 'All three closed.';
  if (i.minutes < 11 * 60 && !i.morningDone) return i.sessionTonight ? `${i.sessionTonight} tonight. Log the morning when you’re up.` : 'Log the morning when you’re up.';
  if (i.minutes >= 19 * 60) return i.closedRings === 2 ? 'Two closed. One more before bed.' : i.closedRings === 1 ? 'One ring closed so far.' : 'The rings are still open.';
  if (i.sessionTonight) return `${i.sessionTonight} tonight.`;
  return 'On track.';
}
